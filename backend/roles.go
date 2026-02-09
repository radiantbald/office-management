package main

import (
	"database/sql"
	"errors"
	"net/http"
	"os"
	"strings"
)

const (
	roleEmployee  = 1
	roleSecretary = 2
	roleAdmin     = 3
)

func isValidRole(role int) bool {
	return role == roleEmployee || role == roleSecretary || role == roleAdmin
}

func roleTokenFor(role int) string {
	switch role {
	case roleEmployee:
		return strings.TrimSpace(os.Getenv("ROLE_TOKEN_EMPLOYEE"))
	case roleSecretary:
		return strings.TrimSpace(os.Getenv("ROLE_TOKEN_SECRETARY"))
	case roleAdmin:
		return strings.TrimSpace(os.Getenv("ROLE_TOKEN_ADMIN"))
	default:
		return ""
	}
}

func roleTokenFromRequest(r *http.Request) string {
	if r == nil {
		return ""
	}
	token := strings.TrimSpace(r.Header.Get("role_token"))
	if token != "" {
		return token
	}
	return strings.TrimSpace(r.Header.Get("Role-Token"))
}

func getUserRoleByWbUserID(queryer rowQueryer, wbUserID string) (int, error) {
	if queryer == nil || strings.TrimSpace(wbUserID) == "" {
		return roleEmployee, nil
	}
	row := queryer.QueryRow(
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
	if _, err := tx.Exec(`LOCK TABLE users IN EXCLUSIVE MODE`); err != nil {
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
