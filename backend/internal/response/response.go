package response

import (
	"encoding/json"
	"net/http"
)

// APIResponse represents the standard JSON wrapper for all API responses.
// Consistent response structures ensure frontend applications can easily parse success or error payloads.
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// APIError encapsulates standard error codes and human-readable error messages.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON sends a JSON response with the given status code and payload.
func JSON(w http.ResponseWriter, status int, success bool, message string, data interface{}, apiErr *APIError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := APIResponse{
		Success: success,
		Message: message,
		Data:    data,
		Error:   apiErr,
	}

	json.NewEncoder(w).Encode(resp)
}

// Success renders an HTTP 200 OK JSON response.
func Success(w http.ResponseWriter, message string, data interface{}) {
	JSON(w, http.StatusOK, true, message, data, nil)
}

// Created renders an HTTP 201 Created JSON response.
func Created(w http.ResponseWriter, message string, data interface{}) {
	JSON(w, http.StatusCreated, true, message, data, nil)
}

// Error renders a failure response with specific HTTP status code and error details.
func Error(w http.ResponseWriter, status int, code string, message string) {
	JSON(w, status, false, "", nil, &APIError{
		Code:    code,
		Message: message,
	})
}
