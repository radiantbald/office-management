package main

import (
	"crypto/rand"
	"encoding/base64"
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

// Cookie names for HttpOnly token storage.
const (
	accessTokenCookieName  = "office_access_token"
	refreshTokenCookieName = "office_refresh_token"
	csrfTokenCookieName    = "office_csrf_token"
)

// sessionResponse is the JSON payload returned to the frontend with
// non-sensitive claims from the tokens.  The raw JWT strings are never
// exposed — they live exclusively in HttpOnly cookies.
type sessionResponse struct {
	EmployeeID string `json:"employee_id"`
	UserName   string `json:"user_name,omitempty"`
	Role       int    `json:"role"`
	AccessExp  int64  `json:"access_exp"`
	RefreshExp int64  `json:"refresh_exp,omitempty"`
}

// isSecureContext returns true when the request arrived over TLS (direct) or
// through a TLS-terminating reverse proxy (X-Forwarded-Proto: https).
func isSecureContext(r *http.Request) bool {
	return r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
}

// setTokenCookies writes both access and refresh tokens as HttpOnly cookies.
func (a *app) setTokenCookies(w http.ResponseWriter, r *http.Request, accessToken, refreshToken string, accessExp, refreshExp int64) {
	secure := isSecureContext(r)
	now := time.Now().UTC().Unix()

	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookieName,
		Value:    accessToken,
		Path:     "/api/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   int(accessExp - now),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    refreshToken,
		Path:     "/api/auth/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   int(refreshExp - now),
	})

	// CSRF token cookie (readable by JS): used for double-submit protection.
	a.setCSRFCookie(w, r, int(refreshExp-now))
}

func newCSRFToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func (a *app) setCSRFCookie(w http.ResponseWriter, r *http.Request, maxAge int) {
	secure := isSecureContext(r)
	token, err := newCSRFToken()
	if err != nil {
		log.Printf("setCSRFCookie: failed to generate token: %v", err)
		return
	}
	if maxAge <= 0 {
		maxAge = 3600
	}
	// Cleanup legacy CSRF cookie scoped to /api/ to avoid duplicate cookie
	// values (same name, different path) causing token/header mismatches.
	http.SetCookie(w, &http.Cookie{
		Name:     csrfTokenCookieName,
		Value:    "",
		Path:     "/api/",
		HttpOnly: false,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     csrfTokenCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: false,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   maxAge,
	})
}

// clearTokenCookies expires both token cookies.
func (a *app) clearTokenCookies(w http.ResponseWriter, r *http.Request) {
	secure := isSecureContext(r)
	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookieName,
		Value:    "",
		Path:     "/api/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     "/api/auth/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     csrfTokenCookieName,
		Value:    "",
		Path:     "/api/",
		HttpOnly: false,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     csrfTokenCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: false,
		Secure:   secure,
		SameSite: a.authCookieSameSite,
		MaxAge:   -1,
	})
}

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
// Route: POST /api/v2/auth/code/wb-captcha
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
// Route: POST /api/v2/auth/confirm
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

// verifiedUserInfo holds identity fields returned by team.wb.ru after
// successful token validation.  All fields are populated from the upstream
// response, NOT from locally-decoded JWT claims.
type verifiedUserInfo struct {
	WbUserID   string
	UserName   string
	EmployeeID string
}

