package favorite

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"simplebank/internal/auth"
	"simplebank/internal/response"
)

type FavoriteAccount struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	AccountNumber string    `json:"account_number"`
	AliasName     string    `json:"alias_name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateFavoriteRequest struct {
	AccountNumber string `json:"account_number"`
	AliasName     string `json:"alias_name"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// ListFavorites fetches saved transfer favorite target accounts for the authenticated user.
func (h *Handler) ListFavorites(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, user_id, account_number, alias_name, created_at, updated_at
		FROM favorite_accounts
		WHERE user_id = $1
		ORDER BY alias_name ASC
	`, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to query favorite accounts")
		return
	}
	defer rows.Close()

	favorites := make([]FavoriteAccount, 0)
	for rows.Next() {
		var f FavoriteAccount
		if err := rows.Scan(&f.ID, &f.UserID, &f.AccountNumber, &f.AliasName, &f.CreatedAt, &f.UpdatedAt); err != nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Error parsing favorite row")
			return
		}
		favorites = append(favorites, f)
	}

	response.Success(w, "Favorite accounts retrieved", favorites)
}

// AddFavorite saves a new target account number as a favorite.
func (h *Handler) AddFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	var req CreateFavoriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	req.AccountNumber = strings.TrimSpace(req.AccountNumber)
	req.AliasName = strings.TrimSpace(req.AliasName)

	if req.AccountNumber == "" || req.AliasName == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Account number and alias name are required")
		return
	}

	var fav FavoriteAccount
	err := h.DB.QueryRowContext(r.Context(), `
		INSERT INTO favorite_accounts (user_id, account_number, alias_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, account_number) DO UPDATE SET alias_name = EXCLUDED.alias_name, updated_at = CURRENT_TIMESTAMP
		RETURNING id, user_id, account_number, alias_name, created_at, updated_at
	`, userID, req.AccountNumber, req.AliasName).Scan(
		&fav.ID, &fav.UserID, &fav.AccountNumber, &fav.AliasName, &fav.CreatedAt, &fav.UpdatedAt,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add favorite account: "+err.Error())
		return
	}

	response.Created(w, "Favorite account saved", fav)
}

// UpdateFavorite updates the alias name of a favorite account.
func (h *Handler) UpdateFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	id := chi.URLParam(r, "id")
	var req struct {
		AliasName string `json:"alias_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	req.AliasName = strings.TrimSpace(req.AliasName)
	if req.AliasName == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Alias name is required")
		return
	}

	res, err := h.DB.ExecContext(r.Context(), `
		UPDATE favorite_accounts SET alias_name = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND user_id = $3
	`, req.AliasName, id, userID)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database update failed")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Favorite account not found or access denied")
		return
	}

	response.Success(w, "Favorite account alias updated", nil)
}

// DeleteFavorite removes a saved favorite account.
func (h *Handler) DeleteFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	id := chi.URLParam(r, "id")
	res, err := h.DB.ExecContext(r.Context(), `
		DELETE FROM favorite_accounts WHERE id = $1 AND user_id = $2
	`, id, userID)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete favorite")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Favorite account not found or access denied")
		return
	}

	response.Success(w, "Favorite account deleted", nil)
}
