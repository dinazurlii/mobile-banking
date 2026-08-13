import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, SavingAccount } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  account: SavingAccount | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<SavingAccount | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('simplebank_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = async () => {
    try {
      if (!localStorage.getItem('simplebank_token')) {
        setLoading(false);
        return;
      }
      const u = await api.auth.me();
      setUser(u);

      const accounts = await api.accounts.getAccounts();
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('simplebank_token', res.token);
    setToken(res.token);
    setUser(res.user);

    const accounts = await api.accounts.getAccounts();
    if (accounts && accounts.length > 0) {
      setAccount(accounts[0]);
    }
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    localStorage.setItem('simplebank_token', res.token);
    setToken(res.token);
    setUser(res.user);

    const accounts = await api.accounts.getAccounts();
    if (accounts && accounts.length > 0) {
      setAccount(accounts[0]);
    }
  };

  const logout = () => {
    localStorage.removeItem('simplebank_token');
    setToken(null);
    setUser(null);
    setAccount(null);
  };

  const refreshAccount = async () => {
    if (!token) return;
    try {
      const accounts = await api.accounts.getAccounts();
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Failed to refresh account:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, account, token, loading, login, register, logout, refreshAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
