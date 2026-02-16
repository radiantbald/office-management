package main

import (
	"context"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}

// --- Auth context ---

type contextKey string

const authClaimsCtxKey contextKey = "authClaims"
const officeAccessTokenClaimsCtxKey contextKey = "officeAccessTokenClaims"

// authClaimsFromContext returns the validated authClaims injected by authMiddleware.
// For public endpoints (not behind authMiddleware), returns zero value.
func authClaimsFromContext(ctx context.Context) authClaims {
	if claims, ok := ctx.Value(authClaimsCtxKey).(authClaims); ok {
		return claims
	}
	return authClaims{}
}

// officeAccessTokenClaimsFromContext returns the verified OfficeAccessTokenClaims if the
// request was authenticated via Office-Access-Token. Returns nil otherwise.
func officeAccessTokenClaimsFromContext(ctx context.Context) *OfficeAccessTokenClaims {
	if claims, ok := ctx.Value(officeAccessTokenClaimsCtxKey).(*OfficeAccessTokenClaims); ok {
		return claims
	}
	return nil
}

func (a *app) authMiddleware(next http.Handler) http.Handler {
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
			"/api/health",
			"/api/auth/",
			"/api/v2/auth/",
			"/api/user/info",
			"/api/user/wb-band",
		}
		for _, publicPath := range publicPaths {
			if strings.HasPrefix(path, publicPath) {
				next.ServeHTTP(w, r)
				return
			}
		}

		// ── Require Office-Access-Token (server-signed JWT) for all protected endpoints ──
		// Priority: 1) Header (legacy / API clients), 2) HttpOnly cookie (browser SPA).
		officeAccessToken := r.Header.Get("Office-Access-Token")
		if officeAccessToken == "" {
			if c, err := r.Cookie("office_access_token"); err == nil {
				officeAccessToken = c.Value
			}
		}
		if officeAccessToken == "" {
			respondError(w, http.StatusUnauthorized, "Office-Access-Token is required")
			return
		}

		if len(a.officeJWTSecret) == 0 {
			respondError(w, http.StatusServiceUnavailable, "Office token verification is not configured")
			return
		}

		atClaims, err := VerifyOfficeAccessToken(officeAccessToken, a.officeJWTSecret)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid or expired Office-Access-Token")
			return
		}

		if atClaims.EmployeeID == "" {
			respondError(w, http.StatusUnauthorized, "Invalid Office-Access-Token: missing employee_id")
			return
		}

		// Inject validated claims into request context.
		claims := authClaims{
			EmployeeID: atClaims.EmployeeID,
			UserName:   atClaims.UserName,
		}
		ctx := context.WithValue(r.Context(), authClaimsCtxKey, claims)
		ctx = context.WithValue(ctx, officeAccessTokenClaimsCtxKey, atClaims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000"
		}

		// Only set CORS headers when the Origin matches the whitelist.
		// Same-origin requests (empty Origin) need no CORS headers.
		if origin != "" {
			for _, allowed := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowed) == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					break
				}
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Office-Access-Token, Office-Refresh-Token, X-Device-ID, deviceid, devicename, Accept, Cache-Control, Pragma, X-Cookie, wb-apptype, Origin, Referer")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type, Authorization, Office-Access-Token, Office-Refresh-Token, X-Set-Cookie, Content-Disposition")
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
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'")
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

// --- IP-based rate limiter ---

type ipRateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func newIPRateLimiter(limit int, window time.Duration) *ipRateLimiter {
	rl := &ipRateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *ipRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.window)
		for ip, times := range rl.requests {
			var valid []time.Time
			for _, t := range times {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = valid
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *ipRateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	times := rl.requests[ip]
	var valid []time.Time
	for _, t := range times {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[ip] = valid
		return false
	}

	rl.requests[ip] = append(valid, now)
	return true
}

func clientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return strings.TrimSpace(realIP)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
