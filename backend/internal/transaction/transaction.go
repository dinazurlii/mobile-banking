package transaction

import (
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"simplebank/internal/auth"
	"simplebank/internal/response"
)

type TransactionItem struct {
	ID                       string    `json:"id"`
	ReferenceNumber          string    `json:"reference_number"`
	UserID                   string    `json:"user_id"`
	SourceAccountNumber      string    `json:"source_account_number,omitempty"`
	DestinationAccountNumber string    `json:"destination_account_number,omitempty"`
	DestinationOwnerName     string    `json:"destination_owner_name,omitempty"`
	EWalletProviderName      string    `json:"ewallet_provider_name,omitempty"`
	DestinationPhoneNumber   string    `json:"destination_phone_number,omitempty"`
	TransactionType          string    `json:"transaction_type"`
	Amount                   float64   `json:"amount"`
	Currency                 string    `json:"currency"`
	Status                   string    `json:"status"`
	Description              string    `json:"description,omitempty"`
	FailureReason            string    `json:"failure_reason,omitempty"`
	CreatedAt                time.Time `json:"created_at"`
}

type PaginatedResult struct {
	Items      []TransactionItem `json:"items"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalItems int               `json:"total_items"`
	TotalPages int               `json:"total_pages"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// GetTransactions retrieves paginated transaction history for the authenticated user.
// Educational note: Filtering MUST be performed at the database level using parameterized SQL queries.
// Never pull all rows into memory and filter in JavaScript/frontend code!
func (h *Handler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	query := r.URL.Query()
	startDate := query.Get("start_date")
	endDate := query.Get("end_date")
	txType := query.Get("transaction_type")
	status := query.Get("status")
	search := query.Get("search")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := " WHERE th.user_id = $1"
	args := []interface{}{userID}
	paramIdx := 2

	if startDate != "" {
		whereClause += fmt.Sprintf(" AND th.created_at >= $%d::timestamptz", paramIdx)
		args = append(args, startDate+" 00:00:00")
		paramIdx++
	}

	if endDate != "" {
		whereClause += fmt.Sprintf(" AND th.created_at <= $%d::timestamptz", paramIdx)
		args = append(args, endDate+" 23:59:59")
		paramIdx++
	}

	if txType != "" {
		whereClause += fmt.Sprintf(" AND th.transaction_type = $%d", paramIdx)
		args = append(args, txType)
		paramIdx++
	}

	if status != "" {
		whereClause += fmt.Sprintf(" AND th.status = $%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (th.reference_number ILIKE $%d OR th.description ILIKE $%d)", paramIdx, paramIdx)
		args = append(args, "%"+search+"%")
		paramIdx++
	}

	// 1. Count Total Matching Items
	countQuery := "SELECT COUNT(*) FROM transaction_history th" + whereClause
	var totalItems int
	err := h.DB.QueryRowContext(r.Context(), countQuery, args...).Scan(&totalItems)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to count transaction records")
		return
	}

	// 2. Query Paginated Items
	dataQuery := `
		SELECT th.id, th.reference_number, th.user_id,
		       COALESCE(sa_src.account_number, ''),
		       COALESCE(sa_dst.account_number, ''),
		       COALESCE(u_dst.full_name, ''),
		       COALESCE(ep.name, ''),
		       COALESCE(th.destination_phone_number, ''),
		       th.transaction_type, th.amount, th.status,
		       COALESCE(th.description, ''), COALESCE(th.failure_reason, ''), th.created_at
		FROM transaction_history th
		LEFT JOIN saving_accounts sa_src ON th.source_account_id = sa_src.id
		LEFT JOIN saving_accounts sa_dst ON th.destination_account_id = sa_dst.id
		LEFT JOIN users u_dst ON sa_dst.user_id = u_dst.id
		LEFT JOIN ewallet_providers ep ON th.ewallet_provider_id = ep.id
	` + whereClause + fmt.Sprintf(" ORDER BY th.created_at DESC LIMIT $%d OFFSET $%d", paramIdx, paramIdx+1)

	args = append(args, limit, offset)

	rows, err := h.DB.QueryContext(r.Context(), dataQuery, args...)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch transaction history")
		return
	}
	defer rows.Close()

	items := make([]TransactionItem, 0)
	for rows.Next() {
		var item TransactionItem
		if err := rows.Scan(
			&item.ID, &item.ReferenceNumber, &item.UserID,
			&item.SourceAccountNumber, &item.DestinationAccountNumber, &item.DestinationOwnerName,
			&item.EWalletProviderName, &item.DestinationPhoneNumber,
			&item.TransactionType, &item.Amount, &item.Status,
			&item.Description, &item.FailureReason, &item.CreatedAt,
		); err != nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Error parsing transaction row")
			return
		}
		item.Currency = "IDR"
		items = append(items, item)
	}

	totalPages := (totalItems + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	response.Success(w, "Transaction history retrieved", PaginatedResult{
		Items:      items,
		Page:       page,
		Limit:      limit,
		TotalItems: totalItems,
		TotalPages: totalPages,
	})
}

