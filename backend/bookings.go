package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
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

	rows, err := a.db.QueryContext(r.Context(),
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
		  WHERE d.coworking_id = $1 AND b.date = $2 AND b.cancelled_at IS NULL
		  ORDER BY b.created_at DESC`,
		spaceIDValue,
		date,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if strings.TrimSpace(item.ApplierEmployeeID) == "0" {
			item.UserName = "Гость"
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, tx)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
		if _, err = tx.ExecContext(ctx,
			`UPDATE workplace_bookings
			    SET cancelled_at = now(), canceller_employee_id = $1
			  WHERE applier_employee_id = $1 AND date = $2 AND cancelled_at IS NULL`,
			employeeID,
			date,
		); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
	}

	var existing int
	err = tx.QueryRowContext(ctx, `SELECT 1 FROM workplace_bookings WHERE workplace_id = $1 AND date = $2 AND cancelled_at IS NULL LIMIT 1`, payload.WorkplaceID, date).
		Scan(&existing)
	if err == nil {
		respondError(w, http.StatusBadRequest, "Стол уже занят")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO workplace_bookings (workplace_id, applier_employee_id, tenant_employee_id, date)
		 VALUES ($1, $2, $3, $4)`,
		payload.WorkplaceID,
		employeeID,
		requesterEmployeeID,
		date,
	); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if deskName, details, metaErr := a.getWorkplaceAuditMeta(payload.WorkplaceID); metaErr == nil {
		bookingFor := a.resolveBookingTargetLabel(r.Context(), employeeID)
		formattedDate := formatAuditDeskDate(date)
		details["date"] = date
		details["booking_date"] = formattedDate
		details["booked_for_employee_id"] = employeeID
		details["requested_by_employee_id"] = requesterEmployeeID
		details["booking_for"] = bookingFor
		details["changes"] = []string{
			fmt.Sprintf("Дата бронирования: %s", formattedDate),
			fmt.Sprintf("Кому забронировано: %s", bookingFor),
		}
		a.logAuditEventFromRequest(r, auditActionBook, auditEntityDeskBooking, payload.WorkplaceID, deskName, details)
	}

	respondJSON(w, http.StatusCreated, map[string]any{"success": true})
}

