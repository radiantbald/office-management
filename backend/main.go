package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const dbFile = "office.db"
const uploadDirName = "uploads"
const buildingUploadDirName = "buildings"
const maxBuildingImageSize = 5 << 20
const maxBuildingFormSize = maxBuildingImageSize + (1 << 20)

type app struct {
	db                *sql.DB
	uploadDir         string
	buildingUploadDir string
}

type building struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Address   string  `json:"address"`
	ImageURL  string  `json:"image_url,omitempty"`
	Floors    []int64 `json:"floors"`
	CreatedAt string  `json:"created_at"`
}

type floor struct {
	ID         int64  `json:"id"`
	BuildingID int64  `json:"building_id"`
	Name       string `json:"name"`
	Level      int    `json:"level"`
	PlanSVG    string `json:"plan_svg,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type space struct {
	ID        int64  `json:"id"`
	FloorID   int64  `json:"floor_id"`
	Name      string `json:"name"`
	Kind      string `json:"kind"`
	CreatedAt string `json:"created_at"`
}

type desk struct {
	ID        int64  `json:"id"`
	SpaceID   int64  `json:"space_id"`
	Label     string `json:"label"`
	CreatedAt string `json:"created_at"`
}

type meetingRoom struct {
	ID        int64  `json:"id"`
	SpaceID   int64  `json:"space_id"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	CreatedAt string `json:"created_at"`
}

