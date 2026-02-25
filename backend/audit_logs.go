package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
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
	resolvedDetails := a.enrichAuditLogDetails(r.Context(), entityType, entityID, details)

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
		Details:         resolvedDetails,
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
		        COALESCE(f.level, 0),
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
		floorLevel   int
		buildingID   int64
		buildingName string
	)
	if err := row.Scan(&id, &label, &coworkingID, &coworking, &floorID, &floorName, &floorLevel, &buildingID, &buildingName); err != nil {
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
		"floor_level":    floorLevel,
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
		        COALESCE(f.level, 0),
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
		floorLevel   int
		buildingID   int64
		buildingName string
	)
	if err := row.Scan(&id, &name, &floorID, &floorName, &floorLevel, &buildingID, &buildingName); err != nil {
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
		"floor_level":       floorLevel,
		"building_id":       buildingID,
		"building_name":     buildingName,
	}, nil
}

type floorAuditSummary struct {
	ID    int64
	Name  string
	Level int
}

func (a *app) getFloorAuditSummaries(ids []int64) map[int64]floorAuditSummary {
	result := make(map[int64]floorAuditSummary, len(ids))
	for _, floorID := range ids {
		if floorID <= 0 {
			continue
		}
		item, err := a.getFloor(floorID)
		if err != nil {
			continue
		}
		result[floorID] = floorAuditSummary{
			ID:    item.ID,
			Name:  strings.TrimSpace(item.Name),
			Level: item.Level,
		}
	}
	return result
}

func describeBuildingAuditChanges(
	before building,
	after building,
	beforeFloors,
	afterFloors map[int64]floorAuditSummary,
) (changes []string, addedFloors []string, removedFloors []string) {
	if strings.TrimSpace(before.Name) != strings.TrimSpace(after.Name) {
		changes = append(changes, fmt.Sprintf("Название: %q -> %q", before.Name, after.Name))
	}
	if strings.TrimSpace(before.Address) != strings.TrimSpace(after.Address) {
		changes = append(changes, fmt.Sprintf("Адрес: %q -> %q", before.Address, after.Address))
	}
	if strings.TrimSpace(before.Timezone) != strings.TrimSpace(after.Timezone) {
		changes = append(changes, fmt.Sprintf("Часовой пояс: %q -> %q", before.Timezone, after.Timezone))
	}
	if strings.TrimSpace(before.ResponsibleEmployeeID) != strings.TrimSpace(after.ResponsibleEmployeeID) {
		changes = append(changes, fmt.Sprintf(
			"Ответственный: %q -> %q",
			strings.TrimSpace(before.ResponsibleEmployeeID),
			strings.TrimSpace(after.ResponsibleEmployeeID),
		))
	}

	beforeSet := make(map[int64]struct{}, len(before.Floors))
	afterSet := make(map[int64]struct{}, len(after.Floors))
	for _, id := range before.Floors {
		if id > 0 {
			beforeSet[id] = struct{}{}
		}
	}
	for _, id := range after.Floors {
		if id > 0 {
			afterSet[id] = struct{}{}
		}
	}

	addedIDs := make([]int64, 0)
	removedIDs := make([]int64, 0)
	for id := range afterSet {
		if _, exists := beforeSet[id]; !exists {
			addedIDs = append(addedIDs, id)
		}
	}
	for id := range beforeSet {
		if _, exists := afterSet[id]; !exists {
			removedIDs = append(removedIDs, id)
		}
	}
	sort.Slice(addedIDs, func(i, j int) bool { return addedIDs[i] < addedIDs[j] })
	sort.Slice(removedIDs, func(i, j int) bool { return removedIDs[i] < removedIDs[j] })

	for _, id := range addedIDs {
		if meta, ok := afterFloors[id]; ok {
			name := meta.Name
			if name == "" {
				name = fmt.Sprintf("Этаж #%d", id)
			}
			addedFloors = append(addedFloors, fmt.Sprintf("%s (id=%d, level=%d)", name, id, meta.Level))
			continue
		}
		addedFloors = append(addedFloors, fmt.Sprintf("id=%d", id))
	}
	for _, id := range removedIDs {
		if meta, ok := beforeFloors[id]; ok {
			name := meta.Name
			if name == "" {
				name = fmt.Sprintf("Этаж #%d", id)
			}
			removedFloors = append(removedFloors, fmt.Sprintf("%s (id=%d, level=%d)", name, id, meta.Level))
			continue
		}
		removedFloors = append(removedFloors, fmt.Sprintf("id=%d", id))
	}

	if len(addedFloors) > 0 {
		changes = append(changes, "Добавлены этажи: "+strings.Join(addedFloors, ", "))
	}
	if len(removedFloors) > 0 {
		changes = append(changes, "Удалены этажи: "+strings.Join(removedFloors, ", "))
	}

	return changes, addedFloors, removedFloors
}

