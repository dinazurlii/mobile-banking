export interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SavingAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  reference_number: string;
  user_id: string;
  source_account_number?: string;
  destination_account_number?: string;
  destination_owner_name?: string;
  ewallet_provider_name?: string;
  destination_phone_number?: string;
  transaction_type: 'TRANSFER' | 'TOPUP_EWALLET' | 'INITIAL_DEPOSIT' | 'BALANCE_TOPUP';
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'REJECTED';
  description?: string;
  failure_reason?: string;
  created_at: string;
}

export interface PaginatedTransactions {
  items: TransactionItem[];
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface FavoriteAccount {
  id: string;
  user_id: string;
  account_number: string;
  alias_name: string;
  created_at: string;
  updated_at: string;
}

export interface EWalletProvider {
  id: string;
  code: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SimulatorScenario {
  id: string;
  transaction_type: string;
  scenario_code: string;
  scenario_name: string;
  description: string;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransferReceiptData {
  reference_number: string;
  source_account_number: string;
  destination_account_number: string;
  destination_owner_name?: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason?: string;
  description?: string;
  created_at: string;
}

export interface TopUpReceiptData {
  reference_number: string;
  provider_code: string;
  provider_name: string;
  phone_number: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason?: string;
  created_at: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
