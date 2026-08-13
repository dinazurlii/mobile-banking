package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"simplebank/internal/response"
)

type contextKey string

const UserIDContextKey contextKey = "user_id"

// Claims defines custom JWT claim payload containing user identity and metadata.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "simplebank_super_secret_jwt_key_2026_dev_mode"
	}
	return []byte(secret)
}

// HashPassword hashes a user password using Bcrypt with standard cost factor.
// Educational note: Never store passwords in plain text! Bcrypt uses salting automatically
// to prevent rainbow table attacks.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(bytes), nil
}

// CheckPasswordHash compares a plaintext password against a bcrypt hash.
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// HashPIN hashes a 6-digit transaction PIN using Bcrypt.
func HashPIN(pin string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash pin: %w", err)
	}
	return string(bytes), nil
}

// CheckPINHash compares a plaintext PIN against a stored PIN hash.
func CheckPINHash(pin, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin))
	return err == nil
}

// GenerateToken issues a signed JWT token valid for 24 hours.
func GenerateToken(userID, email string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "simplebank-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ParseToken parses and validates a JWT token string.
func ParseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return getJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	return claims, nil
}

// RequireAuth middleware inspects the Authorization header for a valid Bearer JWT token.
// If valid, it extracts the authenticated user_id and attaches it to the request context.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization header is missing")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid Authorization header format. Expected Bearer <token>")
			return
		}

		tokenStr := parts[1]
		claims, err := ParseToken(tokenStr)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Token is invalid or expired")
			return
		}

		// Attach authenticated User ID into context
		ctx := context.WithValue(r.Context(), UserIDContextKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserIDFromContext retrieves the authenticated user ID from context.
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	val := ctx.Value(UserIDContextKey)
	if val == nil {
		return "", false
	}
	userID, ok := val.(string)
	return userID, ok
}
