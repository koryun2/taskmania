package store

import "testing"

func TestPostgresDSN(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "keeps an explicit mode",
			in:   "postgres://u:p@host:5432/db?sslmode=disable",
			want: "postgres://u:p@host:5432/db?sslmode=disable",
		},
		{
			name: "local Postgres has no TLS",
			in:   "postgres://u:p@localhost:5432/db",
			want: "postgres://u:p@localhost:5432/db?sslmode=disable",
		},
		{
			name: "remote Postgres requires TLS",
			in:   "postgres://u:p@db.example.com:5432/app",
			want: "postgres://u:p@db.example.com:5432/app?sslmode=require",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := postgresDSN(tt.in); got != tt.want {
				t.Fatalf("postgresDSN(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}