func main() {
	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s?_fk=1", dbFile))
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	uploadDir, err := filepath.Abs(uploadDirName)
	if err != nil {
		log.Fatalf("resolve upload dir: %v", err)
	}
	buildingUploadDir := filepath.Join(uploadDir, buildingUploadDirName)
	if err := os.MkdirAll(buildingUploadDir, 0o755); err != nil {
		log.Fatalf("create upload dir: %v", err)
	}

	app := &app{
		db:                db,
		uploadDir:         uploadDir,
		buildingUploadDir: buildingUploadDir,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/buildings", app.handleBuildings)
	mux.HandleFunc("/api/buildings/", app.handleBuildingSubroutes)
	mux.HandleFunc("/api/floors", app.handleFloors)
	mux.HandleFunc("/api/floors/", app.handleFloorSubroutes)
	mux.HandleFunc("/api/spaces", app.handleSpaces)
	mux.HandleFunc("/api/spaces/", app.handleSpaceSubroutes)
	mux.HandleFunc("/api/desks", app.handleDesks)
	mux.HandleFunc("/api/meeting-rooms", app.handleMeetingRooms)

	webDir := filepath.Join("..", "frontend")
	serveFrontendPage := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
	}
	mux.HandleFunc("/buildings", serveFrontendPage)
	mux.HandleFunc("/buildings/", serveFrontendPage)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(app.uploadDir))))
	mux.Handle("/", http.FileServer(http.Dir(webDir)))

	server := &http.Server{
		Addr:              ":8080",
		Handler:           loggingMiddleware(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("server listening on http://localhost%s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}

func migrate(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS office_buildings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			address TEXT NOT NULL,
			image_url TEXT,
			floors TEXT NOT NULL DEFAULT '[]',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);`,
		`CREATE TABLE IF NOT EXISTS floors (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			building_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			level INTEGER NOT NULL,
			plan_svg TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY(building_id) REFERENCES office_buildings(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS spaces (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			floor_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			kind TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY(floor_id) REFERENCES floors(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS desks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			space_id INTEGER NOT NULL,
			label TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS meeting_rooms (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			space_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			capacity INTEGER NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
		);`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	if err := ensureColumn(db, "office_buildings", "image_url", "TEXT"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_buildings", "floors", "TEXT NOT NULL DEFAULT '[]'"); err != nil {
		return err
	}
	return nil
}

func ensureColumn(db *sql.DB, table, column, definition string) error {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return err
	}
	defer rows.Close()

	exists := false
	for rows.Next() {
		var (
			cid     int
			name    string
			colType string
			notNull int
			dflt    sql.NullString
			pk      int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return err
		}
		if name == column {
			exists = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err = db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition))
	return err
}

func (a *app) handleBuildings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := a.listBuildings()
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
			created, status, err := a.createBuildingFromMultipart(w, r)
			if err != nil {
				respondError(w, status, err.Error())
				return
			}
			respondJSON(w, http.StatusCreated, created)
			return
		}
		var payload struct {
			Name              string `json:"name"`
			Address           string `json:"address"`
			UndergroundFloors int    `json:"underground_floors"`
			AbovegroundFloors int    `json:"aboveground_floors"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		payload.Name = strings.TrimSpace(payload.Name)
		payload.Address = strings.TrimSpace(payload.Address)
		if payload.Name == "" || payload.Address == "" {
			respondError(w, http.StatusBadRequest, "name and address are required")
			return
		}
		if payload.UndergroundFloors < 0 || payload.AbovegroundFloors < 0 {
			respondError(w, http.StatusBadRequest, "underground_floors and aboveground_floors must be non-negative")
			return
		}
		result, err := a.createBuildingWithFloors(payload.Name, payload.Address, "", payload.UndergroundFloors, payload.AbovegroundFloors)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusCreated, result)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) createBuildingFromMultipart(w http.ResponseWriter, r *http.Request) (building, int, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBuildingFormSize)
	if err := r.ParseMultipartForm(maxBuildingFormSize); err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid form data or file is too large")
	}
	name := strings.TrimSpace(r.FormValue("name"))
	address := strings.TrimSpace(r.FormValue("address"))
	if name == "" || address == "" {
		return building{}, http.StatusBadRequest, errors.New("name and address are required")
	}
	undergroundFloors, err := parseOptionalInt(r.FormValue("underground_floors"))
	if err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid underground_floors")
	}
	abovegroundFloors, err := parseOptionalInt(r.FormValue("aboveground_floors"))
	if err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid aboveground_floors")
	}
	if undergroundFloors < 0 || abovegroundFloors < 0 {
		return building{}, http.StatusBadRequest, errors.New("underground_floors and aboveground_floors must be non-negative")
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			created, createErr := a.createBuildingWithFloors(name, address, "", undergroundFloors, abovegroundFloors)
			if createErr != nil {
				return building{}, http.StatusInternalServerError, createErr
			}
			return created, http.StatusOK, nil
		}
		return building{}, http.StatusBadRequest, err
	}

	created, err := a.createBuildingWithFloors(name, address, "", undergroundFloors, abovegroundFloors)
	if err != nil {
		return building{}, http.StatusInternalServerError, err
	}
	imageURL, err := a.saveBuildingImage(created.ID, file, header)
	if err != nil {
		return building{}, http.StatusBadRequest, err
	}
	updated, err := a.updateBuildingImage(created.ID, imageURL)
	if err != nil {
		return building{}, http.StatusInternalServerError, err
	}
	return updated, http.StatusOK, nil
}

