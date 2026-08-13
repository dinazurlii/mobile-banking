package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// InitDB opens a connection pool to the PostgreSQL database using environment variables or fallback defaults.
// Educational note: A connection pool manages open connections to the database for concurrent web requests.
func InitDB(connStr string) (*sql.DB, error) {
	if connStr == "" {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "asani")
		password := getEnv("DB_PASSWORD", "")
		dbname := getEnv("DB_NAME", "simplebank_db")
		sslmode := getEnv("DB_SSLMODE", "disable")

		if password != "" {
			connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", host, port, user, password, dbname, sslmode)
		} else {
			connStr = fmt.Sprintf("host=%s port=%s user=%s dbname=%s sslmode=%s", host, port, user, dbname, sslmode)
		}
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure pool parameters to prevent resource exhaustion
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(15 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("[Database] Successfully connected to PostgreSQL")
	return db, nil
}

// RunMigrations applies SQL migration scripts to set up database tables and indexes.
func RunMigrations(db *sql.DB, migrationFilePath string) error {
	content, err := os.ReadFile(migrationFilePath)
	if err != nil {
		return fmt.Errorf("failed to read migration file %s: %w", migrationFilePath, err)
	}

	// Execute migration queries as a single batch execution
	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("failed to execute migration script: %w", err)
	}

	log.Println("[Database] Database migrations applied successfully")
	return nil
}

// RunSeeds populates initial database reference data and default test accounts.
func RunSeeds(db *sql.DB, seedFilePath string) error {
	content, err := os.ReadFile(seedFilePath)
	if err != nil {
		return fmt.Errorf("failed to read seed file %s: %w", seedFilePath, err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("failed to execute seed script: %w", err)
	}

	// Seed demo users if they do not exist
	if err := seedDemoUsers(db); err != nil {
		return fmt.Errorf("failed to seed demo users: %w", err)
	}

	log.Println("[Database] Database seed data populated successfully")
	return nil
}

// seedDemoUsers creates 3 demo accounts with realistic balances for immediate testing.
func seedDemoUsers(db *sql.DB) error {
	// Password: Password123!
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// PIN: 123456
	pinHash, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	type demoUser struct {
		FullName    string
		Email       string
		Phone       string
		DOB         string
		Address     string
		AccNumber   string
		InitBalance float64
	}

	demoUsers := []demoUser{
		{
			FullName:    "Budi Santoso",
			Email:       "budi@simplebank.com",
			Phone:       "081234567890",
			DOB:         "1992-05-15",
			Address:     "Jl. Sudirman No. 45, Jakarta",
			AccNumber:   "1000888001",
			InitBalance: 10000000.00, // Rp 10.000.000
		},
		{
			FullName:    "Andi Wijaya",
			Email:       "andi@simplebank.com",
			Phone:       "081987654321",
			DOB:         "1995-08-20",
			Address:     "Jl. Gajah Mada No. 12, Bandung",
			AccNumber:   "1000888002",
			InitBalance: 5000000.00, // Rp 5.000.000
		},
		{
			FullName:    "Siti Rahma",
			Email:       "siti@simplebank.com",
			Phone:       "081555666777",
			DOB:         "1998-11-10",
			Address:     "Jl. Pemuda No. 88, Surabaya",
			AccNumber:   "1000888003",
			InitBalance: 2500000.00, // Rp 2.500.000
		},
	}

	for _, u := range demoUsers {
		var userID string
		// Insert User if not exists
		err := db.QueryRow(`
			INSERT INTO users (full_name, email, phone_number, password_hash, pin_hash, date_of_birth, address)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
			RETURNING id
		`, u.FullName, u.Email, u.Phone, string(passwordHash), string(pinHash), u.DOB, u.Address).Scan(&userID)
		if err != nil {
			return fmt.Errorf("failed to insert demo user %s: %w", u.Email, err)
		}

		// Insert Saving Account if not exists
		_, err = db.Exec(`
			INSERT INTO saving_accounts (user_id, account_number, account_type, balance, currency, status)
			VALUES ($1, $2, 'SAVINGS', $3, 'IDR', 'ACTIVE')
			ON CONFLICT (account_number) DO NOTHING
		`, userID, u.AccNumber, u.InitBalance)
		if err != nil {
			return fmt.Errorf("failed to insert saving account for user %s: %w", u.Email, err)
		}
	}

	// Seed some favorite accounts for Budi (User 1)
	var budiID string
	err = db.QueryRow(`SELECT id FROM users WHERE email = 'budi@simplebank.com'`).Scan(&budiID)
	if err == nil && budiID != "" {
		_, _ = db.Exec(`
			INSERT INTO favorite_accounts (user_id, account_number, alias_name)
			VALUES ($1, '1000888002', 'Andi Wijaya'), ($1, '1000888003', 'Siti Rahma')
			ON CONFLICT (user_id, account_number) DO NOTHING
		`, budiID)
	}

	return nil
}

// WithTx executes a database function inside an explicit SQL transaction block.
// Educational note: Financial operations MUST run inside transactions.
// If fn returns an error, tx.Rollback() undoes all intermediate writes.
// If fn completes without error, tx.Commit() persists all writes atomically.
func WithTx(ctx context.Context, db *sql.DB, fn func(tx *sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return fmt.Errorf("failed to begin database transaction: %w", err)
	}

	// Defer rollback to recover from panics or early error returns.
	// If tx has already been committed, Rollback() returns sql.ErrTxDone and is safely ignored.
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p) // Re-throw panic after rollback
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil && rbErr != sql.ErrTxDone {
			return fmt.Errorf("transaction error: %v, rollback error: %w", err, rbErr)
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func getEnv(key, fallback string) string {
	if val := strings.TrimSpace(os.Getenv(key)); val != "" {
		return val
	}
	return fallback
}
