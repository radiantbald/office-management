package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

type booking struct {
	ID         int64  `json:"id"`
	DeskID     int64  `json:"desk_id"`
	BuildingID int64  `json:"building_id,omitempty"`
	FloorLevel int    `json:"floor_level,omitempty"`
	UserKey    string `json:"user_key"`
	UserName   string `json:"user_name"`
	Date       string `json:"date"`
	CreatedAt  string `json:"created_at"`
	DeskLabel  string `json:"desk_label,omitempty"`
	SpaceID    int64  `json:"space_id,omitempty"`
	SpaceName  string `json:"space_name,omitempty"`
}

type bookingCreatePayload struct {
	Date   string `json:"date"`
	DeskID int64  `json:"desk_id"`
}

type bookingMultiPayload struct {
	Dates  []string `json:"dates"`
	DeskID int64    `json:"desk_id"`
}

func (a *app) handleBookings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListBookingsBySpaceDate(w, r)
	case http.MethodPost:
		a.handleCreateBooking(w, r)
	case http.MethodDelete:
		a.handleCancelBooking(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleBookingsSubroutes(w http.ResponseWriter, r *http.Request) {
	suffix := strings.TrimPrefix(r.URL.Path, "/api/bookings")
	if !strings.HasPrefix(suffix, "/") {
		respondError(w, http.StatusBadRequest, "invalid path")
		return
	}

	switch suffix {
	case "/me":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleListMyBookings(w, r)
	case "/all":
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCancelAllBookings(w, r)
	case "/multiple":
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCreateMultipleBookings(w, r)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (a *app) handleListBookingsBySpaceDate(w http.ResponseWriter, r *http.Request) {
	spaceID := strings.TrimSpace(r.URL.Query().Get("space_id"))
	dateRaw := strings.TrimSpace(r.URL.Query().Get("date"))
	if spaceID == "" || dateRaw == "" {
		respondError(w, http.StatusBadRequest, "space_id and date are required")
		return
	}
	spaceIDValue, err := strconv.ParseInt(spaceID, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "space_id must be a number")
		return
	}

	date, err := normalizeBookingDate(dateRaw)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id, b.desk_id, b.user_key, b.user_name, b.date, b.created_at,
		        d.label, d.space_id
		   FROM bookings b
		   JOIN desks d ON d.id = b.desk_id
		  WHERE d.space_id = $1 AND b.date = $2
		  ORDER BY b.created_at DESC`,
		spaceIDValue,
		date,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	items := make([]booking, 0)
	for rows.Next() {
		var item booking
		if err := rows.Scan(
			&item.ID,
			&item.DeskID,
			&item.UserKey,
			&item.UserName,
			&item.Date,
			&item.CreatedAt,
			&item.DeskLabel,
			&item.SpaceID,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleCreateBooking(w http.ResponseWriter, r *http.Request) {
	userKey, userName := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	var payload bookingCreatePayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	date, err := normalizeBookingDate(payload.Date)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := ensureNotPast(date); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.DeskID == 0 {
		respondError(w, http.StatusBadRequest, "desk_id is required")
		return
	}

	if err := a.ensureDeskExists(payload.DeskID); err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	buildingID, err := getDeskBuildingID(tx, payload.DeskID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if _, err = tx.Exec(
		`DELETE FROM bookings WHERE user_key = $1 AND date = $2 AND building_id = $3`,
		userKey,
		date,
		buildingID,
	); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var existing int
	err = tx.QueryRow(`SELECT 1 FROM bookings WHERE desk_id = $1 AND date = $2 LIMIT 1`, payload.DeskID, date).
		Scan(&existing)
	if err == nil {
		respondError(w, http.StatusBadRequest, "Стол уже занят")
		return
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO bookings (desk_id, building_id, user_key, user_name, date)
		 VALUES ($1, $2, $3, $4, $5)`,
		payload.DeskID,
		buildingID,
		userKey,
		userName,
		date,
	); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{"success": true})
}