func (a *app) handleBuildingSubroutes(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/api/buildings/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/buildings/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if suffix == "" {
		switch r.Method {
		case http.MethodPut:
			var payload struct {
				Name    string `json:"name"`
				Address string `json:"address"`
			}
			if err := decodeJSON(r, &payload); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			payload.Name = strings.TrimSpace(payload.Name)
			payload.Address = strings.TrimSpace(payload.Address)
			if payload.Name == "" || payload.Address == "" {
				respondError(w, http.StatusBadRequest, "name and address are required")
				return
			}
			result, err := a.updateBuilding(id, payload.Name, payload.Address)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, result)
		case http.MethodDelete:
			if err := a.deleteBuilding(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}
	if suffix == "/image" {
		switch r.Method {
		case http.MethodPost:
			existing, err := a.getBuilding(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			file, header, err := r.FormFile("image")
			if err != nil {
				if errors.Is(err, http.ErrMissingFile) && strings.EqualFold(r.FormValue("remove"), "true") {
					updated, clearErr := a.clearBuildingImage(id)
					if clearErr != nil {
						if errors.Is(clearErr, errNotFound) {
							respondError(w, http.StatusNotFound, "building not found")
							return
						}
						respondError(w, http.StatusInternalServerError, clearErr.Error())
						return
					}
					respondJSON(w, http.StatusOK, updated)
					return
				}
				respondError(w, http.StatusBadRequest, "image file is required")
				return
			}
			defer file.Close()
			imageURL, err := a.saveBuildingImage(id, file, header)
			if err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			updated, err := a.updateBuildingImage(id, imageURL)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			if existing.ImageURL != "" && existing.ImageURL != imageURL {
				_ = a.removeUploadedFile(existing.ImageURL)
			}
			respondJSON(w, http.StatusOK, updated)
		case http.MethodDelete:
			updated, err := a.clearBuildingImage(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, updated)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}
	if suffix != "/floors" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := a.listFloorsByBuilding(id)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleFloors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		BuildingID int64  `json:"building_id"`
		Name       string `json:"name"`
		Level      int    `json:"level"`
		PlanSVG    string `json:"plan_svg"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.PlanSVG = strings.TrimSpace(payload.PlanSVG)
	if payload.BuildingID == 0 || payload.Name == "" || payload.PlanSVG == "" {
		respondError(w, http.StatusBadRequest, "building_id, name, and plan_svg are required")
		return
	}
	result, err := a.createFloor(payload.BuildingID, payload.Name, payload.Level, payload.PlanSVG)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleFloorSubroutes(w http.ResponseWriter, r *http.Request) {
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/floors/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	switch suffix {
	case "":
		switch r.Method {
		case http.MethodGet:
			item, err := a.getFloor(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			var payload struct {
				PlanSVG string `json:"plan_svg"`
			}
			if err := decodeJSON(r, &payload); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			payload.PlanSVG = strings.TrimSpace(payload.PlanSVG)
			updated, err := a.updateFloorPlan(id, payload.PlanSVG)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, updated)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case "/spaces":
		switch r.Method {
		case http.MethodGet:
			items, err := a.listSpacesByFloor(id)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]any{"items": items})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (a *app) handleSpaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		FloorID int64  `json:"floor_id"`
		Name    string `json:"name"`
		Kind    string `json:"kind"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Kind = strings.TrimSpace(payload.Kind)
	if payload.FloorID == 0 || payload.Name == "" || payload.Kind == "" {
		respondError(w, http.StatusBadRequest, "floor_id, name, and kind are required")
		return
	}
	result, err := a.createSpace(payload.FloorID, payload.Name, payload.Kind)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleSpaceSubroutes(w http.ResponseWriter, r *http.Request) {
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/spaces/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	switch suffix {
	case "/desks":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		items, err := a.listDesksBySpace(id)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	case "/meeting-rooms":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		items, err := a.listMeetingRoomsBySpace(id)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (a *app) handleDesks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		SpaceID int64  `json:"space_id"`
		Label   string `json:"label"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Label = strings.TrimSpace(payload.Label)
	if payload.SpaceID == 0 || payload.Label == "" {
		respondError(w, http.StatusBadRequest, "space_id and label are required")
		return
	}
	result, err := a.createDesk(payload.SpaceID, payload.Label)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleMeetingRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		SpaceID  int64  `json:"space_id"`
		Name     string `json:"name"`
		Capacity int    `json:"capacity"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	if payload.SpaceID == 0 || payload.Name == "" || payload.Capacity <= 0 {
		respondError(w, http.StatusBadRequest, "space_id, name, and capacity are required")
		return
	}
	result, err := a.createMeetingRoom(payload.SpaceID, payload.Name, payload.Capacity)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) listBuildings() ([]building, error) {
	rows, err := a.db.Query(
		`SELECT id, name, address, COALESCE(image_url, ''), COALESCE(floors, '[]'), created_at
		FROM office_buildings
		ORDER BY id DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []building
	for rows.Next() {
		var b building
		var floorsJSON string
		if err := rows.Scan(&b.ID, &b.Name, &b.Address, &b.ImageURL, &floorsJSON, &b.CreatedAt); err != nil {
			return nil, err
		}
		b.Floors = decodeFloorIDs(floorsJSON)
		items = append(items, b)
	}
	return items, rows.Err()
}

var errNotFound = errors.New("not found")

func (a *app) createBuilding(name, address, imageURL string) (building, error) {
	return a.createBuildingWithFloors(name, address, imageURL, 0, 0)
}

func (a *app) createBuildingWithFloors(name, address, imageURL string, undergroundFloors, abovegroundFloors int) (building, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return building{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	result, err := tx.Exec(
		`INSERT INTO office_buildings (name, address, image_url, floors) VALUES (?, ?, ?, ?)`,
		name,
		address,
		imageURL,
		"[]",
	)
	if err != nil {
		return building{}, err
	}
	buildingID, err := result.LastInsertId()
	if err != nil {
		return building{}, err
	}

	floorIDs := make([]int64, 0, undergroundFloors+abovegroundFloors)
	for level := -undergroundFloors; level <= -1; level++ {
		floorName := fmt.Sprintf("B%d", -level)
		id, floorErr := a.createFloorInTx(tx, buildingID, floorName, level, "")
		if floorErr != nil {
			err = floorErr
			return building{}, floorErr
		}
		floorIDs = append(floorIDs, id)
	}
	for level := 1; level <= abovegroundFloors; level++ {
		floorName := strconv.Itoa(level)
		id, floorErr := a.createFloorInTx(tx, buildingID, floorName, level, "")
		if floorErr != nil {
			err = floorErr
			return building{}, floorErr
		}
		floorIDs = append(floorIDs, id)
	}

	floorsJSON, err := encodeFloorIDs(floorIDs)
	if err != nil {
		return building{}, err
	}
	if _, err = tx.Exec(`UPDATE office_buildings SET floors = ? WHERE id = ?`, floorsJSON, buildingID); err != nil {
		return building{}, err
	}
	if err = tx.Commit(); err != nil {
		return building{}, err
	}
	return building{
		ID:        buildingID,
		Name:      name,
		Address:   address,
		ImageURL:  imageURL,
		Floors:    floorIDs,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (a *app) getBuilding(id int64) (building, error) {
	row := a.db.QueryRow(
		`SELECT id, name, address, COALESCE(image_url, ''), COALESCE(floors, '[]'), created_at
		FROM office_buildings
		WHERE id = ?`,
		id,
	)
	var b building
	var floorsJSON string
	if err := row.Scan(&b.ID, &b.Name, &b.Address, &b.ImageURL, &floorsJSON, &b.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return building{}, errNotFound
		}
		return building{}, err
	}
	b.Floors = decodeFloorIDs(floorsJSON)
	return b, nil
}

func (a *app) updateBuilding(id int64, name, address string) (building, error) {
	result, err := a.db.Exec(
		`UPDATE office_buildings SET name = ?, address = ? WHERE id = ?`,
		name,
		address,
		id,
	)
	if err != nil {
		return building{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return building{}, err
	}
	if rows == 0 {
		return building{}, errNotFound
	}
	return a.getBuilding(id)
}

func (a *app) deleteBuilding(id int64) error {
	result, err := a.db.Exec(`DELETE FROM office_buildings WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return nil
}

func (a *app) clearBuildingImage(id int64) (building, error) {
	existing, err := a.getBuilding(id)
	if err != nil {
		return building{}, err
	}
	if existing.ImageURL == "" {
		return existing, nil
	}
	if err := a.removeUploadedFile(existing.ImageURL); err != nil {
		return building{}, err
	}
	return a.updateBuildingImage(id, "")
}

func (a *app) updateBuildingImage(id int64, imageURL string) (building, error) {
	result, err := a.db.Exec(
		`UPDATE office_buildings SET image_url = ? WHERE id = ?`,
		imageURL,
		id,
	)
	if err != nil {
		return building{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return building{}, err
	}
	if rows == 0 {
		return building{}, errNotFound
	}
	return a.getBuilding(id)
}

func (a *app) listFloorsByBuilding(buildingID int64) ([]floor, error) {
	rows, err := a.db.Query(
		`SELECT id, building_id, name, level, created_at FROM floors WHERE building_id = ? ORDER BY id DESC`,
		buildingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []floor
	for rows.Next() {
		var f floor
		if err := rows.Scan(&f.ID, &f.BuildingID, &f.Name, &f.Level, &f.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, f)
	}
	return items, rows.Err()
}

func (a *app) getFloor(id int64) (floor, error) {
	row := a.db.QueryRow(
		`SELECT id, building_id, name, level, plan_svg, created_at FROM floors WHERE id = ?`,
		id,
	)
	var f floor
	if err := row.Scan(&f.ID, &f.BuildingID, &f.Name, &f.Level, &f.PlanSVG, &f.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return floor{}, errNotFound
		}
		return floor{}, err
	}
	return f, nil
}

func (a *app) updateFloorPlan(id int64, planSVG string) (floor, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return floor{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	result, err := tx.Exec(`UPDATE floors SET plan_svg = ? WHERE id = ?`, planSVG, id)
	if err != nil {
		return floor{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return floor{}, err
	}
	if rows == 0 {
		return floor{}, errNotFound
	}
	if planSVG == "" {
		if _, err = tx.Exec(`DELETE FROM spaces WHERE floor_id = ?`, id); err != nil {
			return floor{}, err
		}
	}
	if err = tx.Commit(); err != nil {
		return floor{}, err
	}
	return a.getFloor(id)
}

func (a *app) createFloor(buildingID int64, name string, level int, planSVG string) (floor, error) {
	result, err := a.db.Exec(
		`INSERT INTO floors (building_id, name, level, plan_svg) VALUES (?, ?, ?, ?)`,
		buildingID,
		name,
		level,
		planSVG,
	)
	if err != nil {
		return floor{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return floor{}, err
	}
	return floor{
		ID:         id,
		BuildingID: buildingID,
		Name:       name,
		Level:      level,
		PlanSVG:    planSVG,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (a *app) createFloorInTx(tx *sql.Tx, buildingID int64, name string, level int, planSVG string) (int64, error) {
	result, err := tx.Exec(
		`INSERT INTO floors (building_id, name, level, plan_svg) VALUES (?, ?, ?, ?)`,
		buildingID,
		name,
		level,
		planSVG,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (a *app) listSpacesByFloor(floorID int64) ([]space, error) {
	rows, err := a.db.Query(
		`SELECT id, floor_id, name, kind, created_at FROM spaces WHERE floor_id = ? ORDER BY id DESC`,
		floorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []space
	for rows.Next() {
		var s space
		if err := rows.Scan(&s.ID, &s.FloorID, &s.Name, &s.Kind, &s.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

func (a *app) createSpace(floorID int64, name, kind string) (space, error) {
	result, err := a.db.Exec(
		`INSERT INTO spaces (floor_id, name, kind) VALUES (?, ?, ?)`,
		floorID,
		name,
		kind,
	)
	if err != nil {
		return space{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return space{}, err
	}
	return space{
		ID:        id,
		FloorID:   floorID,
		Name:      name,
		Kind:      kind,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (a *app) listDesksBySpace(spaceID int64) ([]desk, error) {
	rows, err := a.db.Query(
		`SELECT id, space_id, label, created_at FROM desks WHERE space_id = ? ORDER BY id DESC`,
		spaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []desk
	for rows.Next() {
		var d desk
		if err := rows.Scan(&d.ID, &d.SpaceID, &d.Label, &d.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (a *app) createDesk(spaceID int64, label string) (desk, error) {
	result, err := a.db.Exec(
		`INSERT INTO desks (space_id, label) VALUES (?, ?)`,
		spaceID,
		label,
	)
	if err != nil {
		return desk{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return desk{}, err
	}
	return desk{
		ID:        id,
		SpaceID:   spaceID,
		Label:     label,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (a *app) listMeetingRoomsBySpace(spaceID int64) ([]meetingRoom, error) {
	rows, err := a.db.Query(
		`SELECT id, space_id, name, capacity, created_at FROM meeting_rooms WHERE space_id = ? ORDER BY id DESC`,
		spaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []meetingRoom
	for rows.Next() {
		var m meetingRoom
		if err := rows.Scan(&m.ID, &m.SpaceID, &m.Name, &m.Capacity, &m.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (a *app) createMeetingRoom(spaceID int64, name string, capacity int) (meetingRoom, error) {
	result, err := a.db.Exec(
		`INSERT INTO meeting_rooms (space_id, name, capacity) VALUES (?, ?, ?)`,
		spaceID,
		name,
		capacity,
	)
	if err != nil {
		return meetingRoom{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return meetingRoom{}, err
	}
	return meetingRoom{
		ID:        id,
		SpaceID:   spaceID,
		Name:      name,
		Capacity:  capacity,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func parseIDFromPath(path, prefix string) (int64, string, error) {
	if !strings.HasPrefix(path, prefix) {
		return 0, "", errors.New("invalid path")
	}
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts[0]) == 0 {
		return 0, "", errors.New("missing id")
	}
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, "", errors.New("invalid id")
	}
	suffix := ""
	if len(parts) == 2 {
		suffix = "/" + parts[1]
	}
	return id, suffix, nil
}

func decodeJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	return nil
}

func parseOptionalInt(value string) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func encodeFloorIDs(ids []int64) (string, error) {
	payload, err := json.Marshal(ids)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func decodeFloorIDs(payload string) []int64 {
	payload = strings.TrimSpace(payload)
	if payload == "" {
		return []int64{}
	}
	var ids []int64
	if err := json.Unmarshal([]byte(payload), &ids); err != nil {
		return []int64{}
	}
	return ids
}

func (a *app) saveBuildingImage(buildingID int64, file multipart.File, header *multipart.FileHeader) (string, error) {
	defer file.Close()
	if header.Size == 0 {
		return "", errors.New("empty image file")
	}
	if header.Size > maxBuildingImageSize {
		return "", errors.New("image file is too large")
	}

	buffer := make([]byte, 512)
	n, readErr := file.Read(buffer)
	if readErr != nil && !errors.Is(readErr, io.EOF) {
		return "", readErr
	}
	contentType := http.DetectContentType(buffer[:n])
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = extensionFromContentType(contentType)
	}
	if !isAllowedImageType(ext, contentType) {
		return "", errors.New("unsupported image type")
	}

	filename := fmt.Sprintf("building-%d-%d%s", buildingID, time.Now().UnixNano(), ext)
	targetPath := filepath.Join(a.buildingUploadDir, filename)
	output, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer output.Close()

	if _, err := io.Copy(output, io.MultiReader(bytes.NewReader(buffer[:n]), file)); err != nil {
		return "", err
	}
	return "/" + filepath.ToSlash(filepath.Join(uploadDirName, buildingUploadDirName, filename)), nil
}

func (a *app) removeUploadedFile(imageURL string) error {
	prefix := "/" + uploadDirName + "/"
	if !strings.HasPrefix(imageURL, prefix) {
		return nil
	}
	relativePath := strings.TrimPrefix(imageURL, prefix)
	targetPath := filepath.Join(a.uploadDir, filepath.FromSlash(relativePath))
	if err := os.Remove(targetPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func extensionFromContentType(contentType string) string {
	extensions, err := mime.ExtensionsByType(contentType)
	if err != nil || len(extensions) == 0 {
		return ""
	}
	return strings.ToLower(extensions[0])
}

func isAllowedImageType(ext, contentType string) bool {
	if !strings.HasPrefix(contentType, "image/") {
		return false
	}
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
		return true
	default:
		return false
	}
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
