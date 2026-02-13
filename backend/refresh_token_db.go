package main

import (
	"context"
	"database/sql"
	"time"
)

// storeRefreshToken saves a refresh token to the database.
func (a *app) storeRefreshToken(ctx context.Context, tokenID, employeeID string, expiresAtUnix int64) error {
	expiresAt := time.Unix(expiresAtUnix, 0).UTC()
	_, err := a.db.ExecContext(ctx,
		`INSERT INTO office_refresh_tokens (token_id, employee_id, expires_at)
		 VALUES ($1, $2, $3)`,
		tokenID, employeeID, expiresAt,
	)
	return err
}

// isRefreshTokenValid checks if a refresh token is valid (exists and not revoked).
func (a *app) isRefreshTokenValid(ctx context.Context, tokenID, employeeID string) (bool, error) {
	var revokedAt sql.NullTime
	err := a.db.QueryRowContext(ctx,
		`SELECT revoked_at
		   FROM office_refresh_tokens
		  WHERE token_id = $1 AND employee_id = $2`,
		tokenID, employeeID,
	).Scan(&revokedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	// Token is valid if not revoked
	return !revokedAt.Valid, nil
}

// revokeRefreshToken marks a refresh token as revoked.
func (a *app) revokeRefreshToken(ctx context.Context, tokenID string) error {
	_, err := a.db.ExecContext(ctx,
		`UPDATE office_refresh_tokens
		    SET revoked_at = now()
		  WHERE token_id = $1 AND revoked_at IS NULL`,
		tokenID,
	)
	return err
}

// revokeAllUserRefreshTokens revokes all refresh tokens for a specific user.
func (a *app) revokeAllUserRefreshTokens(ctx context.Context, employeeID string) error {
	_, err := a.db.ExecContext(ctx,
		`UPDATE office_refresh_tokens
		    SET revoked_at = now()
		  WHERE employee_id = $1 AND revoked_at IS NULL`,
		employeeID,
	)
	return err
}

// cleanupExpiredRefreshTokens removes expired refresh tokens from the database.
// This should be called periodically (e.g., daily).
func (a *app) cleanupExpiredRefreshTokens(ctx context.Context) error {
	_, err := a.db.ExecContext(ctx,
		`DELETE FROM office_refresh_tokens
		  WHERE expires_at < now()`,
	)
	return err
}

// getUserNameByEmployeeID retrieves the user name from the database by employee_id.
func getUserNameByEmployeeID(ctx context.Context, db *sql.DB, employeeID string) (string, error) {
	var fullName string
	err := db.QueryRowContext(ctx,
		`SELECT COALESCE(full_name, '')
		   FROM users
		  WHERE employee_id = $1
		  LIMIT 1`,
		employeeID,
	).Scan(&fullName)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return fullName, nil
}
