package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"

	"simplebank/internal/account"
	"simplebank/internal/auth"
	"simplebank/internal/database"
	"simplebank/internal/dev"
	"simplebank/internal/favorite"
	"simplebank/internal/middleware"
	"simplebank/internal/response"
	"simplebank/internal/simulator"
	"simplebank/internal/topup"
	"simplebank/internal/transaction"
	"simplebank/internal/transfer"
	"simplebank/internal/user"
)

func main() {
	// 1. Load Environment Variables from .env file if available
	_ = godotenv.Load()

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "asani")
	dbPass := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "simplebank_db")
	dbSSL := getEnv("DB_SSLMODE", "disable")
	port := getEnv("PORT", "8080")

	connStr := "host=" + dbHost + " port=" + dbPort + " user=" + dbUser + " dbname=" + dbName + " sslmode=" + dbSSL
	if dbPass != "" {
		connStr += " password=" + dbPass
	}

	// 2. Initialize Database Connection Pool
	db, err := database.InitDB(connStr)
	if err != nil {
		log.Fatalf("Fatal Database Error: %v", err)
	}
	defer db.Close()

	// 3. Execute Migrations & Seeds
	migrationPath := getEnv("MIGRATION_PATH", "migrations/001_create_tables.sql")
	seedPath := getEnv("SEED_PATH", "seeds/001_seed_data.sql")

	if _, err := os.Stat(migrationPath); err == nil {
		if err := database.RunMigrations(db, migrationPath); err != nil {
			log.Printf("Migration notice: %v", err)
		}
	} else {
		// Fallback to relative path lookup
		execDir, _ := os.Getwd()
		altPath := filepath.Join(execDir, "backend", "migrations", "001_create_tables.sql")
		if _, err := os.Stat(altPath); err == nil {
			_ = database.RunMigrations(db, altPath)
		}
	}

	if _, err := os.Stat(seedPath); err == nil {
		if err := database.RunSeeds(db, seedPath); err != nil {
			log.Printf("Seed notice: %v", err)
		}
	}

	// 4. Initialize Handlers
	userHandler := user.NewHandler(db)
	accHandler := account.NewHandler(db)
	txHandler := transaction.NewHandler(db)
	transferHandler := transfer.NewHandler(db)
	topupHandler := topup.NewHandler(db)
	favHandler := favorite.NewHandler(db)
	devHandler := dev.NewHandler(db)
	simHandler := simulator.NewHandler(db)

	// 5. Setup Chi HTTP Router
	r := chi.NewRouter()

	r.Use(middleware.LoggerMiddleware)
	r.Use(middleware.SetupCORS())

	// Healthcheck endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.Success(w, "SimpleBank API is healthy", map[string]string{
			"status": "UP",
			"env":    getEnv("APP_ENV", "development"),
		})
	})

	// API Version 1 Routes
	r.Route("/api/v1", func(r chi.Router) {

		// Public Auth Endpoints
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", userHandler.Register)
			r.Post("/login", userHandler.Login)

			// Protected Auth Endpoint
			r.With(auth.RequireAuth).Get("/me", userHandler.Me)
		})

		// Protected E-Wallet Public Providers Endpoint
		r.Get("/ewallet/providers", topupHandler.GetProviders)
		r.Get("/simulator/scenarios", simHandler.ListScenarios)

		// Authenticated Routes Group
		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth)

			// Accounts
			r.Get("/accounts", accHandler.GetUserAccounts)
			r.Get("/accounts/{id}", accHandler.GetAccountByID)
			r.Get("/accounts/{id}/balance", accHandler.GetBalance)

			// Transactions & History
			r.Get("/transactions", txHandler.GetTransactions)
			r.Get("/transactions/export", txHandler.ExportCSV)
			r.Get("/transactions/{id}", txHandler.GetTransactionByID)

			// Transfer
			r.Post("/transfers", transferHandler.PerformTransfer)
			r.Get("/transfers/{id}", transferHandler.GetTransferByID)

			// E-Wallet Top Up
			r.Post("/ewallet/topups", topupHandler.PerformTopUp)
			r.Get("/ewallet/topups/{id}", topupHandler.GetTopUpByID)

			// Favorites
			r.Get("/favorites", favHandler.ListFavorites)
			r.Post("/favorites", favHandler.AddFavorite)
			r.Put("/favorites/{id}", favHandler.UpdateFavorite)
			r.Delete("/favorites/{id}", favHandler.DeleteFavorite)

			// Simulator Admin / Manager
			r.Put("/simulator/scenarios/{id}", simHandler.SetDefaultScenario)

			// Development Tools
			r.Post("/dev/balance-topup", devHandler.DevTopUpBalance)
		})
	})

	log.Printf("[SimpleBank Backend] Listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
