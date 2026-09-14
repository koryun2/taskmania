// Package task holds the domain: what a task is, which values are legal, and
// how incoming payloads are validated. It deliberately knows nothing about SQL
// or HTTP so the rules can be tested on their own.
package task

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

type Status string

const (
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
)

// Importance drives the board ordering.
type Importance string

const (
	ImportanceLow    Importance = "low"
	ImportanceMedium Importance = "medium"
	ImportanceHigh   Importance = "high"
)

const (
	MaxTitleLen       = 200
	MaxDescriptionLen = 2000
)

var (
	// ErrNotFound means no task with the given id exists.
	ErrNotFound = errors.New("task not found")

	// ErrConflict means the caller's version no longer matches the stored row,
	// so another writer updated the task first.
	ErrConflict = errors.New("task version conflict")
)

// Task is one item on the board. The json tags are the contract the web client
// depends on, which is why they are snake_case rather than Go-style.
type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      Status     `json:"status"`
	Importance  Importance `json:"importance"`
	Archived    bool       `json:"archived"`
	Version     int64      `json:"version"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (s Status) Valid() bool {
	switch s {
	case StatusTodo, StatusInProgress, StatusDone:
		return true
	}
	return false
}

func (i Importance) Valid() bool {
	switch i {
	case ImportanceLow, ImportanceMedium, ImportanceHigh:
		return true
	}
	return false
}

// ValidationError carries one message per rejected field so the client can show
// errors next to the inputs that caused them.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string {
	names := make([]string, 0, len(e.Fields))
	for name := range e.Fields {
		names = append(names, name)
	}
	sort.Strings(names) // deterministic message, which keeps tests stable
	return fmt.Sprintf("invalid fields: %s", strings.Join(names, ", "))
}

func newValidationError() *ValidationError {
	return &ValidationError{Fields: map[string]string{}}
}

func (e *ValidationError) add(field, message string) {
	e.Fields[field] = message
}

// orNil keeps callers from having to check emptiness themselves.
func (e *ValidationError) orNil() error {
	if len(e.Fields) == 0 {
		return nil
	}
	return e
}

func checkTitle(invalid *ValidationError, title string) {
	switch {
	case title == "":
		invalid.add("title", "Title is required.")
	case utf8.RuneCountInString(title) > MaxTitleLen:
		invalid.add("title", fmt.Sprintf("Title must be %d characters or fewer.", MaxTitleLen))
	}
}

func checkDescription(invalid *ValidationError, description string) {
	if utf8.RuneCountInString(description) > MaxDescriptionLen {
		invalid.add("description", fmt.Sprintf("Description must be %d characters or fewer.", MaxDescriptionLen))
	}
}

// CreateInput is the body of POST /tasks.
type CreateInput struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      Status     `json:"status"`
	Importance  Importance `json:"importance"`
}

// Normalize trims text, applies defaults, then reports what is still wrong. It
// mutates the receiver so the caller goes on to work with clean values.
func (in *CreateInput) Normalize() error {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	if in.Status == "" {
		in.Status = StatusTodo
	}
	if in.Importance == "" {
		in.Importance = ImportanceMedium
	}

	invalid := newValidationError()
	checkTitle(invalid, in.Title)
	checkDescription(invalid, in.Description)
	if !in.Status.Valid() {
		invalid.add("status", "Status must be todo, in_progress, or done.")
	}
	if !in.Importance.Valid() {
		invalid.add("importance", "Importance must be low, medium, or high.")
	}
	return invalid.orNil()
}

// UpdateInput is the body of PUT /tasks/{id}. Content fields are pointers so a
// caller can change one thing without resending the rest, but Version is
// mandatory: it is what makes the write safe against a concurrent update.
type UpdateInput struct {
	Title       *string     `json:"title"`
	Description *string     `json:"description"`
	Status      *Status     `json:"status"`
	Importance  *Importance `json:"importance"`
	Archived    *bool       `json:"archived"`
	Version     int64       `json:"version"`
}

func (in *UpdateInput) Normalize() error {
	invalid := newValidationError()

	if in.Version <= 0 {
		invalid.add("version", "Version is required.")
	}
	if in.Title != nil {
		trimmed := strings.TrimSpace(*in.Title)
		in.Title = &trimmed
		checkTitle(invalid, trimmed)
	}
	if in.Description != nil {
		trimmed := strings.TrimSpace(*in.Description)
		in.Description = &trimmed
		checkDescription(invalid, trimmed)
	}
	if in.Status != nil && !in.Status.Valid() {
		invalid.add("status", "Status must be todo, in_progress, or done.")
	}
	if in.Importance != nil && !in.Importance.Valid() {
		invalid.add("importance", "Importance must be low, medium, or high.")
	}
	return invalid.orNil()
}

// Apply merges the requested changes onto a copy of the stored task.
func (in UpdateInput) Apply(current Task) Task {
	next := current
	if in.Title != nil {
		next.Title = *in.Title
	}
	if in.Description != nil {
		next.Description = *in.Description
	}
	if in.Status != nil {
		next.Status = *in.Status
	}
	if in.Importance != nil {
		next.Importance = *in.Importance
	}
	if in.Archived != nil {
		next.Archived = *in.Archived
	}
	return next
}
