package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/koryun2/taskmania/internal/store"
	"github.com/koryun2/taskmania/internal/task"
)

// newTestServer wires a real handler over an in-memory database, so these
// tests exercise routing, decoding, the store, and the error mapping together.
func newTestServer(t *testing.T) http.Handler {
	t.Helper()

	db, err := store.Open(context.Background(), ":memory:")
	if err != nil {
		t.Fatalf("open in-memory database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	discard := slog.New(slog.NewTextHandler(io.Discard, nil))
	return New(db, discard, []string{"http://localhost:5173"})
}

func do(t *testing.T, handler http.Handler, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()

	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, target, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func decodeInto[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()

	var out T
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode response %q: %v", rec.Body.String(), err)
	}
	return out
}

func createTask(t *testing.T, handler http.Handler, title string) task.Task {
	t.Helper()

	rec := do(t, handler, http.MethodPost, "/tasks", `{"title":"`+title+`"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %q: status %d, body %s", title, rec.Code, rec.Body.String())
	}
	return decodeInto[task.Task](t, rec)
}

func TestHealthAndReady(t *testing.T) {
	handler := newTestServer(t)

	for _, path := range []string{"/health", "/ready"} {
		if rec := do(t, handler, http.MethodGet, path, ""); rec.Code != http.StatusOK {
			t.Errorf("GET %s: status %d, want 200", path, rec.Code)
		}
	}
}

func TestCreateAppliesDefaults(t *testing.T) {
	handler := newTestServer(t)

	rec := do(t, handler, http.MethodPost, "/tasks", `{"title":"Ship it"}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d, want 201: %s", rec.Code, rec.Body.String())
	}
	created := decodeInto[task.Task](t, rec)
	if created.ID == "" {
		t.Error("expected an id")
	}
	if created.Status != task.StatusTodo || created.Importance != task.ImportanceMedium {
		t.Errorf("unexpected defaults: status=%q importance=%q", created.Status, created.Importance)
	}
	if created.Version != 1 {
		t.Errorf("version = %d, want 1", created.Version)
	}
}

func TestCreateRejectsBadRequests(t *testing.T) {
	handler := newTestServer(t)

	tests := []struct {
		name string
		body string
		want int
	}{
		{"missing title", `{"title":"   "}`, http.StatusUnprocessableEntity},
		{"bad status", `{"title":"ok","status":"later"}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"title":`, http.StatusBadRequest},
		{"unknown field", `{"title":"ok","colour":"red"}`, http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, handler, http.MethodPost, "/tasks", tc.body)

			if rec.Code != tc.want {
				t.Fatalf("status %d, want %d: %s", rec.Code, tc.want, rec.Body.String())
			}
		})
	}
}

func TestCreateRejectsOversizedBody(t *testing.T) {
	handler := newTestServer(t)
	huge := `{"title":"` + strings.Repeat("a", maxBodyBytes+1) + `"}`

	rec := do(t, handler, http.MethodPost, "/tasks", huge)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status %d, want 413: %s", rec.Code, rec.Body.String())
	}
}

func TestValidationErrorNamesTheOffendingField(t *testing.T) {
	handler := newTestServer(t)

	rec := do(t, handler, http.MethodPost, "/tasks", `{"title":""}`)

	body := decodeInto[errorBody](t, rec)
	if body.Error.Code != "validation_failed" {
		t.Errorf("code = %q, want validation_failed", body.Error.Code)
	}
	if _, ok := body.Error.Fields["title"]; !ok {
		t.Errorf("expected a message for title, got %v", body.Error.Fields)
	}
}

func TestListReturnsAPage(t *testing.T) {
	handler := newTestServer(t)
	createTask(t, handler, "first")
	createTask(t, handler, "second")

	rec := do(t, handler, http.MethodGet, "/tasks", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d, want 200", rec.Code)
	}
	page := decodeInto[task.Page](t, rec)
	if page.Total != 2 || len(page.Items) != 2 {
		t.Errorf("got %d items of %d total, want 2 of 2", len(page.Items), page.Total)
	}
	if page.Page != 1 || page.Limit != task.DefaultLimit {
		t.Errorf("unexpected paging: page=%d limit=%d", page.Page, page.Limit)
	}
}

func TestListRejectsBadPaging(t *testing.T) {
	handler := newTestServer(t)

	for _, target := range []string{"/tasks?page=0", "/tasks?limit=0", "/tasks?limit=1000", "/tasks?page=abc"} {
		t.Run(target, func(t *testing.T) {
			rec := do(t, handler, http.MethodGet, target, "")

			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status %d, want 422: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestGetSingleTask(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "findable")

	rec := do(t, handler, http.MethodGet, "/tasks/"+created.ID, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d, want 200", rec.Code)
	}
	if found := decodeInto[task.Task](t, rec); found.ID != created.ID {
		t.Errorf("id = %q, want %q", found.ID, created.ID)
	}
}

func TestGetMissingTaskReturns404(t *testing.T) {
	handler := newTestServer(t)

	rec := do(t, handler, http.MethodGet, "/tasks/does-not-exist", "")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d, want 404", rec.Code)
	}
}

func TestUpdateMovesTaskAndBumpsVersion(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "movable")

	rec := do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"status":"in_progress","version":1}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d, want 200: %s", rec.Code, rec.Body.String())
	}
	updated := decodeInto[task.Task](t, rec)
	if updated.Status != task.StatusInProgress {
		t.Errorf("status = %q, want in_progress", updated.Status)
	}
	if updated.Version != 2 {
		t.Errorf("version = %d, want 2", updated.Version)
	}
}

