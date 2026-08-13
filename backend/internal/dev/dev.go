package dev

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"simplebank/internal/auth"
	"simplebank/internal/database"
	"simplebank/internal/response"
)

type TopUpBalanceRequest struct {
	AccountNumber string  `json:"account_number,omitempty"`
	Amount        float64 `json:"amount"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// DevTopUpBalance allows developers to instantly add test balance during local development.
// Educational note: Development utility endpoints MUST be strictly guarded in production environment!
func (h *Handler) DevTopUpBalance(w http.ResponseWriter, r *http.Request) {
	appEnv := strings.ToLower(os.Getenv("APP_ENV"))
	if appEnv == "production" {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "Development tools are disabled in production environment")
		return
	}

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	var req TopUpBalanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	if req.Amount <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Top up amount must be strictly greater than 0")
		return
	}

	var updatedBalance float64
	var targetAccountNum string
	ctx := r.Context()

	err := database.WithTx(ctx, h.DB, func(tx *sql.Tx) error {
		var accountID string
		var err error

		if req.AccountNumber != "" {
			err = tx.QueryRowContext(ctx, `
				SELECT id, account_number, balance FROM saving_accounts WHERE account_number = $1 AND user_id = $2 FOR UPDATE
			`, req.AccountNumber, userID).Scan(&accountID, &targetAccountNum, &updatedBalance)
			if errors.Is(err, sql.ErrNoRows) {
				return errors.New("ACCOUNT_NOT_FOUND")
			} else if err != nil {
				return err
			}
		} else {
			err = tx.QueryRowContext(ctx, `
				SELECT id, account_number, balance FROM saving_accounts WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE
			`, userID).Scan(&accountID, &targetAccountNum, &updatedBalance)
			if errors.Is(err, sql.ErrNoRows) {
				return errors.New("ACCOUNT_NOT_FOUND")
			} else if err != nil {
				return err
			}
		}

		// 1. Credit Account Balance
		err = tx.QueryRowContext(ctx, `
			UPDATE saving_accounts
			SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
			RETURNING balance
		`, req.Amount, accountID).Scan(&updatedBalance)
		if err != nil {
			return fmt.Errorf("failed to update balance: %w", err)
		}

		// 2. Create Audit Ledger Record in transaction_history
		refNumber := fmt.Sprintf("DEV-%s-%06d", time.Now().Format("20060102"), rand.Intn(1000000))
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_history (reference_number, user_id, destination_account_id, transaction_type, amount, status, description)
			VALUES ($1, $2, $3, 'BALANCE_TOPUP', $4, 'SUCCESS', 'Development Balance Top Up')
		`, refNumber, userID, accountID, req.Amount)

		if err != nil {
			return fmt.Errorf("failed to insert dev transaction history: %w", err)
		}

		return nil
	})

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to perform development balance top up: "+err.Error())
		return
	}

	response.Success(w, "Development balance added successfully", map[string]interface{}{
		"account_number": targetAccountNum,
		"added_amount":   req.Amount,
		"new_balance":    updatedBalance,
	})
}
