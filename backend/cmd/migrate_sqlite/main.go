package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

const defaultBuildingTimezone = "Europe/Moscow"

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
	sqlitePath := flag.String("sqlite", "backend/office.db", "path to sqlite database file")
	pgDSN := flag.String("pg", "", "Postgres DSN; overrides env DATABASE_URL/PG*")
	truncate := flag.Bool("truncate", true, "truncate target tables before import")
	flag.Parse()

	dsn := strings.TrimSpace(*pgDSN)
	if dsn == "" {
		dsn = postgresDSN()
	}

	sqliteDB, err := sql.Open("sqlite", fmt.Sprintf("file:%s?mode=ro&_fk=1", *sqlitePath))
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	defer sqliteDB.Close()

	pgDB, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open postgres: %v", err)
	}
	defer pgDB.Close()

	if err := sqliteDB.Ping(); err != nil {
		log.Fatalf("ping sqlite: %v", err)
	}
	if err := pgDB.Ping(); err != nil {
		log.Fatalf("ping postgres: %v", err)
	}

	tx, err := pgDB.Begin()
	if err != nil {
		log.Fatalf("begin postgres: %v", err)
	}
	defer tx.Rollback()

	if *truncate {
		if _, err := tx.Exec(`TRUNCATE bookings, meeting_rooms, desks, spaces, floors, office_buildings RESTART IDENTITY CASCADE`); err != nil {
			log.Fatalf("truncate: %v", err)
		}
	}

	if err := copyBuildings(sqliteDB, tx); err != nil {
		log.Fatalf("copy buildings: %v", err)
	}
	if err := copyFloors(sqliteDB, tx); err != nil {
		log.Fatalf("copy floors: %v", err)
	}
	if err := copySpaces(sqliteDB, tx); err != nil {
		log.Fatalf("copy spaces: %v", err)
	}
	if err := copyDesks(sqliteDB, tx); err != nil {
		log.Fatalf("copy desks: %v", err)
	}
	if err := copyMeetingRooms(sqliteDB, tx); err != nil {
		log.Fatalf("copy meeting rooms: %v", err)
	}
	if err := copyBookings(sqliteDB, tx); err != nil {
		log.Fatalf("copy bookings: %v", err)
	}

	if err := resetSequence(tx, "office_buildings"); err != nil {
		log.Fatalf("reset sequence office_buildings: %v", err)
	}
	if err := resetSequence(tx, "floors"); err != nil {
		log.Fatalf("reset sequence floors: %v", err)
	}
	if err := resetSequence(tx, "spaces"); err != nil {
		log.Fatalf("reset sequence spaces: %v", err)
	}
	if err := resetSequence(tx, "desks"); err != nil {
		log.Fatalf("reset sequence desks: %v", err)
	}
	if err := resetSequence(tx, "meeting_rooms"); err != nil {
		log.Fatalf("reset sequence meeting_rooms: %v", err)
	}
	if err := resetSequence(tx, "bookings"); err != nil {
		log.Fatalf("reset sequence bookings: %v", err)
	}

	if err := tx.Commit(); err != nil {
		log.Fatalf("commit: %v", err)
	}

	log.Println("Migration completed.")
}

