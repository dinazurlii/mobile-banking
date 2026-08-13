import {
  APIResponse,
  User,
  SavingAccount,
  TransactionItem,
  PaginatedTransactions,
  FavoriteAccount,
  EWalletProvider,
  SimulatorScenario,
  TransferReceiptData,
  TopUpReceiptData,
} from '../types';

const API_BASE_URL = '/api/v1';

function getAuthToken(): string | null {
  return localStorage.getItem('simplebank_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  idempotencyKey?: string
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json: APIResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json.error?.message || json.message || 'An unexpected error occurred';
    throw new Error(errorMsg);
  }

  return json.data as T;
}

export const api = {
  auth: {
    register: (data: any) =>
      request<{ token: string; user: User; account_number: string; balance: number }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    login: (data: any) =>
      request<{ token: string; user: User; account_number: string; balance: number }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    me: () => request<User>('/auth/me'),
  },

  accounts: {
    getAccounts: () => request<SavingAccount[]>('/accounts'),
    getAccountByID: (id: string) => request<SavingAccount>(`/accounts/${id}`),
    getBalance: (id: string) =>
      request<{ account_number: string; balance: number; currency: string; status: string }>(
        `/accounts/${id}/balance`
      ),
  },

  transfers: {
    performTransfer: (data: any, idempotencyKey?: string) =>
      request<TransferReceiptData>(
        '/transfers',
        { method: 'POST', body: JSON.stringify(data) },
        idempotencyKey
      ),
    getTransferByID: (id: string) => request<TransferReceiptData>(`/transfers/${id}`),
  },

  topup: {
    getProviders: () => request<EWalletProvider[]>('/ewallet/providers'),
    performTopUp: (data: any) =>
      request<TopUpReceiptData>('/ewallet/topups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getTopUpByID: (id: string) => request<TopUpReceiptData>(`/ewallet/topups/${id}`),
  },

  transactions: {
    getTransactions: (params: {
      start_date?: string;
      end_date?: string;
      transaction_type?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      if (params.transaction_type) query.append('transaction_type', params.transaction_type);
      if (params.status) query.append('status', params.status);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());

      return request<PaginatedTransactions>(`/transactions?${query.toString()}`);
    },
    getTransactionByID: (id: string) => request<TransactionItem>(`/transactions/${id}`),
    exportCSVUrl: (params: {
      start_date?: string;
      end_date?: string;
      transaction_type?: string;
      status?: string;
    }) => {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      if (params.transaction_type) query.append('transaction_type', params.transaction_type);
      if (params.status) query.append('status', params.status);
      return `${API_BASE_URL}/transactions/export?${query.toString()}`;
    },
  },

  favorites: {
    listFavorites: () => request<FavoriteAccount[]>('/favorites'),
    addFavorite: (data: { account_number: string; alias_name: string }) =>
      request<FavoriteAccount>('/favorites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateFavorite: (id: string, alias_name: string) =>
      request<void>(`/favorites/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ alias_name }),
      }),
    deleteFavorite: (id: string) =>
      request<void>(`/favorites/${id}`, { method: 'DELETE' }),
  },

  dev: {
    topUpBalance: (amount: number, account_number?: string) =>
      request<{ account_number: string; added_amount: number; new_balance: number }>(
        '/dev/balance-topup',
        { method: 'POST', body: JSON.stringify({ amount, account_number }) }
      ),
  },

  simulator: {
    listScenarios: (type?: string) =>
      request<SimulatorScenario[]>(`/simulator/scenarios${type ? `?type=${type}` : ''}`),
    setDefaultScenario: (id: string, is_default: boolean, enabled: boolean) =>
      request<void>(`/simulator/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_default, enabled }),
      }),
  },
};
