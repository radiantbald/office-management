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

func isValidRole(role int) bool {
	return role == roleEmployee || role == roleAdmin
}

// resolveRoleFromRequest determines the caller's role.
//
// Priority:
//  1. Office-Access-Token claims (cryptographically verified, includes role).
//  2. Database lookup by wb_user_id from the authorization claims.
func resolveRoleFromRequest(r *http.Request, queryer rowQueryer) (int, error) {
	// Fast path: role is already embedded in the verified Office-Access-Token.
	if atClaims := officeAccessTokenClaimsFromContext(r.Context()); atClaims != nil {
		if isValidRole(atClaims.Role) {
			return atClaims.Role, nil
		}
	}
	// Slow path: fall back to DB.
	wbUserID, _ := extractBookingUser(r)
	if strings.TrimSpace(wbUserID) == "" {
		return roleEmployee, nil
	}
	return getUserRoleByWbUserID(r.Context(), queryer, wbUserID)
}

func ensureNotEmployeeRole(w http.ResponseWriter, r *http.Request, queryer rowQueryer) bool {
	role, err := resolveRoleFromRequest(r, queryer)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
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
