import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TransactionItem, FavoriteAccount } from '../types';
import {
  Eye,
  EyeOff,
  Send,
  Smartphone,
  Copy,
  Check,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Star,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, account, refreshAccount } = useAuth();
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [recentTxs, setRecentTxs] = useState<TransactionItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [devLoading, setDevLoading] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      await refreshAccount();
      const res = await api.transactions.getTransactions({ limit: 5 });
      setRecentTxs(res.items || []);

      const favs = await api.favorites.listFavorites();
      setFavorites(favs || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyAccount = () => {
    if (account?.account_number) {
      navigator.clipboard.writeText(account.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQuickAddBalance = async () => {
    setDevLoading(true);
    try {
      await api.dev.topUpBalance(1000000);
      await loadData();
    } catch (err) {
      console.error('Dev balance topup failed:', err);
    } finally {
      setDevLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Hello, {user?.full_name || 'Customer'} 👋
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Welcome to your SimpleBank Web Banking Portfolio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-navy-800 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Account Balance Card */}
      <div className="card-gradient rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        
        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-32 h-32 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">
              {account?.account_type || 'SAVING ACCOUNT'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {account?.status || 'ACTIVE'}
            </span>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
            title="Toggle Balance Visibility"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Balance Amount */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">Total Available Balance</p>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {showBalance ? (
              formatCurrency(account?.balance || 0)
            ) : (
              <span className="tracking-widest">••••••••••</span>
            )}
          </div>
        </div>

        {/* Account Number & Copy */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Account Number</p>
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-emerald-200 mt-0.5">
              <span>{account?.account_number || '1000888001'}</span>
              <button
                onClick={handleCopyAccount}
                className="p-1 rounded hover:bg-white/10 text-white/80 transition-colors"
                title="Copy Account Number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <Link
            to="/account"
            className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1 group"
          >
            <span>View Detail</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/transfer"
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-navy-800 border border-gray-200 dark:border-gray-800 hover:border-brand-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Send className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Transfer</span>
          <span className="text-[10px] text-gray-400 hidden sm:block">Bank Transfer</span>
        </Link>

        <Link
          to="/topup"
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-navy-800 border border-gray-200 dark:border-gray-800 hover:border-brand-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Smartphone className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Top Up</span>
          <span className="text-[10px] text-gray-400 hidden sm:block">E-Wallet</span>
        </Link>

        <button
          onClick={handleQuickAddBalance}
          disabled={devLoading}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md shadow-amber-500/20">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
            {devLoading ? 'Adding...' : '+ 1M IDR'}
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 hidden sm:block">Dev Balance</span>
        </button>
      </div>

      {/* Favorites & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Favorite Accounts Column */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Favorite Accounts</h2>
            </div>
            <Link to="/favorites" className="text-xs font-semibold text-brand-600 dark:text-emerald-400 hover:underline">
              Manage
            </Link>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              No saved favorite accounts yet.
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.slice(0, 4).map((fav) => (
                <Link
                  key={fav.id}
                  to={`/transfer?dest=${fav.account_number}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-navy-900 hover:bg-brand-50 dark:hover:bg-navy-700 transition-colors group"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-emerald-400">
                      {fav.alias_name}
                    </p>
                    <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {fav.account_number}
                    </p>
                  </div>
                  <Send className="w-4 h-4 text-gray-400 group-hover:text-brand-600 dark:group-hover:text-emerald-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions Column */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
            <Link to="/history" className="text-xs font-semibold text-brand-600 dark:text-emerald-400 hover:underline">
              View All History
            </Link>
          </div>

          {recentTxs.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentTxs.map((tx) => {
                const isDebit = tx.transaction_type === 'TRANSFER' || tx.transaction_type === 'TOPUP_EWALLET';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          isDebit
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDebit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {new Date(tx.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-bold ${isDebit ? 'text-gray-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                      <span
                        className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : tx.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            : tx.status === 'TIMEOUT'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