// verifyExternalToken validates the Authorization bearer token by calling
// team.wb.ru/api/v1/user/info.  If team.wb.ru responds with valid user data,
// we trust the identity.  If it responds with an error or the request fails,
// we reject the token.
//
// This is the ONLY way to confirm that the bearer token is legitimate — we
// cannot verify its signature locally because the signing key belongs to
// the external auth service.
func (a *app) verifyExternalToken(token string, originalReq *http.Request) (*verifiedUserInfo, error) {
	req, err := http.NewRequest(http.MethodGet, "https://team.wb.ru/api/v1/user/info", nil)
	if err != nil {
		return nil, fmt.Errorf("verifyExternalToken: create request: %w", err)
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

	if originalReq != nil {
		cookie, _ := collectCookies(originalReq)
		if cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("verifyExternalToken: upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("verifyExternalToken: upstream returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("verifyExternalToken: read response: %w", err)
	}

	var result struct {
		Status int `json:"status"`
		Data   struct {
			WbUserID   any    `json:"wbUserID"`
			EmployeeID any    `json:"employeeID"`
			FullName   string `json:"fullName"`
			Name       string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("verifyExternalToken: parse response: %w", err)
	}

	wbUserID := normalizeIDString(result.Data.WbUserID)
	employeeID := normalizeIDString(result.Data.EmployeeID)
	userName := firstNonEmptyString(result.Data.FullName, result.Data.Name)

	if wbUserID == "" && employeeID == "" {
		return nil, fmt.Errorf("verifyExternalToken: upstream returned empty identity")
	}

	return &verifiedUserInfo{
		WbUserID:   wbUserID,
		UserName:   userName,
		EmployeeID: employeeID,
	}, nil
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
// already be authenticated via team.wb.ru). The token is validated by calling
// the upstream team.wb.ru/api/v1/user/info endpoint — we never trust JWT
// claims without server-side verification.
//
// POST /api/auth/office-token
// Response: { "office_access_token": "<jwt>", "office_refresh_token": "<jwt>" }
func (a *app) handleAuthOfficeToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if a.officeTokenKeys == nil || !a.officeTokenKeys.CanSign() {
		respondError(w, http.StatusServiceUnavailable, "Office token signing is not configured")
		return
	}

	// Rate-limit office-token issuance the same way we rate-limit login endpoints.
	if a.authRateLimiter != nil && !a.authRateLimiter.allow(clientIP(r)) {
		respondError(w, http.StatusTooManyRequests, "Too many requests, try again later")
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

	// ── CRITICAL: Verify the external token by calling team.wb.ru ──
	// We MUST NOT trust locally-parsed JWT claims because the external
	// token's signing key is unknown to us.  Instead we call team.wb.ru
	// which validates the token and returns the real user identity.
	verifiedUser, err := a.verifyExternalToken(token, r)
	if err != nil {
		log.Printf("handleAuthOfficeToken: external token verification failed: %v", err)
		respondError(w, http.StatusUnauthorized, "Authorization token is invalid or expired")
		return
	}

	employeeID := strings.TrimSpace(verifiedUser.EmployeeID)
	if employeeID == "" {
		wbUserID := strings.TrimSpace(verifiedUser.WbUserID)
		if wbUserID == "" {
			respondError(w, http.StatusUnauthorized, "Unable to identify user from token")
			return
		}
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

	// Create access token
	accessClaims := OfficeAccessTokenClaims{
		EmployeeID: employeeID,
		UserName:   strings.TrimSpace(verifiedUser.UserName),
		Role:       roleID,
	}
	accessToken, err := SignOfficeAccessTokenWithKeyManager(accessClaims, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to sign access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue office access token")
		return
	}
	parsedAccessClaims, err := VerifyOfficeAccessTokenWithKeyManager(accessToken, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to parse access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process access token")
		return
	}

	// Create refresh token (new token family).
	refreshClaims := OfficeRefreshTokenClaims{
		EmployeeID: employeeID,
		// FamilyID is auto-generated inside SignOfficeRefreshToken
	}
	refreshToken, err := SignOfficeRefreshTokenWithKeyManager(refreshClaims, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to sign refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue office refresh token")
		return
	}

	// Parse the refresh token to get token_id, family_id and expiration.
	parsedRefreshClaims, err := VerifyOfficeRefreshTokenWithKeyManager(refreshToken, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthOfficeToken: failed to parse refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process refresh token")
		return
	}

	// Hash token_id with application pepper — never store raw token_id in DB.
	tokenHash := hashTokenID(parsedRefreshClaims.TokenID, a.refreshTokenPepper)

	// Extract device_id — used to bind the refresh token to a specific device.
	deviceID := extractDeviceID(r)

	// Store refresh token in database with family, device_id, IP and User-Agent metadata.
	if err := a.storeRefreshToken(
		r.Context(),
		tokenHash,
		employeeID,
		parsedRefreshClaims.FamilyID,
		deviceID,
		clientIP(r),
		truncateUA(r.UserAgent()),
		parsedRefreshClaims.Exp,
	); err != nil {
		log.Printf("handleAuthOfficeToken: failed to store refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
		return
	}

	// Set tokens as HttpOnly cookies (XSS-safe: JS cannot read them).
	a.setTokenCookies(w, r, accessToken, refreshToken,
		parsedAccessClaims.Exp, parsedRefreshClaims.Exp)

	respondJSON(w, http.StatusOK, map[string]any{
		"session": sessionResponse{
			EmployeeID: parsedAccessClaims.EmployeeID,
			UserName:   parsedAccessClaims.UserName,
			Role:       parsedAccessClaims.Role,
			AccessExp:  parsedAccessClaims.Exp,
			RefreshExp: parsedRefreshClaims.Exp,
		},
	})
}

// handleAuthRefreshToken exchanges a valid refresh token for a new token pair
// (access + refresh).  Implements token rotation with replay detection:
//
//  1. JWT signature & expiration are verified first.
//  2. token_id is hashed (HMAC-SHA256 + pepper) and looked up in DB.
//  3. If the token was already consumed/revoked — this is a replay attack:
//     the whole token family is invalidated and 401 is returned.
//  4. Otherwise: the old token is marked consumed, a new pair is issued,
//     and the new refresh token inherits the same family_id.
//
// POST /api/auth/refresh
// Body: { "office_refresh_token": "<jwt>" }
// Response: { "office_access_token": "<jwt>", "office_refresh_token": "<jwt>" }
func (a *app) handleAuthRefreshToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if a.officeTokenKeys == nil || !a.officeTokenKeys.CanSign() || !a.officeTokenKeys.CanVerify() {
		respondError(w, http.StatusServiceUnavailable, "Office token keys are not configured")
		return
	}

	// 1) Try HttpOnly cookie first (preferred), 2) fall back to JSON body (legacy).
	var refreshToken string
	if c, err := r.Cookie(refreshTokenCookieName); err == nil && strings.TrimSpace(c.Value) != "" {
		refreshToken = strings.TrimSpace(c.Value)
	} else {
		var req struct {
			RefreshToken string `json:"office_refresh_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		refreshToken = strings.TrimSpace(req.RefreshToken)
	}
	if refreshToken == "" {
		respondError(w, http.StatusBadRequest, "office_refresh_token is required")
		return
	}

	// ── Step 1: verify JWT signature and expiration ──
	refreshClaims, err := VerifyOfficeRefreshTokenWithKeyManager(refreshToken, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthRefreshToken: invalid refresh token: %v", err)
		respondError(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	}

	// ── Step 2: atomically consume the refresh token (UPDATE … RETURNING) ──
	// This single SQL statement both validates the token and marks it as
	// consumed in one atomic operation, eliminating the TOCTOU race condition
	// when parallel requests hit /refresh simultaneously.
	tokenHash := hashTokenID(refreshClaims.TokenID, a.refreshTokenPepper)
	status, rec, err := a.consumeRefreshToken(r.Context(), tokenHash, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to consume refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to validate refresh token")
		return
	}

	familyID := rec.FamilyID

	switch status {
	case refreshTokenRevoked:
		// ── Step 3: REPLAY DETECTED — a consumed token was reused ──
		// Invalidate the entire token family so every device in this
		// session chain is forced to re-authenticate.
		log.Printf("handleAuthRefreshToken: REPLAY DETECTED for employee=%s family=%s ip=%s",
			refreshClaims.EmployeeID, familyID, clientIP(r))
		if err := a.revokeTokenFamily(r.Context(), familyID); err != nil {
			log.Printf("handleAuthRefreshToken: failed to revoke token family %s: %v", familyID, err)
		}
		respondError(w, http.StatusUnauthorized, "Refresh token has been revoked — possible replay attack, session invalidated")
		return
	case refreshTokenNotFound:
		respondError(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	case refreshTokenExpired:
		respondError(w, http.StatusUnauthorized, "Refresh token has expired")
		return
	}

	// ── Step 3b: Device binding check ──
	// Refresh tokens are bound to a device_id. If the device_id in the request
	// does not match the stored one, reject — the token may have been stolen.
	// Token is already consumed at this point; on mismatch we revoke the
	// entire family as well.
	requestDeviceID := extractDeviceID(r)
	if rec.DeviceID != "" && requestDeviceID != rec.DeviceID {
		log.Printf("handleAuthRefreshToken: DEVICE MISMATCH for employee=%s family=%s stored_device=%s request_device=%s ip=%s",
			refreshClaims.EmployeeID, familyID, rec.DeviceID, requestDeviceID, clientIP(r))
		// Revoke the entire family — likely token theft.
		if err := a.revokeTokenFamily(r.Context(), familyID); err != nil {
			log.Printf("handleAuthRefreshToken: failed to revoke token family %s: %v", familyID, err)
		}
		respondError(w, http.StatusUnauthorized, "Device mismatch — session invalidated for security")
		return
	}

	// Soft IP heuristic: log IP changes for audit, but do NOT reject.
	// Mobile networks, VPNs, and corporate NATs change IP frequently.
	currentIP := clientIP(r)
	if rec.IPAddress != "" && rec.IPAddress != currentIP {
		log.Printf("handleAuthRefreshToken: IP changed for employee=%s family=%s device=%s old_ip=%s new_ip=%s (audit only, not blocking)",
			refreshClaims.EmployeeID, familyID, requestDeviceID, rec.IPAddress, currentIP)
	}

	// ── Step 4: token was valid and is already consumed — proceed with rotation ──

	// 4a. (consumed atomically in Step 2 above)

	// 4b. Resolve current role & user name from DB.
	roleID, err := getUserRoleByWbUserID(r.Context(), a.db, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to resolve role for %s: %v", refreshClaims.EmployeeID, err)
		roleID = roleEmployee
	}
	userName, err := getUserNameByEmployeeID(r.Context(), a.db, refreshClaims.EmployeeID)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to get user name for %s: %v", refreshClaims.EmployeeID, err)
		userName = ""
	}
	// 4c. Issue new access token.
	accessClaims := OfficeAccessTokenClaims{
		EmployeeID: refreshClaims.EmployeeID,
		UserName:   userName,
		Role:       roleID,
	}
	accessToken, err := SignOfficeAccessTokenWithKeyManager(accessClaims, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to sign access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue access token")
		return
	}
	parsedAccessClaims, err := VerifyOfficeAccessTokenWithKeyManager(accessToken, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to parse access token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process access token")
		return
	}

	// 4d. Issue new refresh token — same family_id, new token_id.
	newRefreshClaims := OfficeRefreshTokenClaims{
		EmployeeID: refreshClaims.EmployeeID,
		FamilyID:   familyID, // inherit the family chain
	}
	newRefreshToken, err := SignOfficeRefreshTokenWithKeyManager(newRefreshClaims, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to sign new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to issue new refresh token")
		return
	}

	// 4e. Store new refresh token (hashed) in DB — inherits the same device_id.
	parsedNewRefresh, err := VerifyOfficeRefreshTokenWithKeyManager(newRefreshToken, a.officeTokenKeys)
	if err != nil {
		log.Printf("handleAuthRefreshToken: failed to parse new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to process new refresh token")
		return
	}
	newTokenHash := hashTokenID(parsedNewRefresh.TokenID, a.refreshTokenPepper)
	if err := a.storeRefreshToken(
		r.Context(),
		newTokenHash,
		parsedNewRefresh.EmployeeID,
		familyID,
		requestDeviceID, // preserve device binding through rotation
		currentIP,
		truncateUA(r.UserAgent()),
		parsedNewRefresh.Exp,
	); err != nil {
		log.Printf("handleAuthRefreshToken: failed to store new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to store new refresh token")
		return
	}

	// Set new tokens as HttpOnly cookies.
	a.setTokenCookies(w, r, accessToken, newRefreshToken,
		parsedAccessClaims.Exp, parsedNewRefresh.Exp)

	respondJSON(w, http.StatusOK, map[string]any{
		"session": sessionResponse{
			EmployeeID: parsedAccessClaims.EmployeeID,
			UserName:   parsedAccessClaims.UserName,
			Role:       parsedAccessClaims.Role,
			AccessExp:  parsedAccessClaims.Exp,
			RefreshExp: parsedNewRefresh.Exp,
		},
	})
}

// truncateUA limits a User-Agent string to 512 characters to avoid storing
// extremely long values in the database.
func truncateUA(ua string) string {
	const maxLen = 512
	if len(ua) > maxLen {
		return ua[:maxLen]
	}
	return ua
}

// extractDeviceID reads the device identifier from the request.
// Looks for X-Device-ID header first, then falls back to the legacy "deviceid" header.
func extractDeviceID(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("X-Device-ID")); v != "" {
		// Limit to 128 chars to prevent abuse.
		if len(v) > 128 {
			return v[:128]
		}
		return v
	}
	if v := strings.TrimSpace(r.Header.Get("deviceid")); v != "" {
		if len(v) > 128 {
			return v[:128]
		}
		return v
	}
	return ""
}

// handleAuthSession validates the Office Access Token cookie and returns
// the session claims (employee_id, role, responsibilities, exp).
// This is the BFF equivalent of "am I logged in?" — the frontend calls it
// on page load to restore the in-memory session without ever seeing the raw JWT.
//
// GET /api/auth/session
// Response: { "session": { ... } } or 401
func (a *app) handleAuthSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if a.officeTokenKeys == nil || !a.officeTokenKeys.CanVerify() {
		respondError(w, http.StatusServiceUnavailable, "Office token verification is not configured")
		return
	}

	c, err := r.Cookie(accessTokenCookieName)
	if err != nil || strings.TrimSpace(c.Value) == "" {
		respondError(w, http.StatusUnauthorized, "No active session")
		return
	}

	atClaims, err := VerifyOfficeAccessTokenWithKeyManager(c.Value, a.officeTokenKeys)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Session expired")
		return
	}

	// Try to read refresh token exp for proactive rotation info.
	var refreshExp int64
	if rc, err := r.Cookie(refreshTokenCookieName); err == nil && rc.Value != "" {
		if rtClaims, err := VerifyOfficeRefreshTokenWithKeyManager(rc.Value, a.officeTokenKeys); err == nil {
			refreshExp = rtClaims.Exp
		}
	}

	// Migration path: if a legacy session exists without CSRF cookie,
	// mint one so the next unsafe request can pass double-submit validation.
	if _, err := r.Cookie(csrfTokenCookieName); err != nil {
		now := time.Now().UTC().Unix()
		maxAge := int(atClaims.Exp - now)
		if refreshExp > now {
			maxAge = int(refreshExp - now)
		}
		a.setCSRFCookie(w, r, maxAge)
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"session": sessionResponse{
			EmployeeID: atClaims.EmployeeID,
			UserName:   atClaims.UserName,
			Role:       atClaims.Role,
			AccessExp:  atClaims.Exp,
			RefreshExp: refreshExp,
		},
	})
}

// handleAuthLogout clears the token cookies and revokes the refresh token
// in the database so it cannot be reused.
//
// POST /api/auth/logout
func (a *app) handleAuthLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Best-effort revoke the refresh token in DB.
	if a.officeTokenKeys != nil && a.officeTokenKeys.CanVerify() {
		if rc, err := r.Cookie(refreshTokenCookieName); err == nil && rc.Value != "" {
			if rtClaims, err := VerifyOfficeRefreshTokenWithKeyManager(rc.Value, a.officeTokenKeys); err == nil {
				tokenHash := hashTokenID(rtClaims.TokenID, a.refreshTokenPepper)
				if err := a.revokeRefreshToken(r.Context(), tokenHash); err != nil {
					log.Printf("handleAuthLogout: failed to revoke refresh token: %v", err)
				}
			}
		}
	}

	a.clearTokenCookies(w, r)
	respondJSON(w, http.StatusOK, map[string]any{"ok": true})
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
