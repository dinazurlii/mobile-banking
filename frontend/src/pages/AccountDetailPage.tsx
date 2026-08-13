import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SavingAccount, TransactionItem } from '../types';
import { CreditCard, ShieldCheck, ArrowDownLeft, ArrowUpRight, Copy, Check } from 'lucide-react';

export const AccountDetailPage: React.FC = () => {
  const { account, user } = useAuth();
  const [accDetail, setAccDetail] = useState<SavingAccount | null>(account);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (account?.id) {
          const detail = await api.accounts.getAccountByID(account.id);
          setAccDetail(detail);
        }
        const txs = await api.transactions.getTransactions({ limit: 15 });
        setTransactions(txs.items || []);
      } catch (err) {
        console.error('Failed to fetch account detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [account]);

  const handleCopy = () => {
    if (accDetail?.account_number) {
      navigator.clipboard.writeText(accDetail.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          Saving Account Details
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Complete account metadata and financial transaction log
        </p>
      </div>

      {/* Account Card */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Owner</p>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
            </div>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4 mr-1" />
            {accDetail?.status || 'ACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-navy-900">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Number</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                {accDetail?.account_number}
              </span>
              <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-navy-900">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Type</p>
            <p className="font-bold text-sm text-gray-900 dark:text-white mt-1">
              {accDetail?.account_type || 'SAVINGS'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-navy-900">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Currency</p>
            <p className="font-bold text-sm text-gray-900 dark:text-white mt-1">
              {accDetail?.currency || 'IDR'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">Current Balance</p>
            <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-300 mt-1">
              {formatCurrency(accDetail?.balance || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Account Transaction Activity */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Account Activity Log</h2>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">No account activity yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx) => {
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
                        Ref: {tx.reference_number} • {new Date(tx.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs font-bold ${isDebit ? 'text-gray-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
  );
};
