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

// Token TTL values are configurable at startup from env.
// Defaults are security-oriented:
// - access: 10 minutes
// - refresh: 30 days
var (
	officeAccessTokenTTL  = 10 * time.Minute
	officeRefreshTokenTTL = 30 * 24 * time.Hour
	officeJWTIssuer       = "office-management"
	officeJWTAccessAud    = "office-management-api"
	officeJWTRefreshAud   = "office-management-refresh"
	officeJWTClockSkew    = 30 * time.Second
)

// configureOfficeTokenTTLs updates token TTLs at startup.
// Non-positive values are ignored and existing values are preserved.
func configureOfficeTokenTTLs(accessTTL, refreshTTL time.Duration) {
	if accessTTL > 0 {
		officeAccessTokenTTL = accessTTL
	}
	if refreshTTL > 0 {
		officeRefreshTokenTTL = refreshTTL
	}
}

func configureOfficeJWTValidation(issuer, accessAudience, refreshAudience string, clockSkew time.Duration) {
	if trimmed := strings.TrimSpace(issuer); trimmed != "" {
		officeJWTIssuer = trimmed
	}
	if trimmed := strings.TrimSpace(accessAudience); trimmed != "" {
		officeJWTAccessAud = trimmed
	}
	if trimmed := strings.TrimSpace(refreshAudience); trimmed != "" {
		officeJWTRefreshAud = trimmed
	}
	if clockSkew >= 0 {
		officeJWTClockSkew = clockSkew
	}
}

// TokenResponsibilities holds the IDs of buildings, floors, and coworkings
// that the user is responsible for (can edit).
type TokenResponsibilities struct {
	Buildings  []int64 `json:"buildings,omitempty"`
	Floors     []int64 `json:"floors,omitempty"`
	Coworkings []int64 `json:"coworkings,omitempty"`
}

// OfficeAccessTokenClaims carries minimal identity + role in the signed Office Access Token JWT.
type OfficeAccessTokenClaims struct {
	EmployeeID       string                 `json:"employee_id"`
	UserName         string                 `json:"user_name,omitempty"`
	Role             int                    `json:"role"`
	Responsibilities *TokenResponsibilities `json:"responsibilities,omitempty"`
	Iss              string                 `json:"iss"`
	Aud              []string               `json:"aud"`
	Exp              int64                  `json:"exp"`
	Nbf              int64                  `json:"nbf"`
	Iat              int64                  `json:"iat"`
	JTI              string                 `json:"jti"`
}

// OfficeRefreshTokenClaims carries minimal identity info for refresh tokens.
type OfficeRefreshTokenClaims struct {
	EmployeeID string   `json:"employee_id"`
	TokenID    string   `json:"token_id"`  // Unique ID for this refresh token (random, high-entropy)
	FamilyID   string   `json:"family_id"` // Token-family ID for replay detection
	Iss        string   `json:"iss"`
	Aud        []string `json:"aud"`
	Exp        int64    `json:"exp"`
	Nbf        int64    `json:"nbf"`
	Iat        int64    `json:"iat"`
	JTI        string   `json:"jti"`
}

// jwtHeader is the constant HS256 header.
var jwtHeader = base64URLEncode([]byte(`{"alg":"HS256","typ":"JWT"}`))

// SignOfficeAccessToken creates a signed HS256 JWT for access token.
func SignOfficeAccessToken(claims OfficeAccessTokenClaims, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("office_access_token: empty signing secret")
	}
	now := time.Now().UTC()
	claims = prepareOfficeAccessClaims(claims, now)
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
	if err := validateOfficeAccessClaims(claims); err != nil {
		return nil, err
	}
	return &claims, nil
}

// SignOfficeRefreshToken creates a signed HS256 JWT for refresh token.
func SignOfficeRefreshToken(claims OfficeRefreshTokenClaims, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("office_refresh_token: empty signing secret")
	}
	now := time.Now().UTC()
	claims = prepareOfficeRefreshClaims(claims, now)
	if claims.Exp == 0 {
		claims.Exp = now.Add(officeRefreshTokenTTL).Unix()
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
	if claims.TokenID == "" {
		claims.TokenID = strings.TrimSpace(claims.JTI)
	}
	if err := validateOfficeRefreshClaims(claims); err != nil {
		return nil, err
	}
	return &claims, nil
}