func (a *app) handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	bookingTargetLabel := a.getActiveDeskBookingTargetLabel(r.Context(), payload.WorkplaceID, date)

	// Try to cancel own booking first.
	result, err := a.db.ExecContext(r.Context(),
		`UPDATE workplace_bookings
		    SET cancelled_at = now(), canceller_employee_id = $1
		  WHERE applier_employee_id = $1 AND workplace_id = $2 AND date = $3
		    AND cancelled_at IS NULL`,
		employeeID,
		payload.WorkplaceID,
		date,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	affected, _ := result.RowsAffected()
	if affected > 0 {
		if deskName, details, metaErr := a.getWorkplaceAuditMeta(payload.WorkplaceID); metaErr == nil {
			formattedDate := formatAuditDeskDate(date)
			targetLabel := bookingTargetLabel
			if strings.TrimSpace(targetLabel) == "" {
				targetLabel = a.resolveBookingTargetLabel(r.Context(), employeeID)
			}
			details["date"] = date
			details["booking_date"] = formattedDate
			details["cancelled_by_employee_id"] = employeeID
			details["scope"] = "own"
			details["cancelled_booking_for"] = targetLabel
			details["changes"] = []string{
				fmt.Sprintf("Дата бронирования: %s", formattedDate),
				fmt.Sprintf("С кого снято бронирование: %s", targetLabel),
			}
			a.logAuditEventFromRequest(r, auditActionCancel, auditEntityDeskBooking, payload.WorkplaceID, deskName, details)
		}
		respondJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	// Own booking not found — check if user can manage this coworking and cancel any booking.
	if !a.canManageCoworkingByWorkplaceID(r, payload.WorkplaceID) {
		respondError(w, http.StatusNotFound, "booking not found")
		return
	}

	result, err = a.db.ExecContext(r.Context(),
		`UPDATE workplace_bookings
		    SET cancelled_at = now(), canceller_employee_id = $3
		  WHERE workplace_id = $1 AND date = $2
		    AND cancelled_at IS NULL`,
		payload.WorkplaceID,
		date,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	affected, _ = result.RowsAffected()
	if affected == 0 {
		respondError(w, http.StatusNotFound, "booking not found")
		return
	}
	if deskName, details, metaErr := a.getWorkplaceAuditMeta(payload.WorkplaceID); metaErr == nil {
		formattedDate := formatAuditDeskDate(date)
		targetLabel := bookingTargetLabel
		if strings.TrimSpace(targetLabel) == "" {
			targetLabel = "Сотрудник"
		}
		details["date"] = date
		details["booking_date"] = formattedDate
		details["cancelled_by_employee_id"] = employeeID
		details["scope"] = "managed"
		details["cancelled_booking_for"] = targetLabel
		details["changes"] = []string{
			fmt.Sprintf("Дата бронирования: %s", formattedDate),
			fmt.Sprintf("С кого снято бронирование: %s", targetLabel),
		}
		a.logAuditEventFromRequest(r, auditActionCancel, auditEntityDeskBooking, payload.WorkplaceID, deskName, details)
	}

	respondJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (a *app) handleListMyBookings(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	rows, err := a.db.QueryContext(r.Context(),
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
		  WHERE b.applier_employee_id = $1 AND b.date >= CURRENT_DATE::text AND b.cancelled_at IS NULL
		  ORDER BY b.date DESC, b.created_at DESC`,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"bookings": items, "success": true})
}

func (a *app) handleCancelAllBookings(w http.ResponseWriter, r *http.Request) {
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if employeeID == "" {
		respondError(w, http.StatusBadRequest, "employee_id is required")
		return
	}

	cancelledDates, _ := a.listActiveDeskBookingDatesByEmployee(r.Context(), employeeID)
	result, err := a.db.ExecContext(r.Context(),
		`UPDATE workplace_bookings
		    SET cancelled_at = now(), canceller_employee_id = $1
		  WHERE applier_employee_id = $1 AND cancelled_at IS NULL`,
		employeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	count, _ := result.RowsAffected()
	formattedDates := formatAuditDeskDates(cancelledDates)
	changes := make([]string, 0)
	if len(formattedDates) > 0 {
		changes = append(changes, fmt.Sprintf("Даты бронирований: %s", strings.Join(formattedDates, ", ")))
	}
	a.logAuditEventFromRequest(r, auditActionCancel, auditEntityDeskBooking, 0, "Все бронирования пользователя", map[string]any{
		"cancelled_by_employee_id": employeeID,
		"deleted_count":            count,
		"scope":                    "all_my_bookings",
		"booking_dates":            formattedDates,
		"changes":                  changes,
	})
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

	rows, err := a.db.QueryContext(r.Context(),
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
		  WHERE d.coworking_id = $1 AND b.date >= CURRENT_DATE::text AND b.cancelled_at IS NULL
		  ORDER BY b.date ASC, b.created_at DESC`,
		spaceIDValue,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if strings.TrimSpace(item.ApplierEmployeeID) == "0" {
			item.UserName = "Гость"
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	cancelledDates, _ := a.listActiveDeskBookingDatesByCoworking(r.Context(), spaceIDValue)
	cancellerID, _ := extractEmployeeIDFromRequest(r, a.db)
	result, err := a.db.ExecContext(r.Context(),
		`UPDATE workplace_bookings
		    SET cancelled_at = now(), canceller_employee_id = $2
		  WHERE workplace_id IN (SELECT id FROM workplaces WHERE coworking_id = $1)
		    AND date >= CURRENT_DATE::text
		    AND cancelled_at IS NULL`,
		spaceIDValue,
		cancellerID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	count, _ := result.RowsAffected()
	formattedDates := formatAuditDeskDates(cancelledDates)
	changes := make([]string, 0)
	if len(formattedDates) > 0 {
		changes = append(changes, fmt.Sprintf("Даты бронирований: %s", strings.Join(formattedDates, ", ")))
	}
	a.logAuditEventFromRequest(r, auditActionCancel, auditEntityDeskBooking, spaceIDValue, fmt.Sprintf("Коворкинг #%d", spaceIDValue), map[string]any{
		"coworking_id":             spaceIDValue,
		"cancelled_by_employee_id": cancellerID,
		"deleted_count":            count,
		"scope":                    "all_coworking_bookings",
		"booking_dates":            formattedDates,
		"changes":                  changes,
	})
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
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	validDates, err := normalizeBookingDates(payload.Dates)
	if err != nil {
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

	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, tx)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
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

	bookedByOthers, err := findBookedDates(ctx, tx, payload.WorkplaceID, employeeID, validDates)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	available := make([]string, 0, len(validDates))
	for _, date := range validDates {
		if !bookedByOthers[date] {
			available = append(available, date)
		}
	}

	if len(available) > 0 && !isGuestBooking {
		if err := deleteUserBookingsForDates(ctx, tx, employeeID, available); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
	}

	created := make([]string, 0, len(available))
	failed := make([]string, 0, len(validDates))
	for _, date := range available {
		result, err := tx.ExecContext(ctx,
			`INSERT INTO workplace_bookings (workplace_id, applier_employee_id, tenant_employee_id, date)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (workplace_id, date) WHERE cancelled_at IS NULL DO NOTHING`,
			payload.WorkplaceID,
			employeeID,
			requesterEmployeeID,
			date,
		)
		if err != nil {
			log.Printf("internal error inserting booking for date %s: %v", date, err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		n, _ := result.RowsAffected()
		if n > 0 {
			created = append(created, date)
		} else {
			failed = append(failed, date)
		}
	}

	for date := range bookedByOthers {
		failed = append(failed, date)
	}

	if err := tx.Commit(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	sort.Strings(created)
	sort.Strings(failed)
	if len(created) > 0 {
		if deskName, details, metaErr := a.getWorkplaceAuditMeta(payload.WorkplaceID); metaErr == nil {
			bookingFor := a.resolveBookingTargetLabel(r.Context(), employeeID)
			formattedCreated := formatAuditDeskDates(created)
			datesText := strings.Join(formattedCreated, ", ")
			details["created_dates"] = created
			details["failed_dates"] = failed
			details["booking_dates"] = formattedCreated
			details["booked_for_employee_id"] = employeeID
			details["requested_by_employee_id"] = requesterEmployeeID
			details["booking_for"] = bookingFor
			details["changes"] = []string{
				fmt.Sprintf("Даты бронирований: %s", datesText),
				fmt.Sprintf("Кому забронировано: %s", bookingFor),
			}
			a.logAuditEventFromRequest(r, auditActionBook, auditEntityDeskBooking, payload.WorkplaceID, deskName, details)
		}
	}

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
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil || strings.TrimSpace(employeeID) == "" {
		return false
	}
	eid := strings.TrimSpace(employeeID)

	// Single query instead of 7 separate N+1 queries:
	var buildingResp, floorResp, coworkingResp string
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), ''),
		        COALESCE(TRIM(c.responsible_employee_id), '')
		   FROM workplaces w
		   JOIN coworkings c ON c.id = w.coworking_id
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE w.id = $1`,
		workplaceID,
	).Scan(&buildingResp, &floorResp, &coworkingResp)
	if err != nil {
		return false
	}
	return (buildingResp != "" && buildingResp == eid) ||
		(floorResp != "" && floorResp == eid) ||
		(coworkingResp != "" && coworkingResp == eid)
}

func (a *app) resolveBookingTargetLabel(ctx context.Context, employeeID string) string {
	targetID := strings.TrimSpace(employeeID)
	if targetID == "" {
		return ""
	}
	if targetID == "0" {
		return "Гость"
	}
	if a == nil || a.db == nil {
		return targetID
	}
	fullName, err := getUserNameByEmployeeID(ctx, a.db, targetID)
	if err != nil {
		return targetID
	}
	name := strings.TrimSpace(fullName)
	if name == "" {
		return targetID
	}
	return fmt.Sprintf("%s (%s)", name, targetID)
}

func (a *app) listActiveDeskBookingDatesByEmployee(ctx context.Context, employeeID string) ([]string, error) {
	rows, err := a.db.QueryContext(ctx,
		`SELECT DISTINCT date
		   FROM workplace_bookings
		  WHERE applier_employee_id = $1 AND cancelled_at IS NULL
		  ORDER BY date ASC`,
		strings.TrimSpace(employeeID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	dates := make([]string, 0)
	for rows.Next() {
		var date string
		if err := rows.Scan(&date); err != nil {
			return nil, err
		}
		date = strings.TrimSpace(date)
		if date != "" {
			dates = append(dates, date)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return dates, nil
}

func (a *app) listActiveDeskBookingDatesByCoworking(ctx context.Context, coworkingID int64) ([]string, error) {
	rows, err := a.db.QueryContext(ctx,
		`SELECT DISTINCT b.date
		   FROM workplace_bookings b
		   JOIN workplaces w ON w.id = b.workplace_id
		  WHERE w.coworking_id = $1
		    AND b.date >= CURRENT_DATE::text
		    AND b.cancelled_at IS NULL
		  ORDER BY b.date ASC`,
		coworkingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	dates := make([]string, 0)
	for rows.Next() {
		var date string
		if err := rows.Scan(&date); err != nil {
			return nil, err
		}
		date = strings.TrimSpace(date)
		if date != "" {
			dates = append(dates, date)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return dates, nil
}

func (a *app) getActiveDeskBookingTargetLabel(ctx context.Context, workplaceID int64, date string) string {
	if a == nil || a.db == nil || workplaceID <= 0 {
		return ""
	}
	var applierEmployeeID string
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(applier_employee_id, '')
		   FROM workplace_bookings
		  WHERE workplace_id = $1 AND date = $2 AND cancelled_at IS NULL
		  LIMIT 1`,
		workplaceID,
		strings.TrimSpace(date),
	).Scan(&applierEmployeeID)
	if err != nil {
		return ""
	}
	return a.resolveBookingTargetLabel(ctx, applierEmployeeID)
}

func formatAuditDeskDate(raw string) string {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return ""
	}
	parsed, err := time.Parse("2006-01-02", normalized)
	if err != nil {
		return normalized
	}
	return parsed.Format("02-01-2006")
}

func formatAuditDeskDates(dates []string) []string {
	formatted := make([]string, 0, len(dates))
	for _, date := range dates {
		value := formatAuditDeskDate(date)
		if value != "" {
			formatted = append(formatted, value)
		}
	}
	return formatted
}

// extractBookingUser returns the user identity from the validated JWT claims
// stored in the request context by authMiddleware. No user-supplied headers
// are trusted — identity comes exclusively from the token.
func extractBookingUser(r *http.Request) (string, string) {
	claims := authClaimsFromContext(r.Context())
	wbUserID := strings.TrimSpace(claims.WbUserID)
	userName := strings.TrimSpace(claims.UserName)
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

func findBookedDates(ctx context.Context, tx *sql.Tx, workplaceID int64, employeeID string, dates []string) (map[string]bool, error) {
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
		`SELECT date, applier_employee_id FROM workplace_bookings WHERE workplace_id = $1 AND date IN (%s) AND cancelled_at IS NULL`,
		strings.Join(placeholders, ","),
	)
	rows, err := tx.QueryContext(ctx, query, args...)
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

func deleteUserBookingsForDates(ctx context.Context, tx *sql.Tx, employeeID string, dates []string) error {
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
		`UPDATE workplace_bookings
		    SET cancelled_at = now(), canceller_employee_id = $1
		  WHERE applier_employee_id = $1 AND date IN (%s) AND cancelled_at IS NULL`,
		strings.Join(placeholders, ","),
	)
	_, err := tx.ExecContext(ctx, query, args...)
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
