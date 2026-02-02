package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
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

	client := &http.Client{}
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

	var jsonData interface{}
	if err := json.Unmarshal(body, &jsonData); err == nil {
		_ = json.NewEncoder(w).Encode(jsonData)
		return
	}
	_, _ = w.Write(body)
}

// handleAuthRequestCode проксирует запрос к auth-hrtech.wb.ru/v2/code/wb-captcha
func (a *app) handleAuthRequestCode(w http.ResponseWriter, r *http.Request) {
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

	client := &http.Client{}
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

	client := &http.Client{}
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
	if xCookieHeader := r.Header.Get("X-Cookie"); xCookieHeader != "" {
		return xCookieHeader, "X-Cookie header"
	}
	if cookieHeader := r.Header.Values("Cookie"); len(cookieHeader) > 0 {
		return strings.Join(cookieHeader, "; "), "Cookie header"
	}
	if cookieHeader := r.Header.Get("Cookie"); cookieHeader != "" {
		return cookieHeader, "Cookie header"
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
