package account

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"simplebank/internal/auth"
	"simplebank/internal/response"
)

// SavingAccount represents a customer bank account.
type SavingAccount struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	AccountNumber string    `json:"account_number"`
	AccountType   string    `json:"account_type"`
	Balance       float64   `json:"balance"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type BalanceResponse struct {
	AccountNumber string  `json:"account_number"`
	Balance       float64 `json:"balance"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// GetUserAccounts lists all saving accounts belonging to the authenticated user.
func (h *Handler) GetUserAccounts(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, user_id, account_number, account_type, balance, currency, status, created_at, updated_at
		FROM saving_accounts
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to query accounts")
		return
	}
	defer rows.Close()

	accounts := make([]SavingAccount, 0)
	for rows.Next() {
		var acc SavingAccount
		if err := rows.Scan(
			&acc.ID, &acc.UserID, &acc.AccountNumber, &acc.AccountType,
			&acc.Balance, &acc.Currency, &acc.Status, &acc.CreatedAt, &acc.UpdatedAt,
		); err != nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Error scanning account record")
			return
		}
		accounts = append(accounts, acc)
	}

	response.Success(w, "Accounts fetched successfully", accounts)
}

// GetAccountByID retrieves specific account details with strict ownership authorization checks.
// Educational note: Never trust user_id or account_id from request params without checking user_id = authenticated_user_id.
func (h *Handler) GetAccountByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	accountID := chi.URLParam(r, "id")
	if accountID == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Account ID is required")
		return
	}

	var acc SavingAccount
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, user_id, account_number, account_type, balance, currency, status, created_at, updated_at
		FROM saving_accounts
		WHERE (id = $1 OR account_number = $1) AND user_id = $2
	`, accountID, userID).Scan(
		&acc.ID, &acc.UserID, &acc.AccountNumber, &acc.AccountType,
		&acc.Balance, &acc.Currency, &acc.Status, &acc.CreatedAt, &acc.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Account not found or access denied")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	response.Success(w, "Account detail fetched", acc)
}

// GetBalance returns real-time balance for an account.
func (h *Handler) GetBalance(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	accountID := chi.URLParam(r, "id")

	var resp BalanceResponse
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT account_number, balance, currency, status
		FROM saving_accounts
		WHERE (id = $1 OR account_number = $1) AND user_id = $2
	`, accountID, userID).Scan(&resp.AccountNumber, &resp.Balance, &resp.Currency, &resp.Status)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Account not found or access denied")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	response.Success(w, "Account balance retrieved", resp)
}
