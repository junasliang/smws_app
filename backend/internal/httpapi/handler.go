package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"smws-api/internal/repository"
	"smws-api/internal/service"
)

type Handler struct {
	whiskies *service.WhiskyService
}

func NewHandler(whiskies *service.WhiskyService) *Handler {
	return &Handler{whiskies: whiskies}
}

func (h *Handler) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", h.health)
	mux.HandleFunc("GET /api/v1/whiskies/search", h.searchWhiskies)
	mux.HandleFunc("GET /api/v1/whiskies/{cask_no}", h.getWhisky)
	return loggingMiddleware(mux)
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) searchWhiskies(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeError(w, http.StatusBadRequest, "q is required")
		return
	}
	if len([]rune(q)) > 120 {
		writeError(w, http.StatusBadRequest, "q must be at most 120 characters")
		return
	}

	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 50 {
			writeError(w, http.StatusBadRequest, "limit must be between 1 and 50")
			return
		}
		limit = parsed
	}

	result, err := h.whiskies.Search(r.Context(), q, limit)
	if err != nil {
		log.Printf("search whiskies: %v", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) getWhisky(w http.ResponseWriter, r *http.Request) {
	caskNo := strings.TrimSpace(r.PathValue("cask_no"))
	if caskNo == "" {
		writeError(w, http.StatusBadRequest, "cask_no is required")
		return
	}

	item, err := h.whiskies.GetByCaskNo(r.Context(), caskNo)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Whisky not found")
		return
	}
	if err != nil {
		log.Printf("get whisky: %v", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, map[string]string{"detail": detail})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(started))
	})
}
