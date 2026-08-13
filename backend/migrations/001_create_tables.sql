-- Migration: 001_create_tables.sql
-- Description: Create initial schema for SimpleBank Web Mobile Banking Simulator

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: users
-- Stores customer profiles with securely hashed passwords and PINs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: saving_accounts
-- Stores customer bank account information and balance (Source of truth)
CREATE TABLE IF NOT EXISTS saving_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'SAVINGS',
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: ewallet_providers
-- Stores available e-wallet services (e.g. OVO, DANA, GoPay, ShopeePay)
CREATE TABLE IF NOT EXISTS ewallet_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: transaction_simulator_scenarios
-- Configurable scenarios for simulating different transaction outcomes
CREATE TABLE IF NOT EXISTS transaction_simulator_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    scenario_code VARCHAR(50) NOT NULL,
    scenario_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_type_code UNIQUE(transaction_type, scenario_code)
);

-- Table: transaction_history
-- Ledger recording all financial activities (Transfers, Top-ups, Balance adjustments)
CREATE TABLE IF NOT EXISTS transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_account_id UUID REFERENCES saving_accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES saving_accounts(id) ON DELETE SET NULL,
    ewallet_provider_id UUID REFERENCES ewallet_providers(id) ON DELETE SET NULL,
    destination_phone_number VARCHAR(50),
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL,
    description TEXT,
    failure_reason TEXT,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: favorite_accounts
-- Saved transfer targets for user convenience
CREATE TABLE IF NOT EXISTS favorite_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    alias_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_account UNIQUE(user_id, account_number)
);

-- Table: audit_logs
-- Security log for compliance and tracing
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    reference_id VARCHAR(100),
    ip_address VARCHAR(50),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index creation for faster queries on financial ledgers
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transaction_history(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_ref_number ON transaction_history(reference_number);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transaction_history(idempotency_key);
