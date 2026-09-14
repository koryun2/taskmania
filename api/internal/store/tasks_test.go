package store

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/koryun2/taskmania/internal/task"
)

// newTestTasks opens a private in-memory database per test, so tests stay
// independent and need no cleanup.
func newTestTasks(t *testing.T) (*Tasks, context.Context) {
	t.Helper()

	ctx := context.Background()
	db, err := Open(ctx, ":memory:")
	if err != nil {
		t.Fatalf("open in-memory database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	return NewTasks(db), ctx
}

func seed(t *testing.T, tasks *Tasks, ctx context.Context, title string, status task.Status, importance task.Importance) task.Task {
	t.Helper()

	now := time.Now().UTC()
	created := task.Task{
		ID:         uuid.NewString(),
		Title:      title,
		Status:     status,
		Importance: importance,
		Version:    1,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := tasks.Create(ctx, created); err != nil {
		t.Fatalf("seed %q: %v", title, err)
	}
	return created
}

func TestCreateThenGet(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	created := seed(t, tasks, ctx, "Write the store", task.StatusTodo, task.ImportanceHigh)

	found, err := tasks.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if found.Title != created.Title {
		t.Errorf("title = %q, want %q", found.Title, created.Title)
	}
	if found.Version != 1 {
		t.Errorf("a new task should start at version 1, got %d", found.Version)
	}
	if found.Archived {
		t.Error("a new task should not be archived")
	}
}

func TestGetMissingTaskReportsNotFound(t *testing.T) {
	tasks, ctx := newTestTasks(t)

	_, err := tasks.Get(ctx, uuid.NewString())

	if !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestUpdateBumpsVersionAndKeepsUnsentFields(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	created := seed(t, tasks, ctx, "Original", task.StatusTodo, task.ImportanceMedium)

	status := task.StatusInProgress
	updated, err := tasks.Update(ctx, created.ID, task.UpdateInput{Status: &status, Version: 1}, time.Now().UTC())
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	if updated.Version != 2 {
		t.Errorf("version = %d, want 2", updated.Version)
	}
	if updated.Status != task.StatusInProgress {
		t.Errorf("status = %q, want in_progress", updated.Status)
	}
	if updated.Title != "Original" {
		t.Errorf("title should be untouched, got %q", updated.Title)
	}
}

// This is the concurrency guarantee: two clients read version 1, both write,
// and the second one is told its copy is stale instead of silently winning.
func TestUpdateWithStaleVersionConflicts(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	created := seed(t, tasks, ctx, "Contested", task.StatusTodo, task.ImportanceMedium)

	first := task.StatusInProgress
	if _, err := tasks.Update(ctx, created.ID, task.UpdateInput{Status: &first, Version: 1}, time.Now().UTC()); err != nil {
		t.Fatalf("first writer should succeed: %v", err)
	}

	second := task.StatusDone
	_, err := tasks.Update(ctx, created.ID, task.UpdateInput{Status: &second, Version: 1}, time.Now().UTC())

	if !errors.Is(err, task.ErrConflict) {
		t.Fatalf("expected ErrConflict for the stale writer, got %v", err)
	}

	// The losing write must not have landed.
	found, err := tasks.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if found.Status != task.StatusInProgress {
		t.Errorf("status = %q, want the first writer's value", found.Status)
	}
	if found.Version != 2 {
		t.Errorf("version = %d, want 2 (only one write should have applied)", found.Version)
	}
}

// A missing row and a stale version both match zero rows, so the store has to
// tell them apart rather than reporting a conflict for a deleted task.
func TestUpdateMissingTaskReportsNotFoundNotConflict(t *testing.T) {
	tasks, ctx := newTestTasks(t)

	status := task.StatusDone
	_, err := tasks.Update(ctx, uuid.NewString(), task.UpdateInput{Status: &status, Version: 1}, time.Now().UTC())

	if !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestDelete(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	created := seed(t, tasks, ctx, "Temporary", task.StatusTodo, task.ImportanceLow)

	if err := tasks.Delete(ctx, created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := tasks.Get(ctx, created.ID); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("task should be gone, got %v", err)
	}
	if err := tasks.Delete(ctx, created.ID); !errors.Is(err, task.ErrNotFound) {
		t.Fatalf("deleting twice should report ErrNotFound, got %v", err)
	}
}

func TestListOrdersByImportanceThenNewest(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	seed(t, tasks, ctx, "low", task.StatusTodo, task.ImportanceLow)
	seed(t, tasks, ctx, "high", task.StatusTodo, task.ImportanceHigh)
	seed(t, tasks, ctx, "medium", task.StatusTodo, task.ImportanceMedium)

	query := task.Query{}
	if err := query.Normalize(); err != nil {
		t.Fatalf("normalize: %v", err)
	}
	page, err := tasks.List(ctx, query)
	if err != nil {
		t.Fatalf("list: %v", err)
	}

	if page.Total != 3 {
		t.Fatalf("total = %d, want 3", page.Total)
	}
	want := []string{"high", "medium", "low"}
	for i, title := range want {
		if page.Items[i].Title != title {
			t.Errorf("position %d = %q, want %q", i, page.Items[i].Title, title)
		}
	}
}

func TestListOpenOnlyHidesDone(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	seed(t, tasks, ctx, "still going", task.StatusInProgress, task.ImportanceMedium)
	seed(t, tasks, ctx, "finished", task.StatusDone, task.ImportanceMedium)

	query := task.Query{OpenOnly: true}
	if err := query.Normalize(); err != nil {
		t.Fatalf("normalize: %v", err)
	}
	page, err := tasks.List(ctx, query)
	if err != nil {
		t.Fatalf("list: %v", err)
	}

	if page.Total != 1 {
		t.Fatalf("total = %d, want 1", page.Total)
	}
	if page.Items[0].Title != "still going" {
		t.Errorf("got %q, want the unfinished task", page.Items[0].Title)
	}
}

func TestListSeparatesArchivedFromTheBoard(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	onBoard := seed(t, tasks, ctx, "on the board", task.StatusTodo, task.ImportanceMedium)
	toArchive := seed(t, tasks, ctx, "filed away", task.StatusTodo, task.ImportanceMedium)

	archived := true
	if _, err := tasks.Update(ctx, toArchive.ID, task.UpdateInput{Archived: &archived, Version: 1}, time.Now().UTC()); err != nil {
		t.Fatalf("archive: %v", err)
	}

	board := mustList(t, tasks, ctx, task.Query{})
	if board.Total != 1 || board.Items[0].ID != onBoard.ID {
		t.Errorf("the board should show only the unarchived task, got %d items", board.Total)
	}

	archive := mustList(t, tasks, ctx, task.Query{Archived: true})
	if archive.Total != 1 || archive.Items[0].ID != toArchive.ID {
		t.Errorf("the archive should show only the archived task, got %d items", archive.Total)
	}
}

// Deleting the last row of the final page must not strand the client on an
// empty screen, so List clamps an over-large page down to the last real one.
func TestListClampsPageBeyondTheEnd(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	seed(t, tasks, ctx, "only task", task.StatusTodo, task.ImportanceMedium)

	page := mustList(t, tasks, ctx, task.Query{Page: 9, Limit: 20})

	if page.Page != 1 {
		t.Errorf("page = %d, want it clamped to 1", page.Page)
	}
	if len(page.Items) != 1 {
		t.Errorf("expected the clamped page to hold the task, got %d items", len(page.Items))
	}
}

func TestListPaginates(t *testing.T) {
	tasks, ctx := newTestTasks(t)
	for _, title := range []string{"a", "b", "c"} {
		seed(t, tasks, ctx, title, task.StatusTodo, task.ImportanceMedium)
	}

	first := mustList(t, tasks, ctx, task.Query{Page: 1, Limit: 2})
	if len(first.Items) != 2 || first.Total != 3 {
		t.Fatalf("page 1: got %d items of %d total, want 2 of 3", len(first.Items), first.Total)
	}

	second := mustList(t, tasks, ctx, task.Query{Page: 2, Limit: 2})
	if len(second.Items) != 1 {
		t.Fatalf("page 2: got %d items, want 1", len(second.Items))
	}
	if second.Items[0].ID == first.Items[0].ID {
		t.Error("pages should not overlap")
	}
}

func mustList(t *testing.T, tasks *Tasks, ctx context.Context, query task.Query) task.Page {
	t.Helper()

	if err := query.Normalize(); err != nil {
		t.Fatalf("normalize: %v", err)
	}
	page, err := tasks.List(ctx, query)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	return page
}
