package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
)

func (a *app) getCoworkingResponsibleEmployeeID(coworkingID int64) (string, error) {
	var employeeID string
	row := a.db.QueryRow(
		`SELECT COALESCE(responsible_employee_id, '') FROM coworkings WHERE id = $1`,
		coworkingID,
	)
	if err := row.Scan(&employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNotFound
		}
		return "", err
	}
	return strings.TrimSpace(employeeID), nil
}

func (a *app) getFloorResponsibleEmployeeID(floorID int64) (string, error) {
	var employeeID string
	row := a.db.QueryRow(
		`SELECT COALESCE(responsible_employee_id, '') FROM floors WHERE id = $1`,
		floorID,
	)
	if err := row.Scan(&employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNotFound
		}
		return "", err
	}
	return strings.TrimSpace(employeeID), nil
}

func (a *app) getBuildingResponsibleEmployeeID(buildingID int64) (string, error) {
	var employeeID string
	row := a.db.QueryRow(
		`SELECT COALESCE(responsible_employee_id, '') FROM office_buildings WHERE id = $1`,
		buildingID,
	)
	if err := row.Scan(&employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNotFound
		}
		return "", err
	}
	return strings.TrimSpace(employeeID), nil
}

func (a *app) getBuildingIDByFloorID(floorID int64) (int64, error) {
	var buildingID int64
	row := a.db.QueryRow(`SELECT building_id FROM floors WHERE id = $1`, floorID)
	if err := row.Scan(&buildingID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, errNotFound
		}
		return 0, err
	}
	return buildingID, nil
}

func (a *app) ensureCanManageBuilding(w http.ResponseWriter, r *http.Request, buildingID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	var responsibleID string
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(responsible_employee_id), '') FROM office_buildings WHERE id = $1`,
		buildingID,
	).Scan(&responsibleID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "building not found")
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return false
	}
	if responsibleID == "" || responsibleID != eid {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return true
}

func (a *app) ensureCanManageBuildingByFloor(w http.ResponseWriter, r *http.Request, floorID int64) bool {
	buildingID, err := a.getBuildingIDByFloorID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	return a.ensureCanManageBuilding(w, r, buildingID)
}

func (a *app) ensureCanManageBuildingBySpace(w http.ResponseWriter, r *http.Request, spaceID int64) bool {
	floorID, err := a.getSpaceFloorID(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	return a.ensureCanManageBuildingByFloor(w, r, floorID)
}

func (a *app) ensureCanManageFloorBySpace(w http.ResponseWriter, r *http.Request, spaceID int64) bool {
	floorID, err := a.getSpaceFloorID(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	return a.ensureCanManageFloor(w, r, floorID)
}

func (a *app) ensureCanManageFloor(w http.ResponseWriter, r *http.Request, floorID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	// Single query: floor → building with all responsible IDs.
	var buildingResp, floorResp string
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), '')
		   FROM floors f
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE f.id = $1`,
		floorID,
	).Scan(&buildingResp, &floorResp)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "floor not found")
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return false
	}
	if (buildingResp != "" && buildingResp == eid) ||
		(floorResp != "" && floorResp == eid) {
		return true
	}
	respondError(w, http.StatusForbidden, "Недостаточно прав")
	return false
}

func (a *app) getCoworkingIDByDeskID(deskID int64) (int64, error) {
	var coworkingID int64
	row := a.db.QueryRow(
		`SELECT coworking_id FROM workplaces WHERE id = $1`,
		deskID,
	)
	if err := row.Scan(&coworkingID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, errNotFound
		}
		return 0, err
	}
	return coworkingID, nil
}

