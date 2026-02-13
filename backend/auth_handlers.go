package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var profileIDPattern = regexp.MustCompile(`^\d+$`)

// handleAuthUserInfo проксирует запрос к team.wb.ru/api/v1/user/info
func (a *app) handleAuthUserInfo(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		log.Printf("handleAuthUserInfo: Authorization header is missing")
		respondError(w, http.StatusUnauthorized, "Authorization header is required")
		return
	}

	token := extractBearerToken(authHeader)
	if token == "" {
		log.Printf("handleAuthUserInfo: Token is empty after extraction")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"code":    3,
			"error":   "empty_token",
			"message": "Empty token",
			"status":  401,
		})
		return
	}

	req, err := http.NewRequest(http.MethodGet, "https://team.wb.ru/api/v1/user/info", nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create request")
		return
	}

	req.Header.Set("accept", "application/json, text/plain, */*")
	req.Header.Set("authorization", "Bearer "+token)
	req.Header.Set("cache-control", "no-cache")
	req.Header.Set("pragma", "no-cache")
	req.Header.Set("referer", "https://team.wb.ru/account")
	req.Header.Set("sec-fetch-dest", "empty")
	req.Header.Set("sec-fetch-mode", "cors")
	req.Header.Set("sec-fetch-site", "same-origin")
	req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36")

	cookie, source := collectCookies(r)
	if cookie != "" {
		req.Header.Set("Cookie", cookie)
		log.Printf("handleAuthUserInfo: Forwarding cookies from %s (length: %d)", source, len(cookie))
	} else {
		log.Printf("handleAuthUserInfo: No cookies found")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("handleAuthUserInfo: Error making request to team.wb.ru: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to make request")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read response")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)

	var jsonData map[string]any
	if err := json.Unmarshal(body, &jsonData); err == nil {
		if dataMap, ok := jsonData["data"].(map[string]any); ok {
			profileID := toInt64(dataMap["id"])
			wbUserID := normalizeIDString(dataMap["wbUserID"])
			fullName := normalizeIDString(dataMap["fullName"])
			userName := firstNonEmptyString(
				fullName,
				normalizeIDString(dataMap["name"]),
			)
			employeeID := normalizeIDString(dataMap["employeeID"])
			profileIDStr := normalizeIDString(dataMap["id"])
			avatarURL := normalizeIDString(dataMap["avatar_url"])

			wbBand := ""
			if cached, err := a.getUserWBBand(wbUserID); err == nil && cached != "" {
				wbBand = cached
			} else if profileID != 0 {
				profileIDStr := fmt.Sprintf("%d", profileID)
				band, err := a.fetchWBBandFromTeam(token, profileIDStr, cookie)
				if err == nil && band != "" {
					wbBand = band
					if err := a.upsertUserWBBand(wbUserID, userName, band); err != nil {
						log.Printf("handleAuthUserInfo: failed to save wb_band: %v", err)
					}
				}
			}
			if err := a.upsertUserInfo(wbUserID, userName, fullName, employeeID, profileIDStr, avatarURL, wbBand); err != nil {
				log.Printf("handleAuthUserInfo: failed to save user info: %v", err)
			}
			roleID, err := getUserRoleByWbUserID(r.Context(), a.db, wbUserID)
			if err != nil {
				log.Printf("handleAuthUserInfo: failed to resolve role: %v", err)
				roleID = roleEmployee
			}

			response := map[string]any{
				"status": jsonData["status"],
				"data": map[string]any{
					"avatar_url":         dataMap["avatar_url"],
					"employee_id":        dataMap["employeeID"],
					"full_name":          dataMap["fullName"],
					"wb_team_profile_id": dataMap["id"],
					"wb_user_id":         dataMap["wbUserID"],
					"wb_band":            wbBand,
					"role":               roleID,
				},
			}
			_ = json.NewEncoder(w).Encode(response)
			return
		}
		_ = json.NewEncoder(w).Encode(jsonData)
		return
	}
	_, _ = w.Write(body)
}

