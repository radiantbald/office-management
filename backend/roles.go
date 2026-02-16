package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
)

const (
	roleEmployee = 1
	roleAdmin    = 2
)

type permission string

const (
	permissionManageRoleAssignments   permission = "manage_role_assignments"
	permissionViewAnyResponsibilities permission = "view_any_responsibilities"
)

var errRequesterIdentityRequired = errors.New("requester identity is required")

func isValidRole(role int) bool {
	return role == roleEmployee || role == roleAdmin
}

func hasPermission(role int, required permission) bool {
	switch role {
	case roleAdmin:
		return true
	case roleEmployee:
		return false
	default:
		return false
	}
}

func isMutatingMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

// resolveRoleFromRequest determines the caller's role.
//
// Priority:
//  1. Mutating requests: database lookup by validated identity from token context.
//  2. Read-only requests: Office-Access-Token claims (cryptographically verified, includes role).
//  3. Fallback: database lookup.
func resolveRoleFromRequest(r *http.Request, queryer rowQueryer) (int, error) {
	if r == nil {
		return roleEmployee, nil
	}
	// For mutating endpoints always resolve role from DB so role changes apply immediately.
	if !isMutatingMethod(r.Method) {
		if atClaims := officeAccessTokenClaimsFromContext(r.Context()); atClaims != nil {
			if isValidRole(atClaims.Role) {
				return atClaims.Role, nil
			}
		}
	}

	// Resolve identity from validated request context first.
	employeeID, err := extractEmployeeIDFromRequest(r, queryer)
	if err != nil {
		return roleEmployee, err
	}
	if strings.TrimSpace(employeeID) != "" {
		return getUserRoleByWbUserID(r.Context(), queryer, employeeID)
	}

	// Final fallback: try user key from claims for legacy paths.
	wbUserID, _ := extractBookingUser(r)
	if strings.TrimSpace(wbUserID) == "" {
		return roleEmployee, errRequesterIdentityRequired
	}
	return getUserRoleByWbUserID(r.Context(), queryer, wbUserID)
}

func respondRoleResolutionError(w http.ResponseWriter, err error) {
	if errors.Is(err, errRequesterIdentityRequired) {
		respondError(w, http.StatusUnauthorized, "User identity is required")
		return
	}
	respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
}

func ensureNotEmployeeRole(w http.ResponseWriter, r *http.Request, queryer rowQueryer) bool {
	role, err := resolveRoleFromRequest(r, queryer)
	if err != nil {
		respondRoleResolutionError(w, err)
		return false
	}
	if role == roleEmployee {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return false
	}
	return true
}

func getUserRoleByWbUserID(ctx context.Context, queryer rowQueryer, wbUserID string) (int, error) {
	if queryer == nil || strings.TrimSpace(wbUserID) == "" {
		return roleEmployee, nil
	}
	row := queryer.QueryRowContext(ctx,
		`SELECT COALESCE(role, $2)
		   FROM users
		  WHERE wb_user_id = $1 OR wb_team_profile_id = $1 OR employee_id = $1
		  ORDER BY (wb_user_id = $1) DESC, (employee_id = $1) DESC
		  LIMIT 1`,
		strings.TrimSpace(wbUserID),
		roleEmployee,
	)
	var role int
	if err := row.Scan(&role); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return roleEmployee, nil
		}
		return roleEmployee, err
	}
	if !isValidRole(role) {
		return roleEmployee, nil
	}
	return role, nil
}

func defaultRoleForNewUser(tx *sql.Tx) (int, error) {
	if tx == nil {
		return roleEmployee, nil
	}
	// Use an advisory lock instead of LOCK TABLE IN EXCLUSIVE MODE to avoid
	// blocking all concurrent reads/writes on the users table.
	// Key 1 is an arbitrary application-level constant for "first user check".
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(1)`); err != nil {
		return roleEmployee, err
	}
	var count int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return roleEmployee, err
	}
	if count == 0 {
		return roleAdmin, nil
	}
	return roleEmployee, nil
}
