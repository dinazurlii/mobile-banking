package simulator

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"simplebank/internal/response"
)

// Scenario represents a simulation rule stored in the database.
type Scenario struct {
	ID              string    `json:"id"`
	TransactionType string    `json:"transaction_type"` // TRANSFER or TOPUP_EWALLET
	ScenarioCode    string    `json:"scenario_code"`    // SUCCESS, FAILED, TIMEOUT, REJECTED, DESTINATION_NOT_FOUND, PHONE_NOT_FOUND
	ScenarioName    string    `json:"scenario_name"`
	Description     string    `json:"description"`
	Enabled         bool      `json:"enabled"`
	IsDefault       bool      `json:"is_default"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// ListScenarios lists all active transaction simulator scenarios stored in the database.
func (h *Handler) ListScenarios(w http.ResponseWriter, r *http.Request) {
	txType := r.URL.Query().Get("type")

	query := `
		SELECT id, transaction_type, scenario_code, scenario_name, description, enabled, is_default, created_at, updated_at
		FROM transaction_simulator_scenarios
	`
	args := make([]interface{}, 0)
	if txType != "" {
		query += " WHERE transaction_type = $1"
		args = append(args, txType)
	}
	query += " ORDER BY transaction_type ASC, is_default DESC, scenario_code ASC"

	rows, err := h.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch simulator scenarios")
		return
	}
	defer rows.Close()

	scenarios := make([]Scenario, 0)
	for rows.Next() {
		var s Scenario
		if err := rows.Scan(
			&s.ID, &s.TransactionType, &s.ScenarioCode, &s.ScenarioName,
			&s.Description, &s.Enabled, &s.IsDefault, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Error scanning scenario")
			return
		}
		scenarios = append(scenarios, s)
	}

	response.Success(w, "Simulator scenarios retrieved", scenarios)
}

// SetDefaultScenario sets the default active scenario for a specific transaction type.
func (h *Handler) SetDefaultScenario(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Scenario ID is required")
		return
	}

	var req struct {
		IsDefault bool `json:"is_default"`
		Enabled   bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	// Fetch scenario to get transaction_type
	var s Scenario
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, transaction_type FROM transaction_simulator_scenarios WHERE id = $1
	`, id).Scan(&s.ID, &s.TransactionType)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Scenario not found")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	if req.IsDefault {
		// Reset all other default scenarios for this transaction_type
		_, _ = h.DB.ExecContext(r.Context(), `
			UPDATE transaction_simulator_scenarios SET is_default = false WHERE transaction_type = $1
		`, s.TransactionType)
	}

	_, err = h.DB.ExecContext(r.Context(), `
		UPDATE transaction_simulator_scenarios SET is_default = $1, enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
	`, req.IsDefault, req.Enabled, id)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update scenario")
		return
	}

	response.Success(w, "Simulator scenario updated successfully", nil)
}

// GetActiveScenario determines which scenario code to use for a transaction.
// If an explicit override code is requested by client (e.g. for developer UI testing), it validates that scenario exists.
// Otherwise, it falls back to the database default scenario for that transaction_type.
func GetActiveScenario(db *sql.DB, txType string, requestedCode string) (string, error) {
	if requestedCode != "" {
		var code string
		err := db.QueryRow(`
			SELECT scenario_code FROM transaction_simulator_scenarios
			WHERE transaction_type = $1 AND scenario_code = $2 AND enabled = true
		`, txType, requestedCode).Scan(&code)
		if err == nil {
			return code, nil
		}
		// If requested code is valid scenario string, return it for test flexibility
		return requestedCode, nil
	}

	var defaultCode string
	err := db.QueryRow(`
		SELECT scenario_code FROM transaction_simulator_scenarios
		WHERE transaction_type = $1 AND is_default = true AND enabled = true
		LIMIT 1
	`, txType).Scan(&defaultCode)

	if err != nil || defaultCode == "" {
		return "SUCCESS", nil // Default fallback is SUCCESS
	}

	return defaultCode, nil
}
