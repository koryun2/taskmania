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
			name: "private Railway has no TLS",
			in:   "postgresql://u:p@postgres.railway.internal:5432/railway",
			want: "postgresql://u:p@postgres.railway.internal:5432/railway?sslmode=disable",
		},
		{
			name: "local Postgres has no TLS",
			in:   "postgres://u:p@localhost:5432/db",
			want: "postgres://u:p@localhost:5432/db?sslmode=disable",
		},
		{
			name: "public Postgres requires TLS",
			in:   "postgres://u:p@proxy.rlwy.net:5432/railway",
			want: "postgres://u:p@proxy.rlwy.net:5432/railway?sslmode=require",
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
