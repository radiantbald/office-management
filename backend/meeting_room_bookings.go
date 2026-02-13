package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type meetingRoomBooking struct {
	ID                int64     `json:"id"`
	MeetingRoomID     int64     `json:"meeting_room_id"`
	ApplierEmployeeID string    `json:"applier_employee_id"`
	UserName          string    `json:"user_name"`
	WbBand            string    `json:"wb_band,omitempty"`
	StartTime         string    `json:"start_time"`
	EndTime           string    `json:"end_time"`
	CreatedAt         time.Time `json:"created_at"`
}

type meetingRoomBookingPayload struct {
	MeetingRoomID int64  `json:"meeting_room_id"`
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

func (a *app) handleMeetingRoomBookingsSubroutes(w http.ResponseWriter, r *http.Request) {
	suffix := strings.TrimPrefix(r.URL.Path, "/api/meeting-room-bookings")
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
		a.handleListMyMeetingRoomBookings(w, r)
	case "/all":
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCancelAllMyMeetingRoomBookings(w, r)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

type myMeetingRoomBooking struct {
	ID              int64  `json:"id"`
	MeetingRoomID   int64  `json:"meeting_room_id"`
	MeetingRoomName string `json:"meeting_room_name"`
	BuildingID      int64  `json:"building_id"`
	BuildingName    string `json:"building_name"`
	FloorLevel      int    `json:"floor_level"`
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
}

func (a *app) handleListMyMeetingRoomBookings(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractMeetingRoomBookingEmployeeID(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id,
		        b.meeting_room_id,
		        m.name,
		        f.building_id,
		        ob.name,
		        f.level,
		        b.start_at,
		        b.end_at,
		        COALESCE(ob.timezone, '')
		   FROM meeting_room_bookings b
		   JOIN meeting_rooms m ON m.id = b.meeting_room_id
		   JOIN floors f ON f.id = m.floor_id
		   JOIN office_buildings ob ON ob.id = f.building_id
		  WHERE b.applier_employee_id = $1 AND b.end_at > now() AND b.cancelled_at IS NULL
		  ORDER BY b.start_at ASC`,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	items := make([]myMeetingRoomBooking, 0)
	for rows.Next() {
		var item myMeetingRoomBooking
		var startAt time.Time
		var endAt time.Time
		var timezone string
		if err := rows.Scan(
			&item.ID,
			&item.MeetingRoomID,
			&item.MeetingRoomName,
			&item.BuildingID,
			&item.BuildingName,
			&item.FloorLevel,
			&startAt,
			&endAt,
			&timezone,
		); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		tz := strings.TrimSpace(timezone)
		if tz == "" {
			tz = defaultBuildingTimezone
		}
		location, locErr := time.LoadLocation(tz)
		if locErr != nil {
			location = time.Local
		}
		item.StartTime = formatDateTimeInLocation(startAt, location)
		item.EndTime = formatDateTimeInLocation(endAt, location)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"bookings": items, "success": true})
}

func (a *app) handleCancelAllMyMeetingRoomBookings(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractMeetingRoomBookingEmployeeID(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	result, err := a.db.Exec(
		`UPDATE meeting_room_bookings
		    SET cancelled_at = now(), canceller_employee_id = $1
		  WHERE applier_employee_id = $1 AND end_at > now() AND cancelled_at IS NULL`,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	count, _ := result.RowsAffected()
	respondJSON(w, http.StatusOK, map[string]any{"success": true, "deletedCount": count})
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
	timezone, err := a.getSpaceTimezone(meetingRoomID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "meeting room not found")
			return
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	dayStart, dayEnd, err := getBookingDayBounds(date, timezone)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		location = time.Local
	}

	rows, err := a.db.Query(
		`SELECT b.id,
		        b.meeting_room_id,
		        b.applier_employee_id,
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(u.wb_band, ''),
		        b.start_at,
		        b.end_at,
		        b.created_at
		   FROM meeting_room_bookings b
		   LEFT JOIN users u ON u.employee_id = b.applier_employee_id
		  WHERE b.meeting_room_id = $1
		    AND NOT (b.end_at <= $2::timestamptz OR b.start_at >= $3::timestamptz)
		    AND b.cancelled_at IS NULL
		  ORDER BY b.start_at ASC`,
		meetingRoomID,
		dayStart,
		dayEnd,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	items := make([]meetingRoomBooking, 0)
	for rows.Next() {
		var item meetingRoomBooking
		var startAt time.Time
		var endAt time.Time
		if err := rows.Scan(
			&item.ID,
			&item.MeetingRoomID,
			&item.ApplierEmployeeID,
			&item.UserName,
			&item.WbBand,
			&startAt,
			&endAt,
			&item.CreatedAt,
		); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		item.StartTime = formatDateTimeInLocation(startAt, location)
		item.EndTime = formatDateTimeInLocation(endAt, location)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	timezone, err := a.getSpaceTimezone(payload.MeetingRoomID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "meeting room not found")
			return
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	startAt, err := parseLocalBookingDateTime(payload.StartTime, timezone)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	endAt, err := parseLocalBookingDateTime(payload.EndTime, timezone)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !endAt.After(startAt) {
		respondError(w, http.StatusBadRequest, "end_time must be later than start_time")
		return
	}
	if err := ensureMeetingRoomTimeNotPast(endAt, timezone); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx := r.Context()
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback()

	var existing int
	err = tx.QueryRowContext(ctx,
		`SELECT 1
		   FROM meeting_room_bookings
		  WHERE meeting_room_id = $1 AND applier_employee_id <> $2
		    AND NOT (end_at <= $3 OR start_at >= $4)
		    AND cancelled_at IS NULL
		  LIMIT 1`,
		payload.MeetingRoomID,
		employeeID,
		startAt,
		endAt,
	).Scan(&existing)
	if err == nil {
		respondError(w, http.StatusBadRequest, "Переговорка занята на выбранное время")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	replacedCount := int64(0)
	result, err := tx.ExecContext(ctx,
		`UPDATE meeting_room_bookings
		    SET cancelled_at = now(), canceller_employee_id = $1
		  WHERE applier_employee_id = $1 AND meeting_room_id <> $4
		    AND NOT (end_at <= $2 OR start_at >= $3)
		    AND cancelled_at IS NULL`,
		employeeID,
		startAt,
		endAt,
		payload.MeetingRoomID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if result != nil {
		replacedCount, _ = result.RowsAffected()
	}
	var existingOwn int
	err = tx.QueryRowContext(ctx,
		`SELECT 1
		 FROM meeting_room_bookings
		WHERE meeting_room_id = $1 AND applier_employee_id = $2
		  AND start_at = $3 AND end_at = $4
		  AND cancelled_at IS NULL
		LIMIT 1`,
		payload.MeetingRoomID,
		employeeID,
		startAt,
		endAt,
	).Scan(&existingOwn)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO meeting_room_bookings (meeting_room_id, applier_employee_id, start_at, end_at)
			 VALUES ($1, $2, $3, $4)`,
			payload.MeetingRoomID,
			employeeID,
			startAt,
			endAt,
		); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	timezone, err := a.getSpaceTimezone(payload.MeetingRoomID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "meeting room not found")
			return
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	startAt, err := parseLocalBookingDateTime(payload.StartTime, timezone)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	endAt, err := parseLocalBookingDateTime(payload.EndTime, timezone)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := a.db.Exec(
		`UPDATE meeting_room_bookings
		    SET cancelled_at = now(), canceller_employee_id = $5
		  WHERE meeting_room_id = $1 AND applier_employee_id = $2 AND start_at = $3 AND end_at = $4
		    AND cancelled_at IS NULL`,
		payload.MeetingRoomID,
		employeeID,
		startAt,
		endAt,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
		timezone = defaultBuildingTimezone
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		timezone = defaultBuildingTimezone
	}
	return timezone, nil
}

func ensureMeetingRoomTimeNotPast(endAt time.Time, timezone string) error {
	location, err := time.LoadLocation(timezone)
	if err != nil {
		location = time.Local
	}
	now := time.Now().In(location)
	if !endAt.After(now) {
		return errors.New("Нельзя бронировать на прошедшее время")
	}
	return nil
}

func getBookingDayBounds(date, timezone string) (time.Time, time.Time, error) {
	location, err := time.LoadLocation(timezone)
	if err != nil {
		location = time.Local
	}
	parsed, err := time.ParseInLocation("2006-01-02", date, location)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid date format, expected YYYY-MM-DD")
	}
	dayStart := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, location)
	dayEnd := dayStart.AddDate(0, 0, 1)
	return dayStart, dayEnd, nil
}

func parseLocalBookingDateTime(raw, timezone string) (time.Time, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, errors.New("time is required")
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		location = time.Local
	}
	parsed, err := time.ParseInLocation("2006-01-02 15:04", value, location)
	if err != nil {
		return time.Time{}, errors.New("invalid time format, expected YYYY-MM-DD HH:MM")
	}
	return parsed, nil
}

func formatDateTimeInLocation(value time.Time, location *time.Location) string {
	if location != nil {
		return value.In(location).Format("2006-01-02 15:04")
	}
	return value.Format("2006-01-02 15:04")
}

type rowQueryer interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func extractMeetingRoomBookingEmployeeID(r *http.Request, queryer rowQueryer) (string, error) {
	if r == nil {
		return "", nil
	}
	return extractEmployeeIDFromRequest(r, queryer)
}

func getEmployeeIDByWbUserID(ctx context.Context, queryer rowQueryer, wbUserID string) (string, error) {
	if queryer == nil || strings.TrimSpace(wbUserID) == "" {
		return "", nil
	}
	row := queryer.QueryRowContext(ctx,
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
