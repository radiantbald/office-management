package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	auditActionCreate = "create"
	auditActionUpdate = "update"
	auditActionDelete = "delete"
	auditActionBook   = "book"
	auditActionCancel = "cancel"
)

const (
	auditEntityBuilding       = "building"
	auditEntityFloor          = "floor"
	auditEntityCoworking      = "coworking"
	auditEntityMeetingRoom    = "meeting_room"
	auditEntityDesk           = "desk"
	auditEntityDeskBooking    = "desk_booking"
	auditEntityMeetingBooking = "meeting_booking"
)

type auditLogItem struct {
	ID              int64          `json:"id"`
	ActionType      string         `json:"action_type"`
	EntityType      string         `json:"entity_type"`
	EntityID        int64          `json:"entity_id"`
	EntityName      string         `json:"entity_name"`
	ActorEmployeeID string         `json:"actor_employee_id"`
	ActorName       string         `json:"actor_name"`
	Details         map[string]any `json:"details"`
	CreatedAt       time.Time      `json:"created_at"`
}

type auditLogWriteInput struct {
	ActionType      string
	EntityType      string
	EntityID        int64
	EntityName      string
	ActorEmployeeID string
	ActorName       string
	Details         map[string]any
}

func ensureAuditLogsStorage(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS audit_log_events (
			id BIGSERIAL PRIMARY KEY,
			action_type TEXT NOT NULL,
			entity_type TEXT NOT NULL,
			entity_id BIGINT NOT NULL DEFAULT 0,
			entity_name TEXT NOT NULL DEFAULT '',
			actor_employee_id TEXT NOT NULL DEFAULT '',
			actor_name TEXT NOT NULL DEFAULT '',
			details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);`,
		`CREATE INDEX IF NOT EXISTS audit_log_events_created_idx ON audit_log_events (created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS audit_log_events_entity_idx ON audit_log_events (entity_type, entity_id, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS audit_log_events_action_idx ON audit_log_events (action_type, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS audit_log_events_actor_idx ON audit_log_events (actor_employee_id, created_at DESC);`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (a *app) logAuditEventFromRequest(
	r *http.Request,
	actionType,
	entityType string,
	entityID int64,
	entityName string,
	details map[string]any,
) {
	if a == nil || a.db == nil || r == nil {
		return
	}

	actorEmployeeID := ""
	if employeeID, err := extractEmployeeIDFromRequest(r, a.db); err == nil {
		actorEmployeeID = strings.TrimSpace(employeeID)
	}

	actorName := ""
	if actorEmployeeID != "" {
		name, err := getUserNameByEmployeeID(r.Context(), a.db, actorEmployeeID)
		if err != nil {
			log.Printf("audit log: failed to resolve actor name for %q: %v", actorEmployeeID, err)
		} else {
			actorName = strings.TrimSpace(name)
		}
	}

	a.logAuditEvent(r.Context(), auditLogWriteInput{
		ActionType:      actionType,
		EntityType:      entityType,
		EntityID:        entityID,
		EntityName:      entityName,
		ActorEmployeeID: actorEmployeeID,
		ActorName:       actorName,
		Details:         details,
	})
}

func (a *app) logAuditEvent(ctx context.Context, input auditLogWriteInput) {
	if a == nil || a.db == nil {
		return
	}
	actionType := strings.TrimSpace(input.ActionType)
	entityType := strings.TrimSpace(input.EntityType)
	if actionType == "" || entityType == "" {
		return
	}

	detailsJSON := []byte("{}")
	if len(input.Details) > 0 {
		raw, err := json.Marshal(input.Details)
		if err != nil {
			log.Printf("audit log: failed to marshal details: %v", err)
		} else {
			detailsJSON = raw
		}
	}

	if _, err := a.db.ExecContext(
		ctx,
		`INSERT INTO audit_log_events (
			action_type,
			entity_type,
			entity_id,
			entity_name,
			actor_employee_id,
			actor_name,
			details_json
		) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
		actionType,
		entityType,
		input.EntityID,
		strings.TrimSpace(input.EntityName),
		strings.TrimSpace(input.ActorEmployeeID),
		strings.TrimSpace(input.ActorName),
		string(detailsJSON),
	); err != nil {
		log.Printf("audit log: failed to store event (%s %s %d): %v", actionType, entityType, input.EntityID, err)
	}
}

func (a *app) handleAdminAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondRoleResolutionError(w, err)
		return
	}
	if role != roleAdmin {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return
	}

	entityType := strings.TrimSpace(r.URL.Query().Get("entity_type"))
	actionType := strings.TrimSpace(r.URL.Query().Get("action_type"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	limit := parseAuditLogsInt(r.URL.Query().Get("limit"), 100)
	if limit > 500 {
		limit = 500
	}
	offset := parseAuditLogsInt(r.URL.Query().Get("offset"), 0)
	if offset < 0 {
		offset = 0
	}

	var (
		whereParts []string
		args       []any
	)
	if entityType != "" && entityType != "all" {
		args = append(args, entityType)
		whereParts = append(whereParts, fmt.Sprintf("entity_type = $%d", len(args)))
	}
	if actionType != "" && actionType != "all" {
		args = append(args, actionType)
		whereParts = append(whereParts, fmt.Sprintf("action_type = $%d", len(args)))
	}
	if search != "" {
		needle := "%" + strings.ToLower(search) + "%"
		args = append(args, needle)
		whereParts = append(whereParts, fmt.Sprintf(`(
			LOWER(COALESCE(entity_name, '')) LIKE $%d OR
			LOWER(COALESCE(entity_type, '')) LIKE $%d OR
			LOWER(COALESCE(action_type, '')) LIKE $%d OR
			CAST(entity_id AS TEXT) LIKE $%d OR
			LOWER(COALESCE(actor_name, '')) LIKE $%d OR
			LOWER(COALESCE(actor_employee_id, '')) LIKE $%d OR
			LOWER(COALESCE(details_json::text, '')) LIKE $%d
		)`, len(args), len(args), len(args), len(args), len(args), len(args), len(args)))
	}

	query := `SELECT id,
	                 action_type,
	                 entity_type,
	                 entity_id,
	                 COALESCE(entity_name, ''),
	                 COALESCE(actor_employee_id, ''),
	                 COALESCE(actor_name, ''),
	                 COALESCE(details_json, '{}'::jsonb),
	                 created_at
	            FROM audit_log_events`
	if len(whereParts) > 0 {
		query += " WHERE " + strings.Join(whereParts, " AND ")
	}
	args = append(args, limit, offset)
	query += fmt.Sprintf(" ORDER BY created_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)-1, len(args))

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("audit log: list query failed: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	items := make([]auditLogItem, 0)
	for rows.Next() {
		var (
			item       auditLogItem
			detailsRaw []byte
		)
		if err := rows.Scan(
			&item.ID,
			&item.ActionType,
			&item.EntityType,
			&item.EntityID,
			&item.EntityName,
			&item.ActorEmployeeID,
			&item.ActorName,
			&detailsRaw,
			&item.CreatedAt,
		); err != nil {
			log.Printf("audit log: list scan failed: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		item.Details = map[string]any{}
		if len(detailsRaw) > 0 {
			if err := json.Unmarshal(detailsRaw, &item.Details); err != nil {
				item.Details = map[string]any{}
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("audit log: rows failed: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"limit":  limit,
		"offset": offset,
	})
}

func parseAuditLogsInt(raw string, fallback int) int {
	value := strings.TrimSpace(raw)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func (a *app) getWorkplaceAuditMeta(workplaceID int64) (string, map[string]any, error) {
	row := a.db.QueryRow(
		`SELECT w.id,
		        COALESCE(w.label, ''),
		        c.id,
		        COALESCE(c.name, ''),
		        f.id,
		        COALESCE(f.name, ''),
		        b.id,
		        COALESCE(b.name, '')
		   FROM workplaces w
		   JOIN coworkings c ON c.id = w.coworking_id
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE w.id = $1`,
		workplaceID,
	)
	var (
		id           int64
		label        string
		coworkingID  int64
		coworking    string
		floorID      int64
		floorName    string
		buildingID   int64
		buildingName string
	)
	if err := row.Scan(&id, &label, &coworkingID, &coworking, &floorID, &floorName, &buildingID, &buildingName); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil, errNotFound
		}
		return "", nil, err
	}
	entityName := strings.TrimSpace(label)
	if entityName == "" {
		entityName = fmt.Sprintf("Стол #%d", id)
	}
	return entityName, map[string]any{
		"desk_id":        id,
		"desk_label":     label,
		"coworking_id":   coworkingID,
		"coworking_name": coworking,
		"floor_id":       floorID,
		"floor_name":     floorName,
		"building_id":    buildingID,
		"building_name":  buildingName,
	}, nil
}

func (a *app) getMeetingRoomAuditMeta(meetingRoomID int64) (string, map[string]any, error) {
	row := a.db.QueryRow(
		`SELECT m.id,
		        COALESCE(m.name, ''),
		        f.id,
		        COALESCE(f.name, ''),
		        b.id,
		        COALESCE(b.name, '')
		   FROM meeting_rooms m
		   JOIN floors f ON f.id = m.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE m.id = $1`,
		meetingRoomID,
	)
	var (
		id           int64
		name         string
		floorID      int64
		floorName    string
		buildingID   int64
		buildingName string
	)
	if err := row.Scan(&id, &name, &floorID, &floorName, &buildingID, &buildingName); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil, errNotFound
		}
		return "", nil, err
	}
	entityName := strings.TrimSpace(name)
	if entityName == "" {
		entityName = fmt.Sprintf("Переговорка #%d", id)
	}
	return entityName, map[string]any{
		"meeting_room_id":   id,
		"meeting_room_name": name,
		"floor_id":          floorID,
		"floor_name":        floorName,
		"building_id":       buildingID,
		"building_name":     buildingName,
	}, nil
}
