package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

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
		claims := extractAuthClaims(r)
		wbUserID := strings.TrimSpace(claims.WbUserID)
		if wbUserID == "" {
			wbUserID = strings.TrimSpace(r.Header.Get("x-wb-user-id"))
		}
		userName := strings.TrimSpace(claims.UserName)
		if userName == "" {
			userName = strings.TrimSpace(r.Header.Get("x-user-name"))
		}
		if parsed.Data.WBBand != "" {
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
