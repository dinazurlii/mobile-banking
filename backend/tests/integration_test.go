package tests

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"simplebank/internal/auth"
	"simplebank/internal/database"
)

func getTestDB(t *testing.T) *sql.DB {
	connStr := os.Getenv("TEST_DB_CONN")
	if connStr == "" {
		connStr = "host=localhost port=5432 user=asani dbname=simplebank_test_db sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Skipf("Skipping integration test: cannot open database connection: %v", err)
		return nil
	}

	if err := db.Ping(); err != nil {
		t.Skipf("Skipping integration test: database ping failed: %v", err)
		return nil
	}

	return db
}

// TestEndToEndBankingFlow runs comprehensive database integration tests for SimpleBank core workflows.
func TestEndToEndBankingFlow(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	// Apply migrations
	migErr := database.RunMigrations(db, "../migrations/001_create_tables.sql")
	if migErr != nil {
		t.Fatalf("Migration failed: %v", migErr)
	}

	// Apply seeds
	seedErr := database.RunSeeds(db, "../seeds/001_seed_data.sql")
	if seedErr != nil {
		t.Fatalf("Seed failed: %v", seedErr)
	}

	ctx := context.Background()

	// 1. Verify Demo User 1 (Budi) & Demo User 2 (Andi) exist
	var budiID, budiAccNum string
	var budiBalance float64
	err := db.QueryRowContext(ctx, `
		SELECT u.id, sa.account_number, sa.balance
		FROM users u
		JOIN saving_accounts sa ON sa.user_id = u.id
		WHERE u.email = 'budi@simplebank.com'
	`).Scan(&budiID, &budiAccNum, &budiBalance)
	if err != nil {
		t.Fatalf("Failed to query Budi's account: %v", err)
	}

	var andiID, andiAccNum string
	var andiBalance float64
	err = db.QueryRowContext(ctx, `
		SELECT u.id, sa.account_number, sa.balance
		FROM users u
		JOIN saving_accounts sa ON sa.user_id = u.id
		WHERE u.email = 'andi@simplebank.com'
	`).Scan(&andiID, &andiAccNum, &andiBalance)
	if err != nil {
		t.Fatalf("Failed to query Andi's account: %v", err)
	}

	if budiBalance < 100000.00 {
		t.Fatalf("Expected Budi to have at least 100,000 IDR balance, got %.2f", budiBalance)
	}

	// 2. Perform Atomic Internal Transfer from Budi -> Andi (Amount: Rp 100,000)
	transferAmount := 100000.00
	refNum := fmt.Sprintf("TEST-TRX-%d", time.Now().UnixNano())

	err = database.WithTx(ctx, db, func(tx *sql.Tx) error {
		// Debit Budi
		res, err := tx.ExecContext(ctx, "UPDATE saving_accounts SET balance = balance - $1 WHERE id = (SELECT id FROM saving_accounts WHERE account_number = $2)", transferAmount, budiAccNum)
		if err != nil {
			return err
		}
		rows, _ := res.RowsAffected()
		if rows == 0 {
			return fmt.Errorf("debit failed")
		}

		// Credit Andi
		_, err = tx.ExecContext(ctx, "UPDATE saving_accounts SET balance = balance + $1 WHERE id = (SELECT id FROM saving_accounts WHERE account_number = $2)", transferAmount, andiAccNum)
		if err != nil {
			return err
		}

		// Insert Transaction History
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_history (reference_number, user_id, transaction_type, amount, status, description)
			VALUES ($1, $2, 'TRANSFER', $3, 'SUCCESS', 'Integration test transfer')
		`, refNum, budiID, transferAmount)
		return err
	})

	if err != nil {
		t.Fatalf("Internal transfer transaction failed: %v", err)
	}

	// 3. Verify Updated Balances
	var newBudiBalance, newAndiBalance float64
	_ = db.QueryRowContext(ctx, "SELECT balance FROM saving_accounts WHERE account_number = $1", budiAccNum).Scan(&newBudiBalance)
	_ = db.QueryRowContext(ctx, "SELECT balance FROM saving_accounts WHERE account_number = $1", andiAccNum).Scan(&newAndiBalance)

	if newBudiBalance != (budiBalance - transferAmount) {
		t.Errorf("Expected Budi balance %.2f, got %.2f", budiBalance-transferAmount, newBudiBalance)
	}

	if newAndiBalance != (andiBalance + transferAmount) {
		t.Errorf("Expected Andi balance %.2f, got %.2f", andiBalance+transferAmount, newAndiBalance)
	}

	// 4. Verify Ledger Record Created
	var ledgerStatus string
	err = db.QueryRowContext(ctx, "SELECT status FROM transaction_history WHERE reference_number = $1", refNum).Scan(&ledgerStatus)
	if err != nil || ledgerStatus != "SUCCESS" {
		t.Errorf("Expected transaction history ledger status SUCCESS, got %s (err: %v)", ledgerStatus, err)
	}
}

// TestPINVerification verifies PIN hashing and validation in database queries.
func TestPINVerification(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	var pinHash string
	err := db.QueryRow("SELECT pin_hash FROM users WHERE email = 'budi@simplebank.com'").Scan(&pinHash)
	if err != nil {
		t.Fatalf("Failed to fetch demo user PIN hash: %v", err)
	}

	if !auth.CheckPINHash("123456", pinHash) {
		t.Fatalf("Valid PIN check failed for demo user Budi!")
	}
}
