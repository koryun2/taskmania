// Package httpapi exposes the task board over HTTP as JSON.
package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/koryun2/taskmania/internal/store"
	"github.com/koryun2/taskmania/internal/task"
)

// maxBodyBytes caps request bodies. Task payloads are small, so anything bigger
// is a mistake or an attack; either way, rejecting beats buffering.
const maxBodyBytes = 64 << 10

// Server carries what the handlers need. now is injectable so tests can make
// assertions about timestamps.
type Server struct {
	tasks   *store.Tasks
	db      *store.DB
	log     *slog.Logger
	now     func() time.Time
	origins []string
}

// New builds the router with CORS, request logging, and panic recovery applied.
func New(db *store.DB, log *slog.Logger, origins []string) http.Handler {
	s := &Server{
		tasks:   store.NewTasks(db),
		db:      db,
		log:     log,
		now:     func() time.Time { return time.Now().UTC() },
		origins: origins,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /ready", s.ready)
	mux.HandleFunc("GET /tasks", s.list)
	mux.HandleFunc("POST /tasks", s.create)
	mux.HandleFunc("GET /tasks/{id}", s.get)
	mux.HandleFunc("PUT /tasks/{id}", s.update)
	mux.HandleFunc("DELETE /tasks/{id}", s.remove)

	// Recovery is outermost so it also covers the logging and CORS layers.
	return s.recoverPanic(s.logRequests(s.cors(mux)))
}

// ---------- handlers ----------

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ready reports whether the database answers, which is what separates it from
// health: health says the process is alive, ready says it can serve traffic.
func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.db.Ping(ctx); err != nil {
		s.fail(w, http.StatusServiceUnavailable, "database_unavailable", "The database is not reachable.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) list(w http.ResponseWriter, r *http.Request) {
	query, err := parseQuery(r)
	if err != nil {
		s.respondErr(w, r, err)
		return
	}
	if err := query.Normalize(); err != nil {
		s.respondErr(w, r, err)
		return
	}

	page, err := s.tasks.List(r.Context(), query)
	if err != nil {
		s.respondErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) get(w http.ResponseWriter, r *http.Request) {
	found, err := s.tasks.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		s.respondErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, found)
}

func (s *Server) create(w http.ResponseWriter, r *http.Request) {
	var in task.CreateInput
	if err := decode(w, r, &in); err != nil {
		s.respondErr(w, r, err)
		return
	}
	if err := in.Normalize(); err != nil {
		s.respondErr(w, r, err)
		return
	}

	now := s.now()
	created := task.Task{
		ID:          uuid.NewString(),
		Title:       in.Title,
		Description: in.Description,
		Status:      in.Status,
		Importance:  in.Importance,
		Archived:    false,
		Version:     1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.tasks.Create(r.Context(), created); err != nil {
		s.respondErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *Server) update(w http.ResponseWriter, r *http.Request) {
	var in task.UpdateInput
	if err := decode(w, r, &in); err != nil {
		s.respondErr(w, r, err)
		return
	}
	if err := in.Normalize(); err != nil {
		s.respondErr(w, r, err)
		return
	}

	updated, err := s.tasks.Update(r.Context(), r.PathValue("id"), in, s.now())
	if err != nil {
		s.respondErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) remove(w http.ResponseWriter, r *http.Request) {
	if err := s.tasks.Delete(r.Context(), r.PathValue("id")); err != nil {
		s.respondErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- request parsing ----------

func parseQuery(r *http.Request) (task.Query, error) {
	raw := r.URL.Query()
	q := task.Query{
		Status:     task.Status(raw.Get("status")),
		Importance: task.Importance(raw.Get("importance")),
		Archived:   raw.Get("archived") == "true",
		OpenOnly:   raw.Get("open") == "true",
	}

	// task.Query reads zero as "not supplied" and swaps in a default, so an
	// explicit page=0 or limit=0 has to be caught here, where an absent
	// parameter is still distinguishable from a zero one.
	invalid := map[string]string{}
	if page := raw.Get("page"); page != "" {
		n, err := strconv.Atoi(page)
		switch {
		case err != nil:
			invalid["page"] = "Page must be a whole number."
		case n < 1:
			invalid["page"] = "Page must be 1 or greater."
		default:
			q.Page = n
		}
	}
	if limit := raw.Get("limit"); limit != "" {
		n, err := strconv.Atoi(limit)
		switch {
		case err != nil:
			invalid["limit"] = "Limit must be a whole number."
		case n < 1:
			invalid["limit"] = fmt.Sprintf("Limit must be between 1 and %d.", task.MaxLimit)
		default:
			q.Limit = n
		}
	}
	if len(invalid) > 0 {
		return task.Query{}, &task.ValidationError{Fields: invalid}
	}
	return q, nil
}

// decode reads a JSON body under the size cap, separating an oversized body
// from malformed JSON so the client gets an accurate status.
func decode(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return errTooLarge
		}
		return fmt.Errorf("%w: %s", errBadJSON, err)
	}
	return nil
}

// ---------- errors ----------

var (
	errBadJSON  = errors.New("malformed json")
	errTooLarge = errors.New("body too large")
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// respondErr maps a domain or transport error to the status and code the client
// expects. Anything unrecognised becomes a 500 and is logged, never echoed back.
func (s *Server) respondErr(w http.ResponseWriter, r *http.Request, err error) {
	var invalid *task.ValidationError

	switch {
	case errors.As(err, &invalid):
		s.fail(w, http.StatusUnprocessableEntity, "validation_failed", "Some fields need attention.", invalid.Fields)
	case errors.Is(err, task.ErrNotFound):
		s.fail(w, http.StatusNotFound, "not_found", "That task no longer exists.", nil)
	case errors.Is(err, task.ErrConflict):
		s.fail(w, http.StatusConflict, "version_conflict", "This task changed somewhere else. Refresh to get the latest version.", nil)
	case errors.Is(err, errTooLarge):
		s.fail(w, http.StatusRequestEntityTooLarge, "payload_too_large", "That request body is too large.", nil)
	case errors.Is(err, errBadJSON):
		s.fail(w, http.StatusBadRequest, "invalid_json", "The request body is not valid JSON.", nil)
	default:
		s.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "err", err)
		s.fail(w, http.StatusInternalServerError, "internal_error", "Something went wrong on our side.", nil)
	}
}

func (s *Server) fail(w http.ResponseWriter, status int, code, message string, fields map[string]string) {
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message, Fields: fields}})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	// The status line is already on the wire, so a failure here cannot change
	// the response; the request log still records what was sent.
	_ = json.NewEncoder(w).Encode(payload)
}

// ---------- middleware ----------

// cors answers preflights and echoes back only origins that were configured, so
// a wildcard cannot leak into a deployment by accident.
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowed := s.allowOrigin(r.Header.Get("Origin")); allowed != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowed)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.Header().Add("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) allowOrigin(origin string) string {
	if origin == "" {
		return ""
	}
	for _, candidate := range s.origins {
		if candidate == "*" {
			return "*"
		}
		if strings.EqualFold(candidate, origin) {
			return candidate
		}
	}
	return ""
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(recorder, r)

		s.log.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"duration", time.Since(started).String(),
		)
	})
}

// recoverPanic stops one bad request from taking the whole process down.
func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				s.log.Error("panic", "method", r.Method, "path", r.URL.Path, "panic", recovered)
				writeJSON(w, http.StatusInternalServerError, errorBody{
					Error: errorDetail{Code: "internal_error", Message: "Something went wrong on our side."},
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// statusRecorder remembers the status so the log line can report it.
type statusRecorder struct {
	http.ResponseWriter
	status  int
	written bool
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.written {
		return
	}
	r.status = status
	r.written = true
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	r.written = true
	return r.ResponseWriter.Write(b)
}
