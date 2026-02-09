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
	ID            int64  `json:"id"`
	MeetingRoomID int64  `json:"meeting_room_id"`
	EmployeeID    string `json:"employee_id"`
	UserName      string `json:"user_name"`
	WbBand        string `json:"wb_band,omitempty"`
	Date          string `json:"date"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	CreatedAt     string `json:"created_at"`
}

type meetingRoomBookingPayload struct {
	MeetingRoomID int64  `json:"meeting_room_id"`
	Date          string `json:"date"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
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
	meetingRoomIDRaw := strings.TrimSpace(r.URL.Query().Get("meeting_room_id"))
	dateRaw := strings.TrimSpace(r.URL.Query().Get("date"))
	if meetingRoomIDRaw == "" || dateRaw == "" {
		respondError(w, http.StatusBadRequest, "meeting_room_id and date are required")
		return
	}
	meetingRoomID, err := strconv.ParseInt(meetingRoomIDRaw, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "meeting_room_id must be a number")
		return
	}
	date, err := normalizeBookingDate(dateRaw)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id,
		        b.meeting_room_id,
		        b.employee_id,
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(u.wb_band, ''),
		        b.date,
		        b.start_min,
		        b.end_min,
		        b.created_at
		   FROM meeting_room_bookings b
		   LEFT JOIN users u ON u.employee_id = b.employee_id
		  WHERE b.meeting_room_id = $1 AND b.date = $2
		  ORDER BY b.start_min ASC`,
		meetingRoomID,
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
			&item.MeetingRoomID,
			&item.EmployeeID,
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
	employeeID, err := extractMeetingRoomBookingEmployeeID(r, a.db)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	var payload meetingRoomBookingPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.MeetingRoomID == 0 {
		respondError(w, http.StatusBadRequest, "meeting_room_id is required")
		return
	}
	if err := a.ensureMeetingSpace(payload.MeetingRoomID); err != nil {
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

	timezone, err := a.getSpaceTimezone(payload.MeetingRoomID)
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

	var existing int
	err = tx.QueryRow(
		`SELECT 1
		   FROM meeting_room_bookings
		  WHERE meeting_room_id = $1 AND date = $2 AND employee_id <> $5
		    AND NOT (end_min <= $3 OR start_min >= $4)
		  LIMIT 1`,
		payload.MeetingRoomID,
		date,
		startMin,
		endMin,
		employeeID,
	).Scan(&existing)
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
		  WHERE employee_id = $1 AND date = $2 AND meeting_room_id <> $5
		    AND NOT (end_min <= $3 OR start_min >= $4)`,
		employeeID,
		date,
		startMin,
		endMin,
		payload.MeetingRoomID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if result != nil {
		replacedCount, _ = result.RowsAffected()
	}
	var existingOwn int
	err = tx.QueryRow(
		`SELECT 1
		   FROM meeting_room_bookings
		  WHERE meeting_room_id = $1 AND employee_id = $2 AND date = $3
		    AND start_min = $4 AND end_min = $5
		  LIMIT 1`,
		payload.MeetingRoomID,
		employeeID,
		date,
		startMin,
		endMin,
	).Scan(&existingOwn)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		if _, err := tx.Exec(
			`INSERT INTO meeting_room_bookings (meeting_room_id, employee_id, date, start_min, end_min)
			 VALUES ($1, $2, $3, $4, $5)`,
			payload.MeetingRoomID,
			employeeID,
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
	employeeID, err := extractMeetingRoomBookingEmployeeID(r, a.db)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	var payload meetingRoomBookingPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.MeetingRoomID == 0 {
		respondError(w, http.StatusBadRequest, "meeting_room_id is required")
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
		  WHERE meeting_room_id = $1 AND employee_id = $2 AND date = $3 AND start_min = $4 AND end_min = $5`,
		payload.MeetingRoomID,
		employeeID,
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
	row := a.db.QueryRow(`SELECT id FROM meeting_rooms WHERE id = $1`, spaceID)
	var id int64
	if err := row.Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		return err
	}
	return nil
}

func (a *app) getSpaceTimezone(spaceID int64) (string, error) {
	row := a.db.QueryRow(
		`SELECT COALESCE(ob.timezone, '')
		   FROM meeting_rooms s
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

type rowQueryer interface {
	QueryRow(query string, args ...any) *sql.Row
}

func extractMeetingRoomBookingEmployeeID(r *http.Request, queryer rowQueryer) (string, error) {
	if r == nil {
		return "", nil
	}
	employeeID := strings.TrimSpace(r.Header.Get("X-Employee-Id"))
	if employeeID != "" {
		return employeeID, nil
	}
	wbUserID, _ := extractBookingUser(r)
	if wbUserID == "" {
		return "", nil
	}
	return getEmployeeIDByWbUserID(queryer, wbUserID)
}

func getEmployeeIDByWbUserID(queryer rowQueryer, wbUserID string) (string, error) {
	if queryer == nil || strings.TrimSpace(wbUserID) == "" {
		return "", nil
	}
	row := queryer.QueryRow(
		`SELECT COALESCE(NULLIF(employee_id, ''), '')
		   FROM users
		  WHERE wb_user_id = $1 OR wb_team_profile_id = $1 OR employee_id = $1
		  ORDER BY (wb_user_id = $1) DESC, (employee_id = $1) DESC
		  LIMIT 1`,
		wbUserID,
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