// GetTransactionByID fetches detail of a single transaction.
func (h *Handler) GetTransactionByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	id := chi.URLParam(r, "id")

	var item TransactionItem
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT th.id, th.reference_number, th.user_id,
		       COALESCE(sa_src.account_number, ''),
		       COALESCE(sa_dst.account_number, ''),
		       COALESCE(u_dst.full_name, ''),
		       COALESCE(ep.name, ''),
		       COALESCE(th.destination_phone_number, ''),
		       th.transaction_type, th.amount, th.status,
		       COALESCE(th.description, ''), COALESCE(th.failure_reason, ''), th.created_at
		FROM transaction_history th
		LEFT JOIN saving_accounts sa_src ON th.source_account_id = sa_src.id
		LEFT JOIN saving_accounts sa_dst ON th.destination_account_id = sa_dst.id
		LEFT JOIN users u_dst ON sa_dst.user_id = u_dst.id
		LEFT JOIN ewallet_providers ep ON th.ewallet_provider_id = ep.id
		WHERE (th.id::text = $1 OR th.reference_number = $1) AND th.user_id = $2
	`, id, userID).Scan(
		&item.ID, &item.ReferenceNumber, &item.UserID,
		&item.SourceAccountNumber, &item.DestinationAccountNumber, &item.DestinationOwnerName,
		&item.EWalletProviderName, &item.DestinationPhoneNumber,
		&item.TransactionType, &item.Amount, &item.Status,
		&item.Description, &item.FailureReason, &item.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Transaction record not found")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	item.Currency = "IDR"
	response.Success(w, "Transaction record retrieved", item)
}

// ExportCSV exports filtered transaction history directly as a downloadable CSV file.
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	query := r.URL.Query()
	startDate := query.Get("start_date")
	endDate := query.Get("end_date")
	txType := query.Get("transaction_type")
	status := query.Get("status")

	whereClause := " WHERE th.user_id = $1"
	args := []interface{}{userID}
	paramIdx := 2

	if startDate != "" {
		whereClause += fmt.Sprintf(" AND th.created_at >= $%d::timestamptz", paramIdx)
		args = append(args, startDate+" 00:00:00")
		paramIdx++
	}

	if endDate != "" {
		whereClause += fmt.Sprintf(" AND th.created_at <= $%d::timestamptz", paramIdx)
		args = append(args, endDate+" 23:59:59")
		paramIdx++
	}

	if txType != "" {
		whereClause += fmt.Sprintf(" AND th.transaction_type = $%d", paramIdx)
		args = append(args, txType)
		paramIdx++
	}

	if status != "" {
		whereClause += fmt.Sprintf(" AND th.status = $%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}

	dataQuery := `
		SELECT th.reference_number, th.transaction_type, th.amount, th.status,
		       COALESCE(sa_src.account_number, ''),
		       COALESCE(sa_dst.account_number, ''),
		       COALESCE(ep.name, ''),
		       COALESCE(th.destination_phone_number, ''),
		       COALESCE(th.description, ''),
		       COALESCE(th.failure_reason, ''),
		       th.created_at
		FROM transaction_history th
		LEFT JOIN saving_accounts sa_src ON th.source_account_id = sa_src.id
		LEFT JOIN saving_accounts sa_dst ON th.destination_account_id = sa_dst.id
		LEFT JOIN ewallet_providers ep ON th.ewallet_provider_id = ep.id
	` + whereClause + " ORDER BY th.created_at DESC"

	rows, err := h.DB.QueryContext(r.Context(), dataQuery, args...)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to query export data")
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=simplebank_transactions_%s.csv", time.Now().Format("20060102_150405")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write CSV Header
	_ = writer.Write([]string{
		"Reference Number", "Date", "Transaction Type", "Amount (IDR)", "Status",
		"Source Account", "Destination Account / Provider", "Phone Number", "Description", "Failure Reason",
	})

	for rows.Next() {
		var ref, tType, statusStr, srcAcc, dstAcc, providerName, phone, desc, failureReason string
		var amount float64
		var createdAt time.Time

		if err := rows.Scan(&ref, &tType, &amount, &statusStr, &srcAcc, &dstAcc, &providerName, &phone, &desc, &failureReason, &createdAt); err != nil {
			continue
		}

		targetStr := dstAcc
		if providerName != "" {
			targetStr = providerName
		}

		_ = writer.Write([]string{
			ref,
			createdAt.Format("2006-01-02 15:04:05"),
			tType,
			fmt.Sprintf("%.2f", amount),
			statusStr,
			srcAcc,
			targetStr,
			phone,
			desc,
			failureReason,
		})
	}
}
