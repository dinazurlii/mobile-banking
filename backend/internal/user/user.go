package user

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"

	"simplebank/internal/auth"
	"simplebank/internal/database"
	"simplebank/internal/response"
)

// User represents a customer entity in PostgreSQL.
type User struct {
	ID          string    `json:"id"`
	FullName    string    `json:"full_name"`
	Email       string    `json:"email"`
	PhoneNumber string    `json:"phone_number"`
	DOB         string    `json:"date_of_birth"`
	Address     string    `json:"address"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	PIN         string `json:"pin"`
	DOB         string `json:"date_of_birth"`
	Address     string `json:"address"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token         string      `json:"token"`
	User          User        `json:"user"`
	AccountNumber string      `json:"account_number"`
	Balance       float64     `json:"balance"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// Register creates a new user and automatically opens a saving account.
// Educational note: User registration and account opening must occur inside a single
// database transaction to maintain relational consistency (User without Account is invalid in banking).
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body format")
		return
	}

	// Validate input fields
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.PhoneNumber = strings.TrimSpace(req.PhoneNumber)
	req.FullName = strings.TrimSpace(req.FullName)

	if req.FullName == "" || req.Email == "" || req.PhoneNumber == "" || req.Password == "" || req.PIN == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Full name, email, phone number, password, and PIN are required")
		return
	}

	if len(req.PIN) != 6 || !isDigitsOnly(req.PIN) {
		response.Error(w, http.StatusBadRequest, "INVALID_PIN", "PIN must be exactly 6 numeric digits")
		return
	}

	if len(req.Password) < 6 {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Password must be at least 6 characters long")
		return
	}

	// Hash password and PIN
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to secure password")
		return
	}

	pinHash, err := auth.HashPIN(req.PIN)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to secure PIN")
		return
	}

	var createdUser User
	var createdAccNumber string

	// Perform atomic database transaction for User + Saving Account creation
	ctx := r.Context()
	err = database.WithTx(ctx, h.DB, func(tx *sql.Tx) error {
		// 1. Check duplicate email or phone number
		var existingID string
		err := tx.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1 OR phone_number = $2", req.Email, req.PhoneNumber).Scan(&existingID)
		if err == nil {
			return errors.New("DUPLICATE_USER")
		} else if !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		// 2. Insert User
		err = tx.QueryRowContext(ctx, `
			INSERT INTO users (full_name, email, phone_number, password_hash, pin_hash, date_of_birth, address)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, full_name, email, phone_number, date_of_birth, address, status, created_at, updated_at
		`, req.FullName, req.Email, req.PhoneNumber, passwordHash, pinHash, req.DOB, req.Address).Scan(
			&createdUser.ID, &createdUser.FullName, &createdUser.Email, &createdUser.PhoneNumber,
			&createdUser.DOB, &createdUser.Address, &createdUser.Status, &createdUser.CreatedAt, &createdUser.UpdatedAt,
		)
		if err != nil {
			return err
		}

		// 3. Generate Unique 10-digit Saving Account Number
		createdAccNumber = generateAccountNumber()
		var initialBalance float64 = 1000000.00 // Welcome initial balance Rp 1,000,000 for learning/testing

		_, err = tx.ExecContext(ctx, `
			INSERT INTO saving_accounts (user_id, account_number, account_type, balance, currency, status)
			VALUES ($1, $2, 'SAVINGS', $3, 'IDR', 'ACTIVE')
		`, createdUser.ID, createdAccNumber, initialBalance)
		if err != nil {
			return err
		}

		// 4. Record Initial Deposit in Transaction History
		refNumber := fmt.Sprintf("TRX-%s-%06d", time.Now().Format("20060102"), rand.Intn(1000000))
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_history (reference_number, user_id, transaction_type, amount, status, description)
			VALUES ($1, $2, 'INITIAL_DEPOSIT', $3, 'SUCCESS', 'Welcome bonus initial balance deposit')
		`, refNumber, createdUser.ID, initialBalance)
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err.Error() == "DUPLICATE_USER" {
			response.Error(w, http.StatusConflict, "DUPLICATE_USER", "An account with this email or phone number already exists")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to complete user registration: "+err.Error())
		return
	}

	// Generate JWT token for immediate login upon registration
	token, err := auth.GenerateToken(createdUser.ID, createdUser.Email)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate authentication token")
		return
	}

	response.Created(w, "Account opened successfully", AuthResponse{
		Token:         token,
		User:          createdUser,
		AccountNumber: createdAccNumber,
		Balance:       1000000.00,
	})
}

// Login authenticates user with email and password, returning JWT token.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body format")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var u User
	var storedPasswordHash string
	ctx := r.Context()

	err := h.DB.QueryRowContext(ctx, `
		SELECT id, full_name, email, phone_number, password_hash, date_of_birth, address, status, created_at, updated_at
		FROM users
		WHERE email = $1
	`, req.Email).Scan(
		&u.ID, &u.FullName, &u.Email, &u.PhoneNumber, &storedPasswordHash,
		&u.DOB, &u.Address, &u.Status, &u.CreatedAt, &u.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) || !auth.CheckPasswordHash(req.Password, storedPasswordHash) {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
		return
	} else if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Database query failed")
		return
	}

	// Fetch primary saving account details
	var accNumber string
	var balance float64
	err = h.DB.QueryRowContext(ctx, `
		SELECT account_number, balance FROM saving_accounts WHERE user_id = $1 LIMIT 1
	`, u.ID).Scan(&accNumber, &balance)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch account balance")
		return
	}

	token, err := auth.GenerateToken(u.ID, u.Email)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to issue auth token")
		return
	}

	response.Success(w, "Login successful", AuthResponse{
		Token:         token,
		User:          u,
		AccountNumber: accNumber,
		Balance:       balance,
	})
}

// Me retrieves current authenticated user profile.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized request")
		return
	}

	var u User
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, full_name, email, phone_number, date_of_birth, address, status, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&u.ID, &u.FullName, &u.Email, &u.PhoneNumber,
		&u.DOB, &u.Address, &u.Status, &u.CreatedAt, &u.UpdatedAt,
	)

	if err != nil {
		response.Error(w, http.StatusNotFound, "USER_NOT_FOUND", "User profile not found")
		return
	}

	response.Success(w, "User profile retrieved", u)
}

func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func generateAccountNumber() string {
	// Generates 10-digit account number starting with 1000
	return fmt.Sprintf("1000%06d", rand.Intn(1000000))
}

func isDigitsOnly(s string) bool {
	matched, _ := regexp.MatchString(`^\d+$`, s)
	return matched
}
