package topup

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

type EWalletProvider struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TopUpRequest struct {
	ProviderCode        string  `json:"provider_code"`
	PhoneNumber         string  `json:"phone_number"`
	Amount              float64 `json:"amount"`
	PIN                 string  `json:"pin"`
	SourceAccountNumber string  `json:"source_account_number,omitempty"`
	SimulatorScenario   string  `json:"simulator_scenario,omitempty"`
}

type TopUpReceipt struct {
	ReferenceNumber string    `json:"reference_number"`
	ProviderCode    string    `json:"provider_code"`
	ProviderName    string    `json:"provider_name"`
	PhoneNumber     string    `json:"phone_number"`
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"`
	FailureReason   string    `json:"failure_reason,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// GetProviders lists available e-wallet providers loaded directly from PostgreSQL database.
// Educational note: E-wallet providers MUST be fetched dynamically from the database,
// never hardcoded in React frontend source code.
func (h *Handler) GetProviders(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, code, name, status, created_at, updated_at
		FROM ewallet_providers
		WHERE status = 'ACTIVE'
		ORDER BY name ASC
	`)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load e-wallet providers")
		return
	}
	defer rows.Close()

	providers := make([]EWalletProvider, 0)
	for rows.Next() {
		var p EWalletProvider
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Error parsing provider row")
			return
		}
		providers = append(providers, p)
	}

	response.Success(w, "E-Wallet providers retrieved", providers)
}

