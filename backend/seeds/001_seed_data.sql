-- Seed: 001_seed_data.sql
-- Initial reference and simulator data for SimpleBank

-- Seed E-Wallet Providers
INSERT INTO ewallet_providers (code, name, status) VALUES
('OVO', 'OVO Cash', 'ACTIVE'),
('DANA', 'DANA Wallet', 'ACTIVE'),
('GOPAY', 'GoPay', 'ACTIVE'),
('SHOPEEPAY', 'ShopeePay', 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- Seed Simulator Scenarios for Transfer
INSERT INTO transaction_simulator_scenarios (transaction_type, scenario_code, scenario_name, description, enabled, is_default) VALUES
('TRANSFER', 'SUCCESS', 'Successful Transfer', 'Simulates a successful funds transfer debit and credit', true, true),
('TRANSFER', 'FAILED', 'System Failure', 'Simulates a generic transaction failure without debiting funds', true, false),
('TRANSFER', 'TIMEOUT', 'Bank Gateway Timeout', 'Simulates a network timeout where transaction status is unresolved', true, false),
('TRANSFER', 'REJECTED', 'Transaction Rejected', 'Simulates rejection by receiving bank validation', true, false),
('TRANSFER', 'DESTINATION_NOT_FOUND', 'Account Not Found', 'Simulates destination bank account not existing', true, false)
ON CONFLICT (transaction_type, scenario_code) DO UPDATE SET scenario_name = EXCLUDED.scenario_name, description = EXCLUDED.description;

-- Seed Simulator Scenarios for E-Wallet Top Up
INSERT INTO transaction_simulator_scenarios (transaction_type, scenario_code, scenario_name, description, enabled, is_default) VALUES
('TOPUP_EWALLET', 'SUCCESS', 'Successful Top Up', 'Simulates a successful e-wallet wallet top up', true, true),
('TOPUP_EWALLET', 'FAILED', 'Provider Outage', 'Simulates provider gateway service failure', true, false),
('TOPUP_EWALLET', 'TIMEOUT', 'Provider Timeout', 'Simulates timeout response from e-wallet provider', true, false),
('TOPUP_EWALLET', 'PHONE_NOT_FOUND', 'Phone Number Unregistered', 'Simulates e-wallet account not linked to phone number', true, false),
('TOPUP_EWALLET', 'REJECTED', 'Limit Exceeded / Rejected', 'Simulates e-wallet monthly balance limit exceeded', true, false)
ON CONFLICT (transaction_type, scenario_code) DO UPDATE SET scenario_name = EXCLUDED.scenario_name, description = EXCLUDED.description;