// The end-to-end version of the concurrency rule: the second writer holding an
// old version gets 409 rather than overwriting the first.
func TestUpdateWithStaleVersionReturns409(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "contested")

	if rec := do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"status":"in_progress","version":1}`); rec.Code != http.StatusOK {
		t.Fatalf("first update should succeed, got %d", rec.Code)
	}

	rec := do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"status":"done","version":1}`)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status %d, want 409: %s", rec.Code, rec.Body.String())
	}
	if body := decodeInto[errorBody](t, rec); body.Error.Code != "version_conflict" {
		t.Errorf("code = %q, want version_conflict", body.Error.Code)
	}
}

func TestUpdateWithoutVersionIsRejected(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "needs version")

	rec := do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"status":"done"}`)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d, want 422: %s", rec.Code, rec.Body.String())
	}
}

func TestUpdateMissingTaskReturns404(t *testing.T) {
	handler := newTestServer(t)

	rec := do(t, handler, http.MethodPut, "/tasks/does-not-exist", `{"status":"done","version":1}`)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d, want 404", rec.Code)
	}
}

func TestArchiveThenRestore(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "archivable")

	archived := decodeInto[task.Task](t, do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"archived":true,"version":1}`))
	if !archived.Archived {
		t.Fatal("task should be archived")
	}

	// The board hides it, the archive shows it.
	board := decodeInto[task.Page](t, do(t, handler, http.MethodGet, "/tasks", ""))
	if board.Total != 0 {
		t.Errorf("board total = %d, want 0", board.Total)
	}
	archive := decodeInto[task.Page](t, do(t, handler, http.MethodGet, "/tasks?archived=true", ""))
	if archive.Total != 1 {
		t.Errorf("archive total = %d, want 1", archive.Total)
	}

	restored := decodeInto[task.Task](t, do(t, handler, http.MethodPut, "/tasks/"+created.ID, `{"archived":false,"version":2}`))
	if restored.Archived {
		t.Error("task should be back on the board")
	}
}

func TestDeleteRemovesTask(t *testing.T) {
	handler := newTestServer(t)
	created := createTask(t, handler, "deletable")

	rec := do(t, handler, http.MethodDelete, "/tasks/"+created.ID, "")

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status %d, want 204", rec.Code)
	}
	if follow := do(t, handler, http.MethodGet, "/tasks/"+created.ID, ""); follow.Code != http.StatusNotFound {
		t.Errorf("task should be gone, got %d", follow.Code)
	}
}

func TestCORSEchoesConfiguredOriginOnly(t *testing.T) {
	handler := newTestServer(t)

	allowed := httptest.NewRequest(http.MethodOptions, "/tasks", nil)
	allowed.Header.Set("Origin", "http://localhost:5173")
	allowedRec := httptest.NewRecorder()
	handler.ServeHTTP(allowedRec, allowed)

	if allowedRec.Code != http.StatusNoContent {
		t.Errorf("preflight status %d, want 204", allowedRec.Code)
	}
	if got := allowedRec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("allow-origin = %q, want the configured origin", got)
	}

	denied := httptest.NewRequest(http.MethodGet, "/tasks", nil)
	denied.Header.Set("Origin", "https://evil.example")
	deniedRec := httptest.NewRecorder()
	handler.ServeHTTP(deniedRec, denied)

	if got := deniedRec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("an unconfigured origin should not be echoed, got %q", got)
	}
}

func TestResponsesAreJSON(t *testing.T) {
	handler := newTestServer(t)

	rec := do(t, handler, http.MethodGet, "/tasks", "")

	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("content-type = %q, want JSON", ct)
	}
}

// Guards the wire contract the web client reads: these keys and spellings are
// what the UI destructures, so renaming one is a breaking change.
func TestTaskJSONShape(t *testing.T) {
	handler := newTestServer(t)
	createTask(t, handler, "shape")

	rec := do(t, handler, http.MethodGet, "/tasks", "")

	var raw struct {
		Items []map[string]json.RawMessage `json:"items"`
		Page  json.RawMessage              `json:"page"`
		Limit json.RawMessage              `json:"limit"`
		Total json.RawMessage              `json:"total"`
	}
	if err := json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&raw); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(raw.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(raw.Items))
	}

	for _, key := range []string{"id", "title", "description", "status", "importance", "archived", "version", "created_at", "updated_at"} {
		if _, ok := raw.Items[0][key]; !ok {
			t.Errorf("task json is missing %q", key)
		}
	}
}
