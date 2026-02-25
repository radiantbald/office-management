package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

const uploadDirName = "uploads"
const buildingUploadDirName = "buildings"
const dbDumpDirName = "backend/db_dumps"
const maxBuildingImageSize = 5 << 20
const maxBuildingFormSize = maxBuildingImageSize + (1 << 20)
const maxFloorPlanJSONSize = 50 << 20
const defaultBuildingTimezone = "Europe/Moscow"

type app struct {
	db                 *sql.DB
	uploadDir          string
	buildingUploadDir  string
	dbDumpDir          string
	authRateLimiter    *ipRateLimiter
	officeTokenKeys    *officeTokenKeyManager
	refreshTokenPepper []byte
	authCookieSameSite http.SameSite
	authCookieDomain   string
	externalHTTPClient *http.Client
	externalMaxRetries int
}

type building struct {
	ID                    int64     `json:"id"`
	Name                  string    `json:"name"`
	Address               string    `json:"address"`
	Timezone              string    `json:"timezone"`
	ImageURL              string    `json:"image_url,omitempty"`
	ResponsibleEmployeeID string    `json:"responsible_employee_id,omitempty"`
	Floors                []int64   `json:"floors"`
	CreatedAt             time.Time `json:"created_at"`
}

type floor struct {
	ID                    int64     `json:"id"`
	BuildingID            int64     `json:"building_id"`
	Name                  string    `json:"name"`
	Level                 int       `json:"level"`
	SpacesCount           int       `json:"spaces_count"`
	ResponsibleEmployeeID string    `json:"responsible_employee_id,omitempty"`
	PlanSVG               string    `json:"plan_svg,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
}

type space struct {
	ID                    int64     `json:"id"`
	FloorID               int64     `json:"floor_id"`
	Name                  string    `json:"name"`
	Kind                  string    `json:"kind"`
	Capacity              int       `json:"capacity"`
	Color                 string    `json:"color,omitempty"`
	SnapshotHidden        bool      `json:"snapshot_hidden"`
	SubdivisionL1         string    `json:"subdivision_level_1"`
	SubdivisionL2         string    `json:"subdivision_level_2"`
	ResponsibleEmployeeID string    `json:"responsible_employee_id,omitempty"`
	Points                []point   `json:"points"`
	CreatedAt             time.Time `json:"created_at"`
}

type point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type desk struct {
	ID        int64     `json:"id"`
	SpaceID   int64     `json:"space_id"`
	Label     string    `json:"label"`
	X         float64   `json:"x"`
	Y         float64   `json:"y"`
	Width     float64   `json:"width"`
	Height    float64   `json:"height"`
	Rotation  float64   `json:"rotation"`
	CreatedAt time.Time `json:"created_at"`
}

type deskBookingUser struct {
	WbUserID          string `json:"wb_user_id"`
	UserName          string `json:"user_name"`
	ApplierEmployeeID string `json:"applier_employee_id,omitempty"`
	TenantEmployeeID  string `json:"tenant_employee_id,omitempty"`
	AvatarURL         string `json:"avatar_url,omitempty"`
	WbBand            string `json:"wb_band,omitempty"`
}

type deskBookingInfo struct {
	IsBooked bool             `json:"is_booked"`
	User     *deskBookingUser `json:"user,omitempty"`
}

type deskWithBooking struct {
	desk
	Booking deskBookingInfo `json:"booking"`
}

type deskCreateInput struct {
	SpaceID  int64
	Label    string
	X        float64
	Y        float64
	Width    float64
	Height   float64
	Rotation float64
}

type meetingRoom struct {
	ID        int64     `json:"id"`
	FloorID   int64     `json:"floor_id"`
	Name      string    `json:"name"`
	Capacity  int       `json:"capacity"`
	Color     string    `json:"color,omitempty"`
	Points    []point   `json:"points"`
	CreatedAt time.Time `json:"created_at"`
}

func postgresDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("DATABASE_URL")); dsn != "" {
		return dsn
	}
	host := strings.TrimSpace(os.Getenv("PGHOST"))
	if host == "" {
		host = "localhost"
	}
	port := strings.TrimSpace(os.Getenv("PGPORT"))
	if port == "" {
		port = "5432"
	}
	user := strings.TrimSpace(os.Getenv("PGUSER"))
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("PGPASSWORD")
	dbName := strings.TrimSpace(os.Getenv("PGDATABASE"))
	if dbName == "" {
		dbName = "office"
	}
	sslMode := strings.TrimSpace(os.Getenv("PGSSLMODE"))
	if sslMode == "" {
		sslMode = "disable"
	}
	statementTimeout := strings.TrimSpace(os.Getenv("PG_STATEMENT_TIMEOUT"))
	if statementTimeout == "" {
		statementTimeout = "30000"
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s statement_timeout=%s",
		host,
		port,
		user,
		password,
		dbName,
		sslMode,
		statementTimeout,
	)
}

func main() {
	_ = godotenv.Load()

	db, err := sql.Open("pgx", postgresDSN())
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if err := migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if isTrueEnv("MIGRATE_ONLY") {
		log.Println("migrations applied; exiting because MIGRATE_ONLY=true")
		return
	}

	uploadDir, err := filepath.Abs(uploadDirName)
	if err != nil {
		log.Fatalf("resolve upload dir: %v", err)
	}
	buildingUploadDir := filepath.Join(uploadDir, buildingUploadDirName)
	if err := os.MkdirAll(buildingUploadDir, 0o755); err != nil {
		log.Fatalf("create upload dir: %v", err)
	}
	dbDumpDir, err := filepath.Abs(dbDumpDirName)
	if err != nil {
		log.Fatalf("resolve db dump dir: %v", err)
	}
	if err := os.MkdirAll(dbDumpDir, 0o755); err != nil {
		log.Fatalf("create db dump dir: %v", err)
	}

	officeTokenKeys, err := loadOfficeTokenKeyManagerFromEnv()
	if err != nil {
		log.Fatalf("load office jwt keys: %v", err)
	}
	if !officeTokenKeys.CanSign() {
		log.Println("WARNING: office JWT signing key is not set — Office_Token will not be issued")
	}
	if !officeTokenKeys.CanVerify() {
		log.Println("WARNING: office JWT verification keys are not set — Office_Token will not be verified")
	}
	refreshPepper := strings.TrimSpace(os.Getenv("OFFICE_REFRESH_PEPPER"))
	if refreshPepper == "" {
		// Backward-compatible fallback: reuse legacy HS secret only when present.
		if legacySecret := officeTokenKeys.LegacySecret(); len(legacySecret) > 0 {
			refreshPepper = string(legacySecret)
			log.Println("WARNING: OFFICE_REFRESH_PEPPER is not set — falling back to OFFICE_JWT_SECRET")
		} else {
			log.Println("WARNING: OFFICE_REFRESH_PEPPER is not set — configure it explicitly")
		}
	}
	accessTTL := parseEnvDurationMinutes("OFFICE_ACCESS_TTL_MINUTES", 10, 5, 10)
	refreshTTL := parseEnvDurationDays("OFFICE_REFRESH_TTL_DAYS", 30, 7, 30)
	configureOfficeTokenTTLs(accessTTL, refreshTTL)
	jwtIssuer := strings.TrimSpace(os.Getenv("OFFICE_JWT_ISSUER"))
	if jwtIssuer == "" {
		jwtIssuer = "office-management"
	}
	jwtAccessAudience := strings.TrimSpace(os.Getenv("OFFICE_JWT_ACCESS_AUDIENCE"))
	if jwtAccessAudience == "" {
		jwtAccessAudience = "office-management-api"
	}
	jwtRefreshAudience := strings.TrimSpace(os.Getenv("OFFICE_JWT_REFRESH_AUDIENCE"))
	if jwtRefreshAudience == "" {
		jwtRefreshAudience = "office-management-refresh"
	}
	jwtClockSkew := parseEnvDurationSeconds("OFFICE_JWT_CLOCK_SKEW_SECONDS", 30, 0, 120)
	configureOfficeJWTValidation(jwtIssuer, jwtAccessAudience, jwtRefreshAudience, jwtClockSkew)
	authSameSite := parseSameSiteEnv("AUTH_COOKIE_SAMESITE", http.SameSiteStrictMode)
	authCookieDomain := parseCookieDomainEnv("AUTH_COOKIE_DOMAIN")
	externalAuthTimeout := parseEnvDurationSeconds("EXTERNAL_AUTH_TIMEOUT_SECONDS", 6, 2, 20)
	externalAuthMaxRetries := parseEnvInt("EXTERNAL_AUTH_MAX_RETRIES", 1, 0, 3)
	slowAPIThreshold := parseEnvDurationMilliseconds("SLOW_API_THRESHOLD_MS", 700, 100, 30000)

	externalTransport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   3 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   20,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   3 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: externalAuthTimeout,
	}
	externalHTTPClient := &http.Client{
		Timeout:   externalAuthTimeout,
		Transport: externalTransport,
	}

	app := &app{
		db:                 db,
		uploadDir:          uploadDir,
		buildingUploadDir:  buildingUploadDir,
		dbDumpDir:          dbDumpDir,
		authRateLimiter:    newIPRateLimiter(10, time.Minute), // 10 auth requests per IP per minute
		officeTokenKeys:    officeTokenKeys,
		refreshTokenPepper: []byte(refreshPepper),
		authCookieSameSite: authSameSite,
		authCookieDomain:   authCookieDomain,
		externalHTTPClient: externalHTTPClient,
		externalMaxRetries: externalAuthMaxRetries,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/buildings", app.handleBuildings)
	mux.HandleFunc("/api/buildings/", app.handleBuildingSubroutes)
	mux.HandleFunc("/api/floors", app.handleFloors)
	mux.HandleFunc("/api/floors/", app.handleFloorSubroutes)
	mux.HandleFunc("/api/spaces", app.handleSpaces)
	mux.HandleFunc("/api/spaces/", app.handleSpaceSubroutes)
	mux.HandleFunc("/api/desks", app.handleDesks)
	mux.HandleFunc("/api/desks/bulk", app.handleDeskBulk)
	mux.HandleFunc("/api/desks/", app.handleDeskSubroutes)
	mux.HandleFunc("/api/meeting-rooms", app.handleMeetingRooms)
	mux.HandleFunc("/api/meeting-room-bookings", app.handleMeetingRoomBookings)
	mux.HandleFunc("/api/meeting-room-bookings/", app.handleMeetingRoomBookingsSubroutes)
	mux.HandleFunc("/api/bookings", app.handleBookings)
	mux.HandleFunc("/api/bookings/", app.handleBookingsSubroutes)
	mux.HandleFunc("/api/users", app.handleUsers)
	mux.HandleFunc("/api/users/role", app.handleUserRole)
	mux.HandleFunc("/api/responsibilities", app.handleResponsibilities)
	mux.HandleFunc("/api/admin/logs", app.handleAdminAuditLogs)
	mux.HandleFunc("/api/admin/db-dumps/export", app.handleDatabaseDumpExport)
	mux.HandleFunc("/api/admin/db-dumps/import", app.handleDatabaseDumpImport)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/user/info", app.handleAuthUserInfo)
	mux.HandleFunc("/api/user/wb-band", app.handleAuthUserWbBand)
	mux.HandleFunc("/api/auth/office-token", app.handleAuthOfficeToken)
	mux.HandleFunc("/api/auth/refresh", app.handleAuthRefreshToken)
	mux.HandleFunc("/api/auth/session", app.handleAuthSession)
	mux.HandleFunc("/api/auth/logout", app.handleAuthLogout)
	mux.HandleFunc("/api/v2/auth/code/wb-captcha", app.handleAuthRequestCode)
	mux.HandleFunc("/api/v2/auth/confirm", app.handleAuthConfirmCode)

	webDir := filepath.Join("..", "frontend")
	serveFrontendPage := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
	}
	mux.HandleFunc("/buildings", serveFrontendPage)
	mux.HandleFunc("/buildings/", serveFrontendPage)
	mux.HandleFunc("/spaces", serveFrontendPage)
	mux.HandleFunc("/spaces/", serveFrontendPage)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(app.uploadDir))))
	mux.Handle("/", http.FileServer(http.Dir(webDir)))

	handler := http.Handler(mux)
	handler = app.authMiddleware(handler)
	handler = csrfProtectionMiddleware(handler)
	handler = corsMiddleware(handler)
	handler = securityHeadersMiddleware(handler)
	handler = loggingMiddleware(handler, slowAPIThreshold)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadTimeout:       30 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	sig := <-shutdown
	log.Printf("received signal %v, shutting down gracefully...", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown error: %v", err)
	}
	log.Println("server stopped")
}

func isTrueEnv(name string) bool {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return false
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func parseEnvDurationMinutes(name string, defaultMinutes, minMinutes, maxMinutes int) time.Duration {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return time.Duration(defaultMinutes) * time.Minute
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("WARNING: %s=%q is invalid, using default=%d", name, value, defaultMinutes)
		return time.Duration(defaultMinutes) * time.Minute
	}
	if parsed < minMinutes {
		log.Printf("WARNING: %s=%d is below minimum=%d, clamping", name, parsed, minMinutes)
		parsed = minMinutes
	}
	if parsed > maxMinutes {
		log.Printf("WARNING: %s=%d is above maximum=%d, clamping", name, parsed, maxMinutes)
		parsed = maxMinutes
	}
	return time.Duration(parsed) * time.Minute
}

func parseEnvDurationDays(name string, defaultDays, minDays, maxDays int) time.Duration {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return time.Duration(defaultDays) * 24 * time.Hour
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("WARNING: %s=%q is invalid, using default=%d", name, value, defaultDays)
		return time.Duration(defaultDays) * 24 * time.Hour
	}
	if parsed < minDays {
		log.Printf("WARNING: %s=%d is below minimum=%d, clamping", name, parsed, minDays)
		parsed = minDays
	}
	if parsed > maxDays {
		log.Printf("WARNING: %s=%d is above maximum=%d, clamping", name, parsed, maxDays)
		parsed = maxDays
	}
	return time.Duration(parsed) * 24 * time.Hour
}

func parseEnvDurationSeconds(name string, defaultSeconds, minSeconds, maxSeconds int) time.Duration {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return time.Duration(defaultSeconds) * time.Second
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("WARNING: %s=%q is invalid, using default=%d", name, value, defaultSeconds)
		return time.Duration(defaultSeconds) * time.Second
	}
	if parsed < minSeconds {
		log.Printf("WARNING: %s=%d is below minimum=%d, clamping", name, parsed, minSeconds)
		parsed = minSeconds
	}
	if parsed > maxSeconds {
		log.Printf("WARNING: %s=%d is above maximum=%d, clamping", name, parsed, maxSeconds)
		parsed = maxSeconds
	}
	return time.Duration(parsed) * time.Second
}

func parseEnvDurationMilliseconds(name string, defaultMs, minMs, maxMs int) time.Duration {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return time.Duration(defaultMs) * time.Millisecond
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("WARNING: %s=%q is invalid, using default=%d", name, value, defaultMs)
		return time.Duration(defaultMs) * time.Millisecond
	}
	if parsed < minMs {
		log.Printf("WARNING: %s=%d is below minimum=%d, clamping", name, parsed, minMs)
		parsed = minMs
	}
	if parsed > maxMs {
		log.Printf("WARNING: %s=%d is above maximum=%d, clamping", name, parsed, maxMs)
		parsed = maxMs
	}
	return time.Duration(parsed) * time.Millisecond
}

func parseEnvInt(name string, defaultValue, minValue, maxValue int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("WARNING: %s=%q is invalid, using default=%d", name, value, defaultValue)
		return defaultValue
	}
	if parsed < minValue {
		log.Printf("WARNING: %s=%d is below minimum=%d, clamping", name, parsed, minValue)
		parsed = minValue
	}
	if parsed > maxValue {
		log.Printf("WARNING: %s=%d is above maximum=%d, clamping", name, parsed, maxValue)
		parsed = maxValue
	}
	return parsed
}

func parseSameSiteEnv(name string, defaultValue http.SameSite) http.SameSite {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	if value == "" {
		return defaultValue
	}
	switch value {
	case "strict":
		return http.SameSiteStrictMode
	case "lax":
		return http.SameSiteLaxMode
	case "none":
		return http.SameSiteNoneMode
	default:
		log.Printf("WARNING: %s=%q is invalid (expected strict|lax|none), using default", name, value)
		return defaultValue
	}
}

func parseCookieDomainEnv(name string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return ""
	}
	// RFC allows a leading dot, but browsers ignore it today; normalize value.
	value = strings.TrimPrefix(value, ".")
	if strings.Contains(value, "://") || strings.Contains(value, "/") || strings.Contains(value, ":") {
		log.Printf("WARNING: %s=%q looks invalid for cookie Domain, ignoring", name, value)
		return ""
	}
	if strings.HasPrefix(value, ".") || strings.HasSuffix(value, ".") || strings.Contains(value, "..") {
		log.Printf("WARNING: %s=%q looks invalid for cookie Domain, ignoring", name, value)
		return ""
	}
	return value
}

func migrate(db *sql.DB) error {
	if err := migrateSpaceStorage(db); err != nil {
		return err
	}
	if err := migrateWorkplaceTables(db); err != nil {
		return err
	}
	if err := migrateWorkplaceCoworkingID(db); err != nil {
		return err
	}
	if err := ensureAuditLogsStorage(db); err != nil {
		return err
	}
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			full_name TEXT NOT NULL DEFAULT '',
			employee_id TEXT NOT NULL DEFAULT '',
			wb_team_profile_id TEXT NOT NULL DEFAULT '',
			wb_user_id TEXT NOT NULL DEFAULT '',
			avatar_url TEXT NOT NULL DEFAULT '',
			wb_band TEXT NOT NULL DEFAULT '',
			role INTEGER NOT NULL DEFAULT 1,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);`,
		`CREATE TABLE IF NOT EXISTS office_buildings (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			address TEXT NOT NULL,
			timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
			responsible_employee_id TEXT NOT NULL DEFAULT '',
			image_url TEXT,
			floors TEXT NOT NULL DEFAULT '[]',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);`,
		`CREATE TABLE IF NOT EXISTS floors (
			id BIGSERIAL PRIMARY KEY,
			building_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			level INTEGER NOT NULL,
			plan_svg TEXT NOT NULL,
			responsible_employee_id TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(building_id) REFERENCES office_buildings(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS coworkings (
			id BIGINT PRIMARY KEY DEFAULT nextval('spaces_id_seq'),
			floor_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			subdivision_level_1 TEXT NOT NULL DEFAULT '',
			subdivision_level_2 TEXT NOT NULL DEFAULT '',
			responsible_employee_id TEXT NOT NULL DEFAULT '',
			points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
			color TEXT NOT NULL DEFAULT '',
			snapshot_hidden INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(floor_id) REFERENCES floors(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS workplaces (
			id BIGSERIAL PRIMARY KEY,
			coworking_id BIGINT NOT NULL,
			label TEXT NOT NULL,
			points_json JSONB NOT NULL DEFAULT '{"x":0,"y":0,"width":200,"height":100,"rotation":0}'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(coworking_id) REFERENCES coworkings(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS meeting_rooms (
			id BIGINT PRIMARY KEY DEFAULT nextval('spaces_id_seq'),
			floor_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			capacity INTEGER NOT NULL DEFAULT 0,
			points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
			color TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(floor_id) REFERENCES floors(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS meeting_room_bookings (
			id BIGSERIAL PRIMARY KEY,
			meeting_room_id BIGINT NOT NULL,
			applier_employee_id TEXT NOT NULL,
			start_at TIMESTAMPTZ NOT NULL,
			end_at TIMESTAMPTZ NOT NULL,
			cancelled_at TIMESTAMPTZ,
			canceller_employee_id TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(meeting_room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS workplace_bookings (
			id BIGSERIAL PRIMARY KEY,
			workplace_id BIGINT NOT NULL,
			applier_employee_id TEXT NOT NULL,
			tenant_employee_id TEXT NOT NULL DEFAULT '',
			date TEXT NOT NULL,
			cancelled_at TIMESTAMPTZ,
			canceller_employee_id TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			UNIQUE(workplace_id, date)
		);`,
		`CREATE TABLE IF NOT EXISTS office_refresh_tokens (
			id BIGSERIAL PRIMARY KEY,
			token_id TEXT NOT NULL UNIQUE,
			employee_id TEXT NOT NULL,
			family_id TEXT NOT NULL DEFAULT '',
			expires_at TIMESTAMPTZ NOT NULL,
			revoked_at TIMESTAMPTZ,
			last_used_at TIMESTAMPTZ,
			ip_address TEXT NOT NULL DEFAULT '',
			user_agent TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);`,
		`CREATE TABLE IF NOT EXISTS responsibility_audit_log (
			id BIGSERIAL PRIMARY KEY,
			entity_type TEXT NOT NULL,
			entity_id BIGINT NOT NULL,
			previous_employee_id TEXT NOT NULL DEFAULT '',
			new_employee_id TEXT NOT NULL DEFAULT '',
			changed_by_employee_id TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);`,
		`CREATE INDEX IF NOT EXISTS office_refresh_tokens_employee_id_idx ON office_refresh_tokens (employee_id);`,
		`CREATE INDEX IF NOT EXISTS office_refresh_tokens_token_id_idx ON office_refresh_tokens (token_id);`,
		`CREATE INDEX IF NOT EXISTS responsibility_audit_log_entity_idx ON responsibility_audit_log (entity_type, entity_id, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS responsibility_audit_log_actor_idx ON responsibility_audit_log (changed_by_employee_id, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS office_buildings_responsible_employee_id_idx ON office_buildings (responsible_employee_id);`,
		`CREATE INDEX IF NOT EXISTS floors_responsible_employee_id_idx ON floors (responsible_employee_id);`,
		`CREATE INDEX IF NOT EXISTS coworkings_responsible_employee_id_idx ON coworkings (responsible_employee_id);`,
		`CREATE INDEX IF NOT EXISTS floors_building_id_responsible_employee_id_idx ON floors (building_id, responsible_employee_id);`,
		`CREATE INDEX IF NOT EXISTS coworkings_floor_id_responsible_employee_id_idx ON coworkings (floor_id, responsible_employee_id);`,
		// family_id index is created inside migrateRefreshTokenColumns (after ensureColumn adds the column).
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	if err := migrateCreatedAtColumns(db); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM users WHERE wb_user_id IS NULL OR wb_user_id = ''`); err != nil {
		return err
	}
	if _, err := db.Exec(
		`DELETE FROM users a
		 USING users b
		 WHERE a.id < b.id AND a.wb_user_id = b.wb_user_id`,
	); err != nil {
		return err
	}
	if _, err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_wb_user_id_uidx ON users (wb_user_id)`); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_buildings", "image_url", "TEXT"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_buildings", "floors", "TEXT NOT NULL DEFAULT '[]'"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_buildings", "timezone", "TEXT NOT NULL DEFAULT 'Europe/Moscow'"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_buildings", "responsible_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "floors", "responsible_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "coworkings", "points_json", "JSONB NOT NULL DEFAULT '[]'::jsonb"); err != nil {
		return err
	}
	if err := ensureColumn(db, "coworkings", "color", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	hasCoworkingCapacity, err := columnExists(db, "coworkings", "capacity")
	if err != nil {
		return err
	}
	if hasCoworkingCapacity {
		if _, err := db.Exec(`ALTER TABLE coworkings DROP COLUMN capacity`); err != nil {
			return err
		}
	}
	if err := ensureColumn(db, "coworkings", "subdivision_level_1", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "coworkings", "subdivision_level_2", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "coworkings", "responsible_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "coworkings", "snapshot_hidden", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	hasCoworkingKind, err := columnExists(db, "coworkings", "kind")
	if err != nil {
		return err
	}
	if hasCoworkingKind {
		if _, err := db.Exec(`ALTER TABLE coworkings DROP COLUMN kind`); err != nil {
			return err
		}
	}
	if err := ensureColumn(db, "meeting_rooms", "points_json", "JSONB NOT NULL DEFAULT '[]'::jsonb"); err != nil {
		return err
	}
	if err := ensureColumn(db, "meeting_rooms", "color", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "meeting_rooms", "floor_id", "BIGINT"); err != nil {
		return err
	}
	if err := ensureColumn(db, "meeting_rooms", "capacity", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	hasMeetingSnapshotHidden, err := columnExists(db, "meeting_rooms", "snapshot_hidden")
	if err != nil {
		return err
	}
	if hasMeetingSnapshotHidden {
		if _, err := db.Exec(`ALTER TABLE meeting_rooms DROP COLUMN snapshot_hidden`); err != nil {
			return err
		}
	}
	if err := migratePointsJsonToJSONB(db); err != nil {
		return err
	}
	if err := migrateWorkplaceGeometryToJSON(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomSpaces(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomBookingsMeetingRoomID(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomBookingsUserNameColumn(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomBookingsEmployeeID(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomBookingsTimeColumns(db); err != nil {
		return err
	}
	if err := migrateMeetingRoomBookingsCancelledColumns(db); err != nil {
		return err
	}
	if err := migrateBookingsTable(db); err != nil {
		return err
	}
	if err := migrateUsersProfileIDColumn(db); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "wb_band", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "role", "INTEGER NOT NULL DEFAULT 1"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "full_name", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "wb_team_profile_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "wb_user_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "users", "avatar_url", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsEmployeeID(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsWorkplaceID(db); err != nil {
		return err
	}
	if err := migrateUsersUserNameColumn(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsUserName(db); err != nil {
		return err
	}
	if err := migrateUserKeyColumns(db); err != nil {
		return err
	}
	if _, err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_wb_user_id_unique ON users (wb_user_id) WHERE wb_user_id <> ''`); err != nil {
		return err
	}
	if err := ensureUsersView(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsApplierTenant(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsGuestConstraint(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsCancelledColumns(db); err != nil {
		return err
	}
	if err := migrateWorkplaceBookingsUniqueConstraint(db); err != nil {
		return err
	}
	if err := createBookingIndexes(db); err != nil {
		return err
	}
	if err := migrateRefreshTokenColumns(db); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsCancelledColumns(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	if err := ensureColumn(db, "workplace_bookings", "cancelled_at", "TIMESTAMPTZ"); err != nil {
		return err
	}
	if err := ensureColumn(db, "workplace_bookings", "canceller_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsUniqueConstraint(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil || !hasTable {
		return err
	}
	// Drop the non-partial UNIQUE(workplace_id, date) constraint that conflicts with soft-delete.
	rows, err := db.Query(
		`SELECT c.conname
		   FROM pg_constraint c
		   JOIN pg_class t ON c.conrelid = t.oid
		  WHERE t.relname = 'workplace_bookings'
		    AND c.contype = 'u'
		    AND array_length(c.conkey, 1) = 2
		    AND c.conkey @> (
		        SELECT ARRAY[
		            (SELECT a1.attnum FROM pg_attribute a1 WHERE a1.attrelid = t.oid AND a1.attname = 'workplace_id'),
		            (SELECT a2.attnum FROM pg_attribute a2 WHERE a2.attrelid = t.oid AND a2.attname = 'date')
		        ]
		    )`,
	)
	if err != nil {
		return err
	}
	defer rows.Close()
	var constraintNames []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		constraintNames = append(constraintNames, name)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, name := range constraintNames {
		if _, err := db.Exec(
			fmt.Sprintf("ALTER TABLE workplace_bookings DROP CONSTRAINT %q", name),
		); err != nil {
			return err
		}
	}
	// Also drop any non-partial unique index on (workplace_id, date).
	idxRows, err := db.Query(
		`SELECT i.relname
		   FROM pg_index ix
		   JOIN pg_class i ON i.oid = ix.indexrelid
		   JOIN pg_class t ON t.oid = ix.indrelid
		   JOIN pg_attribute a1 ON a1.attrelid = t.oid
		   JOIN pg_attribute a2 ON a2.attrelid = t.oid
		  WHERE t.relname = 'workplace_bookings'
		    AND ix.indisunique = true
		    AND a1.attname = 'workplace_id' AND a1.attnum = ANY(ix.indkey)
		    AND a2.attname = 'date' AND a2.attnum = ANY(ix.indkey)
		    AND array_length(ix.indkey, 1) = 2
		    AND ix.indpred IS NULL
		    AND i.relname <> 'workplace_bookings_wp_date_active_uidx'`,
	)
	if err != nil {
		return err
	}
	defer idxRows.Close()
	var indexNames []string
	for idxRows.Next() {
		var name string
		if err := idxRows.Scan(&name); err != nil {
			return err
		}
		indexNames = append(indexNames, name)
	}
	if err := idxRows.Err(); err != nil {
		return err
	}
	for _, name := range indexNames {
		if _, err := db.Exec(fmt.Sprintf("DROP INDEX IF EXISTS %q", name)); err != nil {
			return err
		}
	}
	// Create partial unique index: only one active booking per workplace+date.
	if _, err := db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS workplace_bookings_wp_date_active_uidx
		 ON workplace_bookings (workplace_id, date)
		 WHERE cancelled_at IS NULL`,
	); err != nil {
		return err
	}
	return nil
}

func createBookingIndexes(db *sql.DB) error {
	if db == nil {
		return nil
	}
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_workplace_bookings_wp_date
		 ON workplace_bookings (workplace_id, date)
		 WHERE cancelled_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_workplace_bookings_applier_date
		 ON workplace_bookings (applier_employee_id, date)
		 WHERE cancelled_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_meeting_room_bookings_room_time
		 ON meeting_room_bookings (meeting_room_id, start_at, end_at)
		 WHERE cancelled_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_meeting_room_bookings_applier
		 ON meeting_room_bookings (applier_employee_id, end_at)
		 WHERE cancelled_at IS NULL`,
	}
	for _, stmt := range indexes {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

// migrateRefreshTokenColumns adds security-related columns to the
// office_refresh_tokens table: family_id (token-family for replay detection),
// last_used_at (audit), ip_address and user_agent (optional tracking).
// It also invalidates any legacy plain-text token_id rows by revoking them.
func migrateRefreshTokenColumns(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "office_refresh_tokens")
	if err != nil || !hasTable {
		return err
	}
	if err := ensureColumn(db, "office_refresh_tokens", "family_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_refresh_tokens", "last_used_at", "TIMESTAMPTZ"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_refresh_tokens", "ip_address", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_refresh_tokens", "user_agent", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := ensureColumn(db, "office_refresh_tokens", "device_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	// Revoke any pre-existing tokens that were stored without family_id
	// (they predate the hashing scheme so their token_id column is plain-text).
	if _, err := db.Exec(
		`UPDATE office_refresh_tokens
		    SET revoked_at = now()
		  WHERE family_id = '' AND revoked_at IS NULL`,
	); err != nil {
		return err
	}
	// Create index on family_id for efficient family revocation queries.
	if _, err := db.Exec(
		`CREATE INDEX IF NOT EXISTS office_refresh_tokens_family_id_idx ON office_refresh_tokens (family_id)`,
	); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsApplierTenant(db *sql.DB) error {
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil || !hasTable {
		return err
	}
	hasEmployeeID, err := columnExists(db, "workplace_bookings", "employee_id")
	if err != nil {
		return err
	}
	if hasEmployeeID {
		// Drop all indexes/constraints referencing employee_id before rename.
		if _, err := db.Exec(`DROP INDEX IF EXISTS workplace_bookings_employee_date_uidx`); err != nil {
			return err
		}
		if _, err := db.Exec(`DROP INDEX IF EXISTS workplace_bookings_wb_user_id_date_unique`); err != nil {
			return err
		}
		if _, err := db.Exec(
			`ALTER TABLE workplace_bookings RENAME COLUMN employee_id TO applier_employee_id`,
		); err != nil {
			return err
		}
	}
	if err := ensureColumn(db, "workplace_bookings", "tenant_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	// Backfill: for existing bookings the booker is the same as the applier.
	if _, err := db.Exec(
		`UPDATE workplace_bookings SET tenant_employee_id = applier_employee_id WHERE tenant_employee_id = ''`,
	); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsGuestConstraint(db *sql.DB) error {
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil || !hasTable {
		return err
	}

	// Determine current column name (applier_employee_id after rename, employee_id on legacy).
	colName := "applier_employee_id"
	hasApplier, err := columnExists(db, "workplace_bookings", "applier_employee_id")
	if err != nil {
		return err
	}
	if !hasApplier {
		colName = "employee_id"
	}

	// Find and drop any unique constraint on (colName, date) regardless of name.
	rows, err := db.Query(
		`SELECT c.conname
		   FROM pg_constraint c
		   JOIN pg_class t ON c.conrelid = t.oid
		  WHERE t.relname = 'workplace_bookings'
		    AND c.contype = 'u'
		    AND array_length(c.conkey, 1) = 2
		    AND c.conkey @> (
		        SELECT ARRAY[
		            (SELECT a1.attnum FROM pg_attribute a1 WHERE a1.attrelid = t.oid AND a1.attname = $1),
		            (SELECT a2.attnum FROM pg_attribute a2 WHERE a2.attrelid = t.oid AND a2.attname = 'date')
		        ]
		    )`,
		colName,
	)
	if err != nil {
		return err
	}
	defer rows.Close()
	var constraintNames []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		constraintNames = append(constraintNames, name)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, name := range constraintNames {
		if _, err := db.Exec(
			fmt.Sprintf(`ALTER TABLE workplace_bookings DROP CONSTRAINT %q`, name),
		); err != nil {
			return err
		}
	}

	// Also drop any non-partial unique index on (colName, date).
	idxRows, err := db.Query(
		fmt.Sprintf(
			`SELECT i.relname
			   FROM pg_index ix
			   JOIN pg_class i ON i.oid = ix.indexrelid
			   JOIN pg_class t ON t.oid = ix.indrelid
			   JOIN pg_attribute a1 ON a1.attrelid = t.oid
			   JOIN pg_attribute a2 ON a2.attrelid = t.oid
			  WHERE t.relname = 'workplace_bookings'
			    AND ix.indisunique = true
			    AND a1.attname = '%s' AND a1.attnum = ANY(ix.indkey)
			    AND a2.attname = 'date' AND a2.attnum = ANY(ix.indkey)
			    AND array_length(ix.indkey, 1) = 2
			    AND ix.indpred IS NULL
			    AND i.relname <> 'workplace_bookings_applier_date_uidx'`, colName),
	)
	if err != nil {
		return err
	}
	defer idxRows.Close()
	var indexNames []string
	for idxRows.Next() {
		var name string
		if err := idxRows.Scan(&name); err != nil {
			return err
		}
		indexNames = append(indexNames, name)
	}
	if err := idxRows.Err(); err != nil {
		return err
	}
	for _, name := range indexNames {
		if _, err := db.Exec(fmt.Sprintf(`DROP INDEX IF EXISTS %q`, name)); err != nil {
			return err
		}
	}

	// Drop old index name if it exists (from before rename).
	if _, err := db.Exec(`DROP INDEX IF EXISTS workplace_bookings_employee_date_uidx`); err != nil {
		return err
	}

	// Drop and recreate the index so the predicate includes cancelled_at IS NULL.
	if _, err := db.Exec(`DROP INDEX IF EXISTS workplace_bookings_applier_date_uidx`); err != nil {
		return err
	}

	// Create partial unique index that allows multiple applier_employee_id='0' (guest) bookings
	// and ignores soft-deleted (cancelled) rows.
	if _, err := db.Exec(
		fmt.Sprintf(
			`CREATE UNIQUE INDEX IF NOT EXISTS workplace_bookings_applier_date_uidx
			 ON workplace_bookings (%s, date)
			 WHERE %s <> '0' AND cancelled_at IS NULL`, colName, colName),
	); err != nil {
		return err
	}
	return nil
}

func ensureUsersView(db *sql.DB) error {
	stmts := []string{
		`CREATE OR REPLACE VIEW users_view AS
		  SELECT id,
		         full_name,
		         employee_id,
		         wb_team_profile_id,
		         wb_user_id,
		         avatar_url,
		         wb_band,
		         created_at,
		         role
		    FROM users`,
		`CREATE OR REPLACE FUNCTION users_view_update_fn()
		   RETURNS trigger AS $$
		   BEGIN
		     UPDATE users
		        SET full_name = COALESCE(NEW.full_name, ''),
		            employee_id = COALESCE(NEW.employee_id, ''),
		            wb_team_profile_id = COALESCE(NEW.wb_team_profile_id, ''),
		            wb_user_id = COALESCE(NEW.wb_user_id, ''),
		            avatar_url = COALESCE(NEW.avatar_url, ''),
		            wb_band = COALESCE(NEW.wb_band, ''),
		            role = COALESCE(NEW.role, users.role)
		      WHERE id = OLD.id;
		     RETURN NEW;
		   END;
		   $$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS users_view_update ON users_view`,
		`CREATE TRIGGER users_view_update
		 INSTEAD OF UPDATE ON users_view
		 FOR EACH ROW
		 EXECUTE FUNCTION users_view_update_fn()`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func migrateSpaceStorage(db *sql.DB) error {
	if _, err := db.Exec(`CREATE SEQUENCE IF NOT EXISTS spaces_id_seq`); err != nil {
		return err
	}

	hasCoworkings, err := tableExists(db, "coworkings")
	if err != nil {
		return err
	}
	hasSpaces, err := tableExists(db, "spaces")
	if err != nil {
		return err
	}
	if !hasCoworkings && hasSpaces {
		if _, err := db.Exec(`ALTER TABLE spaces RENAME TO coworkings`); err != nil {
			return err
		}
		hasCoworkings = true
	}

	hasMeetingRooms, err := tableExists(db, "meeting_rooms")
	if err != nil {
		return err
	}
	if hasMeetingRooms {
		hasSpaceID, err := columnExists(db, "meeting_rooms", "space_id")
		if err != nil {
			return err
		}
		if hasSpaceID {
			if _, err := db.Exec(`DROP TABLE meeting_rooms`); err != nil {
				return err
			}
			hasMeetingRooms = false
		}
	}

	if hasCoworkings {
		if _, err := db.Exec(`ALTER TABLE coworkings ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')`); err != nil {
			return err
		}
	}
	if hasMeetingRooms {
		if _, err := db.Exec(`ALTER TABLE meeting_rooms ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')`); err != nil {
			return err
		}
	}
	return nil
}

func migrateWorkplaceTables(db *sql.DB) error {
	hasWorkplaces, err := tableExists(db, "workplaces")
	if err != nil {
		return err
	}
	hasDesks, err := tableExists(db, "desks")
	if err != nil {
		return err
	}
	if !hasWorkplaces && hasDesks {
		if _, err := db.Exec(`ALTER TABLE desks RENAME TO workplaces`); err != nil {
			return err
		}
		hasWorkplaces = true
	}

	hasWorkplaceBookings, err := tableExists(db, "workplace_bookings")
	if err != nil {
		return err
	}
	hasBookings, err := tableExists(db, "bookings")
	if err != nil {
		return err
	}
	if !hasWorkplaceBookings && hasBookings {
		if _, err := db.Exec(`ALTER TABLE bookings RENAME TO workplace_bookings`); err != nil {
			return err
		}
	}
	return nil
}

func migrateWorkplaceCoworkingID(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplaces")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasCoworkingID, err := columnExists(db, "workplaces", "coworking_id")
	if err != nil {
		return err
	}
	hasSpaceID, err := columnExists(db, "workplaces", "space_id")
	if err != nil {
		return err
	}
	switch {
	case !hasCoworkingID && hasSpaceID:
		if _, err := db.Exec(`ALTER TABLE workplaces RENAME COLUMN space_id TO coworking_id`); err != nil {
			return err
		}
	case hasCoworkingID && hasSpaceID:
		if _, err := db.Exec(
			`UPDATE workplaces
			 SET coworking_id = space_id
			 WHERE coworking_id IS NULL`,
		); err != nil {
			return err
		}
		if _, err := db.Exec(`ALTER TABLE workplaces DROP COLUMN space_id`); err != nil {
			return err
		}
	}
	return nil
}
func migrateMeetingRoomSpaces(db *sql.DB) error {
	if _, err := db.Exec(`ALTER TABLE coworkings ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')`); err != nil {
		return err
	}
	if _, err := db.Exec(`ALTER TABLE meeting_rooms ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')`); err != nil {
		return err
	}
	hasCoworkingKind, err := columnExists(db, "coworkings", "kind")
	if err != nil {
		return err
	}
	if hasCoworkingKind {
		hasCoworkingCapacity, err := columnExists(db, "coworkings", "capacity")
		if err != nil {
			return err
		}
		capacityExpr := "0"
		if hasCoworkingCapacity {
			capacityExpr = "COALESCE(capacity, 0)"
		}
		query := fmt.Sprintf(
			`INSERT INTO meeting_rooms (id, floor_id, name, capacity, points_json, color, created_at)
			 SELECT id,
			        floor_id,
			        name,
			        %s,
			        COALESCE(points_json, '[]'),
			        COALESCE(color, ''),
			        created_at
			   FROM coworkings
			  WHERE kind = 'meeting'
			 ON CONFLICT (id) DO NOTHING`,
			capacityExpr,
		)
		if _, err := db.Exec(query); err != nil {
			return err
		}
		if _, err := db.Exec(`DELETE FROM coworkings WHERE kind = 'meeting'`); err != nil {
			return err
		}
	}
	if _, err := db.Exec(
		`SELECT setval(
		    'spaces_id_seq',
		    GREATEST(
		        1,
		        COALESCE((SELECT MAX(id) FROM coworkings), 0),
		        COALESCE((SELECT MAX(id) FROM meeting_rooms), 0)
		    ),
		    GREATEST(
		        COALESCE((SELECT MAX(id) FROM coworkings), 0),
		        COALESCE((SELECT MAX(id) FROM meeting_rooms), 0)
		    ) > 0
		)`,
	); err != nil {
		return err
	}
	return nil
}

func migrateMeetingRoomBookingsMeetingRoomID(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "meeting_room_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasMeetingRoomID, err := columnExists(db, "meeting_room_bookings", "meeting_room_id")
	if err != nil {
		return err
	}
	hasSpaceID, err := columnExists(db, "meeting_room_bookings", "space_id")
	if err != nil {
		return err
	}
	switch {
	case !hasMeetingRoomID && hasSpaceID:
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings RENAME COLUMN space_id TO meeting_room_id`); err != nil {
			return err
		}
	case hasMeetingRoomID && hasSpaceID:
		if _, err := db.Exec(
			`UPDATE meeting_room_bookings
			 SET meeting_room_id = space_id
			 WHERE meeting_room_id IS NULL`,
		); err != nil {
			return err
		}
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN space_id`); err != nil {
			return err
		}
	}
	if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP CONSTRAINT IF EXISTS meeting_room_bookings_space_id_fkey`); err != nil {
		return err
	}
	if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP CONSTRAINT IF EXISTS meeting_room_bookings_meeting_room_id_fkey`); err != nil {
		return err
	}
	if _, err := db.Exec(
		`ALTER TABLE meeting_room_bookings
		 ADD CONSTRAINT meeting_room_bookings_meeting_room_id_fkey
		 FOREIGN KEY(meeting_room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE`,
	); err != nil {
		return err
	}
	return nil
}

func migrateMeetingRoomBookingsTimeColumns(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "meeting_room_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasStartAt, err := columnExists(db, "meeting_room_bookings", "start_at")
	if err != nil {
		return err
	}
	hasEndAt, err := columnExists(db, "meeting_room_bookings", "end_at")
	if err != nil {
		return err
	}
	if !hasStartAt {
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings ADD COLUMN start_at TIMESTAMPTZ`); err != nil {
			return err
		}
	}
	if !hasEndAt {
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings ADD COLUMN end_at TIMESTAMPTZ`); err != nil {
			return err
		}
	}
	if _, err := db.Exec(
		`CREATE INDEX IF NOT EXISTS meeting_room_bookings_room_start_end_idx
		  ON meeting_room_bookings (meeting_room_id, start_at, end_at)`,
	); err != nil {
		return err
	}

	hasDate, err := columnExists(db, "meeting_room_bookings", "date")
	if err != nil {
		return err
	}
	hasStartMin, err := columnExists(db, "meeting_room_bookings", "start_min")
	if err != nil {
		return err
	}
	hasEndMin, err := columnExists(db, "meeting_room_bookings", "end_min")
	if err != nil {
		return err
	}
	if hasDate && hasStartMin && hasEndMin {
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		rows, err := tx.Query(
			`SELECT b.id,
			        b.meeting_room_id,
			        b.date,
			        b.start_min,
			        b.end_min,
			        COALESCE(ob.timezone, '')
			   FROM meeting_room_bookings b
			   JOIN meeting_rooms s ON s.id = b.meeting_room_id
			   JOIN floors f ON f.id = s.floor_id
			   JOIN office_buildings ob ON ob.id = f.building_id
			  WHERE b.start_at IS NULL OR b.end_at IS NULL`,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		type bookingTimeRow struct {
			id       int64
			date     string
			startMin int
			endMin   int
			timezone string
		}
		rowsData := make([]bookingTimeRow, 0)
		for rows.Next() {
			var row bookingTimeRow
			var meetingRoomID int64
			if err := rows.Scan(&row.id, &meetingRoomID, &row.date, &row.startMin, &row.endMin, &row.timezone); err != nil {
				return err
			}
			rowsData = append(rowsData, row)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		rows.Close()

		for _, row := range rowsData {
			timezone := strings.TrimSpace(row.timezone)
			if timezone == "" {
				timezone = defaultBuildingTimezone
			}
			if _, err := time.LoadLocation(timezone); err != nil {
				timezone = defaultBuildingTimezone
			}
			location, err := time.LoadLocation(timezone)
			if err != nil {
				location = time.Local
			}
			parsedDate, err := time.ParseInLocation("2006-01-02", row.date, location)
			if err != nil {
				return err
			}
			startAt := parsedDate.Add(time.Duration(row.startMin) * time.Minute)
			endAt := parsedDate.Add(time.Duration(row.endMin) * time.Minute)
			if _, err := tx.Exec(
				`UPDATE meeting_room_bookings SET start_at = $1, end_at = $2 WHERE id = $3`,
				startAt,
				endAt,
				row.id,
			); err != nil {
				return err
			}
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}

	var hasNulls bool
	if err := db.QueryRow(
		`SELECT EXISTS (
			SELECT 1 FROM meeting_room_bookings
			WHERE start_at IS NULL OR end_at IS NULL
		)`,
	).Scan(&hasNulls); err != nil {
		return err
	}
	if !hasNulls {
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings ALTER COLUMN start_at SET NOT NULL`); err != nil {
			return err
		}
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings ALTER COLUMN end_at SET NOT NULL`); err != nil {
			return err
		}
		if hasDate {
			if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN date`); err != nil {
				return err
			}
		}
		if hasStartMin {
			if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN start_min`); err != nil {
				return err
			}
		}
		if hasEndMin {
			if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN end_min`); err != nil {
				return err
			}
		}
	}
	return nil
}

func migrateMeetingRoomBookingsUserNameColumn(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "meeting_room_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasUserName, err := columnExists(db, "meeting_room_bookings", "user_name")
	if err != nil {
		return err
	}
	if hasUserName {
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN user_name`); err != nil {
			return err
		}
	}
	return nil
}

func migrateMeetingRoomBookingsEmployeeID(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "meeting_room_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasEmployeeID, err := columnExists(db, "meeting_room_bookings", "employee_id")
	if err != nil {
		return err
	}
	hasWbUserID, err := columnExists(db, "meeting_room_bookings", "wb_user_id")
	if err != nil {
		return err
	}
	hasApplierEmployeeID, err := columnExists(db, "meeting_room_bookings", "applier_employee_id")
	if err != nil {
		return err
	}
	switch {
	case !hasEmployeeID && !hasApplierEmployeeID && hasWbUserID:
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings RENAME COLUMN wb_user_id TO applier_employee_id`); err != nil {
			return err
		}
		hasApplierEmployeeID = true
	case hasEmployeeID && hasWbUserID:
		if _, err := db.Exec(
			`UPDATE meeting_room_bookings
			 SET employee_id = wb_user_id
			 WHERE employee_id IS NULL`,
		); err != nil {
			return err
		}
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings DROP COLUMN wb_user_id`); err != nil {
			return err
		}
	}
	// Rename employee_id → applier_employee_id if not yet renamed.
	if !hasApplierEmployeeID {
		hasEmployeeID, err = columnExists(db, "meeting_room_bookings", "employee_id")
		if err != nil {
			return err
		}
		if hasEmployeeID {
			if _, err := db.Exec(`ALTER TABLE meeting_room_bookings RENAME COLUMN employee_id TO applier_employee_id`); err != nil {
				return err
			}
		}
	}
	if _, err := db.Exec(
		`UPDATE meeting_room_bookings b
		 SET applier_employee_id = COALESCE(NULLIF(u.employee_id, ''), b.applier_employee_id)
		 FROM users u
		 WHERE b.applier_employee_id = u.wb_user_id
		    OR b.applier_employee_id = u.wb_team_profile_id
		    OR b.applier_employee_id = u.employee_id`,
	); err != nil {
		return err
	}
	return nil
}

func migrateMeetingRoomBookingsCancelledColumns(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "meeting_room_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	if err := ensureColumn(db, "meeting_room_bookings", "cancelled_at", "TIMESTAMPTZ"); err != nil {
		return err
	}
	if err := ensureColumn(db, "meeting_room_bookings", "canceller_employee_id", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	return nil
}

func migrateUserKeyColumns(db *sql.DB) error {
	if db == nil {
		return nil
	}

	hasUsers, err := tableExists(db, "users")
	if err != nil {
		return err
	}
	if hasUsers {
		hasUserKey, err := columnExists(db, "users", "user_key")
		if err != nil {
			return err
		}
		if hasUserKey {
			if _, err := db.Exec(
				`UPDATE users
				 SET wb_user_id = user_key
				 WHERE (wb_user_id = '' OR wb_user_id IS NULL) AND user_key <> ''`,
			); err != nil {
				return err
			}
			if _, err := db.Exec(`ALTER TABLE users DROP COLUMN user_key`); err != nil {
				return err
			}
		}
	}

	// Create unique index only if old column name still exists (before rename migration).
	hasOldCol, _ := columnExists(db, "workplace_bookings", "employee_id")
	if hasOldCol {
		if _, err := db.Exec(
			`CREATE UNIQUE INDEX IF NOT EXISTS workplace_bookings_wb_user_id_date_unique
			 ON workplace_bookings (employee_id, date)`,
		); err != nil {
			return err
		}
	}
	return nil
}

func migrateUsersProfileIDColumn(db *sql.DB) error {
	if db == nil {
		return nil
	}

	hasUsers, err := tableExists(db, "users")
	if err != nil {
		return err
	}
	if !hasUsers {
		return nil
	}

	hasProfileID, err := columnExists(db, "users", "profile_id")
	if err != nil {
		return err
	}
	hasTeamProfileID, err := columnExists(db, "users", "wb_team_profile_id")
	if err != nil {
		return err
	}

	switch {
	case hasProfileID && !hasTeamProfileID:
		if _, err := db.Exec(`ALTER TABLE users RENAME COLUMN profile_id TO wb_team_profile_id`); err != nil {
			return err
		}
	case hasProfileID && hasTeamProfileID:
		if _, err := db.Exec(
			`UPDATE users
			 SET wb_team_profile_id = profile_id
			 WHERE (wb_team_profile_id = '' OR wb_team_profile_id IS NULL) AND profile_id <> ''`,
		); err != nil {
			return err
		}
		if _, err := db.Exec(`ALTER TABLE users DROP COLUMN profile_id`); err != nil {
			return err
		}
	}
	return nil
}

func migrateUsersUserNameColumn(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasUsers, err := tableExists(db, "users")
	if err != nil {
		return err
	}
	if !hasUsers {
		return nil
	}
	hasUserName, err := columnExists(db, "users", "user_name")
	if err != nil {
		return err
	}
	if !hasUserName {
		return nil
	}
	if _, err := db.Exec(`DROP VIEW IF EXISTS users_view CASCADE`); err != nil {
		return err
	}
	if _, err := db.Exec(`DROP FUNCTION IF EXISTS users_view_update_fn()`); err != nil {
		return err
	}
	if _, err := db.Exec(`ALTER TABLE users DROP COLUMN user_name`); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsEmployeeID(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}

	hasEmployeeID, err := columnExists(db, "workplace_bookings", "employee_id")
	if err != nil {
		return err
	}
	hasWbUserID, err := columnExists(db, "workplace_bookings", "wb_user_id")
	if err != nil {
		return err
	}
	hasUserKey, err := columnExists(db, "workplace_bookings", "user_key")
	if err != nil {
		return err
	}
	hasUsers, err := tableExists(db, "users")
	if err != nil {
		return err
	}

	switch {
	case !hasEmployeeID && hasWbUserID:
		if _, err := db.Exec(`ALTER TABLE workplace_bookings RENAME COLUMN wb_user_id TO employee_id`); err != nil {
			return err
		}
		hasEmployeeID = true
		hasWbUserID = false
	case !hasEmployeeID && hasUserKey:
		if _, err := db.Exec(`ALTER TABLE workplace_bookings RENAME COLUMN user_key TO employee_id`); err != nil {
			return err
		}
		hasEmployeeID = true
		hasUserKey = false
	}

	if hasEmployeeID && hasUsers {
		updateQuery := `UPDATE workplace_bookings b
		                   SET employee_id = u.employee_id
		                  FROM users u
		                 WHERE u.employee_id <> ''
		                   AND (u.wb_user_id = b.employee_id OR u.wb_team_profile_id = b.employee_id OR u.employee_id = b.employee_id`
		if hasWbUserID {
			updateQuery += ` OR u.wb_user_id = b.wb_user_id OR u.wb_team_profile_id = b.wb_user_id OR u.employee_id = b.wb_user_id`
		}
		if hasUserKey {
			updateQuery += ` OR u.wb_user_id = b.user_key OR u.wb_team_profile_id = b.user_key OR u.employee_id = b.user_key`
		}
		updateQuery += `)`
		if _, err := db.Exec(updateQuery); err != nil {
			return err
		}
	}

	if hasEmployeeID && hasWbUserID {
		if _, err := db.Exec(`ALTER TABLE workplace_bookings DROP COLUMN wb_user_id`); err != nil {
			return err
		}
	}
	if hasEmployeeID && hasUserKey {
		if _, err := db.Exec(`ALTER TABLE workplace_bookings DROP COLUMN user_key`); err != nil {
			return err
		}
	}
	return nil
}

func migrateWorkplaceBookingsWorkplaceID(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasDeskID, err := columnExists(db, "workplace_bookings", "desk_id")
	if err != nil {
		return err
	}
	if !hasDeskID {
		return nil
	}
	if _, err := db.Exec(`ALTER TABLE workplace_bookings RENAME COLUMN desk_id TO workplace_id`); err != nil {
		return err
	}
	return nil
}

func migrateWorkplaceBookingsUserName(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplace_bookings")
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasUserName, err := columnExists(db, "workplace_bookings", "user_name")
	if err != nil {
		return err
	}
	if !hasUserName {
		return nil
	}
	if _, err := db.Exec(`ALTER TABLE workplace_bookings DROP COLUMN user_name`); err != nil {
		return err
	}
	return nil
}

func migrateCreatedAtColumns(db *sql.DB) error {
	if _, err := db.Exec(`DROP VIEW IF EXISTS users_view`); err != nil {
		return err
	}
	tables := []string{
		"users",
		"office_buildings",
		"floors",
		"coworkings",
		"workplaces",
		"meeting_rooms",
		"meeting_room_bookings",
		"workplace_bookings",
	}
	for _, table := range tables {
		hasTable, err := tableExists(db, table)
		if err != nil {
			return err
		}
		if !hasTable {
			continue
		}
		hasColumn, err := columnExists(db, table, "created_at")
		if err != nil {
			return err
		}
		if !hasColumn {
			continue
		}
		dataType, err := columnType(db, table, "created_at")
		if err != nil {
			return err
		}
		if dataType == "timestamp with time zone" {
			continue
		}
		if dataType == "text" {
			if _, err := db.Exec(
				fmt.Sprintf(
					`UPDATE %s SET created_at = now()::text WHERE created_at IS NULL OR TRIM(created_at) = ''`,
					table,
				),
			); err != nil {
				return err
			}
		}
		if _, err := db.Exec(
			fmt.Sprintf(
				`ALTER TABLE %s ALTER COLUMN created_at DROP DEFAULT`,
				table,
			),
		); err != nil {
			return err
		}
		if _, err := db.Exec(
			fmt.Sprintf(
				`ALTER TABLE %s ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz`,
				table,
			),
		); err != nil {
			return err
		}
		if _, err := db.Exec(
			fmt.Sprintf(
				`ALTER TABLE %s ALTER COLUMN created_at SET DEFAULT now()`,
				table,
			),
		); err != nil {
			return err
		}
	}
	return nil
}

func migrateBookingUserKeyColumn(db *sql.DB, table string) error {
	hasTable, err := tableExists(db, table)
	if err != nil {
		return err
	}
	if !hasTable {
		return nil
	}
	hasUserKey, err := columnExists(db, table, "user_key")
	if err != nil {
		return err
	}
	hasWbUserID, err := columnExists(db, table, "wb_user_id")
	if err != nil {
		return err
	}
	switch {
	case hasUserKey && !hasWbUserID:
		if _, err := db.Exec(fmt.Sprintf("ALTER TABLE %q RENAME COLUMN user_key TO wb_user_id", table)); err != nil {
			return err
		}
	case hasUserKey && hasWbUserID:
		if _, err := db.Exec(fmt.Sprintf(
			`UPDATE %q
			 SET wb_user_id = user_key
			 WHERE (wb_user_id = '' OR wb_user_id IS NULL) AND user_key <> ''`,
			table,
		)); err != nil {
			return err
		}
		if _, err := db.Exec(fmt.Sprintf("ALTER TABLE %q DROP COLUMN user_key", table)); err != nil {
			return err
		}
	}
	return nil
}

func tableExists(db *sql.DB, table string) (bool, error) {
	var exists bool
	if err := db.QueryRow(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = $1
		)`,
		table,
	).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func columnExists(db *sql.DB, table, column string) (bool, error) {
	var exists bool
	if err := db.QueryRow(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = $1
			  AND column_name = $2
		)`,
		table,
		column,
	).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func columnType(db *sql.DB, table, column string) (string, error) {
	var dataType string
	if err := db.QueryRow(
		`SELECT data_type
		 FROM information_schema.columns
		 WHERE table_schema = current_schema()
		   AND table_name = $1
		   AND column_name = $2`,
		table,
		column,
	).Scan(&dataType); err != nil {
		return "", err
	}
	return dataType, nil
}

func (a *app) upsertUserInfo(wbUserID, userName, fullName, employeeID, profileID, avatarURL, wbBand string) error {
	if strings.TrimSpace(wbUserID) == "" {
		return nil
	}
	normalizedFullName := strings.TrimSpace(fullName)
	if normalizedFullName == "" {
		normalizedFullName = strings.TrimSpace(userName)
	}
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	role, err := defaultRoleForNewUser(tx)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		`INSERT INTO users (wb_user_id, full_name, employee_id, wb_team_profile_id, avatar_url, wb_band, role)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (wb_user_id)
		 DO UPDATE SET full_name = EXCLUDED.full_name,
		               employee_id = EXCLUDED.employee_id,
		               wb_team_profile_id = EXCLUDED.wb_team_profile_id,
		               avatar_url = EXCLUDED.avatar_url,
		               wb_band = EXCLUDED.wb_band`,
		strings.TrimSpace(wbUserID),
		normalizedFullName,
		strings.TrimSpace(employeeID),
		strings.TrimSpace(profileID),
		strings.TrimSpace(avatarURL),
		strings.TrimSpace(wbBand),
		role,
	)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (a *app) upsertUserWBBand(wbUserID, userName, wbBand string) error {
	if strings.TrimSpace(wbUserID) == "" || strings.TrimSpace(wbBand) == "" {
		return nil
	}
	normalizedFullName := strings.TrimSpace(userName)
	_, err := a.db.Exec(
		`INSERT INTO users (wb_user_id, full_name, wb_band)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (wb_user_id)
		 DO UPDATE SET wb_band = EXCLUDED.wb_band,
		               full_name = CASE
		                 WHEN COALESCE(users.full_name, '') = '' THEN EXCLUDED.full_name
		                 ELSE users.full_name
		               END`,
		strings.TrimSpace(wbUserID),
		normalizedFullName,
		strings.TrimSpace(wbBand),
	)
	return err
}

func (a *app) getUserWBBand(wbUserID string) (string, error) {
	if strings.TrimSpace(wbUserID) == "" {
		return "", nil
	}
	var wbBand string
	err := a.db.QueryRow(
		`SELECT COALESCE(wb_band, '') FROM users WHERE wb_user_id = $1`,
		strings.TrimSpace(wbUserID),
	).Scan(&wbBand)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(wbBand), nil
}

func ensureColumn(db *sql.DB, table, column, definition string) error {
	var exists bool
	if err := db.QueryRow(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = $1
			  AND column_name = $2
		)`,
		table,
		column,
	).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err := db.Exec(fmt.Sprintf("ALTER TABLE %q ADD COLUMN %q %s", table, column, definition))
	return err
}

func normalizeTimezone(raw string) (string, error) {
	tz := strings.TrimSpace(raw)
	if tz == "" {
		return defaultBuildingTimezone, nil
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return "", err
	}
	return tz, nil
}

func migratePointsJsonToJSONB(db *sql.DB) error {
	if db == nil {
		return nil
	}
	for _, table := range []string{"coworkings", "meeting_rooms"} {
		exists, err := columnExists(db, table, "points_json")
		if err != nil {
			return err
		}
		if !exists {
			continue
		}
		dt, err := columnType(db, table, "points_json")
		if err != nil {
			return err
		}
		if strings.EqualFold(dt, "text") {
			// Drop the TEXT default first — PostgreSQL cannot auto-cast it to JSONB.
			if _, err := db.Exec(fmt.Sprintf(
				`ALTER TABLE %q ALTER COLUMN points_json DROP DEFAULT`,
				table,
			)); err != nil {
				return err
			}
			if _, err := db.Exec(fmt.Sprintf(
				`ALTER TABLE %q ALTER COLUMN points_json TYPE JSONB USING CASE WHEN points_json IS NULL OR points_json = '' THEN '[]'::jsonb ELSE points_json::jsonb END`,
				table,
			)); err != nil {
				return err
			}
			if _, err := db.Exec(fmt.Sprintf(
				`ALTER TABLE %q ALTER COLUMN points_json SET DEFAULT '[]'::jsonb`,
				table,
			)); err != nil {
				return err
			}
		}
	}
	return nil
}

func migrateWorkplaceGeometryToJSON(db *sql.DB) error {
	if db == nil {
		return nil
	}
	hasTable, err := tableExists(db, "workplaces")
	if err != nil || !hasTable {
		return err
	}
	hasX, err := columnExists(db, "workplaces", "x")
	if err != nil {
		return err
	}
	if !hasX {
		// Already migrated or fresh install — just ensure the column exists.
		return ensureColumn(db, "workplaces", "points_json",
			`JSONB NOT NULL DEFAULT '{"x":0,"y":0,"width":200,"height":100,"rotation":0}'::jsonb`)
	}
	// Old schema with individual columns — migrate to JSONB.
	if err := ensureColumn(db, "workplaces", "points_json",
		`JSONB NOT NULL DEFAULT '{"x":0,"y":0,"width":200,"height":100,"rotation":0}'::jsonb`); err != nil {
		return err
	}
	if _, err := db.Exec(
		`UPDATE workplaces SET points_json = jsonb_build_object(
			'x', COALESCE(x, 0),
			'y', COALESCE(y, 0),
			'width', COALESCE(width, 200),
			'height', COALESCE(height, 100),
			'rotation', COALESCE(rotation, 0)
		)`,
	); err != nil {
		return err
	}
	for _, col := range []string{"x", "y", "width", "height", "rotation"} {
		if _, err := db.Exec(fmt.Sprintf(`ALTER TABLE workplaces DROP COLUMN %q`, col)); err != nil {
			return err
		}
	}
	return nil
}

func encodeDeskGeometry(x, y, width, height, rotation float64) (string, error) {
	g := struct {
		X        float64 `json:"x"`
		Y        float64 `json:"y"`
		Width    float64 `json:"width"`
		Height   float64 `json:"height"`
		Rotation float64 `json:"rotation"`
	}{x, y, width, height, rotation}
	raw, err := json.Marshal(g)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func decodeDeskGeometry(raw string) (x, y, width, height, rotation float64) {
	if raw == "" {
		return 0, 0, 200, 100, 0
	}
	var g struct {
		X        float64 `json:"x"`
		Y        float64 `json:"y"`
		Width    float64 `json:"width"`
		Height   float64 `json:"height"`
		Rotation float64 `json:"rotation"`
	}
	if err := json.Unmarshal([]byte(raw), &g); err != nil {
		return 0, 0, 200, 100, 0
	}
	return g.X, g.Y, g.Width, g.Height, g.Rotation
}

func encodePoints(points []point) (string, error) {
	if len(points) == 0 {
		return "[]", nil
	}
	raw, err := json.Marshal(points)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func decodePoints(raw string) []point {
	if raw == "" {
		return nil
	}
	var points []point
	if err := json.Unmarshal([]byte(raw), &points); err != nil {
		return nil
	}
	return points
}

func (a *app) handleBuildings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := a.listBuildings()
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		if !ensureNotEmployeeRole(w, r, a.db) {
			return
		}
		if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
			created, status, err := a.createBuildingFromMultipart(w, r)
			if err != nil {
				if status == http.StatusInternalServerError {
					log.Printf("internal error: %v", err)
					respondError(w, status, "internal error")
				} else {
					respondError(w, status, err.Error())
				}
				return
			}
			a.logAuditEventFromRequest(r, auditActionCreate, auditEntityBuilding, created.ID, created.Name, map[string]any{
				"building_id":           created.ID,
				"building_name":         created.Name,
				"address":               created.Address,
				"timezone":              created.Timezone,
				"responsible_employee":  created.ResponsibleEmployeeID,
				"created_floor_ids":     created.Floors,
				"created_from_multipart": true,
			})
			respondJSON(w, http.StatusCreated, created)
			return
		}
		var payload struct {
			Name                  string `json:"name"`
			Address               string `json:"address"`
			Timezone              string `json:"timezone"`
			ResponsibleEmployeeID string `json:"responsible_employee_id"`
			UndergroundFloors     int    `json:"underground_floors"`
			AbovegroundFloors     int    `json:"aboveground_floors"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		payload.Name = strings.TrimSpace(payload.Name)
		payload.Address = strings.TrimSpace(payload.Address)
		payload.ResponsibleEmployeeID = strings.TrimSpace(payload.ResponsibleEmployeeID)
		if payload.Name == "" || payload.Address == "" {
			respondError(w, http.StatusBadRequest, "name and address are required")
			return
		}
		if payload.UndergroundFloors < 0 || payload.AbovegroundFloors < 0 {
			respondError(w, http.StatusBadRequest, "underground_floors and aboveground_floors must be non-negative")
			return
		}
		timezone, err := normalizeTimezone(payload.Timezone)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid timezone")
			return
		}
		result, err := a.createBuildingWithFloors(payload.Name, payload.Address, timezone, "", payload.UndergroundFloors, payload.AbovegroundFloors, payload.ResponsibleEmployeeID)
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		a.logAuditEventFromRequest(r, auditActionCreate, auditEntityBuilding, result.ID, result.Name, map[string]any{
			"building_id":           result.ID,
			"building_name":         result.Name,
			"address":               result.Address,
			"timezone":              result.Timezone,
			"underground_floors":    payload.UndergroundFloors,
			"aboveground_floors":    payload.AbovegroundFloors,
			"responsible_employee":  result.ResponsibleEmployeeID,
			"created_floor_ids":     result.Floors,
			"created_from_multipart": false,
		})
		respondJSON(w, http.StatusCreated, result)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) createBuildingFromMultipart(w http.ResponseWriter, r *http.Request) (building, int, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBuildingFormSize)
	if err := r.ParseMultipartForm(maxBuildingFormSize); err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid form data or file is too large")
	}
	name := strings.TrimSpace(r.FormValue("name"))
	address := strings.TrimSpace(r.FormValue("address"))
	responsibleEmployeeID := strings.TrimSpace(r.FormValue("responsible_employee_id"))
	if name == "" || address == "" {
		return building{}, http.StatusBadRequest, errors.New("name and address are required")
	}
	timezone, err := normalizeTimezone(r.FormValue("timezone"))
	if err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid timezone")
	}
	undergroundFloors, err := parseOptionalInt(r.FormValue("underground_floors"))
	if err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid underground_floors")
	}
	abovegroundFloors, err := parseOptionalInt(r.FormValue("aboveground_floors"))
	if err != nil {
		return building{}, http.StatusBadRequest, errors.New("invalid aboveground_floors")
	}
	if undergroundFloors < 0 || abovegroundFloors < 0 {
		return building{}, http.StatusBadRequest, errors.New("underground_floors and aboveground_floors must be non-negative")
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			created, createErr := a.createBuildingWithFloors(name, address, timezone, "", undergroundFloors, abovegroundFloors, responsibleEmployeeID)
			if createErr != nil {
				return building{}, http.StatusInternalServerError, createErr
			}
			return created, http.StatusOK, nil
		}
		return building{}, http.StatusBadRequest, err
	}

	created, err := a.createBuildingWithFloors(name, address, timezone, "", undergroundFloors, abovegroundFloors, responsibleEmployeeID)
	if err != nil {
		return building{}, http.StatusInternalServerError, err
	}
	imageURL, err := a.saveBuildingImage(created.ID, file, header)
	if err != nil {
		return building{}, http.StatusBadRequest, err
	}
	updated, err := a.updateBuildingImage(created.ID, imageURL)
	if err != nil {
		return building{}, http.StatusInternalServerError, err
	}
	return updated, http.StatusOK, nil
}