func formatPointsForAudit(points []point) string {
	if len(points) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(points))
	for _, p := range points {
		parts = append(parts, fmt.Sprintf("(%.2f, %.2f)", p.X, p.Y))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func (a *app) enrichAuditLogDetails(ctx context.Context, entityType string, entityID int64, details map[string]any) map[string]any {
	merged := make(map[string]any, len(details)+1)
	for key, value := range details {
		merged[key] = value
	}
	if _, hasPath := merged["entity_path"]; hasPath {
		return merged
	}
	path := strings.TrimSpace(a.resolveEntityPath(ctx, entityType, entityID, merged))
	if path != "" {
		merged["entity_path"] = path
	}
	return merged
}

func (a *app) resolveEntityPath(ctx context.Context, entityType string, entityID int64, details map[string]any) string {
	switch strings.TrimSpace(entityType) {
	case auditEntityBuilding:
		if name := readAuditString(details, "building_name", "entity_name"); name != "" {
			return name
		}
		if entityID > 0 {
			return a.queryBuildingPath(ctx, entityID)
		}
	case auditEntityFloor:
		if path := joinAuditPath(
			readAuditString(details, "building_name"),
			floorLabel(readAuditString(details, "floor_name", "entity_name"), readAuditInt(details, "floor_level")),
		); hasAuditPathDepth(path, 2) {
			return path
		}
		if entityID > 0 {
			return a.queryFloorPath(ctx, entityID)
		}
	case auditEntityCoworking:
		if path := joinAuditPath(
			readAuditString(details, "building_name"),
			floorLabel(readAuditString(details, "floor_name"), readAuditInt(details, "floor_level")),
			readAuditString(details, "subdivision_level_1", "before_subdivision_1", "after_subdivision_1"),
			readAuditString(details, "subdivision_level_2", "before_subdivision_2", "after_subdivision_2"),
			readAuditString(details, "space_name", "coworking_name", "entity_name"),
		); hasAuditPathDepth(path, 3) {
			return path
		}
		if entityID > 0 {
			return a.queryCoworkingPath(ctx, entityID)
		}
	case auditEntityMeetingRoom:
		if path := joinAuditPath(
			readAuditString(details, "building_name"),
			floorLabel(readAuditString(details, "floor_name"), readAuditInt(details, "floor_level")),
			readAuditString(details, "meeting_room_name", "space_name", "entity_name"),
		); hasAuditPathDepth(path, 3) {
			return path
		}
		if entityID > 0 {
			return a.queryMeetingRoomPath(ctx, entityID)
		}
	case auditEntityDesk, auditEntityDeskBooking:
		if path := joinAuditPath(
			readAuditString(details, "building_name"),
			floorLabel(readAuditString(details, "floor_name"), readAuditInt(details, "floor_level")),
			readAuditString(details, "subdivision_level_1", "before_subdivision_1", "after_subdivision_1"),
			readAuditString(details, "subdivision_level_2", "before_subdivision_2", "after_subdivision_2"),
			readAuditString(details, "coworking_name", "space_name"),
			readAuditString(details, "desk_label", "entity_name"),
		); hasAuditPathDepth(path, 4) {
			return path
		}
		if entityID > 0 {
			return a.queryDeskPath(ctx, entityID)
		}
	case auditEntityMeetingBooking:
		if path := joinAuditPath(
			readAuditString(details, "building_name"),
			floorLabel(readAuditString(details, "floor_name"), readAuditInt(details, "floor_level")),
			readAuditString(details, "meeting_room_name", "entity_name"),
		); hasAuditPathDepth(path, 3) {
			return path
		}
		if entityID > 0 {
			return a.queryMeetingRoomPath(ctx, entityID)
		}
	}
	return ""
}

func readAuditString(details map[string]any, keys ...string) string {
	if details == nil {
		return ""
	}
	for _, key := range keys {
		value, ok := details[key]
		if !ok {
			continue
		}
		text := strings.TrimSpace(fmt.Sprint(value))
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func readAuditInt(details map[string]any, keys ...string) int {
	if details == nil {
		return 0
	}
	for _, key := range keys {
		value, ok := details[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case int:
			return typed
		case int32:
			return int(typed)
		case int64:
			return int(typed)
		case float64:
			return int(typed)
		case float32:
			return int(typed)
		case string:
			parsed, err := strconv.Atoi(strings.TrimSpace(typed))
			if err == nil {
				return parsed
			}
		}
	}
	return 0
}

func joinAuditPath(parts ...string) string {
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		text := strings.TrimSpace(part)
		if text == "" {
			continue
		}
		normalized = append(normalized, text)
	}
	return strings.Join(normalized, " · ")
}

func hasAuditPathDepth(path string, minParts int) bool {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return false
	}
	if minParts <= 1 {
		return true
	}
	parts := strings.Split(trimmed, " · ")
	count := 0
	for _, part := range parts {
		if strings.TrimSpace(part) != "" {
			count++
		}
	}
	return count >= minParts
}

func floorLabel(name string, level int) string {
	trimmed := strings.TrimSpace(name)
	if trimmed != "" {
		if strings.HasPrefix(strings.ToLower(trimmed), "этаж ") {
			return trimmed
		}
		if _, err := strconv.Atoi(trimmed); err == nil {
			return "Этаж " + trimmed
		}
		return trimmed
	}
	if level != 0 {
		return fmt.Sprintf("Этаж %d", level)
	}
	return ""
}

func (a *app) queryBuildingPath(ctx context.Context, buildingID int64) string {
	if a == nil || a.db == nil || buildingID <= 0 {
		return ""
	}
	var buildingName string
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(name, '') FROM office_buildings WHERE id = $1`,
		buildingID,
	).Scan(&buildingName)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(buildingName)
}

func (a *app) queryFloorPath(ctx context.Context, floorID int64) string {
	if a == nil || a.db == nil || floorID <= 0 {
		return ""
	}
	var (
		buildingName string
		floorName    string
		level        int
	)
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(b.name, ''),
		        COALESCE(f.name, ''),
		        COALESCE(f.level, 0)
		   FROM floors f
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE f.id = $1`,
		floorID,
	).Scan(&buildingName, &floorName, &level)
	if err != nil {
		return ""
	}
	return joinAuditPath(buildingName, floorLabel(floorName, level))
}

