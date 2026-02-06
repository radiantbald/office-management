package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type meetingRoomBooking struct {
	ID        int64  `json:"id"`
	SpaceID   int64  `json:"space_id"`
	UserKey   string `json:"user_key"`
	UserName  string `json:"user_name"`
	WbBand    string `json:"wb_band,omitempty"`
	Date      string `json:"date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	CreatedAt string `json:"created_at"`
}

type meetingRoomBookingPayload struct {
	SpaceID   int64  `json:"space_id"`
	Date      string `json:"date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

func (a *app) handleMeetingRoomBookings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListMeetingRoomBookings(w, r)
	case http.MethodPost:
		a.handleCreateMeetingRoomBooking(w, r)
	case http.MethodDelete:
		a.handleCancelMeetingRoomBooking(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleListMeetingRoomBookings(w http.ResponseWriter, r *http.Request) {
	spaceIDRaw := strings.TrimSpace(r.URL.Query().Get("space_id"))
	dateRaw := strings.TrimSpace(r.URL.Query().Get("date"))
	if spaceIDRaw == "" || dateRaw == "" {
		respondError(w, http.StatusBadRequest, "space_id and date are required")
		return
	}
	spaceID, err := strconv.ParseInt(spaceIDRaw, 10, 64)
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
		`SELECT b.id,
		        b.space_id,
		        b.user_key,
		        COALESCE(NULLIF(u.full_name, ''), NULLIF(u.user_name, ''), b.user_name),
		        COALESCE(u.wb_band, ''),
		        b.date,
		        b.start_min,
		        b.end_min,
		        b.created_at
		   FROM meeting_room_bookings b
		   LEFT JOIN LATERAL (
		     SELECT user_name, full_name, wb_band
		       FROM users
		      WHERE user_key = b.user_key OR profile_id = b.user_key
		      ORDER BY (user_key = b.user_key) DESC
		      LIMIT 1
		   ) u ON true
		  WHERE b.space_id = $1 AND b.date = $2
		  ORDER BY b.start_min ASC`,
		spaceID,
		date,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	items := make([]meetingRoomBooking, 0)
	for rows.Next() {
		var item meetingRoomBooking
		var startMin int
		var endMin int
		if err := rows.Scan(
			&item.ID,
			&item.SpaceID,
			&item.UserKey,
			&item.UserName,
			&item.WbBand,
			&item.Date,
			&startMin,
			&endMin,
			&item.CreatedAt,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		item.StartTime = formatMinutesToTime(startMin)
		item.EndTime = formatMinutesToTime(endMin)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleCreateMeetingRoomBooking(w http.ResponseWriter, r *http.Request) {
	userKey, userName := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	var payload meetingRoomBookingPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.SpaceID == 0 {
		respondError(w, http.StatusBadRequest, "space_id is required")
		return
	}
	if err := a.ensureMeetingSpace(payload.SpaceID); err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "meeting room not found")
			return
		}
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

	startMin, err := parseTimeToMinutes(payload.StartTime)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	endMin, err := parseTimeToMinutes(payload.EndTime)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if endMin <= startMin {
		respondError(w, http.StatusBadRequest, "end_time must be later than start_time")
		return
	}

	timezone, err := a.getSpaceTimezone(payload.SpaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "meeting room not found")
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := ensureMeetingRoomTimeNotPast(date, endMin, timezone); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	employeeID, err := getEmployeeIDByUserKey(tx, userKey)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var existing int
	if employeeID == "" {
		err = tx.QueryRow(
			`SELECT 1
			   FROM meeting_room_bookings
			  WHERE space_id = $1 AND date = $2 AND user_key <> $5
			    AND NOT (end_min <= $3 OR start_min >= $4)
			  LIMIT 1`,
			payload.SpaceID,
			date,
			startMin,
			endMin,
			userKey,
		).Scan(&existing)
	} else {
		err = tx.QueryRow(
			`SELECT 1
			   FROM meeting_room_bookings b
			   LEFT JOIN users u
			     ON u.user_key = b.user_key OR u.profile_id = b.user_key
			  WHERE b.space_id = $1 AND b.date = $2
			    AND NOT (b.end_min <= $3 OR b.start_min >= $4)
			    AND NOT (
			      (COALESCE(NULLIF(u.employee_id, ''), '') = $5)
			      OR ((u.employee_id IS NULL OR u.employee_id = '') AND b.user_key = $6)
			    )
			  LIMIT 1`,
			payload.SpaceID,
			date,
			startMin,
			endMin,
			employeeID,
			userKey,
		).Scan(&existing)
	}
	if err == nil {
		respondError(w, http.StatusBadRequest, "Переговорка занята на выбранное время")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	replacedCount := int64(0)
	result, err := tx.Exec(
		`DELETE FROM meeting_room_bookings
		  WHERE user_key = $1 AND date = $2 AND space_id <> $5
		    AND NOT (end_min <= $3 OR start_min >= $4)`,
		userKey,
		date,
		startMin,
		endMin,
		payload.SpaceID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if result != nil {
		replacedCount, _ = result.RowsAffected()
	}
	if employeeID != "" {
		result, err = tx.Exec(
			`DELETE FROM meeting_room_bookings b
			  USING users u
			  WHERE u.employee_id = $6 AND u.employee_id <> ''
			    AND (u.user_key = b.user_key OR u.profile_id = b.user_key)
			    AND b.user_key <> $1
			    AND b.date = $2 AND b.space_id <> $5
			    AND NOT (b.end_min <= $3 OR b.start_min >= $4)`,
			userKey,
			date,
			startMin,
			endMin,
			payload.SpaceID,
			employeeID,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if result != nil {
			affected, _ := result.RowsAffected()
			replacedCount += affected
		}
	}

	var existingOwn int
	if employeeID == "" {
		err = tx.QueryRow(
			`SELECT 1
			   FROM meeting_room_bookings
			  WHERE space_id = $1 AND user_key = $2 AND date = $3
			    AND start_min = $4 AND end_min = $5
			  LIMIT 1`,
			payload.SpaceID,
			userKey,
			date,
			startMin,
			endMin,
		).Scan(&existingOwn)
	} else {
		err = tx.QueryRow(
			`SELECT 1
			   FROM meeting_room_bookings b
			   LEFT JOIN users u
			     ON u.user_key = b.user_key OR u.profile_id = b.user_key
			  WHERE b.space_id = $1 AND b.date = $2
			    AND b.start_min = $3 AND b.end_min = $4
			    AND (
			      COALESCE(NULLIF(u.employee_id, ''), '') = $5
			      OR ((u.employee_id IS NULL OR u.employee_id = '') AND b.user_key = $6)
			    )
			  LIMIT 1`,
			payload.SpaceID,
			date,
			startMin,
			endMin,
			employeeID,
			userKey,
		).Scan(&existingOwn)
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		if _, err := tx.Exec(
			`INSERT INTO meeting_room_bookings (space_id, user_key, user_name, date, start_min, end_min)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			payload.SpaceID,
			userKey,
			userName,
			date,
			startMin,
			endMin,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"success":       true,
		"replacedCount": replacedCount,
	})
}

func (a *app) handleCancelMeetingRoomBooking(w http.ResponseWriter, r *http.Request) {
	userKey, _ := extractBookingUser(r)
	if userKey == "" {
		respondError(w, http.StatusBadRequest, "user key is required")
		return
	}

	var payload meetingRoomBookingPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.SpaceID == 0 {
		respondError(w, http.StatusBadRequest, "space_id is required")
		return
	}

	date, err := normalizeBookingDate(payload.Date)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	startMin, err := parseTimeToMinutes(payload.StartTime)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	endMin, err := parseTimeToMinutes(payload.EndTime)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := a.db.Exec(
		`DELETE FROM meeting_room_bookings
		  WHERE space_id = $1 AND user_key = $2 AND date = $3 AND start_min = $4 AND end_min = $5`,
		payload.SpaceID,
		userKey,
		date,
		startMin,
		endMin,
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

func (a *app) ensureMeetingSpace(spaceID int64) error {
	row := a.db.QueryRow(`SELECT kind FROM spaces WHERE id = $1`, spaceID)
	var kind string
	if err := row.Scan(&kind); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		return err
	}
	if strings.TrimSpace(kind) != "meeting" {
		return errors.New("space is not a meeting room")
	}
	return nil
}

func (a *app) getSpaceTimezone(spaceID int64) (string, error) {
	row := a.db.QueryRow(
		`SELECT COALESCE(ob.timezone, '')
		   FROM spaces s
		   JOIN floors f ON f.id = s.floor_id
		   JOIN office_buildings ob ON ob.id = f.building_id
		  WHERE s.id = $1`,
		spaceID,
	)
	var timezone string
	if err := row.Scan(&timezone); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNotFound
		}
		return "", err
	}
	timezone = strings.TrimSpace(timezone)
	if timezone == "" {
		timezone = "Europe/Moscow"
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		timezone = "Europe/Moscow"
	}
	return timezone, nil
}

func ensureMeetingRoomTimeNotPast(date string, endMin int, timezone string) error {
	location, err := time.LoadLocation(timezone)
	if err != nil {
		location = time.Local
	}
	now := time.Now().In(location)
	if now.Format("2006-01-02") != date {
		return nil
	}
	nowMinutes := now.Hour()*60 + now.Minute()
	if nowMinutes >= endMin {
		return errors.New("Нельзя бронировать на прошедшее время")
	}
	return nil
}

func parseTimeToMinutes(raw string) (int, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0, errors.New("time is required")
	}
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return 0, errors.New("invalid time format, expected HH:MM")
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func formatMinutesToTime(minutes int) string {
	if minutes < 0 {
		minutes = 0
	}
	hours := minutes / 60
	minutes = minutes % 60
	if hours > 23 {
		hours = 23
		minutes = 59
	}
	return time.Date(0, 1, 1, hours, minutes, 0, 0, time.UTC).Format("15:04")
}

func getEmployeeIDByUserKey(tx *sql.Tx, userKey string) (string, error) {
	if tx == nil || strings.TrimSpace(userKey) == "" {
		return "", nil
	}
	row := tx.QueryRow(
		`SELECT COALESCE(NULLIF(employee_id, ''), '')
		   FROM users
		  WHERE user_key = $1 OR profile_id = $1
		  ORDER BY (user_key = $1) DESC
		  LIMIT 1`,
		userKey,
	)
	var employeeID string
	if err := row.Scan(&employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(employeeID), nil
}