// handleAuthUserWbBand проксирует запрос к team.wb.ru/api/v1/user/profile/{id}/wbband
// и сохраняет wb_band в таблицу users по ключу пользователя.
func (a *app) handleAuthUserWbBand(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		log.Printf("handleAuthUserWbBand: Authorization header is missing")
		respondError(w, http.StatusUnauthorized, "Authorization header is required")
		return
	}

	token := extractBearerToken(authHeader)
	if token == "" {
		log.Printf("handleAuthUserWbBand: Token is empty after extraction")
		respondError(w, http.StatusUnauthorized, "Invalid authorization token")
		return
	}

	profileID := strings.TrimSpace(r.URL.Query().Get("wb_team_profile_id"))
	if profileID == "" {
		profileID = strings.TrimSpace(r.URL.Query().Get("profile_id"))
	}
	if profileID == "" {
		respondError(w, http.StatusBadRequest, "wb_team_profile_id is required")
		return
	}

	body, status, err := a.fetchWBBandRaw(token, profileID, "", r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to make request")
		return
	}

	var parsed struct {
		Status int `json:"status"`
		Data   struct {
			WBBand string `json:"wb_band"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &parsed); err == nil {
		// Identity comes exclusively from the JWT token — no header fallbacks.
		claims := extractAuthClaims(r)
		wbUserID := strings.TrimSpace(claims.WbUserID)
		userName := strings.TrimSpace(claims.UserName)
		if parsed.Data.WBBand != "" && wbUserID != "" {
			if err := a.upsertUserWBBand(wbUserID, userName, parsed.Data.WBBand); err != nil {
				log.Printf("handleAuthUserWbBand: failed to save wb_band: %v", err)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	var jsonData interface{}
	if err := json.Unmarshal(body, &jsonData); err == nil {
		_ = json.NewEncoder(w).Encode(jsonData)
		return
	}
	_, _ = w.Write(body)
}

func (a *app) fetchWBBandFromTeam(token, profileID, cookie string) (string, error) {
	body, _, err := a.fetchWBBandRaw(token, profileID, cookie, nil)
	if err != nil {
		return "", err
	}
	var parsed struct {
		Status int `json:"status"`
		Data   struct {
			WBBand string `json:"wb_band"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}
	return strings.TrimSpace(parsed.Data.WBBand), nil
}

func (a *app) fetchWBBandRaw(token, profileID, cookie string, sourceReq *http.Request) ([]byte, int, error) {
	// Validate profileID is strictly numeric to prevent SSRF via path traversal.
	if !profileIDPattern.MatchString(profileID) {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid profile ID: %q", profileID)
	}
	url := fmt.Sprintf("https://team.wb.ru/api/v1/user/profile/%s/wbband", profileID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	req.Header.Set("accept", "application/json, text/plain, */*")
	req.Header.Set("authorization", "Bearer "+token)
	req.Header.Set("cache-control", "no-cache")
	req.Header.Set("pragma", "no-cache")
	req.Header.Set("referer", "https://team.wb.ru/account")
	req.Header.Set("sec-fetch-dest", "empty")
	req.Header.Set("sec-fetch-mode", "cors")
	req.Header.Set("sec-fetch-site", "same-origin")
	req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36")

	if sourceReq != nil {
		cookie, source := collectCookies(sourceReq)
		if cookie != "" {
			req.Header.Set("Cookie", cookie)
			log.Printf("handleAuthUserWbBand: Forwarding cookies from %s (length: %d)", source, len(cookie))
		} else {
			log.Printf("handleAuthUserWbBand: No cookies found")
		}
	} else if strings.TrimSpace(cookie) != "" {
		req.Header.Set("Cookie", cookie)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return body, resp.StatusCode, nil
}

func toInt64(value any) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case string:
		parsed, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
		if err != nil {
			return 0
		}
		return parsed
	default:
		return 0
	}
}

