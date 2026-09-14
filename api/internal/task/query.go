package task

import "fmt"

const (
	DefaultLimit = 20
	MaxLimit     = 100
)

// Query describes one page of the board.
//
// Archived and OpenOnly are separate switches because the client asks two
// different questions: the archive wants archived rows whatever their status,
// while the dashboard wants unarchived rows that are not finished yet.
type Query struct {
	Status     Status
	Importance Importance
	Archived   bool
	OpenOnly   bool
	Page       int
	Limit      int
}

// Normalize fills in defaults and rejects values that are out of range.
//
// Zero means "not supplied" here, so a caller that can distinguish an absent
// parameter from an explicit zero must reject the zero before calling this.
func (q *Query) Normalize() error {
	if q.Page == 0 {
		q.Page = 1
	}
	if q.Limit == 0 {
		q.Limit = DefaultLimit
	}

	invalid := newValidationError()
	if q.Page < 1 {
		invalid.add("page", "Page must be 1 or greater.")
	}
	if q.Limit < 1 || q.Limit > MaxLimit {
		invalid.add("limit", fmt.Sprintf("Limit must be between 1 and %d.", MaxLimit))
	}
	if q.Status != "" && !q.Status.Valid() {
		invalid.add("status", "Status must be todo, in_progress, or done.")
	}
	if q.Importance != "" && !q.Importance.Valid() {
		invalid.add("importance", "Importance must be low, medium, or high.")
	}
	return invalid.orNil()
}

func (q Query) Offset() int {
	return (q.Page - 1) * q.Limit
}

// Page is a slice of the board plus the totals the client needs to draw a pager.
type Page struct {
	Items []Task `json:"items"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
	Total int    `json:"total"`
}
