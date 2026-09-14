// Package config reads runtime settings from the environment.
package config

import (
	"os"
	"strings"
)

// Config is everything the server needs to start. The defaults are chosen so
// `go run ./cmd/server` works with no environment set at all.
type Config struct {
	Port        string
	DatabaseURL string
	CORSOrigins []string
	LogJSON     bool
}

func Load() Config {
	return Config{
		Port:        env("PORT", "8080"),
		DatabaseURL: env("DATABASE_URL", ""),
		CORSOrigins: splitOrigins(env("CORS_ORIGINS", "http://localhost:5173")),
		LogJSON:     env("LOG_JSON", "") == "true",
	}
}

func (c Config) Addr() string { return ":" + c.Port }

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