func (a *app) handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	userKey, _ := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	var payload bookingCreatePayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	date, err := normalizeBookingDate(payload.Date)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.DeskID == 0 {
		respondError(w, http.StatusBadRequest, "desk_id is required")
		return
	}

	result, err := a.db.Exec(
		`DELETE FROM bookings WHERE user_key = $1 AND desk_id = $2 AND date = $3`,
		userKey,
		payload.DeskID,
		date,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		respondError(w, http.StatusNotFound, "booking not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (a *app) handleListMyBookings(w http.ResponseWriter, r *http.Request) {
	userKey, _ := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id, b.date, b.created_at, b.desk_id, b.user_key, b.user_name,
		        d.label, d.space_id, s.name, f.building_id, f.level
		   FROM bookings b
		   JOIN desks d ON d.id = b.desk_id
		   JOIN spaces s ON s.id = d.space_id
		   JOIN floors f ON f.id = s.floor_id
		  WHERE b.user_key = $1 AND b.date >= CURRENT_DATE::text
		  ORDER BY b.date DESC, b.created_at DESC`,
		userKey,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	items := make([]booking, 0)
	for rows.Next() {
		var item booking
		if err := rows.Scan(
			&item.ID,
			&item.Date,
			&item.CreatedAt,
			&item.DeskID,
			&item.UserKey,
			&item.UserName,
			&item.DeskLabel,
			&item.SpaceID,
			&item.SpaceName,
			&item.BuildingID,
			&item.FloorLevel,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"bookings": items, "success": true})
}

func (a *app) handleCancelAllBookings(w http.ResponseWriter, r *http.Request) {
	userKey, _ := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	result, err := a.db.Exec(`DELETE FROM bookings WHERE user_key = $1`, userKey)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	count, _ := result.RowsAffected()
	respondJSON(w, http.StatusOK, map[string]any{"success": true, "deletedCount": count})
}

func (a *app) handleCreateMultipleBookings(w http.ResponseWriter, r *http.Request) {
	userKey, userName := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	var payload bookingMultiPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.Dates == nil || len(payload.Dates) == 0 {
		respondError(w, http.StatusBadRequest, "dates are required")
		return
	}

	if payload.DeskID == 0 {
		respondError(w, http.StatusBadRequest, "desk_id is required")
		return
	}

	if err := a.ensureDeskExists(payload.DeskID); err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	validDates, err := normalizeBookingDates(payload.Dates)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	buildingID, err := getDeskBuildingID(tx, payload.DeskID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	bookedByOthers, err := findBookedDates(tx, payload.DeskID, userKey, validDates)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	available := make([]string, 0, len(validDates))
	for _, date := range validDates {
		if !bookedByOthers[date] {
			available = append(available, date)
		}
	}

	if len(available) > 0 {
		if err := deleteUserBookingsForDates(tx, userKey, buildingID, available); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	created := make([]string, 0, len(available))
	failed := make([]string, 0, len(validDates))
	for _, date := range available {
		if _, err := tx.Exec(
			`INSERT INTO bookings (desk_id, building_id, user_key, user_name, date)
			 VALUES ($1, $2, $3, $4, $5)`,
			payload.DeskID,
			buildingID,
			userKey,
			userName,
			date,
		); err != nil {
			failed = append(failed, date)
		} else {
			created = append(created, date)
		}
	}

	for date := range bookedByOthers {
		failed = append(failed, date)
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	sort.Strings(created)
	sort.Strings(failed)

	respondJSON(w, http.StatusOK, map[string]any{
		"success":      true,
		"createdDates": created,
		"failedDates":  failed,
	})
}

func (a *app) ensureDeskExists(deskID int64) error {
	row := a.db.QueryRow(`SELECT id FROM desks WHERE id = $1`, deskID)
	var id int64
	if err := row.Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		return err
	}
	return nil
}

func getDeskBuildingID(tx *sql.Tx, deskID int64) (int64, error) {
	row := tx.QueryRow(
		`SELECT f.building_id
		   FROM desks d
		   JOIN spaces s ON s.id = d.space_id
		   JOIN floors f ON f.id = s.floor_id
		  WHERE d.id = $1`,
		deskID,
	)
	var buildingID int64
	if err := row.Scan(&buildingID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, errNotFound
		}
		return 0, err
	}
	return buildingID, nil
}

func extractBookingUser(r *http.Request) (string, string) {
	userKey := strings.TrimSpace(r.Header.Get("X-User-Key"))
	if userKey == "" {
		userKey = strings.TrimSpace(r.Header.Get("X-User-Email"))
	}
	userName := strings.TrimSpace(r.Header.Get("X-User-Name"))
	return userKey, userName
}

func normalizeBookingDate(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", errors.New("date is required")
	}
	normalized := strings.Split(strings.Split(trimmed, "T")[0], " ")[0]
	normalized = strings.TrimSpace(normalized)
	if len(normalized) != 10 {
		return "", errors.New("invalid date format, expected YYYY-MM-DD")
	}
	if _, err := time.Parse("2006-01-02", normalized); err != nil {
		return "", errors.New("invalid date format, expected YYYY-MM-DD")
	}
	return normalized, nil
}

func ensureNotPast(date string) error {
	parsed, err := time.Parse("2006-01-02", date)
	if err != nil {
		return errors.New("invalid date format, expected YYYY-MM-DD")
	}
	today := time.Now()
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	parsed = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, parsed.Location())
	if parsed.Before(today) {
		return errors.New("Нельзя бронировать стол на прошедшую дату")
	}
	return nil
}

func normalizeBookingDates(dates []string) ([]string, error) {
	set := make(map[string]struct{})
	normalized := make([]string, 0, len(dates))
	for _, raw := range dates {
		date, err := normalizeBookingDate(raw)
		if err != nil {
			continue
		}
		if err := ensureNotPast(date); err != nil {
			continue
		}
		if _, exists := set[date]; exists {
			continue
		}
		set[date] = struct{}{}
		normalized = append(normalized, date)
	}
	if len(normalized) == 0 {
		return nil, errors.New("Нет валидных дат для бронирования")
	}
	sort.Strings(normalized)
	return normalized, nil
}

func findBookedDates(tx *sql.Tx, deskID int64, userKey string, dates []string) (map[string]bool, error) {
	if len(dates) == 0 {
		return map[string]bool{}, nil
	}
	placeholders := make([]string, 0, len(dates))
	args := make([]any, 0, len(dates)+1)
	args = append(args, deskID)
	for i, date := range dates {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+2))
		args = append(args, date)
	}
	query := fmt.Sprintf(
		`SELECT date, user_key FROM bookings WHERE desk_id = $1 AND date IN (%s)`,
		strings.Join(placeholders, ","),
	)
	rows, err := tx.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bookedByOthers := make(map[string]bool)
	for rows.Next() {
		var date string
		var bookingUser string
		if err := rows.Scan(&date, &bookingUser); err != nil {
			return nil, err
		}
		if bookingUser != userKey {
			bookedByOthers[date] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return bookedByOthers, nil
}

func deleteUserBookingsForDates(tx *sql.Tx, userKey string, buildingID int64, dates []string) error {
	if len(dates) == 0 {
		return nil
	}
	placeholders := make([]string, 0, len(dates))
	args := make([]any, 0, len(dates)+2)
	args = append(args, userKey)
	args = append(args, buildingID)
	for i, date := range dates {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+3))
		args = append(args, date)
	}
	query := fmt.Sprintf(
		`DELETE FROM bookings WHERE user_key = $1 AND building_id = $2 AND date IN (%s)`,
		strings.Join(placeholders, ","),
	)
	_, err := tx.Exec(query, args...)
	return err
}

func migrateBookingsTable(db *sql.DB) error {
	var hasBuildingID bool
	if err := db.QueryRow(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'bookings'
			  AND column_name = 'building_id'
		)`,
	).Scan(&hasBuildingID); err != nil {
		return err
	}
	if hasBuildingID {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`CREATE TABLE IF NOT EXISTS bookings_new (
			id BIGSERIAL PRIMARY KEY,
			desk_id BIGINT NOT NULL,
			building_id BIGINT NOT NULL,
			user_key TEXT NOT NULL,
			user_name TEXT NOT NULL DEFAULT '',
			date TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (now()::text),
			FOREIGN KEY(desk_id) REFERENCES desks(id) ON DELETE CASCADE,
			UNIQUE(desk_id, date),
			UNIQUE(user_key, date, building_id)
		);`,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT INTO bookings_new (id, desk_id, building_id, user_key, user_name, date, created_at)
		 SELECT b.id, b.desk_id, f.building_id, b.user_key, b.user_name, b.date, b.created_at
		   FROM bookings b
		   JOIN desks d ON d.id = b.desk_id
		   JOIN spaces s ON s.id = d.space_id
		   JOIN floors f ON f.id = s.floor_id`,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(`DROP TABLE bookings`); err != nil {
		return err
	}
	if _, err := tx.Exec(`ALTER TABLE bookings_new RENAME TO bookings`); err != nil {
		return err
	}
	if _, err := tx.Exec(
		`SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE((SELECT MAX(id) FROM bookings), 0))`,
	); err != nil {
		return err
	}

	return tx.Commit()
}