func copyBuildings(sqliteDB *sql.DB, tx *sql.Tx) error {
	hasTimezone, err := hasSQLiteColumn(sqliteDB, "office_buildings", "timezone")
	if err != nil {
		return err
	}
	query := `SELECT id, name, address, image_url, floors, created_at FROM office_buildings ORDER BY id`
	if hasTimezone {
		query = `SELECT id, name, address, image_url, floors, created_at, timezone FROM office_buildings ORDER BY id`
	}
	rows, err := sqliteDB.Query(query)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        int64
			name      string
			address   string
			imageURL  sql.NullString
			floors    string
			createdAt string
			timezone  sql.NullString
		)
		if hasTimezone {
			if err := rows.Scan(&id, &name, &address, &imageURL, &floors, &createdAt, &timezone); err != nil {
				return err
			}
		} else {
			if err := rows.Scan(&id, &name, &address, &imageURL, &floors, &createdAt); err != nil {
				return err
			}
		}
		targetTimezone := strings.TrimSpace(timezone.String)
		if targetTimezone == "" {
			targetTimezone = defaultBuildingTimezone
		}
		if _, err := tx.Exec(
			`INSERT INTO office_buildings (id, name, address, image_url, floors, created_at, timezone)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			id,
			name,
			address,
			imageURL.String,
			floors,
			createdAt,
			targetTimezone,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func hasSQLiteColumn(db *sql.DB, table, column string) (bool, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var (
			cid       int
			name      string
			dataType  string
			notNull   int
			dfltValue sql.NullString
			pk        int
		)
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &dfltValue, &pk); err != nil {
			return false, err
		}
		if strings.EqualFold(name, column) {
			return true, nil
		}
	}
	return false, rows.Err()
}

func copyFloors(sqliteDB *sql.DB, tx *sql.Tx) error {
	rows, err := sqliteDB.Query(`SELECT id, building_id, name, level, plan_svg, created_at FROM floors ORDER BY id`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id         int64
			buildingID int64
			name       string
			level      int
			planSVG    string
			createdAt  string
		)
		if err := rows.Scan(&id, &buildingID, &name, &level, &planSVG, &createdAt); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO floors (id, building_id, name, level, plan_svg, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			id,
			buildingID,
			name,
			level,
			planSVG,
			createdAt,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func copySpaces(sqliteDB *sql.DB, tx *sql.Tx) error {
	rows, err := sqliteDB.Query(`SELECT id, floor_id, name, kind, capacity, points_json, color, snapshot_hidden, created_at FROM spaces ORDER BY id`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id             int64
			floorID        int64
			name           string
			kind           string
			capacity       int
			pointsJSON     string
			color          string
			snapshotHidden int
			createdAt      string
		)
		if err := rows.Scan(
			&id,
			&floorID,
			&name,
			&kind,
			&capacity,
			&pointsJSON,
			&color,
			&snapshotHidden,
			&createdAt,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO spaces (id, floor_id, name, kind, capacity, points_json, color, snapshot_hidden, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			id,
			floorID,
			name,
			kind,
			capacity,
			pointsJSON,
			color,
			snapshotHidden,
			createdAt,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func copyDesks(sqliteDB *sql.DB, tx *sql.Tx) error {
	rows, err := sqliteDB.Query(`SELECT id, space_id, label, x, y, width, height, rotation, created_at FROM desks ORDER BY id`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        int64
			spaceID   int64
			label     string
			x         float64
			y         float64
			width     float64
			height    float64
			rotation  float64
			createdAt string
		)
		if err := rows.Scan(&id, &spaceID, &label, &x, &y, &width, &height, &rotation, &createdAt); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO desks (id, space_id, label, x, y, width, height, rotation, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			id,
			spaceID,
			label,
			x,
			y,
			width,
			height,
			rotation,
			createdAt,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func copyMeetingRooms(sqliteDB *sql.DB, tx *sql.Tx) error {
	rows, err := sqliteDB.Query(`SELECT id, space_id, name, capacity, created_at FROM meeting_rooms ORDER BY id`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        int64
			spaceID   int64
			name      string
			capacity  int
			createdAt string
		)
		if err := rows.Scan(&id, &spaceID, &name, &capacity, &createdAt); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO meeting_rooms (id, space_id, name, capacity, created_at)
			 VALUES ($1, $2, $3, $4, $5)`,
			id,
			spaceID,
			name,
			capacity,
			createdAt,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func copyBookings(sqliteDB *sql.DB, tx *sql.Tx) error {
	hasBuildingID := false
	rows, err := sqliteDB.Query(`PRAGMA table_info(bookings)`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var (
			cid     int
			name    string
			colType string
			notNull int
			dflt    sql.NullString
			pk      int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			rows.Close()
			return err
		}
		if name == "building_id" {
			hasBuildingID = true
		}
	}
	rows.Close()

	var query string
	if hasBuildingID {
		query = `SELECT id, desk_id, building_id, user_key, user_name, date, created_at FROM bookings ORDER BY id`
	} else {
		query = `SELECT b.id, b.desk_id, f.building_id, b.user_key, b.user_name, b.date, b.created_at
		          FROM bookings b
		          JOIN desks d ON d.id = b.desk_id
		          JOIN spaces s ON s.id = d.space_id
		          JOIN floors f ON f.id = s.floor_id
		         ORDER BY b.id`
	}

	rows, err = sqliteDB.Query(query)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id         int64
			deskID     int64
			buildingID int64
			userKey    string
			userName   string
			date       string
			createdAt  string
		)
		if err := rows.Scan(&id, &deskID, &buildingID, &userKey, &userName, &date, &createdAt); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO bookings (id, desk_id, building_id, user_key, user_name, date, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			id,
			deskID,
			buildingID,
			userKey,
			userName,
			date,
			createdAt,
		); err != nil {
			return err
		}
	}
	return rows.Err()
}

func resetSequence(tx *sql.Tx, table string) error {
	_, err := tx.Exec(
		fmt.Sprintf(
			`SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE((SELECT MAX(id) FROM %s), 0))`,
			table,
			table,
		),
	)
	return err
}