func normalizeIDString(value any) string {
	if value == nil {
		return ""
	}
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		if v == 0 {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%.0f", v))
	case int64:
		if v == 0 {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%d", v))
	case int:
		if v == 0 {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%d", v))
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

// handleAuthRequestCode проксирует запрос к auth-hrtech.wb.ru/v2/code/wb-captcha
func (a *app) handleAuthRequestCode(w http.ResponseWriter, r *http.Request) {
	if a.authRateLimiter != nil && !a.authRateLimiter.allow(clientIP(r)) {
		respondError(w, http.StatusTooManyRequests, "Too many requests, try again later")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer r.Body.Close()

	req, err := http.NewRequest(http.MethodPost, "https://auth-hrtech.wb.ru/v2/code/wb-captcha", strings.NewReader(string(body)))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create request")
		return
	}

	for _, headerName := range []string{"deviceid", "devicename", "wb-apptype"} {
		if value := r.Header.Get(headerName); value != "" {
			req.Header.Set(headerName, value)
		}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Origin", "https://team.wb.ru")
	req.Header.Set("Referer", "https://team.wb.ru/")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to make request")
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read response")
		return
	}

	for _, cookie := range resp.Header.Values("Set-Cookie") {
		w.Header().Add("X-Set-Cookie", cookie)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(respBody)
}

// handleAuthConfirmCode проксирует запрос к auth-hrtech.wb.ru/v2/auth
func (a *app) handleAuthConfirmCode(w http.ResponseWriter, r *http.Request) {
	if a.authRateLimiter != nil && !a.authRateLimiter.allow(clientIP(r)) {
		respondError(w, http.StatusTooManyRequests, "Too many requests, try again later")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer r.Body.Close()

	cookie := r.Header.Get("X-Cookie")
	if cookie == "" {
		cookie = r.Header.Get("Cookie")
	}

	req, err := http.NewRequest(http.MethodPost, "https://auth-hrtech.wb.ru/v2/auth", strings.NewReader(string(body)))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create request")
		return
	}

	for _, headerName := range []string{"deviceid", "devicename", "wb-apptype"} {
		if value := r.Header.Get(headerName); value != "" {
			req.Header.Set(headerName, value)
		}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Origin", "https://team.wb.ru")
	req.Header.Set("Referer", "https://team.wb.ru/")

	if cookie != "" {
		req.Header.Set("Cookie", cookie)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to make request")
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read response")
		return
	}

	for _, setCookie := range resp.Header.Values("Set-Cookie") {
		w.Header().Add("X-Set-Cookie", setCookie)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(respBody)
}

func extractBearerToken(authHeader string) string {
	token := authHeader
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else if strings.HasPrefix(authHeader, "bearer ") {
		token = strings.TrimPrefix(authHeader, "bearer ")
	}
	return strings.TrimSpace(token)
}

// handleAuthOfficeToken issues both access and refresh tokens.
// The endpoint requires a valid Authorization bearer token (the caller must
// already be authenticated). It resolves identity from the JWT claims and
// the user's role from the database, then returns signed tokens
// that the client can use for all subsequent API requests.
//
// POST /api/auth/office-token
// Response: { "office_access_token": "<jwt>", "office_refresh_token": "<jwt>" }
func (a *app) handleAuthOfficeToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if len(a.officeJWTSecret) == 0 {
		respondError(w, http.StatusServiceUnavailable, "Office token signing is not configured")
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondError(w, http.StatusUnauthorized, "Authorization header is required")
		return
	}
	token := extractBearerToken(authHeader)
	if token == "" {
		respondError(w, http.StatusUnauthorized, "Invalid authorization token")
		return
	}

	claims := parseAuthClaimsFromToken(token)
	employeeID := strings.TrimSpace(claims.EmployeeID)
	if employeeID == "" {
		// Fallback to wb_user_id for role lookup
		wbUserID := strings.TrimSpace(claims.WbUserID)
		if wbUserID == "" {
			respondError(w, http.StatusUnauthorized, "Unable to identify user from token")
			return
		}
		// Try to get employee_id from database using wb_user_id
		dbEmployeeID, err := getEmployeeIDByWbUserID(r.Context(), a.db, wbUserID)
		if err == nil && dbEmployeeID != "" {
			employeeID = dbEmployeeID
		} else {
			respondError(w, http.StatusUnauthorized, "employee_id is required for office token")
			return
		}
	}

	roleID, err := getUserRoleByWbUserID(r.Context(), a.db, employeeID)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to resolve role for %s: %v", employeeID, err)
		roleID = roleEmployee
	}

	// Load user responsibilities for the token
	responsibilities := a.loadResponsibilitiesForToken(employeeID)

	// Create access token
	accessClaims := OfficeAccessTokenClaims{
		EmployeeID:       employeeID,
		UserName:         strings.TrimSpace(claims.UserName),
		Role:             roleID,
		Responsibilities: responsibilities,
	}
	accessToken, err := SignOfficeAccessToken(accessClaims, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to sign access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue office access token")
		return
	}

	// Create refresh token
	refreshClaims := OfficeRefreshTokenClaims{
		EmployeeID: employeeID,
	}
	refreshToken, err := SignOfficeRefreshToken(refreshClaims, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to sign refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue office refresh token")
		return
	}

	// Parse the refresh token to get token_id and expiration
	parsedRefreshClaims, err := VerifyOfficeRefreshToken(refreshToken, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to parse refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process refresh token")
		return
	}

	// Store refresh token in database
	if err := a.storeRefreshToken(r.Context(), parsedRefreshClaims.TokenID, employeeID, parsedRefreshClaims.Exp); err != nil {
		log.Printf("handleAuthOfficeToken: failed to store refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"office_access_token":  accessToken,
		"office_refresh_token": refreshToken,
	})
}

// handleAuthRefreshToken exchanges a valid refresh token for a new access token.
//
// POST /api/auth/refresh
// Body: { "office_refresh_token": "<jwt>" }
// Response: { "office_access_token": "<jwt>" }
func (a *app) handleAuthRefreshToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if len(a.officeJWTSecret) == 0 {
		respondError(w, http.StatusServiceUnavailable, "Office token signing is not configured")
		return
	}

	var req struct {
		RefreshToken string `json:"office_refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	refreshToken := strings.TrimSpace(req.RefreshToken)
	if refreshToken == "" {
		respondError(w, http.StatusBadRequest, "office_refresh_token is required")
		return
	}

	// Verify refresh token signature and expiration
	refreshClaims, err := VerifyOfficeRefreshToken(refreshToken, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthRefreshToken: invalid refresh token: %v", err)
		respondError(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	}

	// Check if refresh token exists and is not revoked in database
	valid, err := a.isRefreshTokenValid(r.Context(), refreshClaims.TokenID, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to validate refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to validate refresh token")
		return
	}
	if !valid {
		respondError(w, http.StatusUnauthorized, "Refresh token has been revoked")
		return
	}

	// Get current role from database
	roleID, err := getUserRoleByWbUserID(r.Context(), a.db, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to resolve role for %s: %v", refreshClaims.EmployeeID, err)
		roleID = roleEmployee
	}

	// Get user name from database
	userName, err := getUserNameByEmployeeID(r.Context(), a.db, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to get user name for %s: %v", refreshClaims.EmployeeID, err)
		userName = ""
	}

	// Load user responsibilities for the token
	responsibilities := a.loadResponsibilitiesForToken(refreshClaims.EmployeeID)

	// Issue new access token
	accessClaims := OfficeAccessTokenClaims{
		EmployeeID:       refreshClaims.EmployeeID,
		UserName:         userName,
		Role:             roleID,
		Responsibilities: responsibilities,
	}
	accessToken, err := SignOfficeAccessToken(accessClaims, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to sign access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue access token")
		return
	}

	// ── ROTATING REFRESH TOKEN: Issue a new refresh token and revoke the old one ──
	
	// Revoke the old refresh token to prevent reuse
	if err := a.revokeRefreshToken(r.Context(), refreshClaims.TokenID); err != nil {
		log.Printf("handleAuthRefreshToken: failed to revoke old refresh token: %v", err)
		// Non-critical: continue even if revocation fails
	}

	// Create a new refresh token
	newRefreshClaims := OfficeRefreshTokenClaims{
		EmployeeID: refreshClaims.EmployeeID,
	}
	newRefreshToken, err := SignOfficeRefreshToken(newRefreshClaims, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to sign new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue new refresh token")
		return
	}

	// Parse and store the new refresh token
	parsedNewRefresh, err := VerifyOfficeRefreshToken(newRefreshToken, a.officeJWTSecret)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to parse new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process new refresh token")
		return
	}

	if err := a.storeRefreshToken(r.Context(), parsedNewRefresh.TokenID, parsedNewRefresh.EmployeeID, parsedNewRefresh.Exp); err != nil {
		log.Printf("handleAuthRefreshToken: failed to store new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to store new refresh token")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"office_access_token":  accessToken,
		"office_refresh_token": newRefreshToken,
	})
}

func collectCookies(r *http.Request) (string, string) {
	if xCookieHeader := r.Header.Values("X-Cookie"); len(xCookieHeader) > 0 {
		return strings.Join(xCookieHeader, "; "), "X-Cookie header"
	}
	if cookieHeader := r.Header.Values("Cookie"); len(cookieHeader) > 0 {
		return strings.Join(cookieHeader, "; "), "Cookie header"
	}
	if parsedCookies := r.Cookies(); len(parsedCookies) > 0 {
		parts := make([]string, 0, len(parsedCookies))
		for _, c := range parsedCookies {
			parts = append(parts, c.Name+"="+c.Value)
		}
		return strings.Join(parts, "; "), "r.Cookies()"
	}
	return "", ""
}
