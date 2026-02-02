package main

import (
	"net/http"
	"os"
	"strings"
)

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path
		if !strings.HasPrefix(path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		publicPaths := []string{
			"/api/auth/",
		}
		for _, publicPath := range publicPaths {
			if strings.HasPrefix(path, publicPath) {
				next.ServeHTTP(w, r)
				return
			}
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

		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000"
		}

		originAllowed := false
		if origin != "" {
			for _, allowed := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowed) == origin {
					originAllowed = true
					break
				}
			}
		}

		if originAllowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin == "" {
			if os.Getenv("ENV") != "production" {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, deviceid, devicename, Accept, Cache-Control, Pragma, X-Cookie, wb-apptype, Origin, Referer")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type, Authorization, X-Set-Cookie, Content-Disposition")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}
