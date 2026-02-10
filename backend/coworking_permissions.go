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
	kind, err := a.getSpaceKind(spaceID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			respondError(w, http.StatusNotFound, "space not found")
			return false
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if kind != "coworking" {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return a.ensureCanManageCoworking(w, r, spaceID)
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
