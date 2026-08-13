#!/bin/bash
set -e

echo "================================================================="
echo "   SimpleBank Web Mobile Banking Simulator — Preflight Startup   "
echo "================================================================="

# Step 1: Preflight Unit & Integration Test Check
echo "🔍 Step 1: Running Preflight Unit & Integration Tests..."
cd backend
if go test -v ./tests/...; then
    echo "✅ Preflight tests PASSED!"
else
    echo "❌ PREFLIGHT TESTS FAILED! Application startup halted."
    exit 1
fi
cd ..

# Step 2: Ensure PostgreSQL Database simplebank_db exists
echo "🐘 Step 2: Verifying PostgreSQL database..."
psql -U postgres -c "CREATE DATABASE simplebank_db;" 2>/dev/null || psql postgres -c "CREATE DATABASE simplebank_db;" 2>/dev/null || true

# Step 3: Launch Go Backend Server in Background
echo "🚀 Step 3: Starting Go Backend REST API (Port 8080)..."
cd backend
go run cmd/server/main.go &
BACKEND_PID=$!
cd ..

# Step 4: Launch React Frontend Dev Server
echo "💻 Step 4: Starting React Frontend (Port 3000)..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo "================================================================="
echo "✅ SimpleBank Banking Simulator is now running!"
echo "   Backend REST API: http://localhost:8080"
echo "   Frontend Web UI:  http://localhost:3000"
echo "================================================================="

wait
