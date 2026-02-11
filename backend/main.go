package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

const uploadDirName = "uploads"
const buildingUploadDirName = "buildings"
const maxBuildingImageSize = 5 << 20
const maxBuildingFormSize = maxBuildingImageSize + (1 << 20)
const defaultBuildingTimezone = "Europe/Moscow"

type app struct {
	db                *sql.DB
	uploadDir         string
	buildingUploadDir string
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
	WbUserID   string `json:"wb_user_id"`
	UserName   string `json:"user_name"`
	EmployeeID string `json:"employee_id,omitempty"`
	AvatarURL  string `json:"avatar_url,omitempty"`
	WbBand     string `json:"wb_band,omitempty"`
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
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host,
		port,
		user,
		password,
		dbName,
		sslMode,
	)
}

func main() {
	_ = godotenv.Load()

	db, err := sql.Open("pgx", postgresDSN())
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

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

	app := &app{
		db:                db,
		uploadDir:         uploadDir,
		buildingUploadDir: buildingUploadDir,
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
	mux.HandleFunc("/api/bookings", app.handleBookings)
	mux.HandleFunc("/api/bookings/", app.handleBookingsSubroutes)
	mux.HandleFunc("/api/users", app.handleUsers)
	mux.HandleFunc("/api/users/role", app.handleUserRole)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/auth/user/info", app.handleAuthUserInfo)
	mux.HandleFunc("/api/auth/user/wb-band", app.handleAuthUserWbBand)
	mux.HandleFunc("/api/auth/v2/code/wb-captcha", app.handleAuthRequestCode)
	mux.HandleFunc("/api/auth/v2/auth", app.handleAuthConfirmCode)

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
	handler = authMiddleware(handler)
	handler = corsMiddleware(handler)
	handler = securityHeadersMiddleware(handler)
	handler = loggingMiddleware(handler)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
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
			points_json TEXT NOT NULL DEFAULT '[]',
			color TEXT NOT NULL DEFAULT '',
			snapshot_hidden INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(floor_id) REFERENCES floors(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS workplaces (
			id BIGSERIAL PRIMARY KEY,
			coworking_id BIGINT NOT NULL,
			label TEXT NOT NULL,
			x DOUBLE PRECISION NOT NULL DEFAULT 0,
			y DOUBLE PRECISION NOT NULL DEFAULT 0,
			width DOUBLE PRECISION NOT NULL DEFAULT 200,
			height DOUBLE PRECISION NOT NULL DEFAULT 100,
			rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(coworking_id) REFERENCES coworkings(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS meeting_rooms (
			id BIGINT PRIMARY KEY DEFAULT nextval('spaces_id_seq'),
			floor_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			capacity INTEGER NOT NULL DEFAULT 0,
			points_json TEXT NOT NULL DEFAULT '[]',
			color TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(floor_id) REFERENCES floors(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS meeting_room_bookings (
			id BIGSERIAL PRIMARY KEY,
			meeting_room_id BIGINT NOT NULL,
			employee_id TEXT NOT NULL,
			start_at TIMESTAMPTZ NOT NULL,
			end_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(meeting_room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS workplace_bookings (
			id BIGSERIAL PRIMARY KEY,
			workplace_id BIGINT NOT NULL,
			employee_id TEXT NOT NULL,
			date TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			FOREIGN KEY(workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			UNIQUE(workplace_id, date),
			UNIQUE(employee_id, date)
		);`,
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
	if err := ensureColumn(db, "coworkings", "points_json", "TEXT NOT NULL DEFAULT '[]'"); err != nil {
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
	if err := ensureColumn(db, "meeting_rooms", "points_json", "TEXT NOT NULL DEFAULT '[]'"); err != nil {
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
	if err := ensureColumn(db, "workplaces", "x", "REAL NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if err := ensureColumn(db, "workplaces", "y", "REAL NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if err := ensureColumn(db, "workplaces", "width", "REAL NOT NULL DEFAULT 200"); err != nil {
		return err
	}
	if err := ensureColumn(db, "workplaces", "height", "REAL NOT NULL DEFAULT 100"); err != nil {
		return err
	}
	if err := ensureColumn(db, "workplaces", "rotation", "REAL NOT NULL DEFAULT 0"); err != nil {
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
	switch {
	case !hasEmployeeID && hasWbUserID:
		if _, err := db.Exec(`ALTER TABLE meeting_room_bookings RENAME COLUMN wb_user_id TO employee_id`); err != nil {
			return err
		}
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
	if _, err := db.Exec(
		`UPDATE meeting_room_bookings b
		 SET employee_id = COALESCE(NULLIF(u.employee_id, ''), b.employee_id)
		 FROM users u
		 WHERE b.employee_id = u.wb_user_id
		    OR b.employee_id = u.wb_team_profile_id
		    OR b.employee_id = u.employee_id`,
	); err != nil {
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

	if _, err := db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS workplace_bookings_wb_user_id_date_unique
		 ON workplace_bookings (employee_id, date)`,
	); err != nil {
		return err
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
		if _, err := db.Exec(fmt.Sprintf("ALTER TABLE %s RENAME COLUMN user_key TO wb_user_id", table)); err != nil {
			return err
		}
	case hasUserKey && hasWbUserID:
		if _, err := db.Exec(fmt.Sprintf(
			`UPDATE %s
			 SET wb_user_id = user_key
			 WHERE (wb_user_id = '' OR wb_user_id IS NULL) AND user_key <> ''`,
			table,
		)); err != nil {
			return err
		}
		if _, err := db.Exec(fmt.Sprintf("ALTER TABLE %s DROP COLUMN user_key", table)); err != nil {
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
	_, err := db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition))
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
			respondError(w, http.StatusInternalServerError, err.Error())
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
				respondError(w, status, err.Error())
				return
			}
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
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
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
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageBuilding(w, r, id) {
				return
			}
			var payload struct {
				Name                  string  `json:"name"`
				Address               string  `json:"address"`
				Timezone              *string `json:"timezone"`
				ResponsibleEmployeeID *string `json:"responsible_employee_id"`
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
			if payload.ResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.ResponsibleEmployeeID)
				payload.ResponsibleEmployeeID = &trimmed
				role, err := resolveRoleFromRequest(r, a.db)
				if err != nil {
					respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
					return
				}
				if role != roleAdmin {
					respondError(w, http.StatusForbidden, "Недостаточно прав")
					return
				}
			}
			timezone := ""
			if payload.Timezone == nil {
				existing, err := a.getBuilding(id)
				if err != nil {
					if errors.Is(err, errNotFound) {
						respondError(w, http.StatusNotFound, "building not found")
						return
					}
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
				timezone = existing.Timezone
			} else {
				normalized, err := normalizeTimezone(*payload.Timezone)
				if err != nil {
					respondError(w, http.StatusBadRequest, "invalid timezone")
					return
				}
				timezone = normalized
			}
			result, err := a.updateBuilding(id, payload.Name, payload.Address, timezone, payload.ResponsibleEmployeeID)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, result)
		case http.MethodDelete:
			if !ensureNotEmployeeRole(w, r, a.db) {
				return
			}
			if err := a.deleteBuilding(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
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
				respondError(w, http.StatusInternalServerError, err.Error())
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
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			if existing.ImageURL != "" && existing.ImageURL != imageURL {
				_ = a.removeUploadedFile(existing.ImageURL)
			}
			respondJSON(w, http.StatusOK, updated)
		case http.MethodDelete:
			if !a.ensureCanManageBuilding(w, r, id) {
				return
			}
			updated, err := a.clearBuildingImage(id)
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "building not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
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
			respondError(w, http.StatusInternalServerError, err.Error())
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
	if err := decodeJSON(r, &payload); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	payload.Name = strings.TrimSpace(payload.Name)
	payload.PlanSVG = strings.TrimSpace(payload.PlanSVG)
	if payload.BuildingID == 0 || payload.Name == "" || payload.PlanSVG == "" {
		respondError(w, http.StatusBadRequest, "building_id, name, and plan_svg are required")
		return
	}
	if !a.ensureCanManageBuilding(w, r, payload.BuildingID) {
		return
	}
	result, err := a.createFloor(payload.BuildingID, payload.Name, payload.Level, payload.PlanSVG)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
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
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageFloor(w, r, id) {
				return
			}
			var payload struct {
				Name                  *string `json:"name"`
				PlanSVG               *string `json:"plan_svg"`
				ResponsibleEmployeeID *string `json:"responsible_employee_id"`
			}
			if err := decodeJSON(r, &payload); err != nil {
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
				trimmed := strings.TrimSpace(*payload.PlanSVG)
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
				err     error
			)
			if payload.PlanSVG != nil {
				updated, err = a.updateFloorPlan(id, *payload.PlanSVG)
				if err != nil {
					if errors.Is(err, errNotFound) {
						respondError(w, http.StatusNotFound, "floor not found")
						return
					}
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
			}
			if payload.Name != nil || payload.ResponsibleEmployeeID != nil {
				updated, err = a.updateFloorDetails(id, payload.Name, payload.ResponsibleEmployeeID)
				if err != nil {
					if errors.Is(err, errNotFound) {
						respondError(w, http.StatusNotFound, "floor not found")
						return
					}
					if err.Error() == "name is required" {
						respondError(w, http.StatusBadRequest, err.Error())
						return
					}
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
			}
			respondJSON(w, http.StatusOK, updated)
		case http.MethodDelete:
			if !a.ensureCanManageBuildingByFloor(w, r, id) {
				return
			}
			if err := a.deleteFloorAndShift(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "floor not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case "/spaces":
		switch r.Method {
		case http.MethodGet:
			items, err := a.listSpacesByFloor(id)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err.Error())
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
		if !a.ensureCanManageBuildingByFloor(w, r, payload.FloorID) {
			return
		}
	}
	if payload.FloorResponsibleEmployeeID != "" {
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if payload.FloorResponsibleEmployeeID != "" {
		if err := a.updateFloorResponsibleEmployeeID(payload.FloorID, payload.FloorResponsibleEmployeeID); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "floor not found")
				return
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
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
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, item)
		case http.MethodPut:
			if !a.ensureCanManageSpace(w, r, id) {
				return
			}
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
			if payload.ResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.ResponsibleEmployeeID)
				payload.ResponsibleEmployeeID = &trimmed
				if !a.ensureCanManageBuildingBySpace(w, r, id) {
					return
				}
			}
			if payload.FloorResponsibleEmployeeID != nil {
				trimmed := strings.TrimSpace(*payload.FloorResponsibleEmployeeID)
				payload.FloorResponsibleEmployeeID = &trimmed
				if !a.ensureCanManageBuildingBySpace(w, r, id) {
					return
				}
			}
			var (
				result space
				err    error
			)
			if len(payload.Points) > 0 {
				if len(payload.Points) < 3 {
					respondError(w, http.StatusBadRequest, "points are required")
					return
				}
				result, err = a.updateSpaceGeometry(id, payload.Points, payload.Color)
			} else if payload.SnapshotHidden != nil &&
				payload.Name == "" &&
				payload.Kind == "" &&
				payload.Capacity == nil &&
				payload.Color == "" {
				result, err = a.updateSpaceSnapshotHidden(id, *payload.SnapshotHidden)
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
						respondError(w, http.StatusInternalServerError, err.Error())
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
				result, err = a.updateSpaceDetails(
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
			if err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
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
					respondError(w, http.StatusInternalServerError, err.Error())
					return
				}
			}
			respondJSON(w, http.StatusOK, result)
		case http.MethodDelete:
			if !a.ensureCanManageSpace(w, r, id) {
				return
			}
			if err := a.deleteSpace(id); err != nil {
				if errors.Is(err, errNotFound) {
					respondError(w, http.StatusNotFound, "space not found")
					return
				}
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
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
			respondError(w, http.StatusInternalServerError, err.Error())
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
			respondError(w, http.StatusInternalServerError, err.Error())
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
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
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
			respondError(w, http.StatusInternalServerError, err.Error())
			return
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
		if err := a.deleteDesksBulk(unique); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return
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
		result, err := a.updateDesk(id, payload.Label, payload.X, payload.Y, payload.Width, payload.Height, payload.Rotation)
		if err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			if err.Error() == "label is required" {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			if err.Error() == "width and height must be greater than 0" {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, result)
	case http.MethodDelete:
		if !a.ensureCanManageDesk(w, r, id) {
			return
		}
		if err := a.deleteDesk(id); err != nil {
			if errors.Is(err, errNotFound) {
				respondError(w, http.StatusNotFound, "desk not found")
				return
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
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
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	if !a.ensureCanManageFloor(w, r, floorID) {
		return
	}
	result, err := a.createMeetingRoom(floorID, payload.Name, payload.Capacity)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
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

func (a *app) updateBuilding(id int64, name, address, timezone string, responsibleEmployeeID *string) (building, error) {
	responsibleValue := ""
	if responsibleEmployeeID == nil {
		existing, err := a.getBuilding(id)
		if err != nil {
			return building{}, err
		}
		responsibleValue = strings.TrimSpace(existing.ResponsibleEmployeeID)
	} else {
		responsibleValue = strings.TrimSpace(*responsibleEmployeeID)
	}
	result, err := a.db.Exec(
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
			return floor{}, errors.New("name is required")
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
		`SELECT id, coworking_id, label, x, y, width, height, rotation, created_at FROM workplaces WHERE coworking_id = $1 ORDER BY id DESC`,
		spaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []desk
	for rows.Next() {
		var d desk
		if err := rows.Scan(&d.ID, &d.SpaceID, &d.Label, &d.X, &d.Y, &d.Width, &d.Height, &d.Rotation, &d.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (a *app) listDesksBySpaceWithBookings(spaceID int64, date string) ([]deskWithBooking, error) {
	rows, err := a.db.Query(
		`SELECT d.id, d.coworking_id, d.label, d.x, d.y, d.width, d.height, d.rotation, d.created_at,
		        b.employee_id,
		        COALESCE(NULLIF(u.full_name, ''), ''),
		        COALESCE(NULLIF(u.employee_id, ''), b.employee_id, ''),
		        COALESCE(u.wb_user_id, ''),
		        COALESCE(u.avatar_url, ''),
		        COALESCE(u.wb_band, '')
		   FROM workplaces d
		   LEFT JOIN workplace_bookings b ON b.workplace_id = d.id AND b.date = $2
		   LEFT JOIN LATERAL (
		     SELECT full_name, employee_id, wb_user_id, avatar_url, wb_band
		       FROM users
		      WHERE employee_id = b.employee_id
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
		var bookingWbUserID sql.NullString
		var userName sql.NullString
		var employeeID sql.NullString
		var userWbUserID sql.NullString
		var avatarURL sql.NullString
		var wbBand sql.NullString
		if err := rows.Scan(
			&d.ID,
			&d.SpaceID,
			&d.Label,
			&d.X,
			&d.Y,
			&d.Width,
			&d.Height,
			&d.Rotation,
			&d.CreatedAt,
			&bookingWbUserID,
			&userName,
			&employeeID,
			&userWbUserID,
			&avatarURL,
			&wbBand,
		); err != nil {
			return nil, err
		}
		d.Booking.IsBooked = bookingWbUserID.Valid && strings.TrimSpace(bookingWbUserID.String) != ""
		if d.Booking.IsBooked {
			wbUserIDValue := strings.TrimSpace(bookingWbUserID.String)
			resolvedWbUserID := strings.TrimSpace(userWbUserID.String)
			if resolvedWbUserID == "" {
				resolvedWbUserID = wbUserIDValue
			}
			userNameValue := strings.TrimSpace(userName.String)
			if userNameValue == "" {
				userNameValue = wbUserIDValue
			}
			d.Booking.User = &deskBookingUser{
				WbUserID:   resolvedWbUserID,
				UserName:   userNameValue,
				EmployeeID: strings.TrimSpace(employeeID.String),
				AvatarURL:  strings.TrimSpace(avatarURL.String),
				WbBand:     strings.TrimSpace(wbBand.String),
			}
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (a *app) createDesk(spaceID int64, label string, x, y, width, height, rotation float64) (desk, error) {
	var id int64
	if err := a.db.QueryRow(
		`INSERT INTO workplaces (coworking_id, label, x, y, width, height, rotation)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
		spaceID,
		label,
		x,
		y,
		width,
		height,
		rotation,
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
		`INSERT INTO workplaces (coworking_id, label, x, y, width, height, rotation)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
	)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	now := time.Now().UTC()
	created := make([]desk, 0, len(items))
	for _, item := range items {
		var id int64
		execErr := stmt.QueryRow(
			item.SpaceID,
			item.Label,
			item.X,
			item.Y,
			item.Width,
			item.Height,
			item.Rotation,
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
	row := a.db.QueryRow(
		`SELECT id, coworking_id, label, x, y, width, height, rotation, created_at FROM workplaces WHERE id = $1`,
		id,
	)
	if err := row.Scan(&d.ID, &d.SpaceID, &d.Label, &d.X, &d.Y, &d.Width, &d.Height, &d.Rotation, &d.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return desk{}, errNotFound
		}
		return desk{}, err
	}
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
		return desk{}, errors.New("label is required")
	}
	if current.Width <= 0 || current.Height <= 0 {
		return desk{}, errors.New("width and height must be greater than 0")
	}
	result, err := a.db.Exec(
		`UPDATE workplaces SET label = $1, x = $2, y = $3, width = $4, height = $5, rotation = $6 WHERE id = $7`,
		current.Label,
		current.X,
		current.Y,
		current.Width,
		current.Height,
		current.Rotation,
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
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
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
	targetPath := filepath.Join(a.uploadDir, filepath.FromSlash(relativePath))
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

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
