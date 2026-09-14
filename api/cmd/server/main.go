// Command server runs the Taskmania HTTP API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/koryun2/taskmania/internal/config"
	"github.com/koryun2/taskmania/internal/httpapi"
	"github.com/koryun2/taskmania/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load()
	log := newLogger(cfg.LogJSON)

	// Signals cancel this context, which is what starts the shutdown below.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	startupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	db, err := store.Open(startupCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	log.Info("database ready", "driver", db.Driver)

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           httpapi.New(db, log, cfg.CORSOrigins),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// ListenAndServe blocks, so it runs on its own goroutine and reports back
	// through this channel.
	failed := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", server.Addr, "cors", cfg.CORSOrigins)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			failed <- err
			return
		}
		failed <- nil
	}()

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
		log.Info("shutting down")
	}

	// A fresh context: the one above is already cancelled, and in-flight
	// requests still need a window to finish.
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	log.Info("stopped cleanly")
	return nil
}

// newLogger picks text for humans locally and JSON where logs get collected.
func newLogger(asJSON bool) *slog.Logger {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	if asJSON {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}
