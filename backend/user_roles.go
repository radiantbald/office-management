package main

import (
	"net/http"
	"strings"
)

type roleUpdateRequest struct {
	WbUserID      string `json:"wb_user_id"`
	EmployeeID    string `json:"employee_id"`
	TeamProfileID string `json:"wb_team_profile_id"`
	Role          int    `json:"role"`
}

func (a *app) handleUserRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	requesterID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester identity")
		return
	}
	if strings.TrimSpace(requesterID) == "" {
		respondError(w, http.StatusUnauthorized, "User identity is required")
		return
	}

	requesterRole, err := getUserRoleByWbUserID(r.Context(), a.db, requesterID)
	if err != nil {
		respondRoleResolutionError(w, err)
		return
	}
	if !hasPermission(requesterRole, permissionManageRoleAssignments) {
		respondError(w, http.StatusForbidden, "Admin role is required")
		return
	}

	var payload roleUpdateRequest
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	targetID := firstNonEmptyString(
		strings.TrimSpace(payload.WbUserID),
		strings.TrimSpace(payload.EmployeeID),
		strings.TrimSpace(payload.TeamProfileID),
	)
	if targetID == "" {
		respondError(w, http.StatusBadRequest, "Target user identifier is required")
		return
	}
	if !isValidRole(payload.Role) {
		respondError(w, http.StatusBadRequest, "Invalid role")
		return
	}

	result, err := a.db.Exec(
		`UPDATE users
		    SET role = $1
		  WHERE wb_user_id = $2 OR wb_team_profile_id = $2 OR employee_id = $2`,
		payload.Role,
		targetID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update role")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"user_id": targetID,
		"role":    payload.Role,
	})
}
