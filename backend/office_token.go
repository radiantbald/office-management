package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Token TTL constants
const (
	officeAccessTokenTTL  = 1 * time.Hour      // Access token lives 1 hour
	officeRefreshTokenTTL = 30 * 24 * time.Hour // Refresh token lives 30 days
)

// TokenResponsibilities holds the IDs of buildings, floors, and coworkings
// that the user is responsible for (can edit).
type TokenResponsibilities struct {
	Buildings  []int64 `json:"buildings,omitempty"`
	Floors     []int64 `json:"floors,omitempty"`
	Coworkings []int64 `json:"coworkings,omitempty"`
}

// OfficeAccessTokenClaims carries identity + role + responsibilities inside the signed Office Access Token JWT.
type OfficeAccessTokenClaims struct {
	EmployeeID        string                 `json:"employee_id"`
	UserName          string                 `json:"user_name,omitempty"`
	Role              int                    `json:"role"`
	Responsibilities  *TokenResponsibilities `json:"responsibilities,omitempty"`
	Exp               int64                  `json:"exp"`
	Iat               int64                  `json:"iat"`
}

// OfficeRefreshTokenClaims carries minimal identity info for refresh tokens.
type OfficeRefreshTokenClaims struct {
	EmployeeID string `json:"employee_id"`
	TokenID    string `json:"token_id"`  // Unique ID for this refresh token (random, high-entropy)
	FamilyID   string `json:"family_id"` // Token-family ID for replay detection
	Exp        int64  `json:"exp"`
	Iat        int64  `json:"iat"`
}

// jwtHeader is the constant HS256 header.
var jwtHeader = base64URLEncode([]byte(`{"alg":"HS256","typ":"JWT"}`))

// SignOfficeAccessToken creates a signed HS256 JWT for access token.
func SignOfficeAccessToken(claims OfficeAccessTokenClaims, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("office_access_token: empty signing secret")
	}
	now := time.Now().UTC()
	claims.Iat = now.Unix()
	if claims.Exp == 0 {
		claims.Exp = now.Add(officeAccessTokenTTL).Unix()
	}
	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("office_access_token: marshal claims: %w", err)
	}
	payload := base64URLEncode(payloadJSON)
	signingInput := jwtHeader + "." + payload
	sig := hmacSHA256([]byte(signingInput), secret)
	return signingInput + "." + base64URLEncode(sig), nil
}

// VerifyOfficeAccessToken validates the signature and expiration and returns the claims.
func VerifyOfficeAccessToken(tokenStr string, secret []byte) (*OfficeAccessTokenClaims, error) {
	if len(secret) == 0 {
		return nil, errors.New("office_access_token: empty signing secret")
	}
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("office_access_token: malformed token")
	}
	signingInput := parts[0] + "." + parts[1]
	sigBytes, err := base64URLDecode(parts[2])
	if err != nil {
		return nil, fmt.Errorf("office_access_token: decode signature: %w", err)
	}
	expected := hmacSHA256([]byte(signingInput), secret)
	if !hmac.Equal(sigBytes, expected) {
		return nil, errors.New("office_access_token: invalid signature")
	}
	payloadJSON, err := base64URLDecode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("office_access_token: decode payload: %w", err)
	}
	var claims OfficeAccessTokenClaims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return nil, fmt.Errorf("office_access_token: unmarshal claims: %w", err)
	}
	if time.Now().UTC().Unix() > claims.Exp {
		return nil, errors.New("office_access_token: token expired")
	}
	return &claims, nil
}

// SignOfficeRefreshToken creates a signed HS256 JWT for refresh token.
func SignOfficeRefreshToken(claims OfficeRefreshTokenClaims, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("office_refresh_token: empty signing secret")
	}
	now := time.Now().UTC()
	claims.Iat = now.Unix()
	if claims.Exp == 0 {
		claims.Exp = now.Add(officeRefreshTokenTTL).Unix()
	}
	if claims.TokenID == "" {
		claims.TokenID = generateTokenID()
	}
	if claims.FamilyID == "" {
		claims.FamilyID = generateTokenID()
	}
	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("office_refresh_token: marshal claims: %w", err)
	}
	payload := base64URLEncode(payloadJSON)
	signingInput := jwtHeader + "." + payload
	sig := hmacSHA256([]byte(signingInput), secret)
	return signingInput + "." + base64URLEncode(sig), nil
}

// VerifyOfficeRefreshToken validates the signature and expiration and returns the claims.
func VerifyOfficeRefreshToken(tokenStr string, secret []byte) (*OfficeRefreshTokenClaims, error) {
	if len(secret) == 0 {
		return nil, errors.New("office_refresh_token: empty signing secret")
	}
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("office_refresh_token: malformed token")
	}
	signingInput := parts[0] + "." + parts[1]
	sigBytes, err := base64URLDecode(parts[2])
	if err != nil {
		return nil, fmt.Errorf("office_refresh_token: decode signature: %w", err)
	}
	expected := hmacSHA256([]byte(signingInput), secret)
	if !hmac.Equal(sigBytes, expected) {
		return nil, errors.New("office_refresh_token: invalid signature")
	}
	payloadJSON, err := base64URLDecode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("office_refresh_token: decode payload: %w", err)
	}
	var claims OfficeRefreshTokenClaims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return nil, fmt.Errorf("office_refresh_token: unmarshal claims: %w", err)
	}
	if time.Now().UTC().Unix() > claims.Exp {
		return nil, errors.New("office_refresh_token: token expired")
	}
	return &claims, nil
}

// generateTokenID creates a unique token ID for refresh tokens.
func generateTokenID() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based ID
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// hashTokenID produces HMAC-SHA256(token_id, pepper) so that the raw token_id
// is never stored in the database.  Even with full DB access an attacker cannot
// reconstruct the original value.  The pepper is the application-level JWT
// signing secret (officeJWTSecret).
func hashTokenID(tokenID string, pepper []byte) string {
	mac := hmac.New(sha256.New, pepper)
	mac.Write([]byte(tokenID))
	return hex.EncodeToString(mac.Sum(nil))
}

// --- helpers ---

func hmacSHA256(data, key []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}

func base64URLEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func base64URLDecode(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(s)
}
