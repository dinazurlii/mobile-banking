# SimpleBank — Web Mobile Banking Simulator

SimpleBank is an educational full-stack mobile banking learning platform & transaction processing simulator. Built with **Go (Golang)**, **React + TypeScript**, and **PostgreSQL**.

---

## 🌟 Architecture & Highlights

```text
               +-----------------------------+
               |   React + TypeScript Web    |
               |  Mobile-First Responsive UI |
               +--------------+--------------+
                              | REST API (JSON)
                              v
               +-----------------------------+
               |     Go REST API Monolith    |
               |  (JWT Auth, Bcrypt, Chi)    |
               +--------------+--------------+
                              | Transactional SQL
                              v
               +-----------------------------+
               |  PostgreSQL Database        |
               |  (Source of Truth Ledger)   |
               +-----------------------------+
```

* **Database First**: All business data (users, balances, ledgers, e-wallet providers, simulator scenarios) is stored in PostgreSQL. Zero hardcoded business data in frontend or backend!
* **Transactional Integrity**: Financial transfers and top-ups use PostgreSQL transaction blocks (`BEGIN`, `COMMIT`, `ROLLBACK`) with `FOR UPDATE` row locking to prevent race conditions or overdrafts.
* **Preflight Testing**: Built-in test runner verifies all unit and integration tests before launching the application.
* **Live Simulator Engine**: Developer & tester controls to simulate banking scenarios: `SUCCESS`, `FAILED`, `TIMEOUT`, `REJECTED`, `DESTINATION_NOT_FOUND`, and `PHONE_NOT_FOUND`.
* **Security**: Passwords and 6-digit transaction PINs are stored securely using **Bcrypt** hashing.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Go** 1.22+
* **Node.js** 18+ and **npm**
* **PostgreSQL** 14+

### Option 1: One-Command Preflight Launch
Run the automated startup script:

```bash
./start.sh
```

This will automatically:
1. Run preflight unit & integration tests (`go test -v ./tests/...`).
2. Create PostgreSQL database `simplebank_db`.
3. Apply SQL migrations & seed data.
4. Launch Go Backend API at `http://localhost:8080`.
5. Launch React Frontend App at `http://localhost:3000`.

---

## 🔐 Seed Demo Test Accounts

The system pre-seeds 3 demo bank accounts with realistic balances and hashed PINs (`123456`):

| Customer Name | Email | Password | PIN | Initial Balance | Account Number |
|---|---|---|---|---|---|
| **Budi Santoso** | `budi@simplebank.com` | `Password123!` | `123456` | **Rp 10.000.000** | `1000888001` |
| **Andi Wijaya** | `andi@simplebank.com` | `Password123!` | `123456` | **Rp 5.000.000** | `1000888002` |
| **Siti Rahma** | `siti@simplebank.com` | `Password123!` | `123456` | **Rp 2.500.000** | `1000888003` |

---

## 🧪 Preflight Testing

Run unit and integration test suites anytime:

```bash
cd backend
go test -v ./tests/...
```

---

## 📡 REST API Reference

### Authentication
* `POST /api/v1/auth/register` — Open saving account & register customer profile
* `POST /api/v1/auth/login` — Authenticate and issue JWT token
* `GET  /api/v1/auth/me` — Retrieve current authenticated user profile

### Accounts & Portfolio
* `GET /api/v1/accounts` — List user saving accounts
* `GET /api/v1/accounts/{id}` — Fetch detailed account metadata
* `GET /api/v1/accounts/{id}/balance` — Get real-time account balance

### Financial Transactions
* `POST /api/v1/transfers` — Perform fund transfer (supports `Idempotency-Key` & simulator scenarios)
* `GET  /api/v1/transfers/{id}` — Fetch digital transfer receipt
* `GET  /api/v1/ewallet/providers` — List e-wallet providers loaded from database
* `POST /api/v1/ewallet/topups` — Perform e-wallet top-up
* `GET  /api/v1/ewallet/topups/{id}` — Fetch digital top-up receipt

### Ledger & Statement History
* `GET /api/v1/transactions` — Query paginated history with date/type/status filters
* `GET /api/v1/transactions/export` — Download CSV financial statement

### Simulator & Development Utilities
* `POST /api/v1/dev/balance-topup` — Add test balance (Development mode only)
* `GET  /api/v1/simulator/scenarios` — List simulator scenarios
* `PUT  /api/v1/simulator/scenarios/{id}` — Set default active scenario