func (a *app) queryCoworkingPath(ctx context.Context, coworkingID int64) string {
	if a == nil || a.db == nil || coworkingID <= 0 {
		return ""
	}
	var (
		buildingName string
		floorName    string
		level        int
		coworking    string
		subdivision1 string
		subdivision2 string
	)
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(b.name, ''),
		        COALESCE(f.name, ''),
		        COALESCE(f.level, 0),
		        COALESCE(c.name, ''),
		        COALESCE(c.subdivision_level_1, ''),
		        COALESCE(c.subdivision_level_2, '')
		   FROM coworkings c
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE c.id = $1`,
		coworkingID,
	).Scan(&buildingName, &floorName, &level, &coworking, &subdivision1, &subdivision2)
	if err != nil {
		return ""
	}
	return joinAuditPath(
		buildingName,
		floorLabel(floorName, level),
		subdivision1,
		subdivision2,
		coworking,
	)
}

func (a *app) queryMeetingRoomPath(ctx context.Context, meetingRoomID int64) string {
	if a == nil || a.db == nil || meetingRoomID <= 0 {
		return ""
	}
	var (
		buildingName string
		floorName    string
		level        int
		meetingName  string
	)
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(b.name, ''),
		        COALESCE(f.name, ''),
		        COALESCE(f.level, 0),
		        COALESCE(m.name, '')
		   FROM meeting_rooms m
		   JOIN floors f ON f.id = m.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE m.id = $1`,
		meetingRoomID,
	).Scan(&buildingName, &floorName, &level, &meetingName)
	if err != nil {
		return ""
	}
	return joinAuditPath(buildingName, floorLabel(floorName, level), meetingName)
}

func (a *app) queryDeskPath(ctx context.Context, deskID int64) string {
	if a == nil || a.db == nil || deskID <= 0 {
		return ""
	}
	var (
		buildingName string
		floorName    string
		level        int
		coworking    string
		subdivision1 string
		subdivision2 string
		deskLabel    string
	)
	err := a.db.QueryRowContext(ctx,
		`SELECT COALESCE(b.name, ''),
		        COALESCE(f.name, ''),
		        COALESCE(f.level, 0),
		        COALESCE(c.name, ''),
		        COALESCE(c.subdivision_level_1, ''),
		        COALESCE(c.subdivision_level_2, ''),
		        COALESCE(w.label, '')
		   FROM workplaces w
		   JOIN coworkings c ON c.id = w.coworking_id
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE w.id = $1`,
		deskID,
	).Scan(&buildingName, &floorName, &level, &coworking, &subdivision1, &subdivision2, &deskLabel)
	if err != nil {
		return ""
	}
	return joinAuditPath(
		buildingName,
		floorLabel(floorName, level),
		subdivision1,
		subdivision2,
		coworking,
		deskLabel,
	)
}

