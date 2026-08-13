package tests

import (
	"testing"

	"simplebank/internal/auth"
)

// TestPasswordHashing verifies Bcrypt password hashing and validation logic.
// Educational note: Unit testing authentication hashing ensures passwords can never be parsed in plain text.
func TestPasswordHashing(t *testing.T) {
	rawPassword := "SecurePassword123!"

	hash, err := auth.HashPassword(rawPassword)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == rawPassword {
		t.Fatalf("Password hash should not match raw plaintext password!")
	}

	if !auth.CheckPasswordHash(rawPassword, hash) {
		t.Fatalf("Valid password check failed!")
	}

	if auth.CheckPasswordHash("WrongPassword", hash) {
		t.Fatalf("Wrong password check should have failed!")
	}
}

// TestPINHashing verifies 6-digit transaction PIN hashing and verification.
func TestPINHashing(t *testing.T) {
	rawPIN := "123456"

	hash, err := auth.HashPIN(rawPIN)
	if err != nil {
		t.Fatalf("Failed to hash PIN: %v", err)
	}

	if !auth.CheckPINHash(rawPIN, hash) {
		t.Fatalf("Valid PIN check failed!")
	}

	if auth.CheckPINHash("654321", hash) {
		t.Fatalf("Invalid PIN check should have failed!")
	}
}

// TestJWTTokenIssuance verifies JWT token generation and claims parsing.
func TestJWTTokenIssuance(t *testing.T) {
	userID := "user-uuid-12345"
	email := "test@simplebank.com"

	tokenStr, err := auth.GenerateToken(userID, email)
	if err != nil {
		t.Fatalf("Failed to issue JWT token: %v", err)
	}

	claims, err := auth.ParseToken(tokenStr)
	if err != nil {
		t.Fatalf("Failed to parse issued JWT token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}
}
