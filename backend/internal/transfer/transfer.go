package transfer

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"simplebank/internal/auth"
	"simplebank/internal/database"
	"simplebank/internal/response"
	"simplebank/internal/simulator"
)

type TransferRequest struct {
	SourceAccountNumber      string  `json:"source_account_number"`
	DestinationAccountNumber string  `json:"destination_account_number"`
	Amount                   float64 `json:"amount"`
	PIN                      string  `json:"pin"`
	Description              string  `json:"description"`
	SimulatorScenario        string  `json:"simulator_scenario,omitempty"` // Optional simulator scenario override for testing
}

type TransferReceipt struct {
	ReferenceNumber          string    `json:"reference_number"`
	SourceAccountNumber      string    `json:"source_account_number"`
	DestinationAccountNumber string    `json:"destination_account_number"`
	DestinationOwnerName     string    `json:"destination_owner_name,omitempty"`
	Amount                   float64   `json:"amount"`
	Currency                 string    `json:"currency"`
	Status                   string    `json:"status"`
	FailureReason            string    `json:"failure_reason,omitempty"`
	Description              string    `json:"description,omitempty"`
	CreatedAt                time.Time `json:"created_at"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// PerformTransfer processes a fund transfer between bank accounts inside an isolated database transaction.
// Educational note: This demonstrates critical transactional banking integrity:
// 1. PIN verification in backend (never rely solely on frontend validation!)
// 2. FOR UPDATE row locks prevent race conditions when two transfers occur concurrently.
// 3. Balance checks & atomic debit/credit.
// 4. Idempotency guarantees to prevent duplicate charges.
func (h *Handler) PerformTransfer(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	req.SourceAccountNumber = strings.TrimSpace(req.SourceAccountNumber)
	req.DestinationAccountNumber = strings.TrimSpace(req.DestinationAccountNumber)

	// Validate inputs
	if req.SourceAccountNumber == "" || req.DestinationAccountNumber == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Source and destination account numbers are required")
		return
	}

	if req.Amount <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Transfer amount must be strictly greater than 0")
		return
	}

	if req.PIN == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_PIN", "Transaction PIN is required")
		return
	}

	if req.SourceAccountNumber == req.DestinationAccountNumber {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Cannot transfer funds to the same account")
		return
	}

	// Idempotency check: Return prior transaction receipt if idempotency key was already processed
	if idempotencyKey != "" {
		var existingReceipt TransferReceipt
		err := h.DB.QueryRowContext(r.Context(), `
			SELECT reference_number, amount, status, COALESCE(failure_reason, ''), COALESCE(description, ''), created_at
			FROM transaction_history
			WHERE user_id = $1 AND idempotency_key = $2
		`, userID, idempotencyKey).Scan(
			&existingReceipt.ReferenceNumber, &existingReceipt.Amount, &existingReceipt.Status,
			&existingReceipt.FailureReason, &existingReceipt.Description, &existingReceipt.CreatedAt,
		)
		if err == nil {
			existingReceipt.SourceAccountNumber = req.SourceAccountNumber
			existingReceipt.DestinationAccountNumber = req.DestinationAccountNumber
			existingReceipt.Currency = "IDR"
			response.Success(w, "Idempotent transfer retrieved", existingReceipt)
			return
		}
	}

	// 1. Verify User PIN hash from Database
	var storedPINHash string
	err := h.DB.QueryRowContext(r.Context(), "SELECT pin_hash FROM users WHERE id = $1", userID).Scan(&storedPINHash)
	if err != nil || !auth.CheckPINHash(req.PIN, storedPINHash) {
		response.Error(w, http.StatusUnauthorized, "INVALID_PIN", "Invalid transaction PIN")
		return
	}

	// Determine active simulator scenario (SUCCESS, FAILED, TIMEOUT, REJECTED, DESTINATION_NOT_FOUND)
	scenarioCode, err := simulator.GetActiveScenario(h.DB, "TRANSFER", req.SimulatorScenario)
	if err != nil {
		scenarioCode = "SUCCESS"
	}

	var receipt TransferReceipt
	ctx := r.Context()

	// Execute atomic financial database transaction
	err = database.WithTx(ctx, h.DB, func(tx *sql.Tx) error {
		// Fetch source account with FOR UPDATE lock (Prevents race conditions)
		var sourceAccID, sourceUserID string
		var sourceBalance float64
		var sourceStatus string
		err := tx.QueryRowContext(ctx, `
			SELECT id, user_id, balance, status
			FROM saving_accounts
			WHERE account_number = $1
			FOR UPDATE
		`, req.SourceAccountNumber).Scan(&sourceAccID, &sourceUserID, &sourceBalance, &sourceStatus)

		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("SOURCE_ACCOUNT_NOT_FOUND")
		} else if err != nil {
			return err
		}

		// Ensure source account belongs to authenticated user
		if sourceUserID != userID {
			return errors.New("FORBIDDEN_SOURCE_ACCOUNT")
		}

		if sourceStatus != "ACTIVE" {
			return errors.New("SOURCE_ACCOUNT_INACTIVE")
		}

		// Fetch destination account details
		var destAccID string
		var destOwnerName string
		err = tx.QueryRowContext(ctx, `
			SELECT sa.id, u.full_name
			FROM saving_accounts sa
			JOIN users u ON sa.user_id = u.id
			WHERE sa.account_number = $1
		`, req.DestinationAccountNumber).Scan(&destAccID, &destOwnerName)

		if scenarioCode == "DESTINATION_NOT_FOUND" || errors.Is(err, sql.ErrNoRows) {
			// Record Failed Transaction due to destination not found
			refNumber := generateRefNumber()
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, transaction_type, amount, status, description, failure_reason, idempotency_key)
				VALUES ($1, $2, $3, 'TRANSFER', $4, 'FAILED', $5, 'Destination account not found', $6)
			`, refNumber, userID, sourceAccID, req.Amount, req.Description, idempotencyKey)

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "FAILED",
				FailureReason:            "Destination account not found",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}
			return nil
		}

		// Rule check: Insufficient balance
		if sourceBalance < req.Amount {
			refNumber := generateRefNumber()
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, destination_account_id, transaction_type, amount, status, description, failure_reason, idempotency_key)
				VALUES ($1, $2, $3, $4, 'TRANSFER', $5, 'REJECTED', $6, 'INSUFFICIENT_BALANCE', $7)
			`, refNumber, userID, sourceAccID, destAccID, req.Amount, req.Description, idempotencyKey)

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				DestinationOwnerName:     destOwnerName,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "REJECTED",
				FailureReason:            "Insufficient account balance",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}
			return nil
		}

		// Handle simulator scenario outcomes
		refNumber := generateRefNumber()

		switch scenarioCode {
		case "SUCCESS":
			// 1. Debit Source Account
			_, err = tx.ExecContext(ctx, `
				UPDATE saving_accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
			`, req.Amount, sourceAccID)
			if err != nil {
				return fmt.Errorf("debit source account failed: %w", err)
			}

			// 2. Credit Destination Account (Internal Transfer)
			_, err = tx.ExecContext(ctx, `
				UPDATE saving_accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
			`, req.Amount, destAccID)
			if err != nil {
				return fmt.Errorf("credit destination account failed: %w", err)
			}

			// 3. Record Transaction History LEDGER
			_, err = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, destination_account_id, transaction_type, amount, status, description, idempotency_key)
				VALUES ($1, $2, $3, $4, 'TRANSFER', $5, 'SUCCESS', $6, $7)
			`, refNumber, userID, sourceAccID, destAccID, req.Amount, req.Description, idempotencyKey)
			if err != nil {
				return fmt.Errorf("insert ledger failed: %w", err)
			}

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				DestinationOwnerName:     destOwnerName,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "SUCCESS",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}

		case "FAILED":
			// Balance remains unchanged. Record FAILED entry in ledger.
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, destination_account_id, transaction_type, amount, status, description, failure_reason, idempotency_key)
				VALUES ($1, $2, $3, $4, 'TRANSFER', $5, 'FAILED', $6, 'Simulated Bank Processing Failure', $7)
			`, refNumber, userID, sourceAccID, destAccID, req.Amount, req.Description, idempotencyKey)

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				DestinationOwnerName:     destOwnerName,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "FAILED",
				FailureReason:            "Simulated Bank Processing Failure",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}

		case "TIMEOUT":
			// Balance remains unchanged. Record TIMEOUT status.
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, destination_account_id, transaction_type, amount, status, description, failure_reason, idempotency_key)
				VALUES ($1, $2, $3, $4, 'TRANSFER', $5, 'TIMEOUT', $6, 'Bank Interconnection Gateway Timeout', $7)
			`, refNumber, userID, sourceAccID, destAccID, req.Amount, req.Description, idempotencyKey)

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				DestinationOwnerName:     destOwnerName,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "TIMEOUT",
				FailureReason:            "Bank Interconnection Gateway Timeout",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}

		case "REJECTED":
			// Balance remains unchanged. Record REJECTED status.
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, destination_account_id, transaction_type, amount, status, description, failure_reason, idempotency_key)
				VALUES ($1, $2, $3, $4, 'TRANSFER', $5, 'REJECTED', $6, 'Transaction Rejected by Clearing House', $7)
			`, refNumber, userID, sourceAccID, destAccID, req.Amount, req.Description, idempotencyKey)

			receipt = TransferReceipt{
				ReferenceNumber:          refNumber,
				SourceAccountNumber:      req.SourceAccountNumber,
				DestinationAccountNumber: req.DestinationAccountNumber,
				DestinationOwnerName:     destOwnerName,
				Amount:                   req.Amount,
				Currency:                 "IDR",
				Status:                   "REJECTED",
				FailureReason:            "Transaction Rejected by Clearing House",
				Description:              req.Description,
				CreatedAt:                time.Now(),
			}
		}

		return nil
	})

	if err != nil {
		switch err.Error() {
		case "SOURCE_ACCOUNT_NOT_FOUND":
			response.Error(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Source account not found")
		case "FORBIDDEN_SOURCE_ACCOUNT":
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "You do not own this source account")
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Transfer processing failed: "+err.Error())
		}
		return
	}

	response.Success(w, "Transfer processed", receipt)
}

// GetTransferByID retrieves a specific transfer transaction receipt.
func (h *Handler) GetTransferByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	ref := chi.URLParam(r, "id")

	var receipt TransferReceipt
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT th.reference_number, sa_src.account_number, COALESCE(sa_dst.account_number, ''),
		       th.amount, th.status, COALESCE(th.failure_reason, ''), COALESCE(th.description, ''), th.created_at
		FROM transaction_history th
		LEFT JOIN saving_accounts sa_src ON th.source_account_id = sa_src.id
		LEFT JOIN saving_accounts sa_dst ON th.destination_account_id = sa_dst.id
		WHERE (th.reference_number = $1 OR th.id::text = $1) AND th.user_id = $2
	`, ref, userID).Scan(
		&receipt.ReferenceNumber, &receipt.SourceAccountNumber, &receipt.DestinationAccountNumber,
		&receipt.Amount, &receipt.Status, &receipt.FailureReason, &receipt.Description, &receipt.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Transfer receipt not found")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to query receipt")
		return
	}

	receipt.Currency = "IDR"
	response.Success(w, "Transfer receipt retrieved", receipt)
}

func generateRefNumber() string {
	return fmt.Sprintf("TRX-%s-%06d", time.Now().Format("20060102"), rand.Intn(1000000))
}