func describeFloorAuditChanges(before, after floor) []string {
	changes := make([]string, 0)
	if strings.TrimSpace(before.Name) != strings.TrimSpace(after.Name) {
		changes = append(changes, fmt.Sprintf("Название: %q -> %q", before.Name, after.Name))
	}
	beforeResponsible := strings.TrimSpace(before.ResponsibleEmployeeID)
	afterResponsible := strings.TrimSpace(after.ResponsibleEmployeeID)
	if beforeResponsible != afterResponsible {
		changes = append(changes, fmt.Sprintf("Ответственный: %q -> %q", beforeResponsible, afterResponsible))
	}
	beforeHasPlan := strings.TrimSpace(before.PlanSVG) != ""
	afterHasPlan := strings.TrimSpace(after.PlanSVG) != ""
	if beforeHasPlan != afterHasPlan {
		changes = append(changes, fmt.Sprintf("План этажа: %t -> %t", beforeHasPlan, afterHasPlan))
	} else if beforeHasPlan && afterHasPlan && strings.TrimSpace(before.PlanSVG) != strings.TrimSpace(after.PlanSVG) {
		changes = append(changes, "План этажа: старое содержимое -> новое содержимое")
	}
	return changes
}

func describeSpaceAuditChanges(before, after space) []string {
	changes := make([]string, 0)
	if strings.TrimSpace(before.Name) != strings.TrimSpace(after.Name) {
		changes = append(changes, fmt.Sprintf("Название: %q -> %q", before.Name, after.Name))
	}
	if strings.TrimSpace(before.Kind) != strings.TrimSpace(after.Kind) {
		changes = append(changes, fmt.Sprintf("Тип: %q -> %q", before.Kind, after.Kind))
	}
	if before.Capacity != after.Capacity {
		changes = append(changes, fmt.Sprintf("Вместимость: %d -> %d", before.Capacity, after.Capacity))
	}
	if strings.TrimSpace(before.Color) != strings.TrimSpace(after.Color) {
		changes = append(changes, fmt.Sprintf("Цвет: %q -> %q", before.Color, after.Color))
	}
	if strings.TrimSpace(before.SubdivisionL1) != strings.TrimSpace(after.SubdivisionL1) {
		changes = append(changes, fmt.Sprintf("Подразделение 1: %q -> %q", before.SubdivisionL1, after.SubdivisionL1))
	}
	if strings.TrimSpace(before.SubdivisionL2) != strings.TrimSpace(after.SubdivisionL2) {
		changes = append(changes, fmt.Sprintf("Подразделение 2: %q -> %q", before.SubdivisionL2, after.SubdivisionL2))
	}
	beforeResponsible := strings.TrimSpace(before.ResponsibleEmployeeID)
	afterResponsible := strings.TrimSpace(after.ResponsibleEmployeeID)
	if beforeResponsible != afterResponsible {
		changes = append(changes, fmt.Sprintf("Ответственный: %q -> %q", beforeResponsible, afterResponsible))
	}
	if before.SnapshotHidden != after.SnapshotHidden {
		changes = append(changes, fmt.Sprintf("Скрытие подложки: %t -> %t", before.SnapshotHidden, after.SnapshotHidden))
	}
	beforePoints := formatPointsForAudit(before.Points)
	afterPoints := formatPointsForAudit(after.Points)
	if beforePoints != afterPoints {
		changes = append(changes, "Полигон: изменен")
		changes = append(changes, fmt.Sprintf("Координаты: %s -> %s", beforePoints, afterPoints))
	}
	return changes
}

func describeDeskAuditChanges(before, after desk) []string {
	changes := make([]string, 0)
	if strings.TrimSpace(before.Label) != strings.TrimSpace(after.Label) {
		changes = append(changes, fmt.Sprintf("Название стола: %q -> %q", before.Label, after.Label))
	}
	if before.SpaceID != after.SpaceID {
		changes = append(changes, fmt.Sprintf("Коворкинг ID: %d -> %d", before.SpaceID, after.SpaceID))
	}
	if before.X != after.X {
		changes = append(changes, fmt.Sprintf("X: %.2f -> %.2f", before.X, after.X))
	}
	if before.Y != after.Y {
		changes = append(changes, fmt.Sprintf("Y: %.2f -> %.2f", before.Y, after.Y))
	}
	if before.Width != after.Width {
		changes = append(changes, fmt.Sprintf("Ширина: %.2f -> %.2f", before.Width, after.Width))
	}
	if before.Height != after.Height {
		changes = append(changes, fmt.Sprintf("Высота: %.2f -> %.2f", before.Height, after.Height))
	}
	if before.Rotation != after.Rotation {
		changes = append(changes, fmt.Sprintf("Поворот: %.2f -> %.2f", before.Rotation, after.Rotation))
	}
	return changes
}
