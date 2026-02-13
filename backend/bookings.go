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
	ID                int64     `json:"id"`
	WorkplaceID       int64     `json:"workplace_id"`
	BuildingID        int64     `json:"building_id,omitempty"`
	BuildingName      string    `json:"building_name,omitempty"`
	FloorLevel        int       `json:"floor_level,omitempty"`
	WbUserID          string    `json:"wb_user_id"`
	UserName          string    `json:"user_name"`
	ApplierEmployeeID string    `json:"applier_employee_id,omitempty"`
	TenantEmployeeID  string    `json:"tenant_employee_id,omitempty"`
	TenantUserName    string    `json:"tenant_user_name,omitempty"`
	AvatarURL         string    `json:"avatar_url,omitempty"`
	WbBand            string    `json:"wb_band,omitempty"`
	Date              string    `json:"date"`
	CreatedAt         time.Time `json:"created_at"`
	DeskLabel         string    `json:"desk_label,omitempty"`
	SpaceID           int64     `json:"space_id,omitempty"`
	SpaceName         string    `json:"space_name,omitempty"`
	SubdivisionL1     string    `json:"subdivision_level_1,omitempty"`
	SubdivisionL2     string    `json:"subdivision_level_2,omitempty"`
}

type bookingCreatePayload struct {
	Date             string `json:"date"`
	WorkplaceID      int64  `json:"workplace_id"`
	TargetEmployeeID string `json:"target_employee_id,omitempty"`
}