func (a *app) getCoworkingIDsByDeskIDs(ids []int64) ([]int64, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	placeholders := make([]string, 0, len(ids))
	args := make([]any, 0, len(ids))
	for i, id := range ids {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		args = append(args, id)
	}
	query := fmt.Sprintf(
		`SELECT id, coworking_id FROM workplaces WHERE id IN (%s)`,
		strings.Join(placeholders, ","),
	)
	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	coworkingIDs := make(map[int64]struct{})
	found := make(map[int64]struct{})
	for rows.Next() {
		var deskID int64
		var coworkingID int64
		if err := rows.Scan(&deskID, &coworkingID); err != nil {
			return nil, err
		}
		found[deskID] = struct{}{}
		coworkingIDs[coworkingID] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(found) != len(ids) {
		return nil, errNotFound
	}
	unique := make([]int64, 0, len(coworkingIDs))
	for id := range coworkingIDs {
		unique = append(unique, id)
	}
	return unique, nil
}

func (a *app) ensureCanManageSpace(w http.ResponseWriter, r *http.Request, spaceID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	// Try coworking first (single query with full hierarchy).
	var buildingResp, floorResp, coworkingResp string
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), ''),
		        COALESCE(TRIM(c.responsible_employee_id), '')
		   FROM coworkings c
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE c.id = $1`,
		spaceID,
	).Scan(&buildingResp, &floorResp, &coworkingResp)
	if err == nil {
		if (buildingResp != "" && buildingResp == eid) ||
			(floorResp != "" && floorResp == eid) ||
			(coworkingResp != "" && coworkingResp == eid) {
			return true
		}
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	if !errors.Is(err, sql.ErrNoRows) {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	// Maybe it's a meeting room.
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), '')
		   FROM meeting_rooms mr
		   JOIN floors f ON f.id = mr.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE mr.id = $1`,
		spaceID,
	).Scan(&buildingResp, &floorResp)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "space not found")
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return false
	}
	if (buildingResp != "" && buildingResp == eid) || (floorResp != "" && floorResp == eid) {
		return true
	}
	respondError(w, http.StatusForbidden, "Недостаточно прав")
	return false
}

func (a *app) ensureCanManageCoworking(w http.ResponseWriter, r *http.Request, coworkingID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	// Single query: resolve hierarchy and all responsible employee IDs.
	var buildingResp, floorResp, coworkingResp string
	err = a.db.QueryRowContext(r.Context(),
		`SELECT COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), ''),
		        COALESCE(TRIM(c.responsible_employee_id), '')
		   FROM coworkings c
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE c.id = $1`,
		coworkingID,
	).Scan(&buildingResp, &floorResp, &coworkingResp)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "space not found")
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return false
	}
	if (buildingResp != "" && buildingResp == eid) ||
		(floorResp != "" && floorResp == eid) ||
		(coworkingResp != "" && coworkingResp == eid) {
		return true
	}
	respondError(w, http.StatusForbidden, "Недостаточно прав")
	return false
}

func (a *app) ensureCanManageCoworkings(w http.ResponseWriter, r *http.Request, coworkingIDs []int64) bool {
	if len(coworkingIDs) == 0 {
		return true
	}
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}

	// Single batch query instead of N+1.
	placeholders := make([]string, len(coworkingIDs))
	args := make([]any, len(coworkingIDs))
	for i, id := range coworkingIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	query := fmt.Sprintf(
		`SELECT c.id,
		        COALESCE(TRIM(b.responsible_employee_id), ''),
		        COALESCE(TRIM(f.responsible_employee_id), ''),
		        COALESCE(TRIM(c.responsible_employee_id), '')
		   FROM coworkings c
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE c.id IN (%s)`,
		strings.Join(placeholders, ","),
	)
	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	defer rows.Close()

	manageable := make(map[int64]bool, len(coworkingIDs))
	for rows.Next() {
		var cID int64
		var buildingResp, floorResp, coworkingResp string
		if err := rows.Scan(&cID, &buildingResp, &floorResp, &coworkingResp); err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return false
		}
		canManage := (buildingResp != "" && buildingResp == eid) ||
			(floorResp != "" && floorResp == eid) ||
			(coworkingResp != "" && coworkingResp == eid)
		manageable[cID] = canManage
	}
	if err := rows.Err(); err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	for _, id := range coworkingIDs {
		allowed, found := manageable[id]
		if !found {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		if !allowed {
			respondError(w, http.StatusForbidden, "Недостаточно прав")
			return false
		}
	}
	return true
}

func (a *app) ensureCanManageDesk(w http.ResponseWriter, r *http.Request, deskID int64) bool {
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	employeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	eid := strings.TrimSpace(employeeID)
	if eid == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	// Single query: desk → coworking → floor → building with all responsible IDs.
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
		deskID,
	).Scan(&buildingResp, &floorResp, &coworkingResp)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "desk not found")
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return false
	}
	if (buildingResp != "" && buildingResp == eid) ||
		(floorResp != "" && floorResp == eid) ||
		(coworkingResp != "" && coworkingResp == eid) {
		return true
	}
	respondError(w, http.StatusForbidden, "Недостаточно прав")
	return false
}

func (a *app) ensureCanManageDesks(w http.ResponseWriter, r *http.Request, deskIDs []int64) bool {
	if len(deskIDs) == 0 {
		return true
	}
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return false
	}
	if role != roleEmployee {
		return true
	}
	coworkingIDs, err := a.getCoworkingIDsByDeskIDs(deskIDs)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return false
		}
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return false
	}
	return a.ensureCanManageCoworkings(w, r, coworkingIDs)
}