func prepareOfficeAccessClaims(claims OfficeAccessTokenClaims, now time.Time) OfficeAccessTokenClaims {
	nowUnix := now.Unix()
	if claims.Iat == 0 {
		claims.Iat = nowUnix
	}
	if claims.Nbf == 0 {
		claims.Nbf = claims.Iat
	}
	if strings.TrimSpace(claims.Iss) == "" {
		claims.Iss = officeJWTIssuer
	}
	if len(claims.Aud) == 0 {
		claims.Aud = []string{officeJWTAccessAud}
	}
	if strings.TrimSpace(claims.JTI) == "" {
		claims.JTI = generateTokenID()
	}
	return claims
}

func prepareOfficeRefreshClaims(claims OfficeRefreshTokenClaims, now time.Time) OfficeRefreshTokenClaims {
	nowUnix := now.Unix()
	if claims.Iat == 0 {
		claims.Iat = nowUnix
	}
	if claims.Nbf == 0 {
		claims.Nbf = claims.Iat
	}
	if strings.TrimSpace(claims.Iss) == "" {
		claims.Iss = officeJWTIssuer
	}
	if len(claims.Aud) == 0 {
		claims.Aud = []string{officeJWTRefreshAud}
	}
	if claims.TokenID == "" {
		claims.TokenID = generateTokenID()
	}
	if strings.TrimSpace(claims.JTI) == "" {
		claims.JTI = claims.TokenID
	}
	if claims.TokenID == "" {
		claims.TokenID = claims.JTI
	}
	return claims
}

func validateOfficeAccessClaims(claims OfficeAccessTokenClaims) error {
	return validateStandardOfficeJWTClaims(
		"office_access_token",
		claims.Iss,
		claims.Aud,
		claims.Exp,
		claims.Nbf,
		claims.Iat,
		claims.JTI,
		officeJWTAccessAud,
	)
}

func validateOfficeRefreshClaims(claims OfficeRefreshTokenClaims) error {
	return validateStandardOfficeJWTClaims(
		"office_refresh_token",
		claims.Iss,
		claims.Aud,
		claims.Exp,
		claims.Nbf,
		claims.Iat,
		claims.JTI,
		officeJWTRefreshAud,
	)
}

func validateStandardOfficeJWTClaims(tokenType, iss string, aud []string, exp, nbf, iat int64, jti, requiredAudience string) error {
	if strings.TrimSpace(iss) == "" {
		return fmt.Errorf("%s: missing iss", tokenType)
	}
	if iss != officeJWTIssuer {
		return fmt.Errorf("%s: invalid iss", tokenType)
	}
	if len(aud) == 0 {
		return fmt.Errorf("%s: missing aud", tokenType)
	}
	if !audContains(aud, requiredAudience) {
		return fmt.Errorf("%s: invalid aud", tokenType)
	}
	if exp <= 0 {
		return fmt.Errorf("%s: missing exp", tokenType)
	}
	if nbf <= 0 {
		return fmt.Errorf("%s: missing nbf", tokenType)
	}
	if iat <= 0 {
		return fmt.Errorf("%s: missing iat", tokenType)
	}
	if strings.TrimSpace(jti) == "" {
		return fmt.Errorf("%s: missing jti", tokenType)
	}

	now := time.Now().UTC().Unix()
	skewSeconds := int64(officeJWTClockSkew / time.Second)
	if now > exp+skewSeconds {
		return fmt.Errorf("%s: token expired", tokenType)
	}
	if now+skewSeconds < nbf {
		return fmt.Errorf("%s: token is not active yet", tokenType)
	}
	return nil
}

func audContains(aud []string, required string) bool {
	required = strings.TrimSpace(required)
	for _, candidate := range aud {
		if strings.TrimSpace(candidate) == required {
			return true
		}
	}
	return false
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
// reconstruct the original value. The pepper should be independent from the
// JWT signing key so it can be rotated separately.
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
