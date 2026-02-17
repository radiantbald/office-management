package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const (
	dbDumpExportTimeout = 3 * time.Minute
	dbDumpImportTimeout = 5 * time.Minute
	maxDBDumpUploadSize = 300 << 20 // 300MB
)

var dumpFileNameUnsafeChars = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func activeDatabaseDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("DATABASE_URL")); dsn != "" {
		return dsn
	}
	return postgresDSN()
}

func (a *app) handleDatabaseDumpExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	if !ensureNotEmployeeRoleFresh(w, r, a.db) {
		return
	}

	timestamp := time.Now().Format("20060102_150405")
	fileName := fmt.Sprintf("db_dump_%s.sql", timestamp)
	filePath := filepath.Join(a.dbDumpDir, fileName)

	ctx, cancel := context.WithTimeout(r.Context(), dbDumpExportTimeout)
	defer cancel()

	cmd := exec.CommandContext(
		ctx,
		"pg_dump",
		"--clean",
		"--if-exists",
		"--no-owner",
		"--no-privileges",
		"--encoding=UTF8",
		"--format=plain",
		"--dbname", activeDatabaseDSN(),
		"--file", filePath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			respondError(w, http.StatusGatewayTimeout, "Создание дампа БД превысило лимит времени")
			return
		}
		log.Printf("db dump export failed: %v, output=%s", err, string(output))
		respondError(w, http.StatusInternalServerError, "Не удалось создать дамп БД")
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("db dump open failed: %v", err)
		respondError(w, http.StatusInternalServerError, "Не удалось открыть дамп БД")
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		log.Printf("db dump stat failed: %v", err)
		respondError(w, http.StatusInternalServerError, "Не удалось подготовить дамп БД")
		return
	}

	w.Header().Set("Content-Type", "application/sql")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", info.Size()))
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("db dump download stream failed: %v", err)
	}
}

func (a *app) handleDatabaseDumpImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	if !ensureNotEmployeeRoleFresh(w, r, a.db) {
		return
	}
	if err := r.ParseMultipartForm(maxDBDumpUploadSize); err != nil {
		respondError(w, http.StatusBadRequest, "Не удалось прочитать загруженный файл")
		return
	}

	src, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Файл дампа не найден")
		return
	}
	defer src.Close()

	uploadedPath, err := saveUploadedDumpFile(a.dbDumpDir, header, src)
	if err != nil {
		log.Printf("db dump upload save failed: %v", err)
		respondError(w, http.StatusInternalServerError, "Не удалось сохранить загруженный дамп")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), dbDumpImportTimeout)
	defer cancel()
	cmd := exec.CommandContext(
		ctx,
		"psql",
		"--set", "ON_ERROR_STOP=1",
		"--single-transaction",
		"--dbname", activeDatabaseDSN(),
		"--file", uploadedPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			respondError(w, http.StatusGatewayTimeout, "Восстановление БД превысило лимит времени")
			return
		}
		log.Printf("db dump import failed: %v, output=%s", err, string(output))
		respondError(w, http.StatusInternalServerError, "Не удалось загрузить дамп БД")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message":  "Дамп БД успешно загружен",
		"filename": filepath.Base(uploadedPath),
	})
}

func saveUploadedDumpFile(targetDir string, header *multipart.FileHeader, src multipart.File) (string, error) {
	if header == nil || src == nil {
		return "", errors.New("invalid uploaded file")
	}
	originalName := strings.TrimSpace(filepath.Base(header.Filename))
	if originalName == "" {
		originalName = "dump.sql"
	}
	ext := strings.ToLower(filepath.Ext(originalName))
	if ext == "" {
		ext = ".sql"
	}
	base := strings.TrimSuffix(originalName, filepath.Ext(originalName))
	base = dumpFileNameUnsafeChars.ReplaceAllString(base, "_")
	base = strings.Trim(base, "_.- ")
	if base == "" {
		base = "dump"
	}
	timestamp := time.Now().Format("20060102_150405")
	fileName := fmt.Sprintf("db_upload_%s_%s%s", timestamp, base, ext)
	filePath := filepath.Join(targetDir, fileName)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}
	if err := dst.Sync(); err != nil {
		return "", err
	}
	return filePath, nil
}