type bookingMultiPayload struct {
	Dates            []string `json:"dates"`
	WorkplaceID      int64    `json:"workplace_id"`
	TargetEmployeeID string   `json:"target_employee_id,omitempty"`
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
	case "/space-bookings":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleListSpaceBookings(w, r)
	case "/space-bookings-all":
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCancelAllSpaceBookings(w, r)
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
		`SELECT b.id, b.workplace_id,
		        COALESCE(NULLIF(u.wb_user_id, ''), b.applier_employee_id),
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(b.applier_employee_id, ''),
		        COALESCE(b.tenant_employee_id, ''),
		        COALESCE(u.avatar_url, ''),
		        COALESCE(u.wb_band, ''),
		        b.date, b.created_at, d.label, d.coworking_id
		  FROM workplace_bookings b
		  JOIN workplaces d ON d.id = b.workplace_id
		   LEFT JOIN users u ON u.employee_id = b.applier_employee_id
		  WHERE d.coworking_id = $1 AND b.date = $2
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
			&item.WorkplaceID,
			&item.WbUserID,
			&item.UserName,
			&item.ApplierEmployeeID,
			&item.TenantEmployeeID,
			&item.AvatarURL,
			&item.WbBand,
			&item.Date,
			&item.CreatedAt,
			&item.DeskLabel,
			&item.SpaceID,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if strings.TrimSpace(item.ApplierEmployeeID) == "0" {
			item.UserName = "Гость"
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

	if payload.WorkplaceID == 0 {
		respondError(w, http.StatusBadRequest, "workplace_id is required")
		return
	}

	if err := a.ensureWorkplaceExists(payload.WorkplaceID); err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "workplace not found")
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

	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, tx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if requesterEmployeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	targetEmployeeID := strings.TrimSpace(payload.TargetEmployeeID)
	bookingForOther := targetEmployeeID != "" && targetEmployeeID != requesterEmployeeID
	isGuestBooking := targetEmployeeID == "0"

	if bookingForOther {
		if !a.canManageCoworkingByWorkplaceID(r, payload.WorkplaceID) {
			respondError(w, http.StatusForbidden, "Недостаточно прав для бронирования другому сотруднику")
			return
		}
	}

	employeeID := requesterEmployeeID
	if bookingForOther {
		employeeID = targetEmployeeID
	}

	if !isGuestBooking {
		if _, err = tx.Exec(
			`DELETE FROM workplace_bookings WHERE applier_employee_id = $1 AND date = $2`,
			employeeID,
			date,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	var existing int
	err = tx.QueryRow(`SELECT 1 FROM workplace_bookings WHERE workplace_id = $1 AND date = $2 LIMIT 1`, payload.WorkplaceID, date).
		Scan(&existing)
	if err == nil {
		respondError(w, http.StatusBadRequest, "Стол уже занят")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO workplace_bookings (workplace_id, applier_employee_id, tenant_employee_id, date)
		 VALUES ($1, $2, $3, $4)`,
		payload.WorkplaceID,
		employeeID,
		requesterEmployeeID,
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
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
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

	if payload.WorkplaceID == 0 {
		respondError(w, http.StatusBadRequest, "workplace_id is required")
		return
	}

	// Try to cancel own booking first.
	result, err := a.db.Exec(
		`DELETE FROM workplace_bookings WHERE applier_employee_id = $1 AND workplace_id = $2 AND date = $3`,
		employeeID,
		payload.WorkplaceID,
		date,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	affected, _ := result.RowsAffected()
	if affected > 0 {
		respondJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	// Own booking not found — check if user can manage this coworking and cancel any booking.
	if !a.canManageCoworkingByWorkplaceID(r, payload.WorkplaceID) {
		respondError(w, http.StatusNotFound, "booking not found")
		return
	}

	result, err = a.db.Exec(
		`DELETE FROM workplace_bookings WHERE workplace_id = $1 AND date = $2`,
		payload.WorkplaceID,
		date,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	affected, _ = result.RowsAffected()
	if affected == 0 {
		respondError(w, http.StatusNotFound, "booking not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (a *app) handleListMyBookings(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id, b.date, b.created_at, b.workplace_id,
		        COALESCE(NULLIF(u.wb_user_id, ''), b.applier_employee_id),
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(b.applier_employee_id, ''),
		        COALESCE(b.tenant_employee_id, ''),
		        d.label, d.coworking_id, s.name,
		        f.building_id, f.level,
		        ob.name,
		        COALESCE(s.subdivision_level_1, ''),
		        COALESCE(s.subdivision_level_2, '')
		  FROM workplace_bookings b
		  JOIN workplaces d ON d.id = b.workplace_id
		   JOIN coworkings s ON s.id = d.coworking_id
		   JOIN floors f ON f.id = s.floor_id
		   JOIN office_buildings ob ON ob.id = f.building_id
		   LEFT JOIN users u ON u.employee_id = b.applier_employee_id
		  WHERE b.applier_employee_id = $1 AND b.date >= CURRENT_DATE::text
		  ORDER BY b.date DESC, b.created_at DESC`,
		employeeID,
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
			&item.WorkplaceID,
			&item.WbUserID,
			&item.UserName,
			&item.ApplierEmployeeID,
			&item.TenantEmployeeID,
			&item.DeskLabel,
			&item.SpaceID,
			&item.SpaceName,
			&item.BuildingID,
			&item.FloorLevel,
			&item.BuildingName,
			&item.SubdivisionL1,
			&item.SubdivisionL2,
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
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	result, err := a.db.Exec(`DELETE FROM workplace_bookings WHERE applier_employee_id = $1`, employeeID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	count, _ := result.RowsAffected()
	respondJSON(w, http.StatusOK, map[string]any{"success": true, "deletedCount": count})
}

func (a *app) handleListSpaceBookings(w http.ResponseWriter, r *http.Request) {
	spaceID := strings.TrimSpace(r.URL.Query().Get("space_id"))
	if spaceID == "" {
		respondError(w, http.StatusBadRequest, "space_id is required")
		return
	}
	spaceIDValue, err := strconv.ParseInt(spaceID, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "space_id must be a number")
		return
	}

	if !a.ensureCanManageCoworking(w, r, spaceIDValue) {
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id, b.workplace_id, b.date, b.created_at,
		        COALESCE(b.applier_employee_id, ''),
		        COALESCE(b.tenant_employee_id, ''),
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(NULLIF(ut.full_name, ''), ''),
		        d.label, d.coworking_id
		  FROM workplace_bookings b
		  JOIN workplaces d ON d.id = b.workplace_id
		  LEFT JOIN users u ON u.employee_id = b.applier_employee_id
		  LEFT JOIN users ut ON ut.employee_id = b.tenant_employee_id
		  WHERE d.coworking_id = $1 AND b.date >= CURRENT_DATE::text
		  ORDER BY b.date ASC, b.created_at DESC`,
		spaceIDValue,
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
			&item.WorkplaceID,
			&item.Date,
			&item.CreatedAt,
			&item.ApplierEmployeeID,
			&item.TenantEmployeeID,
			&item.UserName,
			&item.TenantUserName,
			&item.DeskLabel,
			&item.SpaceID,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if strings.TrimSpace(item.ApplierEmployeeID) == "0" {
			item.UserName = "Гость"
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"bookings": items, "success": true})
}

func (a *app) handleCancelAllSpaceBookings(w http.ResponseWriter, r *http.Request) {
	spaceID := strings.TrimSpace(r.URL.Query().Get("space_id"))
	if spaceID == "" {
		respondError(w, http.StatusBadRequest, "space_id is required")
		return
	}
	spaceIDValue, err := strconv.ParseInt(spaceID, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "space_id must be a number")
		return
	}

	if !a.ensureCanManageCoworking(w, r, spaceIDValue) {
		return
	}

	result, err := a.db.Exec(
		`DELETE FROM workplace_bookings
		  WHERE workplace_id IN (SELECT id FROM workplaces WHERE coworking_id = $1)
		    AND date >= CURRENT_DATE::text`,
		spaceIDValue,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	count, _ := result.RowsAffected()
	respondJSON(w, http.StatusOK, map[string]any{"success": true, "deletedCount": count})
}

func (a *app) handleCreateMultipleBookings(w http.ResponseWriter, r *http.Request) {
	var payload bookingMultiPayload
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(payload.Dates) == 0 {
		respondError(w, http.StatusBadRequest, "dates are required")
		return
	}

	if payload.WorkplaceID == 0 {
		respondError(w, http.StatusBadRequest, "workplace_id is required")
		return
	}

	if err := a.ensureWorkplaceExists(payload.WorkplaceID); err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "workplace not found")
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

	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, tx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if requesterEmployeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	targetEmployeeID := strings.TrimSpace(payload.TargetEmployeeID)
	bookingForOther := targetEmployeeID != "" && targetEmployeeID != requesterEmployeeID
	isGuestBooking := targetEmployeeID == "0"

	if bookingForOther {
		if !a.canManageCoworkingByWorkplaceID(r, payload.WorkplaceID) {
			respondError(w, http.StatusForbidden, "Недостаточно прав для бронирования другому сотруднику")
			return
		}
	}

	employeeID := requesterEmployeeID
	if bookingForOther {
		employeeID = targetEmployeeID
	}

	bookedByOthers, err := findBookedDates(tx, payload.WorkplaceID, employeeID, validDates)
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

	if len(available) > 0 && !isGuestBooking {
		if err := deleteUserBookingsForDates(tx, employeeID, available); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	created := make([]string, 0, len(available))
	failed := make([]string, 0, len(validDates))
	for _, date := range available {
		if _, err := tx.Exec(
			`INSERT INTO workplace_bookings (workplace_id, applier_employee_id, tenant_employee_id, date)
			 VALUES ($1, $2, $3, $4)`,
			payload.WorkplaceID,
			employeeID,
			requesterEmployeeID,
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

func (a *app) ensureWorkplaceExists(workplaceID int64) error {
	row := a.db.QueryRow(`SELECT id FROM workplaces WHERE id = $1`, workplaceID)
	var id int64
	if err := row.Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		return err
	}
	return nil
}

func (a *app) canManageCoworkingByWorkplaceID(r *http.Request, workplaceID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		return false
	}
	if role != roleEmployee {
		return true
	}
	coworkingID, err := a.getCoworkingIDByDeskID(workplaceID)
	if err != nil {
		return false
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil || strings.TrimSpace(employeeID) == "" {
		return false
	}
	floorID, err := a.getSpaceFloorID(coworkingID)
	if err != nil {
		return false
	}
	buildingID, err := a.getBuildingIDByFloorID(floorID)
	if err != nil {
		return false
	}
	buildingResponsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
	if err == nil && buildingResponsibleID != "" && buildingResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	floorResponsibleID, err := a.getFloorResponsibleEmployeeID(floorID)
	if err == nil && floorResponsibleID != "" && floorResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	coworkingResponsibleID, err := a.getCoworkingResponsibleEmployeeID(coworkingID)
	if err == nil && coworkingResponsibleID != "" && coworkingResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	return false
}

func extractBookingUser(r *http.Request) (string, string) {
	claims := extractAuthClaims(r)
	wbUserID := strings.TrimSpace(claims.WbUserID)
	if wbUserID == "" {
		wbUserID = strings.TrimSpace(r.Header.Get("X-User-Key"))
	}
	if wbUserID == "" {
		wbUserID = strings.TrimSpace(r.Header.Get("X-User-Email"))
	}
	if wbUserID == "" {
		wbUserID = strings.TrimSpace(r.Header.Get("X-Wb-User-Id"))
	}
	userName := strings.TrimSpace(claims.UserName)
	if userName == "" {
		userName = strings.TrimSpace(r.Header.Get("X-User-Name"))
	}
	return wbUserID, userName
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

func findBookedDates(tx *sql.Tx, workplaceID int64, employeeID string, dates []string) (map[string]bool, error) {
	if len(dates) == 0 {
		return map[string]bool{}, nil
	}
	placeholders := make([]string, 0, len(dates))
	args := make([]any, 0, len(dates)+1)
	args = append(args, workplaceID)
	for i, date := range dates {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+2))
		args = append(args, date)
	}
	query := fmt.Sprintf(
		`SELECT date, applier_employee_id FROM workplace_bookings WHERE workplace_id = $1 AND date IN (%s)`,
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
		if bookingUser != employeeID {
			bookedByOthers[date] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return bookedByOthers, nil
}

func deleteUserBookingsForDates(tx *sql.Tx, employeeID string, dates []string) error {
	if len(dates) == 0 {
		return nil
	}
	placeholders := make([]string, 0, len(dates))
	args := make([]any, 0, len(dates)+1)
	args = append(args, employeeID)
	for i, date := range dates {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+2))
		args = append(args, date)
	}
	query := fmt.Sprintf(
		`DELETE FROM workplace_bookings WHERE applier_employee_id = $1 AND date IN (%s)`,
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
			  AND table_name = 'workplace_bookings'
			  AND column_name = 'building_id'
		)`,
	).Scan(&hasBuildingID); err != nil {
		return err
	}
	if !hasBuildingID {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`CREATE TABLE IF NOT EXISTS workplace_bookings_new (
			id BIGSERIAL PRIMARY KEY,
			workplace_id BIGINT NOT NULL,
			employee_id TEXT NOT NULL,
			date TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			UNIQUE(workplace_id, date)
		);`,
	); err != nil {
		return err
	}

	hasEmployeeID, err := columnExists(db, "workplace_bookings", "employee_id")
	if err != nil {
		return err
	}
	hasWbUserID, err := columnExists(db, "workplace_bookings", "wb_user_id")
	if err != nil {
		return err
	}
	hasUserKey, err := columnExists(db, "workplace_bookings", "user_key")
	if err != nil {
		return err
	}
	sourceColumn := "b.employee_id"
	if hasWbUserID {
		sourceColumn = "b.wb_user_id"
	} else if hasUserKey {
		sourceColumn = "b.user_key"
	} else if !hasEmployeeID {
		sourceColumn = "b.user_key"
	}
	hasUsers, err := tableExists(db, "users")
	if err != nil {
		return err
	}
	joinClause := ""
	employeeExpr := sourceColumn
	if hasUsers {
		hasUsersEmployeeID, err := columnExists(db, "users", "employee_id")
		if err != nil {
			return err
		}
		if hasUsersEmployeeID {
			joinClause = fmt.Sprintf("LEFT JOIN users u ON u.wb_user_id = %s OR u.wb_team_profile_id = %s OR u.employee_id = %s", sourceColumn, sourceColumn, sourceColumn)
			employeeExpr = fmt.Sprintf("COALESCE(NULLIF(u.employee_id, ''), %s)", sourceColumn)
		}
	}
	sourceIDColumn := "b.workplace_id"
	hasWorkplaceID, err := columnExists(db, "workplace_bookings", "workplace_id")
	if err != nil {
		return err
	}
	if !hasWorkplaceID {
		sourceIDColumn = "b.desk_id"
	}
	if _, err := tx.Exec(fmt.Sprintf(
		`INSERT INTO workplace_bookings_new (id, workplace_id, employee_id, date, created_at)
		 SELECT DISTINCT ON (%s, b.date)
		        b.id, %s, %s, b.date, b.created_at
		   FROM workplace_bookings b
		   %s
		  ORDER BY %s, b.date, b.created_at DESC`,
		employeeExpr,
		sourceIDColumn,
		employeeExpr,
		joinClause,
		employeeExpr,
	)); err != nil {
		return err
	}

	if _, err := tx.Exec(`DROP TABLE workplace_bookings`); err != nil {
		return err
	}
	if _, err := tx.Exec(`ALTER TABLE workplace_bookings_new RENAME TO workplace_bookings`); err != nil {
		return err
	}
	if _, err := tx.Exec(
		`SELECT setval(
		    pg_get_serial_sequence('workplace_bookings', 'id'),
		    GREATEST(1, COALESCE((SELECT MAX(id) FROM workplace_bookings), 0)),
		    COALESCE((SELECT MAX(id) FROM workplace_bookings), 0) > 0
		)`,
	); err != nil {
		return err
	}

	return tx.Commit()
}
