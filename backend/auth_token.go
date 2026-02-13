package main

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
)

type authClaims struct {
	WbUserID   string
	UserName   string
	EmployeeID string
}

func extractAuthClaims(r *http.Request) authClaims {
	if r == nil {
		return authClaims{}
	}
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return authClaims{}
	}
	token := extractBearerToken(authHeader)
	if token == "" {
		return authClaims{}
	}
	return parseAuthClaimsFromToken(token)
}

func extractEmployeeIDFromRequest(r *http.Request, queryer rowQueryer) (string, error) {
	if r == nil {
		return "", nil
	}
	claims := extractAuthClaims(r)
	employeeID := strings.TrimSpace(claims.EmployeeID)
	if employeeID == "" {
		employeeID = strings.TrimSpace(r.Header.Get("X-Employee-Id"))
	}
	if employeeID != "" {
		return employeeID, nil
	}
	wbUserID := strings.TrimSpace(claims.WbUserID)
	if wbUserID == "" {
		wbUserID, _ = extractBookingUser(r)
	}
	if wbUserID == "" {
		return "", nil
	}
	return getEmployeeIDByWbUserID(r.Context(), queryer, wbUserID)
}

func parseAuthClaimsFromToken(token string) authClaims {
	raw := strings.TrimSpace(token)
	if raw == "" {
		return authClaims{}
	}
	payload := raw
	if strings.Count(raw, ".") >= 2 {
		parts := strings.Split(raw, ".")
		payload = parts[1]
	}
	decoded, err := decodeAuthTokenPayload(payload)
	if err != nil {
		return authClaims{}
	}
	var data map[string]any
	if err := json.Unmarshal(decoded, &data); err != nil {
		return authClaims{}
	}
	return extractAuthClaimsFromMap(data)
}

func decodeAuthTokenPayload(payload string) ([]byte, error) {
	trimmed := strings.TrimSpace(payload)
	if strings.HasPrefix(trimmed, "{") {
		return []byte(trimmed), nil
	}
	if decoded, err := base64.RawURLEncoding.DecodeString(trimmed); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.URLEncoding.DecodeString(trimmed); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.RawStdEncoding.DecodeString(trimmed); err == nil {
		return decoded, nil
	}
	return base64.StdEncoding.DecodeString(trimmed)
}

func extractAuthClaimsFromMap(data map[string]any) authClaims {
	if data == nil {
		return authClaims{}
	}
	maps := collectAuthMaps(data)
	wbUserID := pickFromMaps(
		maps,
		"user",
		"wb_user_id",
		"wbUserID",
		"wbUserId",
		"wb_userid",
		"wb_team_profile_id",
		"wbTeamProfileId",
		"profile_id",
		"profileId",
		"id",
		"user_key",
		"userKey",
		"user_id",
		"userId",
		"sub",
	)
	employeeID := pickFromMaps(maps, "employee_id", "employeeID", "employeeId")
	userName := pickFromMaps(
		maps,
		"full_name",
		"fullName",
		"name",
		"user_name",
		"userName",
		"username",
		"login",
	)
	return authClaims{
		WbUserID:   wbUserID,
		UserName:   userName,
		EmployeeID: employeeID,
	}
}

func collectAuthMaps(data map[string]any) []map[string]any {
	return []map[string]any{
		data,
		getAuthMap(data["user"]),
		getAuthMap(data["profile"]),
		getAuthMap(data["employee"]),
		getAuthMap(data["payload"]),
		getAuthMap(data["data"]),
		getAuthMap(data["claims"]),
		getAuthMap(data["userInfo"]),
		getAuthMap(data["user_info"]),
		getAuthMap(data["employeeInfo"]),
		getAuthMap(data["employee_info"]),
	}
}

func getAuthMap(value any) map[string]any {
	switch typed := value.(type) {
	case map[string]any:
		return typed
	case string:
		return parseAuthMapString(typed)
	default:
		return nil
	}
}

func parseAuthMapString(raw string) map[string]any {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if strings.HasPrefix(trimmed, "{") {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(trimmed), &parsed); err == nil {
			return parsed
		}
	}
	if decoded, err := decodeAuthTokenPayload(trimmed); err == nil {
		var parsed map[string]any
		if err := json.Unmarshal(decoded, &parsed); err == nil {
			return parsed
		}
	}
	return nil
}

func pickFromMaps(maps []map[string]any, keys ...string) string {
	for _, m := range maps {
		if m == nil {
			continue
		}
		if value := pickString(m, keys...); value != "" {
			return value
		}
	}
	return ""
}

func pickString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := m[key]; ok {
			if normalized := normalizeIDString(value); normalized != "" {
				return normalized
			}
		}
	}
	return ""
}
