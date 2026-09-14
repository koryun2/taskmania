package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/koryun2/taskmania/internal/task"
)

type Tasks struct {
	db *DB
}

func NewTasks(db *DB) *Tasks { return &Tasks{db: db} }

// columns is written once so every read scans the same shape in the same order.
const columns = `id, title, description, status, importance, archived, version, created_at, updated_at`

// boardOrder puts high importance first, then the newest. The trailing id makes
// the order total, which pagination needs: without it, rows sharing a
// created_at could show up on two pages or none.
const boardOrder = `
	ORDER BY CASE importance WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
	         created_at DESC,
	         id DESC`

func (t *Tasks) q(query string) string { return rebind(query, t.db.Driver) }

func (t *Tasks) Create(ctx context.Context, in task.Task) error {
	_, err := t.db.SQL.ExecContext(ctx, t.q(`
		INSERT INTO tasks (`+columns+`)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		in.ID, in.Title, in.Description, in.Status, in.Importance,
		in.Archived, in.Version, in.CreatedAt.UTC(), in.UpdatedAt.UTC(),
	)
	if err != nil {
		return fmt.Errorf("insert task: %w", err)
	}
	return nil
}

func (t *Tasks) Get(ctx context.Context, id string) (task.Task, error) {
	row := t.db.SQL.QueryRowContext(ctx, t.q(`SELECT `+columns+` FROM tasks WHERE id = ?`), id)

	found, err := scan(row)
	if errors.Is(err, sql.ErrNoRows) {
		return task.Task{}, task.ErrNotFound
	}
	if err != nil {
		return task.Task{}, fmt.Errorf("get task: %w", err)
	}
	return found, nil
}

func (t *Tasks) Delete(ctx context.Context, id string) error {
	result, err := t.db.SQL.ExecContext(ctx, t.q(`DELETE FROM tasks WHERE id = ?`), id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete task rows: %w", err)
	}
	if affected == 0 {
		return task.ErrNotFound
	}
	return nil
}

// Update reads the row to fill in whatever the caller omitted, then writes it
// back with a version-guarded statement.
//
// The version is enforced by the UPDATE itself rather than by comparing after
// the read. That is the entire point: between the read and the write another
// request can commit, and only the database can decide who won.
func (t *Tasks) Update(ctx context.Context, id string, in task.UpdateInput, now time.Time) (task.Task, error) {
	current, err := t.Get(ctx, id)
	if err != nil {
		return task.Task{}, err
	}
	next := in.Apply(current)

	row := t.db.SQL.QueryRowContext(ctx, t.q(`
		UPDATE tasks
		SET title = ?, description = ?, status = ?, importance = ?, archived = ?,
		    version = version + 1, updated_at = ?
		WHERE id = ? AND version = ?
		RETURNING `+columns),
		next.Title, next.Description, next.Status, next.Importance,
		next.Archived, now.UTC(), id, in.Version,
	)

	updated, err := scan(row)
	if errors.Is(err, sql.ErrNoRows) {
		// Nothing matched, so the row either vanished or its version moved on.
		// Re-reading once is the only way to tell a 404 from a 409.
		_, getErr := t.Get(ctx, id)
		if errors.Is(getErr, task.ErrNotFound) {
			return task.Task{}, task.ErrNotFound
		}
		if getErr != nil {
			return task.Task{}, getErr
		}
		return task.Task{}, task.ErrConflict
	}
	if err != nil {
		return task.Task{}, fmt.Errorf("update task: %w", err)
	}
	return updated, nil
}

// List returns one page of the board plus the total count behind it.
func (t *Tasks) List(ctx context.Context, q task.Query) (task.Page, error) {
	where, args := filter(q)

	var total int
	countRow := t.db.SQL.QueryRowContext(ctx, t.q(`SELECT COUNT(*) FROM tasks`+where), args...)
	if err := countRow.Scan(&total); err != nil {
		return task.Page{}, fmt.Errorf("count tasks: %w", err)
	}

	// Asking for page 9 of a 2-page board should return the last real page.
	// Otherwise deleting the final row leaves the client on a blank screen.
	page := q.Page
	if last := lastPage(total, q.Limit); page > last {
		page = last
	}
	offset := (page - 1) * q.Limit

	pageArgs := append(append([]any{}, args...), q.Limit, offset)
	rows, err := t.db.SQL.QueryContext(ctx, t.q(`
		SELECT `+columns+` FROM tasks`+where+boardOrder+`
		LIMIT ? OFFSET ?`), pageArgs...)
	if err != nil {
		return task.Page{}, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	items := make([]task.Task, 0, q.Limit)
	for rows.Next() {
		found, err := scan(rows)
		if err != nil {
			return task.Page{}, fmt.Errorf("scan task: %w", err)
		}
		items = append(items, found)
	}
	if err := rows.Err(); err != nil {
		return task.Page{}, fmt.Errorf("iterate tasks: %w", err)
	}

	return task.Page{Items: items, Page: page, Limit: q.Limit, Total: total}, nil
}

func filter(q task.Query) (string, []any) {
	clauses := []string{"archived = ?"}
	args := []any{q.Archived}

	switch {
	case q.OpenOnly:
		clauses = append(clauses, "status <> ?")
		args = append(args, task.StatusDone)
	case q.Status != "":
		clauses = append(clauses, "status = ?")
		args = append(args, q.Status)
	}
	if q.Importance != "" {
		clauses = append(clauses, "importance = ?")
		args = append(args, q.Importance)
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func lastPage(total, limit int) int {
	if total <= 0 || limit <= 0 {
		return 1
	}
	return (total + limit - 1) / limit
}

// row is the shared surface of *sql.Row and *sql.Rows.
type row interface {
	Scan(dest ...any) error
}

func scan(src row) (task.Task, error) {
	var found task.Task
	err := src.Scan(
		&found.ID, &found.Title, &found.Description, &found.Status, &found.Importance,
		&found.Archived, &found.Version, &found.CreatedAt, &found.UpdatedAt,
	)
	if err != nil {
		return task.Task{}, err
	}
	found.CreatedAt = found.CreatedAt.UTC()
	found.UpdatedAt = found.UpdatedAt.UTC()
	return found, nil
}
