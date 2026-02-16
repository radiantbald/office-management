package main

import (
	"context"
	"database/sql"
	"time"
)

// refreshTokenStatus describes the state of a refresh token looked up in the DB.
type refreshTokenStatus int

const (
	refreshTokenNotFound refreshTokenStatus = iota // token_hash not in DB
	refreshTokenValid                               // active, not revoked
	refreshTokenRevoked                             // revoked/consumed → replay if reused!
	refreshTokenExpired                             // past expires_at
)

// storeRefreshToken saves a hashed refresh token with its family, IP and User-Agent.
// token_id is stored as HMAC-SHA256(tokenID, pepper) — never in plain text.
func (a *app) storeRefreshToken(ctx context.Context, tokenHash, employeeID, familyID, ipAddress, userAgent string, expiresAtUnix int64) error {
	expiresAt := time.Unix(expiresAtUnix, 0).UTC()
	_, err := a.db.ExecContext(ctx,
		`INSERT INTO office_refresh_tokens
		        (token_id, employee_id, family_id, ip_address, user_agent, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		tokenHash, employeeID, familyID, ipAddress, userAgent, expiresAt,
	)
	return err
}

// checkRefreshToken looks up the token by its hash and returns its status
// together with the family_id (needed for replay revocation).
func (a *app) checkRefreshToken(ctx context.Context, tokenHash, employeeID string) (refreshTokenStatus, string, error) {
	var revokedAt sql.NullTime
	var familyID string
	var expiresAt time.Time
	err := a.db.QueryRowContext(ctx,
		`SELECT revoked_at, family_id, expires_at
		   FROM office_refresh_tokens
		  WHERE token_id = $1 AND employee_id = $2`,
		tokenHash, employeeID,
	).Scan(&revokedAt, &familyID, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return refreshTokenNotFound, "", nil
		}
		return refreshTokenNotFound, "", err
	}
	if revokedAt.Valid {
		return refreshTokenRevoked, familyID, nil
	}
	if time.Now().UTC().After(expiresAt) {
		return refreshTokenExpired, familyID, nil
	}
	return refreshTokenValid, familyID, nil
}

// revokeRefreshToken marks a single refresh token as revoked and records
// the time it was last used.
func (a *app) revokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := a.db.ExecContext(ctx,
		`UPDATE office_refresh_tokens
		    SET revoked_at = now(), last_used_at = now()
		  WHERE token_id = $1 AND revoked_at IS NULL`,
		tokenHash,
	)
	return err
}

// revokeTokenFamily revokes every token that shares the same family_id.
// Called when a replay attack is detected (a previously consumed refresh
// token is presented again).
func (a *app) revokeTokenFamily(ctx context.Context, familyID string) error {
	if familyID == "" {
		return nil
	}
	_, err := a.db.ExecContext(ctx,
		`UPDATE office_refresh_tokens
		    SET revoked_at = now()
		  WHERE family_id = $1 AND revoked_at IS NULL`,
		familyID,
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
