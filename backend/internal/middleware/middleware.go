package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/cors"
)

// ResponseRecorder wraps http.ResponseWriter to capture status codes for logging.
type ResponseRecorder struct {
	http.ResponseWriter
	StatusCode int
}

func (r *ResponseRecorder) WriteHeader(statusCode int) {
	r.StatusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

// LoggerMiddleware logs basic HTTP request metrics safely without exposing sensitive body fields.
func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &ResponseRecorder{ResponseWriter: w, StatusCode: http.StatusOK}

		next.ServeHTTP(rec, r)

		duration := time.Since(start)
		log.Printf("[HTTP] %s %s | Status: %d | Duration: %v | IP: %s",
			r.Method, r.URL.Path, rec.StatusCode, duration, r.RemoteAddr)
	})
}

// SetupCORS configures permissive Cross-Origin Resource Sharing settings for local development.
func SetupCORS() func(next http.Handler) http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	return c.Handler
}
