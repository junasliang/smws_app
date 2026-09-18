package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"smws-api/internal/config"
	"smws-api/internal/httpapi"
	"smws-api/internal/repository"
	"smws-api/internal/service"
)

func main() {
	cfg := config.Load()

	startupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := repository.OpenReadOnly(startupCtx, cfg.DBPath)
	if err != nil {
		log.Fatalf("database startup failed: %v", err)
	}
	defer db.Close()

	repo := repository.NewWhiskyRepository(db)
	whiskyService := service.NewWhiskyService(repo)
	handler := httpapi.NewHandler(whiskyService)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler.Router(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("SMWS API listening on port %s, database=%s", cfg.Port, cfg.DBPath)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
