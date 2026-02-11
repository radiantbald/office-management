package main

import (
	"database/sql"
	"errors"
	"fmt"
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if strings.TrimSpace(employeeID) == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	responsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "building not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleID == "" || responsibleID != strings.TrimSpace(employeeID) {
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
		respondError(w, http.StatusInternalServerError, err.Error())
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	return a.ensureCanManageBuildingByFloor(w, r, floorID)
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if strings.TrimSpace(employeeID) == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	buildingID, err := a.getBuildingIDByFloorID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	buildingResponsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "building not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if buildingResponsibleID != "" && buildingResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	responsibleID, err := a.getFloorResponsibleEmployeeID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleID == "" || responsibleID != strings.TrimSpace(employeeID) {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return true
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if strings.TrimSpace(employeeID) == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	kind, err := a.getSpaceKind(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	floorID, err := a.getSpaceFloorID(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	buildingID, err := a.getBuildingIDByFloorID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	buildingResponsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "building not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if buildingResponsibleID != "" && buildingResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	responsibleFloorID, err := a.getFloorResponsibleEmployeeID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleFloorID != "" && responsibleFloorID == strings.TrimSpace(employeeID) {
		return true
	}
	if kind != "coworking" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	responsibleID, err := a.getCoworkingResponsibleEmployeeID(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleID == "" || responsibleID != strings.TrimSpace(employeeID) {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return true
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if strings.TrimSpace(employeeID) == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	floorID, err := a.getSpaceFloorID(coworkingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	buildingID, err := a.getBuildingIDByFloorID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	buildingResponsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "building not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if buildingResponsibleID != "" && buildingResponsibleID == strings.TrimSpace(employeeID) {
		return true
	}
	responsibleFloorID, err := a.getFloorResponsibleEmployeeID(floorID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "floor not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleFloorID != "" && responsibleFloorID == strings.TrimSpace(employeeID) {
		return true
	}
	responsibleID, err := a.getCoworkingResponsibleEmployeeID(coworkingID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if responsibleID == "" || responsibleID != strings.TrimSpace(employeeID) {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return true
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if strings.TrimSpace(employeeID) == "" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	for _, coworkingID := range coworkingIDs {
		floorID, err := a.getSpaceFloorID(coworkingID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "space not found")
				return false
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return false
		}
		buildingID, err := a.getBuildingIDByFloorID(floorID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "floor not found")
				return false
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return false
		}
		buildingResponsibleID, err := a.getBuildingResponsibleEmployeeID(buildingID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "building not found")
				return false
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return false
		}
		if buildingResponsibleID != "" && buildingResponsibleID == strings.TrimSpace(employeeID) {
			continue
		}
		responsibleFloorID, err := a.getFloorResponsibleEmployeeID(floorID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "floor not found")
				return false
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return false
		}
		if responsibleFloorID != "" && responsibleFloorID == strings.TrimSpace(employeeID) {
			continue
		}
		responsibleID, err := a.getCoworkingResponsibleEmployeeID(coworkingID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "space not found")
				return false
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return false
		}
		if responsibleID == "" || responsibleID != strings.TrimSpace(employeeID) {
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
	coworkingID, err := a.getCoworkingIDByDeskID(deskID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "desk not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	return a.ensureCanManageCoworking(w, r, coworkingID)
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	return a.ensureCanManageCoworkings(w, r, coworkingIDs)
}