// PerformTopUp executes an e-wallet wallet top up inside a PostgreSQL transaction.
func (h *Handler) PerformTopUp(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	var req TopUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request JSON payload")
		return
	}

	req.ProviderCode = strings.TrimSpace(strings.ToUpper(req.ProviderCode))
	req.PhoneNumber = strings.TrimSpace(req.PhoneNumber)
	req.PIN = strings.TrimSpace(req.PIN)

	if req.ProviderCode == "" || req.PhoneNumber == "" || req.Amount <= 0 || req.PIN == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Provider, phone number, positive amount, and PIN are required")
		return
	}

	// 1. Validate Provider exists in database
	var providerID, providerName string
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, name FROM ewallet_providers WHERE code = $1 AND status = 'ACTIVE'
	`, req.ProviderCode).Scan(&providerID, &providerName)
	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusBadRequest, "PROVIDER_NOT_FOUND", "Selected E-Wallet provider is invalid or inactive")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	// 2. Validate User PIN hash
	var storedPINHash string
	err = h.DB.QueryRowContext(r.Context(), "SELECT pin_hash FROM users WHERE id = $1", userID).Scan(&storedPINHash)
	if err != nil || !auth.CheckPINHash(req.PIN, storedPINHash) {
		response.Error(w, http.StatusUnauthorized, "INVALID_PIN", "Invalid transaction PIN")
		return
	}

	// Determine simulator scenario (SUCCESS, FAILED, TIMEOUT, PHONE_NOT_FOUND, REJECTED)
	scenarioCode, err := simulator.GetActiveScenario(h.DB, "TOPUP_EWALLET", req.SimulatorScenario)
	if err != nil {
		scenarioCode = "SUCCESS"
	}

	var receipt TopUpReceipt
	ctx := r.Context()

	// Execute atomic financial transaction
	err = database.WithTx(ctx, h.DB, func(tx *sql.Tx) error {
		// Fetch saving account for debit
		var sourceAccID string
		var balance float64

		if req.SourceAccountNumber != "" {
			err = tx.QueryRowContext(ctx, `
				SELECT id, balance FROM saving_accounts WHERE account_number = $1 AND user_id = $2 FOR UPDATE
			`, req.SourceAccountNumber, userID).Scan(&sourceAccID, &balance)
		} else {
			err = tx.QueryRowContext(ctx, `
				SELECT id, balance FROM saving_accounts WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE
			`, userID).Scan(&sourceAccID, &balance)
		}

		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("SOURCE_ACCOUNT_NOT_FOUND")
		} else if err != nil {
			return err
		}

		refNumber := fmt.Sprintf("TOP-%s-%06d", time.Now().Format("20060102"), rand.Intn(1000000))

		// Rule Check: Balance
		if balance < req.Amount {
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description, failure_reason)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'REJECTED', 'Top Up E-Wallet ' || $7, 'INSUFFICIENT_BALANCE')
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "REJECTED",
				FailureReason:   "Insufficient account balance",
				CreatedAt:       time.Now(),
			}
			return nil
		}

		// Handle Simulator Scenario
		switch scenarioCode {
		case "SUCCESS":
			// 1. Debit account balance
			_, err = tx.ExecContext(ctx, `
				UPDATE saving_accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
			`, req.Amount, sourceAccID)
			if err != nil {
				return fmt.Errorf("debit failed: %w", err)
			}

			// 2. Insert transaction history
			_, err = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'SUCCESS', 'Top Up ' || $7)
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)
			if err != nil {
				return fmt.Errorf("ledger insert failed: %w", err)
			}

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "SUCCESS",
				CreatedAt:       time.Now(),
			}

		case "PHONE_NOT_FOUND":
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description, failure_reason)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'FAILED', 'Top Up ' || $7, 'Phone number not registered to ' || $7)
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "FAILED",
				FailureReason:   "Phone number not registered with " + providerName,
				CreatedAt:       time.Now(),
			}

		case "FAILED":
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description, failure_reason)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'FAILED', 'Top Up ' || $7, 'E-Wallet Provider System Error')
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "FAILED",
				FailureReason:   "E-Wallet Provider System Error",
				CreatedAt:       time.Now(),
			}

		case "TIMEOUT":
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description, failure_reason)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'TIMEOUT', 'Top Up ' || $7, 'E-Wallet Partner Gateway Timeout')
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "TIMEOUT",
				FailureReason:   "E-Wallet Partner Gateway Timeout",
				CreatedAt:       time.Now(),
			}

		case "REJECTED":
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO transaction_history (reference_number, user_id, source_account_id, ewallet_provider_id, destination_phone_number, transaction_type, amount, status, description, failure_reason)
				VALUES ($1, $2, $3, $4, $5, 'TOPUP_EWALLET', $6, 'REJECTED', 'Top Up ' || $7, 'Monthly top-up quota exceeded')
			`, refNumber, userID, sourceAccID, providerID, req.PhoneNumber, req.Amount, providerName)

			receipt = TopUpReceipt{
				ReferenceNumber: refNumber,
				ProviderCode:    req.ProviderCode,
				ProviderName:    providerName,
				PhoneNumber:     req.PhoneNumber,
				Amount:          req.Amount,
				Currency:        "IDR",
				Status:          "REJECTED",
				FailureReason:   "Monthly top-up quota exceeded",
				CreatedAt:       time.Now(),
			}
		}

		return nil
	})

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Top up processing failed: "+err.Error())
		return
	}

	response.Success(w, "Top Up processed", receipt)
}

// GetTopUpByID retrieves specific top up details.
func (h *Handler) GetTopUpByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	ref := chi.URLParam(r, "id")

	var receipt TopUpReceipt
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT th.reference_number, COALESCE(ep.code, ''), COALESCE(ep.name, ''),
		       COALESCE(th.destination_phone_number, ''), th.amount, th.status, COALESCE(th.failure_reason, ''), th.created_at
		FROM transaction_history th
		LEFT JOIN ewallet_providers ep ON th.ewallet_provider_id = ep.id
		WHERE (th.reference_number = $1 OR th.id::text = $1) AND th.user_id = $2 AND th.transaction_type = 'TOPUP_EWALLET'
	`, ref, userID).Scan(
		&receipt.ReferenceNumber, &receipt.ProviderCode, &receipt.ProviderName,
		&receipt.PhoneNumber, &receipt.Amount, &receipt.Status, &receipt.FailureReason, &receipt.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Top up receipt not found")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Query failed")
		return
	}

	receipt.Currency = "IDR"
	response.Success(w, "Top up receipt fetched", receipt)
}