func (a *app) handleBuildingSubroutes(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/api/buildings/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/buildings/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if suffix == "" {
		switch r.Method {
		case http.MethodGet:
			item, err := a.getBuilding(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageBuilding(w, r, id) {
				return
			}
			requesterEmployeeID, requesterErr := extractEmployeeIDFromRequest(r, a.db)
			if requesterErr != nil {
				log.Printf("internal error: %v", requesterErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			requesterEmployeeID = strings.TrimSpace(requesterEmployeeID)
			var payload struct {
				Name                  string  `json:"name"`
				Address               string  `json:"address"`
				Timezone              *string `json:"timezone"`
				ResponsibleEmployeeID *string `json:"responsible_employee_id"`
				UndergroundFloors     *int    `json:"underground_floors"`
				AbovegroundFloors     *int    `json:"aboveground_floors"`
			}
			if err := decodeJSON(r, &payload); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			payload.Name = strings.TrimSpace(payload.Name)
			payload.Address = strings.TrimSpace(payload.Address)
			if payload.Name == "" || payload.Address == "" {
				respondError(w, http.StatusBadRequest, "name and address are required")
				return
			}
			existingBuilding, err := a.getBuilding(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			beforeFloorSummaries := a.getFloorAuditSummaries(existingBuilding.Floors)
			if payload.ResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.ResponsibleEmployeeID)
				payload.ResponsibleEmployeeID = &trimmed
				role, err := resolveRoleFromRequest(r, a.db)
				if err != nil {
					respondRoleResolutionError(w, err)
					return
				}
				if role != roleAdmin {
					respondError(w, http.StatusForbidden, "Недостаточно прав")
					return
				}
			}
			timezone := ""
			if payload.Timezone == nil {
				timezone = existingBuilding.Timezone
			} else {
				normalized, err := normalizeTimezone(*payload.Timezone)
				if err != nil {
					respondError(w, http.StatusBadRequest, "invalid timezone")
					return
				}
				timezone = normalized
			}
			if payload.UndergroundFloors != nil && *payload.UndergroundFloors < 0 {
				respondError(w, http.StatusBadRequest, "underground_floors must be non-negative")
				return
			}
			if payload.AbovegroundFloors != nil && *payload.AbovegroundFloors < 0 {
				respondError(w, http.StatusBadRequest, "aboveground_floors must be non-negative")
				return
			}
			previousResponsible := ""
			if payload.ResponsibleEmployeeID != nil {
				previousResponsible, err = a.getBuildingResponsibleEmployeeID(id)
				if err != nil && !errors.Is(err, errNotFound) {
					log.Printf("internal error: %v", err)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
			}
			result, err := a.updateBuilding(
				id,
				payload.Name,
				payload.Address,
				timezone,
				payload.ResponsibleEmployeeID,
				payload.UndergroundFloors,
				payload.AbovegroundFloors,
			)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if payload.ResponsibleEmployeeID != nil {
				a.auditResponsibilityChange(r.Context(), "building", id, previousResponsible, *payload.ResponsibleEmployeeID, requesterEmployeeID)
			}
			afterFloorSummaries := a.getFloorAuditSummaries(result.Floors)
			changes, addedFloors, removedFloors := describeBuildingAuditChanges(
				existingBuilding,
				result,
				beforeFloorSummaries,
				afterFloorSummaries,
			)
			if len(changes) > 0 {
				a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityBuilding, result.ID, result.Name, map[string]any{
					"building_id":          result.ID,
					"building_name":        result.Name,
					"address":              result.Address,
					"timezone":             result.Timezone,
					"floor_ids":            result.Floors,
					"responsible_employee": result.ResponsibleEmployeeID,
					"changes":              changes,
					"added_floors":         addedFloors,
					"removed_floors":       removedFloors,
					"before_name":          existingBuilding.Name,
					"after_name":           result.Name,
					"before_address":       existingBuilding.Address,
					"after_address":        result.Address,
					"before_timezone":      existingBuilding.Timezone,
					"after_timezone":       result.Timezone,
					"before_responsible":   existingBuilding.ResponsibleEmployeeID,
					"after_responsible":    result.ResponsibleEmployeeID,
					"before_floor_ids":     existingBuilding.Floors,
					"after_floor_ids":      result.Floors,
				})
			}
			respondJSON(w, http.StatusOK, result)
		case http.MethodDelete:
			if !ensureNotEmployeeRole(w, r, a.db) {
				return
			}
			existing, existingErr := a.getBuilding(id)
			if existingErr != nil {
				if errors.Is(existingErr, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", existingErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if err := a.deleteBuilding(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			a.logAuditEventFromRequest(r, auditActionDelete, auditEntityBuilding, existing.ID, existing.Name, map[string]any{
				"building_id":   existing.ID,
				"building_name": existing.Name,
				"address":       existing.Address,
				"timezone":      existing.Timezone,
				"floor_ids":     existing.Floors,
			})
			respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}
	if suffix == "/image" {
		switch r.Method {
		case http.MethodPost:
			if !a.ensureCanManageBuilding(w, r, id) {
				return
			}
			existing, err := a.getBuilding(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			file, header, err := r.FormFile("image")
			if err != nil {
				if errors.Is(err, http.ErrMissingFile) && strings.EqualFold(r.FormValue("remove"), "true") {
					updated, clearErr := a.clearBuildingImage(id)
					if clearErr != nil {
						if errors.Is(clearErr, errNotFound) {
							respondError(w, http.StatusNotFound, "building not found")
							return
						}
						respondError(w, http.StatusInternalServerError, clearErr.Error())
						return
					}
					if strings.TrimSpace(existing.ImageURL) != strings.TrimSpace(updated.ImageURL) {
						a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityBuilding, existing.ID, existing.Name, map[string]any{
							"building_id":       existing.ID,
							"building_name":     existing.Name,
							"changes":           []string{fmt.Sprintf("Изображение: %q -> %q", existing.ImageURL, updated.ImageURL)},
							"before_image_url":  existing.ImageURL,
							"after_image_url":   updated.ImageURL,
						})
					}
					respondJSON(w, http.StatusOK, updated)
					return
				}
				respondError(w, http.StatusBadRequest, "image file is required")
				return
			}
			defer file.Close()
			imageURL, err := a.saveBuildingImage(id, file, header)
			if err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			updated, err := a.updateBuildingImage(id, imageURL)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if existing.ImageURL != "" && existing.ImageURL != imageURL {
				_ = a.removeUploadedFile(existing.ImageURL)
			}
			if strings.TrimSpace(existing.ImageURL) != strings.TrimSpace(updated.ImageURL) {
				a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityBuilding, existing.ID, existing.Name, map[string]any{
					"building_id":       existing.ID,
					"building_name":     existing.Name,
					"changes":           []string{fmt.Sprintf("Изображение: %q -> %q", existing.ImageURL, updated.ImageURL)},
					"before_image_url":  existing.ImageURL,
					"after_image_url":   updated.ImageURL,
				})
			}
			respondJSON(w, http.StatusOK, updated)
		case http.MethodDelete:
			if !a.ensureCanManageBuilding(w, r, id) {
				return
			}
			existing, existingErr := a.getBuilding(id)
			if existingErr != nil {
				if errors.Is(existingErr, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", existingErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			updated, err := a.clearBuildingImage(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if strings.TrimSpace(existing.ImageURL) != strings.TrimSpace(updated.ImageURL) {
				a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityBuilding, existing.ID, existing.Name, map[string]any{
					"building_id":       existing.ID,
					"building_name":     existing.Name,
					"changes":           []string{fmt.Sprintf("Изображение: %q -> %q", existing.ImageURL, updated.ImageURL)},
					"before_image_url":  existing.ImageURL,
					"after_image_url":   updated.ImageURL,
				})
			}
			respondJSON(w, http.StatusOK, updated)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}
	if suffix != "/floors" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := a.listFloorsByBuilding(id)
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleFloors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		BuildingID int64  `json:"building_id"`
		Name       string `json:"name"`
		Level      int    `json:"level"`
		PlanSVG    string `json:"plan_svg"`
	}
	if err := decodeJSONWithLimit(r, &payload, maxFloorPlanJSONSize); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.PlanSVG = sanitizeSVG(strings.TrimSpace(payload.PlanSVG))
	if payload.BuildingID == 0 || payload.Name == "" || payload.PlanSVG == "" {
		respondError(w, http.StatusBadRequest, "building_id, name, and plan_svg are required")
		return
	}
	if !a.ensureCanManageBuilding(w, r, payload.BuildingID) {
		return
	}
	result, err := a.createFloor(payload.BuildingID, payload.Name, payload.Level, payload.PlanSVG)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	a.logAuditEventFromRequest(r, auditActionCreate, auditEntityFloor, result.ID, result.Name, map[string]any{
		"floor_id":     result.ID,
		"floor_name":   result.Name,
		"building_id":  result.BuildingID,
		"floor_level":  result.Level,
		"has_plan_svg": strings.TrimSpace(result.PlanSVG) != "",
	})
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleFloorSubroutes(w http.ResponseWriter, r *http.Request) {
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/floors/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	switch suffix {
	case "":
		switch r.Method {
		case http.MethodGet:
			item, err := a.getFloor(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageFloor(w, r, id) {
				return
			}
			existingFloorForAudit, existingFloorErr := a.getFloor(id)
			if existingFloorErr != nil {
				if errors.Is(existingFloorErr, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				log.Printf("internal error: %v", existingFloorErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			requesterEmployeeID, err := extractEmployeeIDFromRequest(r, a.db)
			if err != nil {
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			requesterEmployeeID = strings.TrimSpace(requesterEmployeeID)
			var payload struct {
				Name                  *string `json:"name"`
				PlanSVG               *string `json:"plan_svg"`
				ResponsibleEmployeeID *string `json:"responsible_employee_id"`
			}
			if err := decodeJSONWithLimit(r, &payload, maxFloorPlanJSONSize); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			if payload.Name != nil {
				trimmed := strings.TrimSpace(*payload.Name)
				if trimmed == "" {
					respondError(w, http.StatusBadRequest, "name is required")
					return
				}
				payload.Name = &trimmed
			}
			if payload.PlanSVG != nil {
				trimmed := sanitizeSVG(strings.TrimSpace(*payload.PlanSVG))
				payload.PlanSVG = &trimmed
			}
			if payload.ResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.ResponsibleEmployeeID)
				payload.ResponsibleEmployeeID = &trimmed
			}
			if payload.Name == nil && payload.PlanSVG == nil && payload.ResponsibleEmployeeID == nil {
				respondError(w, http.StatusBadRequest, "no fields to update")
				return
			}
			if payload.Name != nil || payload.ResponsibleEmployeeID != nil {
				if !a.ensureCanManageBuildingByFloor(w, r, id) {
					return
				}
			}
			var (
				updated floor
				opErr   error
			)
			if payload.PlanSVG != nil {
				updated, opErr = a.updateFloorPlan(id, *payload.PlanSVG)
				if opErr != nil {
					if errors.Is(opErr, errNotFound) {
						respondError(w, http.StatusNotFound, "floor not found")
						return
					}
					log.Printf("internal error: %v", opErr)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
			}
			if payload.Name != nil || payload.ResponsibleEmployeeID != nil {
				previousResponsible := ""
				if payload.ResponsibleEmployeeID != nil {
					previousResponsible, opErr = a.getFloorResponsibleEmployeeID(id)
					if opErr != nil && !errors.Is(opErr, errNotFound) {
						log.Printf("internal error: %v", opErr)
						respondError(w, http.StatusInternalServerError, "internal error")
						return
					}
				}
				updated, opErr = a.updateFloorDetails(id, payload.Name, payload.ResponsibleEmployeeID)
				if opErr != nil {
					if errors.Is(opErr, errNotFound) {
						respondError(w, http.StatusNotFound, "floor not found")
						return
					}
					if errors.Is(opErr, errNameRequired) {
						respondError(w, http.StatusBadRequest, opErr.Error())
						return
					}
					log.Printf("internal error: %v", opErr)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
				if payload.ResponsibleEmployeeID != nil {
					a.auditResponsibilityChange(r.Context(), "floor", id, previousResponsible, *payload.ResponsibleEmployeeID, requesterEmployeeID)
				}
			}
			changes := describeFloorAuditChanges(existingFloorForAudit, updated)
			a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityFloor, updated.ID, updated.Name, map[string]any{
				"floor_id":             updated.ID,
				"floor_name":           updated.Name,
				"building_id":          updated.BuildingID,
				"floor_level":          updated.Level,
				"responsible_employee": updated.ResponsibleEmployeeID,
				"has_plan_svg":         strings.TrimSpace(updated.PlanSVG) != "",
				"changes":              changes,
				"before_name":          existingFloorForAudit.Name,
				"after_name":           updated.Name,
				"before_responsible":   existingFloorForAudit.ResponsibleEmployeeID,
				"after_responsible":    updated.ResponsibleEmployeeID,
				"before_has_plan_svg":  strings.TrimSpace(existingFloorForAudit.PlanSVG) != "",
				"after_has_plan_svg":   strings.TrimSpace(updated.PlanSVG) != "",
			})
			respondJSON(w, http.StatusOK, updated)
		case http.MethodDelete:
			if !a.ensureCanManageBuildingByFloor(w, r, id) {
				return
			}
			existing, existingErr := a.getFloor(id)
			if existingErr != nil {
				if errors.Is(existingErr, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				log.Printf("internal error: %v", existingErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if err := a.deleteFloorAndShift(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			a.logAuditEventFromRequest(r, auditActionDelete, auditEntityFloor, existing.ID, existing.Name, map[string]any{
				"floor_id":     existing.ID,
				"floor_name":   existing.Name,
				"building_id":  existing.BuildingID,
				"floor_level":  existing.Level,
				"has_plan_svg": strings.TrimSpace(existing.PlanSVG) != "",
			})
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case "/spaces":
		switch r.Method {
		case http.MethodGet:
			items, err := a.listSpacesByFloor(id)
			if err != nil {
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			respondJSON(w, http.StatusOK, map[string]any{"items": items})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (a *app) handleSpaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	requesterEmployeeID = strings.TrimSpace(requesterEmployeeID)
	var payload struct {
		FloorID                    int64   `json:"floor_id"`
		Name                       string  `json:"name"`
		Kind                       string  `json:"kind"`
		Capacity                   *int    `json:"capacity"`
		Color                      string  `json:"color"`
		SubdivisionLevel1          string  `json:"subdivision_level_1"`
		SubdivisionLevel2          string  `json:"subdivision_level_2"`
		ResponsibleEmployeeID      string  `json:"responsible_employee_id"`
		FloorResponsibleEmployeeID string  `json:"floor_responsible_employee_id"`
		Points                     []point `json:"points"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Kind = strings.TrimSpace(payload.Kind)
	payload.Color = strings.TrimSpace(payload.Color)
	payload.SubdivisionLevel1 = strings.TrimSpace(payload.SubdivisionLevel1)
	payload.SubdivisionLevel2 = strings.TrimSpace(payload.SubdivisionLevel2)
	payload.ResponsibleEmployeeID = strings.TrimSpace(payload.ResponsibleEmployeeID)
	payload.FloorResponsibleEmployeeID = strings.TrimSpace(payload.FloorResponsibleEmployeeID)
	if payload.FloorID == 0 || payload.Name == "" || payload.Kind == "" {
		respondError(w, http.StatusBadRequest, "floor_id, name, and kind are required")
		return
	}
	if !a.ensureCanManageFloor(w, r, payload.FloorID) {
		return
	}
	if len(payload.Points) < 3 {
		respondError(w, http.StatusBadRequest, "points are required")
		return
	}
	capacity := 0
	if payload.Capacity != nil {
		capacity = *payload.Capacity
	}
	if payload.Kind == "meeting" && capacity <= 0 {
		respondError(w, http.StatusBadRequest, "capacity is required for meeting rooms")
		return
	}
	if payload.Kind != "meeting" {
		capacity = 0
	}
	if payload.Kind != "coworking" {
		payload.SubdivisionLevel1 = ""
		payload.SubdivisionLevel2 = ""
		payload.ResponsibleEmployeeID = ""
	}
	if payload.ResponsibleEmployeeID != "" {
		if !a.ensureCanManageFloor(w, r, payload.FloorID) {
			return
		}
	}
	previousFloorResponsible := ""
	if payload.FloorResponsibleEmployeeID != "" {
		previousFloorResponsible, err = a.getFloorResponsibleEmployeeID(payload.FloorID)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "floor not found")
				return
			}
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if !a.ensureCanManageBuildingByFloor(w, r, payload.FloorID) {
			return
		}
	}
	result, err := a.createSpace(
		payload.FloorID,
		payload.Name,
		payload.Kind,
		capacity,
		payload.SubdivisionLevel1,
		payload.SubdivisionLevel2,
		payload.Points,
		payload.Color,
		payload.ResponsibleEmployeeID,
	)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if payload.FloorResponsibleEmployeeID != "" {
		if err := a.updateFloorResponsibleEmployeeID(payload.FloorID, payload.FloorResponsibleEmployeeID); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "floor not found")
				return
			}
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		a.auditResponsibilityChange(r.Context(), "floor", payload.FloorID, previousFloorResponsible, payload.FloorResponsibleEmployeeID, requesterEmployeeID)
	}
	if payload.Kind == "coworking" {
		a.auditResponsibilityChange(r.Context(), "coworking", result.ID, "", payload.ResponsibleEmployeeID, requesterEmployeeID)
	}
	entityType := auditEntityCoworking
	if result.Kind == "meeting" {
		entityType = auditEntityMeetingRoom
	}
	a.logAuditEventFromRequest(r, auditActionCreate, entityType, result.ID, result.Name, map[string]any{
		"space_id":              result.ID,
		"space_name":            result.Name,
		"space_kind":            result.Kind,
		"floor_id":              result.FloorID,
		"capacity":              result.Capacity,
		"subdivision_level_1":   result.SubdivisionL1,
		"subdivision_level_2":   result.SubdivisionL2,
		"responsible_employee":  result.ResponsibleEmployeeID,
		"snapshot_hidden":       result.SnapshotHidden,
	})
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleSpaceSubroutes(w http.ResponseWriter, r *http.Request) {
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/spaces/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	switch suffix {
	case "":
		switch r.Method {
		case http.MethodGet:
			item, err := a.getSpace(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageSpace(w, r, id) {
				return
			}
			requesterEmployeeID, requesterErr := extractEmployeeIDFromRequest(r, a.db)
			if requesterErr != nil {
				log.Printf("internal error: %v", requesterErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			requesterEmployeeID = strings.TrimSpace(requesterEmployeeID)
			var payload struct {
				Name                       string  `json:"name"`
				Kind                       string  `json:"kind"`
				Capacity                   *int    `json:"capacity"`
				Color                      string  `json:"color"`
				SubdivisionLevel1          string  `json:"subdivision_level_1"`
				SubdivisionLevel2          string  `json:"subdivision_level_2"`
				ResponsibleEmployeeID      *string `json:"responsible_employee_id"`
				FloorResponsibleEmployeeID *string `json:"floor_responsible_employee_id"`
				Points                     []point `json:"points"`
				SnapshotHidden             *bool   `json:"snapshot_hidden"`
			}
			if err := decodeJSON(r, &payload); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			payload.Name = strings.TrimSpace(payload.Name)
			payload.Kind = strings.TrimSpace(payload.Kind)
			payload.Color = strings.TrimSpace(payload.Color)
			payload.SubdivisionLevel1 = strings.TrimSpace(payload.SubdivisionLevel1)
			payload.SubdivisionLevel2 = strings.TrimSpace(payload.SubdivisionLevel2)
			existingSpaceForAudit, existingSpaceErr := a.getSpace(id)
			if existingSpaceErr != nil {
				if errors.Is(existingSpaceErr, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				log.Printf("internal error: %v", existingSpaceErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			var lookupErr error
			previousCoworkingResponsible := ""
			if payload.ResponsibleEmployeeID != nil {
				previousCoworkingResponsible, lookupErr = a.getCoworkingResponsibleEmployeeID(id)
				if lookupErr != nil && !errors.Is(lookupErr, errNotFound) {
					log.Printf("internal error: %v", lookupErr)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
				trimmed := strings.TrimSpace(*payload.ResponsibleEmployeeID)
				payload.ResponsibleEmployeeID = &trimmed
				if !a.ensureCanManageFloorBySpace(w, r, id) {
					return
				}
			}
			previousFloorResponsible := ""
			if payload.FloorResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.FloorResponsibleEmployeeID)
				payload.FloorResponsibleEmployeeID = &trimmed
				floorID, floorErr := a.getSpaceFloorID(id)
				if floorErr != nil {
					if errors.Is(floorErr, errNotFound) {
						respondError(w, http.StatusNotFound, "space not found")
						return
					}
					respondError(w, http.StatusInternalServerError, floorErr.Error())
					return
				}
				previousFloorResponsible, lookupErr = a.getFloorResponsibleEmployeeID(floorID)
				if lookupErr != nil && !errors.Is(lookupErr, errNotFound) {
					log.Printf("internal error: %v", lookupErr)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
				if !a.ensureCanManageBuildingBySpace(w, r, id) {
					return
				}
			}
			var (
				result space
				opErr  error
			)
			if len(payload.Points) > 0 {
				if len(payload.Points) < 3 {
					respondError(w, http.StatusBadRequest, "points are required")
					return
				}
				result, opErr = a.updateSpaceGeometry(id, payload.Points, payload.Color)
			} else if payload.SnapshotHidden != nil &&
				payload.Name == "" &&
				payload.Kind == "" &&
				payload.Capacity == nil &&
				payload.Color == "" {
				result, opErr = a.updateSpaceSnapshotHidden(id, *payload.SnapshotHidden)
			} else {
				if payload.Name == "" {
					respondError(w, http.StatusBadRequest, "name is required")
					return
				}
				capacity := 0
				if payload.Capacity != nil {
					capacity = *payload.Capacity
				}
				effectiveKind := payload.Kind
				if effectiveKind == "" && payload.Capacity != nil {
					kind, err := a.getSpaceKind(id)
					if err != nil {
						if errors.Is(err, errNotFound) {
							respondError(w, http.StatusNotFound, "space not found")
							return
						}
						if errors.Is(err, errSnapshotHiddenNotAllowed) {
							respondError(w, http.StatusBadRequest, "snapshot can only be hidden for coworking")
							return
						}
						log.Printf("internal error: %v", err)
						respondError(w, http.StatusInternalServerError, "internal error")
						return
					}
					effectiveKind = kind
				}
				if effectiveKind == "meeting" {
					if payload.Capacity == nil {
						respondError(w, http.StatusBadRequest, "capacity is required for meeting rooms")
						return
					}
					if capacity <= 0 {
						respondError(w, http.StatusBadRequest, "capacity must be greater than 0")
						return
					}
				} else {
					capacity = 0
				}
				if effectiveKind != "coworking" {
					payload.SubdivisionLevel1 = ""
					payload.SubdivisionLevel2 = ""
				}
				result, opErr = a.updateSpaceDetails(
					id,
					payload.Name,
					payload.Kind,
					capacity,
					payload.Capacity != nil,
					payload.Color,
					payload.SubdivisionLevel1,
					payload.SubdivisionLevel2,
					payload.ResponsibleEmployeeID,
				)
			}
			if opErr != nil {
				if errors.Is(opErr, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				log.Printf("internal error: %v", opErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if payload.ResponsibleEmployeeID != nil {
				a.auditResponsibilityChange(r.Context(), "coworking", id, previousCoworkingResponsible, *payload.ResponsibleEmployeeID, requesterEmployeeID)
			}
			if payload.FloorResponsibleEmployeeID != nil {
				floorID, floorErr := a.getSpaceFloorID(id)
				if floorErr != nil {
					if errors.Is(floorErr, errNotFound) {
						respondError(w, http.StatusNotFound, "space not found")
						return
					}
					respondError(w, http.StatusInternalServerError, floorErr.Error())
					return
				}
				if err := a.updateFloorResponsibleEmployeeID(floorID, *payload.FloorResponsibleEmployeeID); err != nil {
					if errors.Is(err, errNotFound) {
						respondError(w, http.StatusNotFound, "floor not found")
						return
					}
					log.Printf("internal error: %v", err)
					respondError(w, http.StatusInternalServerError, "internal error")
					return
				}
				a.auditResponsibilityChange(r.Context(), "floor", floorID, previousFloorResponsible, *payload.FloorResponsibleEmployeeID, requesterEmployeeID)
			}
			entityType := auditEntityCoworking
			if result.Kind == "meeting" {
				entityType = auditEntityMeetingRoom
			}
			changes := describeSpaceAuditChanges(existingSpaceForAudit, result)
			a.logAuditEventFromRequest(r, auditActionUpdate, entityType, result.ID, result.Name, map[string]any{
				"space_id":              result.ID,
				"space_name":            result.Name,
				"space_kind":            result.Kind,
				"floor_id":              result.FloorID,
				"capacity":              result.Capacity,
				"subdivision_level_1":   result.SubdivisionL1,
				"subdivision_level_2":   result.SubdivisionL2,
				"responsible_employee":  result.ResponsibleEmployeeID,
				"snapshot_hidden":       result.SnapshotHidden,
				"changes":               changes,
				"before_name":           existingSpaceForAudit.Name,
				"after_name":            result.Name,
				"before_kind":           existingSpaceForAudit.Kind,
				"after_kind":            result.Kind,
				"before_capacity":       existingSpaceForAudit.Capacity,
				"after_capacity":        result.Capacity,
				"before_color":          existingSpaceForAudit.Color,
				"after_color":           result.Color,
				"before_subdivision_1":  existingSpaceForAudit.SubdivisionL1,
				"after_subdivision_1":   result.SubdivisionL1,
				"before_subdivision_2":  existingSpaceForAudit.SubdivisionL2,
				"after_subdivision_2":   result.SubdivisionL2,
				"before_responsible":    existingSpaceForAudit.ResponsibleEmployeeID,
				"after_responsible":     result.ResponsibleEmployeeID,
				"before_snapshot_hidden": existingSpaceForAudit.SnapshotHidden,
				"after_snapshot_hidden":  result.SnapshotHidden,
				"before_polygon_points": formatPointsForAudit(existingSpaceForAudit.Points),
				"after_polygon_points":  formatPointsForAudit(result.Points),
			})
			respondJSON(w, http.StatusOK, result)
		case http.MethodDelete:
			if !a.ensureCanManageSpace(w, r, id) {
				return
			}
			existing, existingErr := a.getSpace(id)
			if existingErr != nil {
				if errors.Is(existingErr, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				log.Printf("internal error: %v", existingErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if err := a.deleteSpace(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				log.Printf("internal error: %v", err)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			entityType := auditEntityCoworking
			if existing.Kind == "meeting" {
				entityType = auditEntityMeetingRoom
			}
			a.logAuditEventFromRequest(r, auditActionDelete, entityType, existing.ID, existing.Name, map[string]any{
				"space_id":            existing.ID,
				"space_name":          existing.Name,
				"space_kind":          existing.Kind,
				"floor_id":            existing.FloorID,
				"capacity":            existing.Capacity,
				"subdivision_level_1": existing.SubdivisionL1,
				"subdivision_level_2": existing.SubdivisionL2,
			})
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case "/desks":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		dateRaw := strings.TrimSpace(r.URL.Query().Get("date"))
		date := ""
		if dateRaw != "" {
			normalized, err := normalizeBookingDate(dateRaw)
			if err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			date = normalized
		} else {
			date = time.Now().Format("2006-01-02")
		}
		items, err := a.listDesksBySpaceWithBookings(id, date)
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	case "/meeting-rooms":
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		items, err := a.listMeetingRoomsBySpace(id)
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"items": items})
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (a *app) handleDesks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		SpaceID  int64    `json:"space_id"`
		Label    string   `json:"label"`
		X        *float64 `json:"x"`
		Y        *float64 `json:"y"`
		Width    *float64 `json:"width"`
		Height   *float64 `json:"height"`
		Rotation *float64 `json:"rotation"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Label = strings.TrimSpace(payload.Label)
	if payload.SpaceID == 0 || payload.Label == "" || payload.X == nil || payload.Y == nil {
		respondError(w, http.StatusBadRequest, "space_id, label, x, and y are required")
		return
	}
	if !a.ensureCanManageCoworking(w, r, payload.SpaceID) {
		return
	}
	width := 200.0
	height := 100.0
	rotation := 0.0
	if payload.Width != nil && *payload.Width > 0 {
		width = *payload.Width
	}
	if payload.Height != nil && *payload.Height > 0 {
		height = *payload.Height
	}
	if payload.Rotation != nil {
		rotation = *payload.Rotation
	}
	result, err := a.createDesk(payload.SpaceID, payload.Label, *payload.X, *payload.Y, width, height, rotation)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	a.logAuditEventFromRequest(r, auditActionCreate, auditEntityDesk, result.ID, result.Label, map[string]any{
		"desk_id":      result.ID,
		"desk_label":   result.Label,
		"coworking_id": result.SpaceID,
		"x":            result.X,
		"y":            result.Y,
		"width":        result.Width,
		"height":       result.Height,
		"rotation":     result.Rotation,
	})
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) handleDeskBulk(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var payload struct {
			Items []struct {
				SpaceID  int64    `json:"space_id"`
				Label    string   `json:"label"`
				X        *float64 `json:"x"`
				Y        *float64 `json:"y"`
				Width    *float64 `json:"width"`
				Height   *float64 `json:"height"`
				Rotation *float64 `json:"rotation"`
			} `json:"items"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if len(payload.Items) == 0 {
			respondError(w, http.StatusBadRequest, "items are required")
			return
		}
		inputs := make([]deskCreateInput, 0, len(payload.Items))
		spaceIDs := make(map[int64]struct{})
		for _, item := range payload.Items {
			label := strings.TrimSpace(item.Label)
			if item.SpaceID == 0 || label == "" || item.X == nil || item.Y == nil {
				respondError(w, http.StatusBadRequest, "space_id, label, x, and y are required")
				return
			}
			width := 200.0
			height := 100.0
			rotation := 0.0
			if item.Width != nil && *item.Width > 0 {
				width = *item.Width
			}
			if item.Height != nil && *item.Height > 0 {
				height = *item.Height
			}
			if item.Rotation != nil {
				rotation = *item.Rotation
			}
			inputs = append(inputs, deskCreateInput{
				SpaceID:  item.SpaceID,
				Label:    label,
				X:        *item.X,
				Y:        *item.Y,
				Width:    width,
				Height:   height,
				Rotation: rotation,
			})
			spaceIDs[item.SpaceID] = struct{}{}
		}
		uniqueSpaces := make([]int64, 0, len(spaceIDs))
		for id := range spaceIDs {
			uniqueSpaces = append(uniqueSpaces, id)
		}
		if !a.ensureCanManageCoworkings(w, r, uniqueSpaces) {
			return
		}
		created, err := a.createDesksBulk(inputs)
		if err != nil {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		for _, item := range created {
			a.logAuditEventFromRequest(r, auditActionCreate, auditEntityDesk, item.ID, item.Label, map[string]any{
				"desk_id":      item.ID,
				"desk_label":   item.Label,
				"coworking_id": item.SpaceID,
				"x":            item.X,
				"y":            item.Y,
				"width":        item.Width,
				"height":       item.Height,
				"rotation":     item.Rotation,
				"is_bulk":      true,
			})
		}
		respondJSON(w, http.StatusCreated, map[string]any{"items": created})
	case http.MethodDelete:
		var payload struct {
			IDs []int64 `json:"ids"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if len(payload.IDs) == 0 {
			respondError(w, http.StatusBadRequest, "ids are required")
			return
		}
		seen := make(map[int64]struct{}, len(payload.IDs))
		unique := make([]int64, 0, len(payload.IDs))
		for _, id := range payload.IDs {
			if id == 0 {
				continue
			}
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			unique = append(unique, id)
		}
		if len(unique) == 0 {
			respondError(w, http.StatusBadRequest, "ids are required")
			return
		}
		if !a.ensureCanManageDesks(w, r, unique) {
			return
		}
		desksBeforeDelete := make(map[int64]desk, len(unique))
		for _, deskID := range unique {
			item, getErr := a.getDesk(deskID)
			if getErr != nil {
				if errors.Is(getErr, errNotFound) {
					continue
				}
				log.Printf("internal error: %v", getErr)
				respondError(w, http.StatusInternalServerError, "internal error")
				return
			}
			desksBeforeDelete[deskID] = item
		}
		if err := a.deleteDesksBulk(unique); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		for _, deskID := range unique {
			existing, hasExisting := desksBeforeDelete[deskID]
			entityName := fmt.Sprintf("Стол #%d", deskID)
			details := map[string]any{
				"desk_id": deskID,
				"is_bulk": true,
				"deleted": true,
			}
			if hasExisting {
				if strings.TrimSpace(existing.Label) != "" {
					entityName = existing.Label
				}
				details["desk_label"] = existing.Label
				details["coworking_id"] = existing.SpaceID
				details["x"] = existing.X
				details["y"] = existing.Y
				details["width"] = existing.Width
				details["height"] = existing.Height
				details["rotation"] = existing.Rotation
			}
			a.logAuditEventFromRequest(r, auditActionDelete, auditEntityDesk, deskID, entityName, details)
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleDeskSubroutes(w http.ResponseWriter, r *http.Request) {
	id, suffix, err := parseIDFromPath(r.URL.Path, "/api/desks/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if suffix != "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	switch r.Method {
	case http.MethodPut:
		if !a.ensureCanManageDesk(w, r, id) {
			return
		}
		var payload struct {
			Label    *string  `json:"label"`
			X        *float64 `json:"x"`
			Y        *float64 `json:"y"`
			Width    *float64 `json:"width"`
			Height   *float64 `json:"height"`
			Rotation *float64 `json:"rotation"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if payload.Label != nil {
			trimmed := strings.TrimSpace(*payload.Label)
			if trimmed == "" {
				respondError(w, http.StatusBadRequest, "label is required")
				return
			}
			payload.Label = &trimmed
		}
		if payload.Label == nil && payload.X == nil && payload.Y == nil && payload.Width == nil && payload.Height == nil && payload.Rotation == nil {
			respondError(w, http.StatusBadRequest, "no fields to update")
			return
		}
		existingDeskForAudit, existingDeskErr := a.getDesk(id)
		if existingDeskErr != nil {
			if errors.Is(existingDeskErr, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			log.Printf("internal error: %v", existingDeskErr)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result, err := a.updateDesk(id, payload.Label, payload.X, payload.Y, payload.Width, payload.Height, payload.Rotation)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			if errors.Is(err, errLabelRequired) {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			if errors.Is(err, errInvalidDimensions) {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		changes := describeDeskAuditChanges(existingDeskForAudit, result)
		a.logAuditEventFromRequest(r, auditActionUpdate, auditEntityDesk, result.ID, result.Label, map[string]any{
			"desk_id":      result.ID,
			"desk_label":   result.Label,
			"coworking_id": result.SpaceID,
			"x":            result.X,
			"y":            result.Y,
			"width":        result.Width,
			"height":       result.Height,
			"rotation":     result.Rotation,
			"changes":      changes,
			"before_label": existingDeskForAudit.Label,
			"after_label":  result.Label,
			"before_x":     existingDeskForAudit.X,
			"after_x":      result.X,
			"before_y":     existingDeskForAudit.Y,
			"after_y":      result.Y,
			"before_width": existingDeskForAudit.Width,
			"after_width":  result.Width,
			"before_height": existingDeskForAudit.Height,
			"after_height":  result.Height,
			"before_rotation": existingDeskForAudit.Rotation,
			"after_rotation":  result.Rotation,
		})
		respondJSON(w, http.StatusOK, result)
	case http.MethodDelete:
		if !a.ensureCanManageDesk(w, r, id) {
			return
		}
		existing, existingErr := a.getDesk(id)
		if existingErr != nil {
			if errors.Is(existingErr, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			log.Printf("internal error: %v", existingErr)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if err := a.deleteDesk(id); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		a.logAuditEventFromRequest(r, auditActionDelete, auditEntityDesk, existing.ID, existing.Label, map[string]any{
			"desk_id":      existing.ID,
			"desk_label":   existing.Label,
			"coworking_id": existing.SpaceID,
			"x":            existing.X,
			"y":            existing.Y,
			"width":        existing.Width,
			"height":       existing.Height,
			"rotation":     existing.Rotation,
		})
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *app) handleMeetingRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		SpaceID  int64  `json:"space_id"`
		Name     string `json:"name"`
		Capacity int    `json:"capacity"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	if payload.SpaceID == 0 || payload.Name == "" || payload.Capacity <= 0 {
		respondError(w, http.StatusBadRequest, "space_id, name, and capacity are required")
		return
	}
	floorID := payload.SpaceID
	if _, err := a.getFloor(floorID); err != nil {
		if errors.Is(err, errNotFound) {
			resolvedFloorID, resolveErr := a.getSpaceFloorID(payload.SpaceID)
			if resolveErr != nil {
				if errors.Is(resolveErr, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				respondError(w, http.StatusInternalServerError, resolveErr.Error())
				return
			}
			floorID = resolvedFloorID
		} else {
			log.Printf("internal error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
	}
	if !a.ensureCanManageFloor(w, r, floorID) {
		return
	}
	result, err := a.createMeetingRoom(floorID, payload.Name, payload.Capacity)
	if err != nil {
		log.Printf("internal error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	a.logAuditEventFromRequest(r, auditActionCreate, auditEntityMeetingRoom, result.ID, result.Name, map[string]any{
		"meeting_room_id":   result.ID,
		"meeting_room_name": result.Name,
		"floor_id":          result.FloorID,
		"capacity":          result.Capacity,
	})
	respondJSON(w, http.StatusCreated, result)
}

func (a *app) listBuildings() ([]building, error) {
	rows, err := a.db.Query(
		`SELECT id, name, address, COALESCE(timezone, ''), COALESCE(responsible_employee_id, ''), COALESCE(image_url, ''), COALESCE(floors, '[]'), created_at
		FROM office_buildings
		ORDER BY id DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []building
	for rows.Next() {
		var b building
		var floorsJSON string
		if err := rows.Scan(
			&b.ID,
			&b.Name,
			&b.Address,
			&b.Timezone,
			&b.ResponsibleEmployeeID,
			&b.ImageURL,
			&floorsJSON,
			&b.CreatedAt,
		); err != nil {
			return nil, err
		}
		if strings.TrimSpace(b.Timezone) == "" {
			b.Timezone = defaultBuildingTimezone
		}
		b.Floors = decodeFloorIDs(floorsJSON)
		items = append(items, b)
	}
	return items, rows.Err()
}

var errNotFound = errors.New("not found")
var errSnapshotHiddenNotAllowed = errors.New("snapshot can only be hidden for coworking")
var errNameRequired = errors.New("name is required")
var errLabelRequired = errors.New("label is required")
var errInvalidDimensions = errors.New("width and height must be greater than 0")

func (a *app) createBuilding(name, address, imageURL string) (building, error) {
	return a.createBuildingWithFloors(name, address, defaultBuildingTimezone, imageURL, 0, 0, "")
}

func (a *app) createBuildingWithFloors(name, address, timezone, imageURL string, undergroundFloors, abovegroundFloors int, responsibleEmployeeID string) (building, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return building{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var buildingID int64
	if err = tx.QueryRow(
		`INSERT INTO office_buildings (name, address, timezone, responsible_employee_id, image_url, floors)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		name,
		address,
		timezone,
		strings.TrimSpace(responsibleEmployeeID),
		imageURL,
		"[]",
	).Scan(&buildingID); err != nil {
		return building{}, err
	}

	floorIDs := make([]int64, 0, undergroundFloors+abovegroundFloors)
	for level := -undergroundFloors; level <= -1; level++ {
		floorName := fmt.Sprintf("B%d", -level)
		id, floorErr := a.createFloorInTx(tx, buildingID, floorName, level, "")
		if floorErr != nil {
			err = floorErr
			return building{}, floorErr
		}
		floorIDs = append(floorIDs, id)
	}
	for level := 1; level <= abovegroundFloors; level++ {
		floorName := strconv.Itoa(level)
		id, floorErr := a.createFloorInTx(tx, buildingID, floorName, level, "")
		if floorErr != nil {
			err = floorErr
			return building{}, floorErr
		}
		floorIDs = append(floorIDs, id)
	}

	floorsJSON, err := encodeFloorIDs(floorIDs)
	if err != nil {
		return building{}, err
	}
	if _, err = tx.Exec(`UPDATE office_buildings SET floors = $1 WHERE id = $2`, floorsJSON, buildingID); err != nil {
		return building{}, err
	}
	if err = tx.Commit(); err != nil {
		return building{}, err
	}
	return building{
		ID:                    buildingID,
		Name:                  name,
		Address:               address,
		Timezone:              timezone,
		ResponsibleEmployeeID: strings.TrimSpace(responsibleEmployeeID),
		ImageURL:              imageURL,
		Floors:                floorIDs,
		CreatedAt:             time.Now().UTC(),
	}, nil
}

func (a *app) getBuilding(id int64) (building, error) {
	row := a.db.QueryRow(
		`SELECT id, name, address, COALESCE(timezone, ''), COALESCE(responsible_employee_id, ''), COALESCE(image_url, ''), COALESCE(floors, '[]'), created_at
		FROM office_buildings
		WHERE id = $1`,
		id,
	)
	var b building
	var floorsJSON string
	if err := row.Scan(
		&b.ID,
		&b.Name,
		&b.Address,
		&b.Timezone,
		&b.ResponsibleEmployeeID,
		&b.ImageURL,
		&floorsJSON,
		&b.CreatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return building{}, errNotFound
		}
		return building{}, err
	}
	if strings.TrimSpace(b.Timezone) == "" {
		b.Timezone = defaultBuildingTimezone
	}
	b.Floors = decodeFloorIDs(floorsJSON)
	return b, nil
}

func (a *app) updateBuilding(
	id int64,
	name,
	address,
	timezone string,
	responsibleEmployeeID *string,
	undergroundFloors,
	abovegroundFloors *int,
) (building, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return building{}, err
	}
	defer tx.Rollback()

	responsibleValue := ""
	if responsibleEmployeeID == nil {
		row := tx.QueryRow(`SELECT responsible_employee_id FROM office_buildings WHERE id = $1`, id)
		if err := row.Scan(&responsibleValue); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return building{}, errNotFound
			}
			return building{}, err
		}
	} else {
		responsibleValue = *responsibleEmployeeID
	}
	responsibleValue = strings.TrimSpace(responsibleValue)

	result, err := tx.Exec(
		`UPDATE office_buildings SET name = $1, address = $2, timezone = $3, responsible_employee_id = $4 WHERE id = $5`,
		name,
		address,
		timezone,
		responsibleValue,
		id,
	)
	if err != nil {
		return building{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return building{}, err
	}
	if rows == 0 {
		return building{}, errNotFound
	}

	if undergroundFloors != nil || abovegroundFloors != nil {
		type floorLevel struct {
			ID    int64
			Level int
		}
		var levels []floorLevel
		rows, err := tx.Query(`SELECT id, level FROM floors WHERE building_id = $1`, id)
		if err != nil {
			return building{}, err
		}
		for rows.Next() {
			var entry floorLevel
			if err := rows.Scan(&entry.ID, &entry.Level); err != nil {
				rows.Close()
				return building{}, err
			}
			levels = append(levels, entry)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return building{}, err
		}
		rows.Close()

		currentUnderground := 0
		currentAboveground := 0
		for _, entry := range levels {
			if entry.Level < 0 {
				currentUnderground++
			} else if entry.Level > 0 {
				currentAboveground++
			}
		}
		targetUnderground := currentUnderground
		targetAboveground := currentAboveground
		if undergroundFloors != nil {
			targetUnderground = *undergroundFloors
		}
		if abovegroundFloors != nil {
			targetAboveground = *abovegroundFloors
		}
		if targetUnderground < 0 || targetAboveground < 0 {
			return building{}, errors.New("underground_floors and aboveground_floors must be non-negative")
		}

		if targetUnderground < currentUnderground || targetAboveground < currentAboveground {
			lowerLevel := -targetUnderground
			upperLevel := targetAboveground
			if _, err := tx.Exec(
				`DELETE FROM workplace_bookings
				  WHERE workplace_id IN (
				    SELECT w.id
				      FROM workplaces w
				      JOIN coworkings c ON c.id = w.coworking_id
				      JOIN floors f ON f.id = c.floor_id
				     WHERE f.building_id = $1
				       AND (f.level < $2 OR f.level > $3)
				  )`,
				id,
				lowerLevel,
				upperLevel,
			); err != nil {
				return building{}, err
			}
			if _, err := tx.Exec(
				`DELETE FROM workplaces
				  WHERE coworking_id IN (
				    SELECT c.id
				      FROM coworkings c
				      JOIN floors f ON f.id = c.floor_id
				     WHERE f.building_id = $1
				       AND (f.level < $2 OR f.level > $3)
				  )`,
				id,
				lowerLevel,
				upperLevel,
			); err != nil {
				return building{}, err
			}
			if _, err := tx.Exec(
				`DELETE FROM coworkings
				  WHERE floor_id IN (
				    SELECT f.id
				      FROM floors f
				     WHERE f.building_id = $1
				       AND (f.level < $2 OR f.level > $3)
				  )`,
				id,
				lowerLevel,
				upperLevel,
			); err != nil {
				return building{}, err
			}
			if _, err := tx.Exec(
				`DELETE FROM meeting_room_bookings
				  WHERE meeting_room_id IN (
				    SELECT m.id
				      FROM meeting_rooms m
				      JOIN floors f ON f.id = m.floor_id
				     WHERE f.building_id = $1
				       AND (f.level < $2 OR f.level > $3)
				  )`,
				id,
				lowerLevel,
				upperLevel,
			); err != nil {
				return building{}, err
			}
			if _, err := tx.Exec(
				`DELETE FROM meeting_rooms
				  WHERE floor_id IN (
				    SELECT f.id
				      FROM floors f
				     WHERE f.building_id = $1
				       AND (f.level < $2 OR f.level > $3)
				  )`,
				id,
				lowerLevel,
				upperLevel,
			); err != nil {
				return building{}, err
			}
			_, err := tx.Exec(
				`DELETE FROM floors WHERE building_id = $1 AND (level < $2 OR level > $3)`,
				id,
				lowerLevel,
				upperLevel,
			)
			if err != nil {
				return building{}, err
			}
		}

		if targetUnderground > currentUnderground {
			for level := currentUnderground + 1; level <= targetUnderground; level++ {
				floorName := fmt.Sprintf("B%d", level)
				if _, err := a.createFloorInTx(tx, id, floorName, -level, ""); err != nil {
					return building{}, err
				}
			}
		}
		if targetAboveground > currentAboveground {
			for level := currentAboveground + 1; level <= targetAboveground; level++ {
				floorName := strconv.Itoa(level)
				if _, err := a.createFloorInTx(tx, id, floorName, level, ""); err != nil {
					return building{}, err
				}
			}
		}

		floorRows, err := tx.Query(
			`SELECT id FROM floors WHERE building_id = $1 ORDER BY level ASC`,
			id,
		)
		if err != nil {
			return building{}, err
		}
		var floorIDs []int64
		for floorRows.Next() {
			var floorID int64
			if err := floorRows.Scan(&floorID); err != nil {
				floorRows.Close()
				return building{}, err
			}
			floorIDs = append(floorIDs, floorID)
		}
		if err := floorRows.Err(); err != nil {
			floorRows.Close()
			return building{}, err
		}
		floorRows.Close()

		floorsJSON, err := encodeFloorIDs(floorIDs)
		if err != nil {
			return building{}, err
		}
		if _, err := tx.Exec(`UPDATE office_buildings SET floors = $1 WHERE id = $2`, floorsJSON, id); err != nil {
			return building{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return building{}, err
	}
	return a.getBuilding(id)
}

func (a *app) deleteBuilding(id int64) error {
	result, err := a.db.Exec(`DELETE FROM office_buildings WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return nil
}

func (a *app) clearBuildingImage(id int64) (building, error) {
	existing, err := a.getBuilding(id)
	if err != nil {
		return building{}, err
	}
	if existing.ImageURL == "" {
		return existing, nil
	}
	if err := a.removeUploadedFile(existing.ImageURL); err != nil {
		return building{}, err
	}
	return a.updateBuildingImage(id, "")
}

func (a *app) updateBuildingImage(id int64, imageURL string) (building, error) {
	result, err := a.db.Exec(
		`UPDATE office_buildings SET image_url = $1 WHERE id = $2`,
		imageURL,
		id,
	)
	if err != nil {
		return building{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return building{}, err
	}
	if rows == 0 {
		return building{}, errNotFound
	}
	return a.getBuilding(id)
}

func (a *app) listFloorsByBuilding(buildingID int64) ([]floor, error) {
	rows, err := a.db.Query(
		`SELECT f.id,
		        f.building_id,
		        f.name,
		        f.level,
		        COALESCE(f.responsible_employee_id, '') AS responsible_employee_id,
		        f.created_at,
		        (SELECT COUNT(*) FROM coworkings c WHERE c.floor_id = f.id)
		        + (SELECT COUNT(*) FROM meeting_rooms m WHERE m.floor_id = f.id) AS spaces_count
		   FROM floors f
		  WHERE f.building_id = $1
		  ORDER BY f.id DESC`,
		buildingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []floor
	for rows.Next() {
		var f floor
		if err := rows.Scan(
			&f.ID,
			&f.BuildingID,
			&f.Name,
			&f.Level,
			&f.ResponsibleEmployeeID,
			&f.CreatedAt,
			&f.SpacesCount,
		); err != nil {
			return nil, err
		}
		items = append(items, f)
	}
	return items, rows.Err()
}

func (a *app) getFloor(id int64) (floor, error) {
	row := a.db.QueryRow(
		`SELECT id,
		        building_id,
		        name,
		        level,
		        plan_svg,
		        COALESCE(responsible_employee_id, '') AS responsible_employee_id,
		        created_at
		   FROM floors
		  WHERE id = $1`,
		id,
	)
	var f floor
	if err := row.Scan(
		&f.ID,
		&f.BuildingID,
		&f.Name,
		&f.Level,
		&f.PlanSVG,
		&f.ResponsibleEmployeeID,
		&f.CreatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return floor{}, errNotFound
		}
		return floor{}, err
	}
	return f, nil
}

func (a *app) updateFloorResponsibleEmployeeID(id int64, employeeID string) error {
	trimmed := strings.TrimSpace(employeeID)
	result, err := a.db.Exec(
		`UPDATE floors SET responsible_employee_id = $1 WHERE id = $2`,
		trimmed,
		id,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return nil
}

func (a *app) updateFloorPlan(id int64, planSVG string) (floor, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return floor{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	result, err := tx.Exec(`UPDATE floors SET plan_svg = $1 WHERE id = $2`, planSVG, id)
	if err != nil {
		return floor{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return floor{}, err
	}
	if rows == 0 {
		return floor{}, errNotFound
	}
	if planSVG == "" {
		if _, err = tx.Exec(`DELETE FROM coworkings WHERE floor_id = $1`, id); err != nil {
			return floor{}, err
		}
		if _, err = tx.Exec(`DELETE FROM meeting_rooms WHERE floor_id = $1`, id); err != nil {
			return floor{}, err
		}
	}
	if err = tx.Commit(); err != nil {
		return floor{}, err
	}
	return a.getFloor(id)
}

func (a *app) updateFloorDetails(id int64, name *string, responsibleEmployeeID *string) (floor, error) {
	current, err := a.getFloor(id)
	if err != nil {
		return floor{}, err
	}
	newName := current.Name
	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed == "" {
			return floor{}, errNameRequired
		}
		newName = trimmed
	}
	newResponsible := strings.TrimSpace(current.ResponsibleEmployeeID)
	if responsibleEmployeeID != nil {
		newResponsible = strings.TrimSpace(*responsibleEmployeeID)
	}
	result, err := a.db.Exec(
		`UPDATE floors SET name = $1, responsible_employee_id = $2 WHERE id = $3`,
		newName,
		newResponsible,
		id,
	)
	if err != nil {
		return floor{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return floor{}, err
	}
	if rows == 0 {
		return floor{}, errNotFound
	}
	return a.getFloor(id)
}

func (a *app) deleteFloorAndShift(id int64) error {
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	var buildingID int64
	var level int
	row := tx.QueryRow(`SELECT building_id, level FROM floors WHERE id = $1`, id)
	if err = row.Scan(&buildingID, &level); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		return err
	}
	if _, err = tx.Exec(
		`DELETE FROM workplace_bookings
		  WHERE workplace_id IN (
		    SELECT w.id FROM workplaces w
		    JOIN coworkings c ON c.id = w.coworking_id
		    WHERE c.floor_id = $1
		  )`,
		id,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(
		`DELETE FROM workplaces
		  WHERE coworking_id IN (SELECT id FROM coworkings WHERE floor_id = $1)`,
		id,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(`DELETE FROM coworkings WHERE floor_id = $1`, id); err != nil {
		return err
	}
	if _, err = tx.Exec(
		`DELETE FROM meeting_room_bookings
		  WHERE meeting_room_id IN (SELECT id FROM meeting_rooms WHERE floor_id = $1)`,
		id,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(`DELETE FROM meeting_rooms WHERE floor_id = $1`, id); err != nil {
		return err
	}
	if _, err = tx.Exec(`DELETE FROM floors WHERE id = $1`, id); err != nil {
		return err
	}
	if level >= 0 {
		if _, err = tx.Exec(
			`UPDATE floors SET level = level - 1 WHERE building_id = $1 AND level > $2`,
			buildingID,
			level,
		); err != nil {
			return err
		}
	} else {
		if _, err = tx.Exec(
			`UPDATE floors SET level = level + 1 WHERE building_id = $1 AND level < $2`,
			buildingID,
			level,
		); err != nil {
			return err
		}
	}
	rows, err := tx.Query(
		`SELECT id FROM floors WHERE building_id = $1 ORDER BY id`,
		buildingID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()
	ids := make([]int64, 0)
	for rows.Next() {
		var floorID int64
		if err := rows.Scan(&floorID); err != nil {
			return err
		}
		ids = append(ids, floorID)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	floorsJSON, err := encodeFloorIDs(ids)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(`UPDATE office_buildings SET floors = $1 WHERE id = $2`, floorsJSON, buildingID); err != nil {
		return err
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (a *app) createFloor(buildingID int64, name string, level int, planSVG string) (floor, error) {
	var id int64
	if err := a.db.QueryRow(
		`INSERT INTO floors (building_id, name, level, plan_svg)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		buildingID,
		name,
		level,
		planSVG,
	).Scan(&id); err != nil {
		return floor{}, err
	}
	return floor{
		ID:                    id,
		BuildingID:            buildingID,
		Name:                  name,
		Level:                 level,
		ResponsibleEmployeeID: "",
		PlanSVG:               planSVG,
		CreatedAt:             time.Now().UTC(),
	}, nil
}

func (a *app) createFloorInTx(tx *sql.Tx, buildingID int64, name string, level int, planSVG string) (int64, error) {
	var id int64
	if err := tx.QueryRow(
		`INSERT INTO floors (building_id, name, level, plan_svg)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		buildingID,
		name,
		level,
		planSVG,
	).Scan(&id); err != nil {
		return 0, err
	}
	return id, nil
}

func (a *app) listSpacesByFloor(floorID int64) ([]space, error) {
	rows, err := a.db.Query(
		`SELECT id,
		        floor_id,
		        name,
		        kind,
		        COALESCE(capacity, 0),
		        COALESCE(subdivision_level_1, ''),
		        COALESCE(subdivision_level_2, ''),
		        COALESCE(points_json, '[]'),
		        COALESCE(color, ''),
		        COALESCE(snapshot_hidden, 0),
		        COALESCE(responsible_employee_id, ''),
		        created_at
		   FROM (
		     SELECT id,
		            floor_id,
		            name,
		            'coworking' AS kind,
		            0 AS capacity,
		            COALESCE(subdivision_level_1, '') AS subdivision_level_1,
		            COALESCE(subdivision_level_2, '') AS subdivision_level_2,
		            COALESCE(points_json, '[]') AS points_json,
		            COALESCE(color, '') AS color,
		            COALESCE(snapshot_hidden, 0) AS snapshot_hidden,
		            COALESCE(responsible_employee_id, '') AS responsible_employee_id,
		            created_at
		       FROM coworkings
		      WHERE floor_id = $1
		     UNION ALL
		     SELECT id,
		            floor_id,
		            name,
		            'meeting' AS kind,
		            COALESCE(capacity, 0) AS capacity,
		            '' AS subdivision_level_1,
		            '' AS subdivision_level_2,
		            COALESCE(points_json, '[]') AS points_json,
		            COALESCE(color, '') AS color,
		            0 AS snapshot_hidden,
		            '' AS responsible_employee_id,
		            created_at
		       FROM meeting_rooms
		      WHERE floor_id = $1
		   ) s
		  ORDER BY id DESC`,
		floorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []space
	for rows.Next() {
		var s space
		var pointsJSON string
		var snapshotHidden int
		if err := rows.Scan(
			&s.ID,
			&s.FloorID,
			&s.Name,
			&s.Kind,
			&s.Capacity,
			&s.SubdivisionL1,
			&s.SubdivisionL2,
			&pointsJSON,
			&s.Color,
			&snapshotHidden,
			&s.ResponsibleEmployeeID,
			&s.CreatedAt,
		); err != nil {
			return nil, err
		}
		s.Points = decodePoints(pointsJSON)
		s.SnapshotHidden = snapshotHidden != 0
		items = append(items, s)
	}
	return items, rows.Err()
}

func (a *app) getSpace(id int64) (space, error) {
	row := a.db.QueryRow(
		`SELECT id,
		        floor_id,
		        name,
		        kind,
		        COALESCE(capacity, 0),
		        COALESCE(subdivision_level_1, ''),
		        COALESCE(subdivision_level_2, ''),
		        COALESCE(points_json, '[]'),
		        COALESCE(color, ''),
		        COALESCE(snapshot_hidden, 0),
		        COALESCE(responsible_employee_id, ''),
		        created_at
		   FROM (
		     SELECT id,
		            floor_id,
		            name,
		            'coworking' AS kind,
		            0 AS capacity,
		            COALESCE(subdivision_level_1, '') AS subdivision_level_1,
		            COALESCE(subdivision_level_2, '') AS subdivision_level_2,
		            COALESCE(points_json, '[]') AS points_json,
		            COALESCE(color, '') AS color,
		            COALESCE(snapshot_hidden, 0) AS snapshot_hidden,
		            COALESCE(responsible_employee_id, '') AS responsible_employee_id,
		            created_at
		       FROM coworkings
		      WHERE id = $1
		     UNION ALL
		     SELECT id,
		            floor_id,
		            name,
		            'meeting' AS kind,
		            COALESCE(capacity, 0) AS capacity,
		            '' AS subdivision_level_1,
		            '' AS subdivision_level_2,
		            COALESCE(points_json, '[]') AS points_json,
		            COALESCE(color, '') AS color,
		            0 AS snapshot_hidden,
		            '' AS responsible_employee_id,
		            created_at
		       FROM meeting_rooms
		      WHERE id = $1
		   ) s
		  LIMIT 1`,
		id,
	)
	var s space
	var pointsStored string
	var snapshotHidden int
	if err := row.Scan(
		&s.ID,
		&s.FloorID,
		&s.Name,
		&s.Kind,
		&s.Capacity,
		&s.SubdivisionL1,
		&s.SubdivisionL2,
		&pointsStored,
		&s.Color,
		&snapshotHidden,
		&s.ResponsibleEmployeeID,
		&s.CreatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return space{}, errNotFound
		}
		return space{}, err
	}
	s.Points = decodePoints(pointsStored)
	s.SnapshotHidden = snapshotHidden != 0
	return s, nil
}

func (a *app) getSpaceKind(id int64) (string, error) {
	row := a.db.QueryRow(`SELECT id FROM coworkings WHERE id = $1`, id)
	var coworkingID int64
	if err := row.Scan(&coworkingID); err == nil {
		return "coworking", nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	row = a.db.QueryRow(`SELECT id FROM meeting_rooms WHERE id = $1`, id)
	var meetingID int64
	if err := row.Scan(&meetingID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNotFound
		}
		return "", err
	}
	return "meeting", nil
}

func (a *app) getSpaceFloorID(spaceID int64) (int64, error) {
	row := a.db.QueryRow(`SELECT floor_id FROM coworkings WHERE id = $1`, spaceID)
	var floorID int64
	if err := row.Scan(&floorID); err == nil {
		return floorID, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	row = a.db.QueryRow(`SELECT floor_id FROM meeting_rooms WHERE id = $1`, spaceID)
	if err := row.Scan(&floorID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, errNotFound
		}
		return 0, err
	}
	return floorID, nil
}

func (a *app) createSpace(
	floorID int64,
	name, kind string,
	capacity int,
	subdivisionLevel1, subdivisionLevel2 string,
	points []point,
	color string,
	responsibleEmployeeID string,
) (space, error) {
	pointsJSON, err := encodePoints(points)
	if err != nil {
		return space{}, err
	}
	var id int64
	if kind == "meeting" {
		if err := a.db.QueryRow(
			`INSERT INTO meeting_rooms (floor_id, name, capacity, points_json, color)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id`,
			floorID,
			name,
			capacity,
			pointsJSON,
			color,
		).Scan(&id); err != nil {
			return space{}, err
		}
	} else {
		kind = "coworking"
		if err := a.db.QueryRow(
			`INSERT INTO coworkings (floor_id, name, subdivision_level_1, subdivision_level_2, points_json, color, responsible_employee_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING id`,
			floorID,
			name,
			subdivisionLevel1,
			subdivisionLevel2,
			pointsJSON,
			color,
			responsibleEmployeeID,
		).Scan(&id); err != nil {
			return space{}, err
		}
	}
	return space{
		ID:                    id,
		FloorID:               floorID,
		Name:                  name,
		Kind:                  kind,
		Capacity:              capacity,
		Color:                 color,
		SnapshotHidden:        false,
		SubdivisionL1:         subdivisionLevel1,
		SubdivisionL2:         subdivisionLevel2,
		ResponsibleEmployeeID: strings.TrimSpace(responsibleEmployeeID),
		Points:                points,
		CreatedAt:             time.Now().UTC(),
	}, nil
}

func (a *app) updateSpaceGeometry(id int64, points []point, color string) (space, error) {
	pointsJSON, err := encodePoints(points)
	if err != nil {
		return space{}, err
	}
	result, err := a.db.Exec(
		`UPDATE coworkings SET points_json = $1, color = $2 WHERE id = $3`,
		pointsJSON,
		color,
		id,
	)
	if err != nil {
		return space{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return space{}, err
	}
	if rows == 0 {
		result, err = a.db.Exec(
			`UPDATE meeting_rooms SET points_json = $1, color = $2 WHERE id = $3`,
			pointsJSON,
			color,
			id,
		)
		if err != nil {
			return space{}, err
		}
		rows, err = result.RowsAffected()
		if err != nil {
			return space{}, err
		}
		if rows == 0 {
			return space{}, errNotFound
		}
	}
	return a.getSpace(id)
}

func (a *app) updateSpaceDetails(
	id int64,
	name, kind string,
	capacity int,
	capacityProvided bool,
	color string,
	subdivisionLevel1, subdivisionLevel2 string,
	responsibleEmployeeID *string,
) (space, error) {
	current, err := a.getSpace(id)
	if err != nil {
		return space{}, err
	}
	responsibleValue := strings.TrimSpace(current.ResponsibleEmployeeID)
	if responsibleEmployeeID != nil {
		responsibleValue = strings.TrimSpace(*responsibleEmployeeID)
	}
	if kind == "" {
		kind = current.Kind
	}
	if !capacityProvided {
		capacity = current.Capacity
	}
	if kind != "meeting" {
		kind = "coworking"
		capacity = 0
	}
	if kind != "coworking" {
		subdivisionLevel1 = ""
		subdivisionLevel2 = ""
	}
	if current.Kind == "meeting" {
		if kind == "meeting" {
			result, err := a.db.Exec(
				`UPDATE meeting_rooms
				 SET name = $1, capacity = $2, color = $3
				 WHERE id = $4`,
				name,
				capacity,
				color,
				id,
			)
			if err != nil {
				return space{}, err
			}
			rows, err := result.RowsAffected()
			if err != nil {
				return space{}, err
			}
			if rows == 0 {
				return space{}, errNotFound
			}
			return a.getSpace(id)
		}

		pointsJSON, err := encodePoints(current.Points)
		if err != nil {
			return space{}, err
		}
		snapshotHidden := 0
		if current.SnapshotHidden {
			snapshotHidden = 1
		}
		tx, err := a.db.Begin()
		if err != nil {
			return space{}, err
		}
		defer tx.Rollback()
		if _, err := tx.Exec(
			`INSERT INTO coworkings (id, floor_id, name, subdivision_level_1, subdivision_level_2, points_json, color, snapshot_hidden, responsible_employee_id, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			id,
			current.FloorID,
			name,
			subdivisionLevel1,
			subdivisionLevel2,
			pointsJSON,
			color,
			snapshotHidden,
			responsibleValue,
			current.CreatedAt,
		); err != nil {
			return space{}, err
		}
		if _, err := tx.Exec(`DELETE FROM meeting_rooms WHERE id = $1`, id); err != nil {
			return space{}, err
		}
		if err := tx.Commit(); err != nil {
			return space{}, err
		}
		return a.getSpace(id)
	}

	if kind != "meeting" {
		result, err := a.db.Exec(
			`UPDATE coworkings
			 SET name = $1, color = $2,
			     subdivision_level_1 = $3, subdivision_level_2 = $4,
			     responsible_employee_id = $5
			 WHERE id = $6`,
			name,
			color,
			subdivisionLevel1,
			subdivisionLevel2,
			responsibleValue,
			id,
		)
		if err != nil {
			return space{}, err
		}
		rows, err := result.RowsAffected()
		if err != nil {
			return space{}, err
		}
		if rows == 0 {
			return space{}, errNotFound
		}
		return a.getSpace(id)
	}

	pointsJSON, err := encodePoints(current.Points)
	if err != nil {
		return space{}, err
	}
	tx, err := a.db.Begin()
	if err != nil {
		return space{}, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(
		`INSERT INTO meeting_rooms (id, floor_id, name, capacity, points_json, color, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id,
		current.FloorID,
		name,
		capacity,
		pointsJSON,
		color,
		current.CreatedAt,
	); err != nil {
		return space{}, err
	}
	if _, err := tx.Exec(`DELETE FROM coworkings WHERE id = $1`, id); err != nil {
		return space{}, err
	}
	if err := tx.Commit(); err != nil {
		return space{}, err
	}
	return a.getSpace(id)
}

func (a *app) updateSpaceSnapshotHidden(id int64, hidden bool) (space, error) {
	value := 0
	if hidden {
		value = 1
	}
	result, err := a.db.Exec(`UPDATE coworkings SET snapshot_hidden = $1 WHERE id = $2`, value, id)
	if err != nil {
		return space{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return space{}, err
	}
	if rows == 0 {
		row := a.db.QueryRow(`SELECT id FROM meeting_rooms WHERE id = $1`, id)
		var meetingID int64
		if scanErr := row.Scan(&meetingID); scanErr == nil {
			return space{}, errSnapshotHiddenNotAllowed
		} else if !errors.Is(scanErr, sql.ErrNoRows) {
			return space{}, scanErr
		}
		return space{}, errNotFound
	}
	return a.getSpace(id)
}

func (a *app) deleteSpace(id int64) error {
	result, err := a.db.Exec(`DELETE FROM coworkings WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		result, err = a.db.Exec(`DELETE FROM meeting_rooms WHERE id = $1`, id)
		if err != nil {
			return err
		}
		rows, err = result.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errNotFound
		}
	}
	return nil
}

func (a *app) listDesksBySpace(spaceID int64) ([]desk, error) {
	rows, err := a.db.Query(
		`SELECT id, coworking_id, label, COALESCE(points_json, '{}'), created_at FROM workplaces WHERE coworking_id = $1 ORDER BY id DESC`,
		spaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []desk
	for rows.Next() {
		var d desk
		var geomJSON string
		if err := rows.Scan(&d.ID, &d.SpaceID, &d.Label, &geomJSON, &d.CreatedAt); err != nil {
			return nil, err
		}
		d.X, d.Y, d.Width, d.Height, d.Rotation = decodeDeskGeometry(geomJSON)
		items = append(items, d)
	}
	return items, rows.Err()
}

func (a *app) listDesksBySpaceWithBookings(spaceID int64, date string) ([]deskWithBooking, error) {
	rows, err := a.db.Query(
		`SELECT d.id, d.coworking_id, d.label, COALESCE(d.points_json, '{}'), d.created_at,
		        b.applier_employee_id,
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(NULLIF(u.employee_id, ''), b.applier_employee_id, ''),
		        COALESCE(u.wb_user_id, ''),
		        COALESCE(u.avatar_url, ''),
		        COALESCE(u.wb_band, ''),
		        COALESCE(b.tenant_employee_id, '')
		   FROM workplaces d
		   LEFT JOIN workplace_bookings b ON b.workplace_id = d.id AND b.date = $2 AND b.cancelled_at IS NULL
		   LEFT JOIN LATERAL (
		     SELECT full_name, employee_id, wb_user_id, avatar_url, wb_band
		       FROM users
		      WHERE employee_id = b.applier_employee_id
		      LIMIT 1
		   ) u ON true
		  WHERE d.coworking_id = $1
		  ORDER BY d.id DESC`,
		spaceID,
		date,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []deskWithBooking
	for rows.Next() {
		var d deskWithBooking
		var geomJSON string
		var bookingApplierID sql.NullString
		var userName sql.NullString
		var resolvedApplierID sql.NullString
		var userWbUserID sql.NullString
		var avatarURL sql.NullString
		var wbBand sql.NullString
		var tenantEmployeeID sql.NullString
		if err := rows.Scan(
			&d.ID,
			&d.SpaceID,
			&d.Label,
			&geomJSON,
			&d.CreatedAt,
			&bookingApplierID,
			&userName,
			&resolvedApplierID,
			&userWbUserID,
			&avatarURL,
			&wbBand,
			&tenantEmployeeID,
		); err != nil {
			return nil, err
		}
		d.X, d.Y, d.Width, d.Height, d.Rotation = decodeDeskGeometry(geomJSON)
		d.Booking.IsBooked = bookingApplierID.Valid && strings.TrimSpace(bookingApplierID.String) != ""
		if d.Booking.IsBooked {
			applierValue := strings.TrimSpace(bookingApplierID.String)
			resolvedWbUserID := strings.TrimSpace(userWbUserID.String)
			if resolvedWbUserID == "" {
				resolvedWbUserID = applierValue
			}
			userNameValue := strings.TrimSpace(userName.String)
			if userNameValue == "" {
				userNameValue = applierValue
			}
			resolvedApplier := strings.TrimSpace(resolvedApplierID.String)
			if resolvedApplier == "0" {
				userNameValue = "Гость"
				resolvedWbUserID = "0"
			}
			d.Booking.User = &deskBookingUser{
				WbUserID:          resolvedWbUserID,
				UserName:          userNameValue,
				ApplierEmployeeID: resolvedApplier,
				TenantEmployeeID:  strings.TrimSpace(tenantEmployeeID.String),
				AvatarURL:         strings.TrimSpace(avatarURL.String),
				WbBand:            strings.TrimSpace(wbBand.String),
			}
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (a *app) createDesk(spaceID int64, label string, x, y, width, height, rotation float64) (desk, error) {
	geomJSON, err := encodeDeskGeometry(x, y, width, height, rotation)
	if err != nil {
		return desk{}, err
	}
	var id int64
	if err := a.db.QueryRow(
		`INSERT INTO workplaces (coworking_id, label, points_json)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		spaceID,
		label,
		geomJSON,
	).Scan(&id); err != nil {
		return desk{}, err
	}
	return desk{
		ID:        id,
		SpaceID:   spaceID,
		Label:     label,
		X:         x,
		Y:         y,
		Width:     width,
		Height:    height,
		Rotation:  rotation,
		CreatedAt: time.Now().UTC(),
	}, nil
}

func (a *app) createDesksBulk(items []deskCreateInput) ([]desk, error) {
	if len(items) == 0 {
		return nil, nil
	}
	tx, err := a.db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	stmt, err := tx.Prepare(
		`INSERT INTO workplaces (coworking_id, label, points_json)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
	)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	now := time.Now().UTC()
	created := make([]desk, 0, len(items))
	for _, item := range items {
		geomJSON, encErr := encodeDeskGeometry(item.X, item.Y, item.Width, item.Height, item.Rotation)
		if encErr != nil {
			err = encErr
			return nil, encErr
		}
		var id int64
		execErr := stmt.QueryRow(
			item.SpaceID,
			item.Label,
			geomJSON,
		).Scan(&id)
		if execErr != nil {
			err = execErr
			return nil, execErr
		}
		created = append(created, desk{
			ID:        id,
			SpaceID:   item.SpaceID,
			Label:     item.Label,
			X:         item.X,
			Y:         item.Y,
			Width:     item.Width,
			Height:    item.Height,
			Rotation:  item.Rotation,
			CreatedAt: now,
		})
	}
	if commitErr := tx.Commit(); commitErr != nil {
		err = commitErr
		return nil, commitErr
	}
	return created, nil
}

func (a *app) getDesk(id int64) (desk, error) {
	var d desk
	var geomJSON string
	row := a.db.QueryRow(
		`SELECT id, coworking_id, label, COALESCE(points_json, '{}'), created_at FROM workplaces WHERE id = $1`,
		id,
	)
	if err := row.Scan(&d.ID, &d.SpaceID, &d.Label, &geomJSON, &d.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return desk{}, errNotFound
		}
		return desk{}, err
	}
	d.X, d.Y, d.Width, d.Height, d.Rotation = decodeDeskGeometry(geomJSON)
	return d, nil
}

func (a *app) updateDesk(id int64, label *string, x *float64, y *float64, width *float64, height *float64, rotation *float64) (desk, error) {
	current, err := a.getDesk(id)
	if err != nil {
		return desk{}, err
	}
	if label != nil {
		current.Label = *label
	}
	if x != nil {
		current.X = *x
	}
	if y != nil {
		current.Y = *y
	}
	if width != nil {
		current.Width = *width
	}
	if height != nil {
		current.Height = *height
	}
	if rotation != nil {
		current.Rotation = *rotation
	}
	if current.Label == "" {
		return desk{}, errLabelRequired
	}
	if current.Width <= 0 || current.Height <= 0 {
		return desk{}, errInvalidDimensions
	}
	geomJSON, err := encodeDeskGeometry(current.X, current.Y, current.Width, current.Height, current.Rotation)
	if err != nil {
		return desk{}, err
	}
	result, err := a.db.Exec(
		`UPDATE workplaces SET label = $1, points_json = $2 WHERE id = $3`,
		current.Label,
		geomJSON,
		id,
	)
	if err != nil {
		return desk{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return desk{}, err
	}
	if rows == 0 {
		return desk{}, errNotFound
	}
	return current, nil
}

func (a *app) deleteDesk(id int64) error {
	result, err := a.db.Exec(`DELETE FROM workplaces WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return nil
}

func (a *app) deleteDesksBulk(ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	stmt, err := tx.Prepare(`DELETE FROM workplaces WHERE id = $1`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, id := range ids {
		result, execErr := stmt.Exec(id)
		if execErr != nil {
			err = execErr
			return execErr
		}
		rows, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			err = rowsErr
			return rowsErr
		}
		if rows == 0 {
			err = errNotFound
			return errNotFound
		}
	}
	if commitErr := tx.Commit(); commitErr != nil {
		err = commitErr
		return commitErr
	}
	return nil
}

func (a *app) listMeetingRoomsBySpace(spaceID int64) ([]meetingRoom, error) {
	floorID, err := a.getSpaceFloorID(spaceID)
	if err != nil {
		return nil, err
	}
	rows, err := a.db.Query(
		`SELECT id, floor_id, name, capacity, COALESCE(points_json, '[]'), COALESCE(color, ''), created_at
		   FROM meeting_rooms
		  WHERE floor_id = $1
		  ORDER BY id DESC`,
		floorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []meetingRoom
	for rows.Next() {
		var m meetingRoom
		var pointsJSON string
		if err := rows.Scan(
			&m.ID,
			&m.FloorID,
			&m.Name,
			&m.Capacity,
			&pointsJSON,
			&m.Color,
			&m.CreatedAt,
		); err != nil {
			return nil, err
		}
		m.Points = decodePoints(pointsJSON)
		m.Color = strings.TrimSpace(m.Color)
		items = append(items, m)
	}
	return items, rows.Err()
}

func (a *app) createMeetingRoom(floorID int64, name string, capacity int) (meetingRoom, error) {
	var id int64
	if err := a.db.QueryRow(
		`INSERT INTO meeting_rooms (floor_id, name, capacity)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		floorID,
		name,
		capacity,
	).Scan(&id); err != nil {
		return meetingRoom{}, err
	}
	return meetingRoom{
		ID:        id,
		FloorID:   floorID,
		Name:      name,
		Capacity:  capacity,
		Points:    []point{},
		Color:     "",
		CreatedAt: time.Now().UTC(),
	}, nil
}

func parseIDFromPath(path, prefix string) (int64, string, error) {
	if !strings.HasPrefix(path, prefix) {
		return 0, "", errors.New("invalid path")
	}
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts[0]) == 0 {
		return 0, "", errors.New("missing id")
	}
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, "", errors.New("invalid id")
	}
	suffix := ""
	if len(parts) == 2 {
		suffix = "/" + parts[1]
	}
	return id, suffix, nil
}

func decodeJSON(r *http.Request, dst any) error {
	// Limit request body to 1 MB to prevent memory exhaustion attacks.
	return decodeJSONWithLimit(r, dst, 1<<20)
}

func decodeJSONWithLimit(r *http.Request, dst any, maxBytes int64) error {
	decoder := json.NewDecoder(io.LimitReader(r.Body, maxBytes))
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	return nil
}

func parseOptionalInt(value string) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func encodeFloorIDs(ids []int64) (string, error) {
	payload, err := json.Marshal(ids)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func decodeFloorIDs(payload string) []int64 {
	payload = strings.TrimSpace(payload)
	if payload == "" {
		return []int64{}
	}
	var ids []int64
	if err := json.Unmarshal([]byte(payload), &ids); err != nil {
		return []int64{}
	}
	return ids
}

func (a *app) saveBuildingImage(buildingID int64, file multipart.File, header *multipart.FileHeader) (string, error) {
	defer file.Close()
	if header.Size == 0 {
		return "", errors.New("empty image file")
	}
	if header.Size > maxBuildingImageSize {
		return "", errors.New("image file is too large")
	}

	buffer := make([]byte, 512)
	n, readErr := file.Read(buffer)
	if readErr != nil && !errors.Is(readErr, io.EOF) {
		return "", readErr
	}
	contentType := http.DetectContentType(buffer[:n])
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = extensionFromContentType(contentType)
	}
	if !isAllowedImageType(ext, contentType) {
		return "", errors.New("unsupported image type")
	}

	filename := fmt.Sprintf("building-%d-%d%s", buildingID, time.Now().UnixNano(), ext)
	targetPath := filepath.Join(a.buildingUploadDir, filename)
	output, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer output.Close()

	if _, err := io.Copy(output, io.MultiReader(bytes.NewReader(buffer[:n]), file)); err != nil {
		return "", err
	}
	return "/" + filepath.ToSlash(filepath.Join(uploadDirName, buildingUploadDirName, filename)), nil
}

func (a *app) removeUploadedFile(imageURL string) error {
	prefix := "/" + uploadDirName + "/"
	if !strings.HasPrefix(imageURL, prefix) {
		return nil
	}
	relativePath := strings.TrimPrefix(imageURL, prefix)
	targetPath := filepath.Clean(filepath.Join(a.uploadDir, filepath.FromSlash(relativePath)))

	// Prevent path traversal: ensure the resolved path stays within uploadDir.
	if !strings.HasPrefix(targetPath, filepath.Clean(a.uploadDir)+string(filepath.Separator)) {
		return errors.New("invalid file path: outside upload directory")
	}

	if err := os.Remove(targetPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func extensionFromContentType(contentType string) string {
	extensions, err := mime.ExtensionsByType(contentType)
	if err != nil || len(extensions) == 0 {
		return ""
	}
	return strings.ToLower(extensions[0])
}

func isAllowedImageType(ext, contentType string) bool {
	if !strings.HasPrefix(contentType, "image/") {
		return false
	}
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
		return true
	default:
		return false
	}
}

func (a *app) handleResponsibilities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	requesterRole, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondRoleResolutionError(w, err)
		return
	}
	requesterEmployeeID, err := extractEmployeeIDFromRequest(r, a.db)
	if err != nil {
		log.Printf("responsibilities: failed to resolve requester identity: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	requesterEmployeeID = strings.TrimSpace(requesterEmployeeID)

	employeeID := strings.TrimSpace(r.URL.Query().Get("employee_id"))
	if !hasPermission(requesterRole, permissionViewAnyResponsibilities) {
		if requesterEmployeeID == "" {
			respondError(w, http.StatusUnauthorized, "User identity is required")
			return
		}
		if employeeID == "" {
			employeeID = requesterEmployeeID
		}
		if employeeID != requesterEmployeeID {
			respondError(w, http.StatusForbidden, "Недостаточно прав")
			return
		}
	}
	if employeeID == "" {
		respondJSON(w, http.StatusOK, map[string]any{
			"buildings":  []any{},
			"floors":     []any{},
			"coworkings": []any{},
		})
		return
	}

	type respBuilding struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		Address string `json:"address"`
	}
	type respFloor struct {
		ID              int64  `json:"id"`
		Name            string `json:"name"`
		Level           int    `json:"level"`
		BuildingID      int64  `json:"buildingId"`
		BuildingName    string `json:"buildingName"`
		BuildingAddress string `json:"buildingAddress"`
	}
	type respCoworking struct {
		ID                int64  `json:"id"`
		Name              string `json:"name"`
		FloorID           int64  `json:"floorId"`
		FloorName         string `json:"floorName"`
		FloorLevel        int    `json:"floorLevel"`
		BuildingID        int64  `json:"buildingId"`
		BuildingName      string `json:"buildingName"`
		BuildingAddress   string `json:"buildingAddress"`
		SubdivisionLevel1 string `json:"subdivisionLevel1"`
		SubdivisionLevel2 string `json:"subdivisionLevel2"`
	}

	// Buildings where user is responsible.
	buildingRows, err := a.db.Query(
		`SELECT id, name, address FROM office_buildings WHERE responsible_employee_id = $1 ORDER BY name`,
		employeeID,
	)
	if err != nil {
		log.Printf("responsibilities: buildings query error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer buildingRows.Close()
	var buildings []respBuilding
	for buildingRows.Next() {
		var b respBuilding
		if err := buildingRows.Scan(&b.ID, &b.Name, &b.Address); err != nil {
			log.Printf("responsibilities: buildings scan error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		buildings = append(buildings, b)
	}
	if err := buildingRows.Err(); err != nil {
		log.Printf("responsibilities: buildings rows error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Floors where user is responsible (with building info).
	floorRows, err := a.db.Query(
		`SELECT f.id, f.name, f.level, b.id, b.name, b.address
		   FROM floors f
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE f.responsible_employee_id = $1
		  ORDER BY b.name, f.level`,
		employeeID,
	)
	if err != nil {
		log.Printf("responsibilities: floors query error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer floorRows.Close()
	var floors []respFloor
	for floorRows.Next() {
		var fl respFloor
		if err := floorRows.Scan(&fl.ID, &fl.Name, &fl.Level, &fl.BuildingID, &fl.BuildingName, &fl.BuildingAddress); err != nil {
			log.Printf("responsibilities: floors scan error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		floors = append(floors, fl)
	}
	if err := floorRows.Err(); err != nil {
		log.Printf("responsibilities: floors rows error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Coworkings where user is responsible (with floor+building info).
	coworkingRows, err := a.db.Query(
		`SELECT c.id, c.name, f.id, f.name, f.level, b.id, b.name, b.address,
		        COALESCE(c.subdivision_level_1, ''), COALESCE(c.subdivision_level_2, '')
		   FROM coworkings c
		   JOIN floors f ON f.id = c.floor_id
		   JOIN office_buildings b ON b.id = f.building_id
		  WHERE c.responsible_employee_id = $1
		  ORDER BY b.name, f.level, c.name`,
		employeeID,
	)
	if err != nil {
		log.Printf("responsibilities: coworkings query error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer coworkingRows.Close()
	var coworkings []respCoworking
	for coworkingRows.Next() {
		var cw respCoworking
		if err := coworkingRows.Scan(
			&cw.ID, &cw.Name, &cw.FloorID, &cw.FloorName, &cw.FloorLevel,
			&cw.BuildingID, &cw.BuildingName, &cw.BuildingAddress,
			&cw.SubdivisionLevel1, &cw.SubdivisionLevel2,
		); err != nil {
			log.Printf("responsibilities: coworkings scan error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal error")
			return
		}
		coworkings = append(coworkings, cw)
	}
	if err := coworkingRows.Err(); err != nil {
		log.Printf("responsibilities: coworkings rows error: %v", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if buildings == nil {
		buildings = []respBuilding{}
	}
	if floors == nil {
		floors = []respFloor{}
	}
	if coworkings == nil {
		coworkings = []respCoworking{}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"buildings":  buildings,
		"floors":     floors,
		"coworkings": coworkings,
	})
}

// loadResponsibilitiesForToken fetches the IDs of buildings, floors, and coworkings
// that the user is responsible for. Returns nil if the user has no responsibilities.
func (a *app) loadResponsibilitiesForToken(employeeID string) *TokenResponsibilities {
	if employeeID == "" {
		return nil
	}

	var buildingIDs []int64
	var floorIDs []int64
	var coworkingIDs []int64

	// Load building IDs
	buildingRows, err := a.db.Query(
		`SELECT id FROM office_buildings WHERE responsible_employee_id = $1`,
		employeeID,
	)
	if err == nil {
		defer buildingRows.Close()
		for buildingRows.Next() {
			var id int64
			if err := buildingRows.Scan(&id); err == nil {
				buildingIDs = append(buildingIDs, id)
			}
		}
	}

	// Load floor IDs
	floorRows, err := a.db.Query(
		`SELECT id FROM floors WHERE responsible_employee_id = $1`,
		employeeID,
	)
	if err == nil {
		defer floorRows.Close()
		for floorRows.Next() {
			var id int64
			if err := floorRows.Scan(&id); err == nil {
				floorIDs = append(floorIDs, id)
			}
		}
	}

	// Load coworking IDs
	coworkingRows, err := a.db.Query(
		`SELECT id FROM coworkings WHERE responsible_employee_id = $1`,
		employeeID,
	)
	if err == nil {
		defer coworkingRows.Close()
		for coworkingRows.Next() {
			var id int64
			if err := coworkingRows.Scan(&id); err == nil {
				coworkingIDs = append(coworkingIDs, id)
			}
		}
	}

	// Return nil if user has no responsibilities at all
	if len(buildingIDs) == 0 && len(floorIDs) == 0 && len(coworkingIDs) == 0 {
		return nil
	}

	return &TokenResponsibilities{
		Buildings:  buildingIDs,
		Floors:     floorIDs,
		Coworkings: coworkingIDs,
	}
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func loggingMiddleware(next http.Handler, slowThreshold time.Duration) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		duration := time.Since(start)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, duration.Round(time.Millisecond))
		if strings.HasPrefix(r.URL.Path, "/api/") && duration >= slowThreshold {
			log.Printf("SLOW_API method=%s path=%s status=%d duration=%s remote_ip=%s threshold=%s",
				r.Method,
				r.URL.Path,
				rec.status,
				duration.Round(time.Millisecond),
				clientIP(r),
				slowThreshold.Round(time.Millisecond),
			)
		}
	})
}

// --- SVG sanitization ---
// Strips dangerous elements and attributes from SVG to prevent stored XSS.

var (
	svgScriptTagRe         = regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?</script\s*>`)
	svgSelfClosingScriptRe = regexp.MustCompile(`(?i)<script[^>]*/>`)
	svgEventAttrDoubleRe   = regexp.MustCompile(`(?i)\s+on\w+\s*=\s*"[^"]*"`)
	svgEventAttrSingleRe   = regexp.MustCompile(`(?i)\s+on\w+\s*=\s*'[^']*'`)
	svgEventAttrUnquotedRe = regexp.MustCompile(`(?i)\s+on\w+\s*=\s*[^\s>"']+`)
	svgJavascriptURIRe     = regexp.MustCompile(`(?i)javascript\s*:`)
	svgDataURIScriptRe     = regexp.MustCompile(`(?i)data\s*:\s*text/html`)
)

func sanitizeSVG(input string) string {
	result := svgScriptTagRe.ReplaceAllString(input, "")
	result = svgSelfClosingScriptRe.ReplaceAllString(result, "")
	result = svgEventAttrDoubleRe.ReplaceAllString(result, "")
	result = svgEventAttrSingleRe.ReplaceAllString(result, "")
	result = svgEventAttrUnquotedRe.ReplaceAllString(result, "")
	result = svgJavascriptURIRe.ReplaceAllString(result, "")
	result = svgDataURIScriptRe.ReplaceAllString(result, "")
	return result
}
