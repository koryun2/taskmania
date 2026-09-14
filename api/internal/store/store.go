// Package store owns the database connection and the SQL behind the board.
// SQLite backs local runs so the project needs no setup; PostgreSQL takes over
// in deployment.
package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

// Driver names as registered by the two database/sql drivers imported above.
const (
	DriverSQLite   = "sqlite"
	DriverPostgres = "pgx"
)

// DB pairs the pool with the driver it was opened with, because placeholder
// syntax and a few column types differ between the two engines.
type DB struct {
	SQL    *sql.DB
	Driver string
}

// The two schemas differ only where the engines genuinely differ: Postgres gets
// a real boolean and a timezone-aware timestamp instead of numeric stand-ins.
const schemaSQLite = `
CREATE TABLE IF NOT EXISTS tasks (
	id          TEXT      NOT NULL PRIMARY KEY,
	title       TEXT      NOT NULL,
	description TEXT      NOT NULL DEFAULT '',
	status      TEXT      NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
	importance  TEXT      NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
	archived    BOOLEAN   NOT NULL DEFAULT FALSE,
	version     INTEGER   NOT NULL DEFAULT 1,
	created_at  TIMESTAMP NOT NULL,
	updated_at  TIMESTAMP NOT NULL
);`

const schemaPostgres = `
CREATE TABLE IF NOT EXISTS tasks (
	id          TEXT        NOT NULL PRIMARY KEY,
	title       TEXT        NOT NULL,
	description TEXT        NOT NULL DEFAULT '',
	status      TEXT        NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
	importance  TEXT        NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
	archived    BOOLEAN     NOT NULL DEFAULT FALSE,
	version     BIGINT      NOT NULL DEFAULT 1,
	created_at  TIMESTAMPTZ NOT NULL,
	updated_at  TIMESTAMPTZ NOT NULL
);`

// The board is read far more often than written, and always through the same
// filter and sort, so these two cover the hot paths.
var indexes = []string{
	`CREATE INDEX IF NOT EXISTS tasks_archived_status_idx ON tasks (archived, status)`,
	`CREATE INDEX IF NOT EXISTS tasks_importance_created_idx ON tasks (importance, created_at DESC)`,
}

// Open resolves the URL to a driver, connects, checks the connection, and
// applies the schema.
func Open(ctx context.Context, databaseURL string) (*DB, error) {
	driver, dsn, err := resolve(databaseURL)
	if err != nil {
		return nil, err
	}

	pool, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", driver, err)
	}
	tune(pool, driver)

	if err := pool.PingContext(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping %s: %w", driver, err)
	}

	db := &DB{SQL: pool, Driver: driver}
	if err := db.migrate(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return db, nil
}

func (db *DB) Close() error { return db.SQL.Close() }

func (db *DB) Ping(ctx context.Context) error { return db.SQL.PingContext(ctx) }

func (db *DB) migrate(ctx context.Context) error {
	schema := schemaSQLite
	if db.Driver == DriverPostgres {
		schema = schemaPostgres
	}
	if _, err := db.SQL.ExecContext(ctx, schema); err != nil {
		return fmt.Errorf("create tasks table: %w", err)
	}
	for _, stmt := range indexes {
		if _, err := db.SQL.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("create index: %w", err)
		}
	}
	return nil
}

// tune applies the connection limits each engine wants. SQLite is held to a
// single connection because concurrent writers against one file produce lock
// contention rather than throughput.
func tune(pool *sql.DB, driver string) {
	if driver == DriverSQLite {
		pool.SetMaxOpenConns(1)
		return
	}
	pool.SetMaxOpenConns(10)
	pool.SetMaxIdleConns(5)
	pool.SetConnMaxLifetime(30 * time.Minute)
}

// resolve maps DATABASE_URL onto a driver and DSN. Empty means "run locally
// against a file", which keeps first-time setup to zero steps.
func resolve(databaseURL string) (driver, dsn string, err error) {
	url := strings.TrimSpace(databaseURL)
	if url == "" {
		url = "file:data/taskmania.db"
	}

	switch {
	case strings.HasPrefix(url, "postgres://"), strings.HasPrefix(url, "postgresql://"):
		return DriverPostgres, url, nil

	case url == ":memory:":
		return DriverSQLite, url, nil

	case strings.HasPrefix(url, "file:"):
		if err := ensureParentDir(strings.TrimPrefix(url, "file:")); err != nil {
			return "", "", err
		}
		return DriverSQLite, url, nil

	case strings.HasPrefix(url, "sqlite://"):
		path := strings.TrimPrefix(url, "sqlite://")
		if path == ":memory:" {
			return DriverSQLite, path, nil
		}
		if err := ensureParentDir(path); err != nil {
			return "", "", err
		}
		return DriverSQLite, "file:" + path, nil

	default:
		if err := ensureParentDir(url); err != nil {
			return "", "", err
		}
		return DriverSQLite, "file:" + url, nil
	}
}

// ensureParentDir creates the directory holding a SQLite file so pointing
// DATABASE_URL at a fresh path just works.
func ensureParentDir(path string) error {
	dir := filepath.Dir(path)
	if dir == "." || dir == "" {
		return nil
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create database directory %s: %w", dir, err)
	}
	return nil
}

// rebind turns the '?' placeholders used in this package into the numbered form
// Postgres expects. The alternative is writing every query twice.
func rebind(query, driver string) string {
	if driver != DriverPostgres {
		return query
	}
	var b strings.Builder
	n := 0
	for i := 0; i < len(query); i++ {
		if query[i] != '?' {
			b.WriteByte(query[i])
			continue
		}
		n++
		fmt.Fprintf(&b, "$%d", n)
	}
	return b.String()
}
