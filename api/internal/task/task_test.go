package task

import (
	"errors"
	"strings"
	"testing"
)

func TestCreateInputAppliesDefaultsAndTrims(t *testing.T) {
	in := CreateInput{Title: "  Ship the board  ", Description: "  with tests  "}

	if err := in.Normalize(); err != nil {
		t.Fatalf("expected valid input, got %v", err)
	}
	if in.Title != "Ship the board" {
		t.Errorf("title not trimmed: %q", in.Title)
	}
	if in.Description != "with tests" {
		t.Errorf("description not trimmed: %q", in.Description)
	}
	if in.Status != StatusTodo {
		t.Errorf("status should default to todo, got %q", in.Status)
	}
	if in.Importance != ImportanceMedium {
		t.Errorf("importance should default to medium, got %q", in.Importance)
	}
}

func TestCreateInputRejectsBadValues(t *testing.T) {
	tests := []struct {
		name  string
		in    CreateInput
		field string
	}{
		{"empty title", CreateInput{Title: "   "}, "title"},
		{"long title", CreateInput{Title: strings.Repeat("a", MaxTitleLen+1)}, "title"},
		{"long description", CreateInput{Title: "ok", Description: strings.Repeat("a", MaxDescriptionLen+1)}, "description"},
		{"bad status", CreateInput{Title: "ok", Status: Status("archived")}, "status"},
		{"bad importance", CreateInput{Title: "ok", Importance: Importance("urgent")}, "importance"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.in.Normalize()

			var invalid *ValidationError
			if !errors.As(err, &invalid) {
				t.Fatalf("expected a ValidationError, got %v", err)
			}
			if _, ok := invalid.Fields[tc.field]; !ok {
				t.Errorf("expected field %q to be rejected, got %v", tc.field, invalid.Fields)
			}
		})
	}
}

// Title length is counted in runes, so multi-byte characters must not make a
// legal title look oversized.
func TestTitleLengthCountsRunesNotBytes(t *testing.T) {
	in := CreateInput{Title: strings.Repeat("é", MaxTitleLen)}

	if err := in.Normalize(); err != nil {
		t.Fatalf("a title of exactly the limit should be accepted, got %v", err)
	}
}

func TestUpdateInputRequiresVersion(t *testing.T) {
	in := UpdateInput{}

	err := in.Normalize()

	var invalid *ValidationError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected a ValidationError, got %v", err)
	}
	if _, ok := invalid.Fields["version"]; !ok {
		t.Errorf("version should be required, got %v", invalid.Fields)
	}
}

func TestUpdateInputOnlyValidatesSuppliedFields(t *testing.T) {
	// Description is absent, so its length rule must not fire.
	title := "  Renamed  "
	in := UpdateInput{Title: &title, Version: 3}

	if err := in.Normalize(); err != nil {
		t.Fatalf("expected valid input, got %v", err)
	}
	if *in.Title != "Renamed" {
		t.Errorf("title not trimmed: %q", *in.Title)
	}
}

func TestUpdateApplyChangesOnlyWhatWasSent(t *testing.T) {
	current := Task{
		Title:       "Original",
		Description: "Original description",
		Status:      StatusTodo,
		Importance:  ImportanceLow,
		Version:     4,
	}
	status := StatusDone
	in := UpdateInput{Status: &status, Version: 4}

	next := in.Apply(current)

	if next.Status != StatusDone {
		t.Errorf("status should have changed, got %q", next.Status)
	}
	if next.Title != current.Title || next.Description != current.Description {
		t.Error("untouched fields should keep their stored values")
	}
	if next.Importance != ImportanceLow {
		t.Errorf("importance should be untouched, got %q", next.Importance)
	}
}

func TestQueryDefaultsAndOffset(t *testing.T) {
	q := Query{}

	if err := q.Normalize(); err != nil {
		t.Fatalf("an empty query should be valid, got %v", err)
	}
	if q.Page != 1 || q.Limit != DefaultLimit {
		t.Fatalf("unexpected defaults: page=%d limit=%d", q.Page, q.Limit)
	}
	if q.Offset() != 0 {
		t.Errorf("page 1 should start at offset 0, got %d", q.Offset())
	}

	q.Page = 3
	if want := 2 * DefaultLimit; q.Offset() != want {
		t.Errorf("offset = %d, want %d", q.Offset(), want)
	}
}

func TestQueryRejectsOutOfRangePaging(t *testing.T) {
	tests := []struct {
		name  string
		query Query
		field string
	}{
		{"negative page", Query{Page: -1}, "page"},
		{"limit above max", Query{Limit: MaxLimit + 1}, "limit"},
		{"negative limit", Query{Limit: -5}, "limit"},
		{"bad status", Query{Status: Status("nope")}, "status"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.query.Normalize()

			var invalid *ValidationError
			if !errors.As(err, &invalid) {
				t.Fatalf("expected a ValidationError, got %v", err)
			}
			if _, ok := invalid.Fields[tc.field]; !ok {
				t.Errorf("expected field %q to be rejected, got %v", tc.field, invalid.Fields)
			}
		})
	}
}
