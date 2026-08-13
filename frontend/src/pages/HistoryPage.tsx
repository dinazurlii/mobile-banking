import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { TransactionItem, PaginatedTransactions } from '../types';
import {
  History,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [txType, setTxType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.transactions.getTransactions({
        start_date: startDate,
        end_date: endDate,
        transaction_type: txType,
        status,
        search,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to query transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate, txType, status, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setTxType('');
    setStatus('');
    setSearch('');
    setPage(1);
  };

  const handleDownloadCSV = () => {
    const exportUrl = api.transactions.exportCSVUrl({
      start_date: startDate,
      end_date: endDate,
      transaction_type: txType,
      status,
    });
    window.open(exportUrl, '_blank');
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Transaction History
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Database-filtered transaction history ledger and CSV exports
          </p>
        </div>

        {/* CSV Export Button (Section 14) */}
        <button
          onClick={handleDownloadCSV}
          className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Statement</span>
        </button>
      </div>

      {/* Filter Bar Panel (Section 13) */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
          <Filter className="w-4 h-4 text-brand-600 dark:text-emerald-400" />
          <span>Database Search & Filters</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Live Search Input */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference # or description..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-xs focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-xs focus:outline-none"
            />
          </div>

          {/* Transaction Type Filter */}
          <div>
            <select
              value={txType}
              onChange={(e) => {
                setTxType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-xs focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="TOPUP_EWALLET">TOPUP_EWALLET</option>
              <option value="INITIAL_DEPOSIT">INITIAL_DEPOSIT</option>
              <option value="BALANCE_TOPUP">BALANCE_TOPUP</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="TIMEOUT">TIMEOUT</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-navy-900 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-navy-900/50 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ref Number</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Description / Target</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    Loading records from database...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    No transactions match your search filter criteria.
                  </td>
                </tr>
              ) : (
                data.items.map((tx) => {
                  const isDebit = tx.transaction_type === 'TRANSFER' || tx.transaction_type === 'TOPUP_EWALLET';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-white">
                        {tx.reference_number}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800 dark:text-gray-200">
                        {tx.transaction_type}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                        {tx.description || tx.ewallet_provider_name || tx.destination_account_number || '-'}
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${isDebit ? 'text-gray-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : tx.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : tx.status === 'TIMEOUT'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-navy-900 transition-colors"
                          title="View Digital Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.total_pages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-navy-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Showing page <strong className="text-gray-900 dark:text-white">{data.page}</strong> of{' '}
              <strong className="text-gray-900 dark:text-white">{data.total_pages}</strong> ({data.total_items} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-white dark:hover:bg-navy-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-white dark:hover:bg-navy-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Transaction Receipt</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                {selectedTx.reference_number}
              </p>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Transaction Type</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedTx.transaction_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Amount</span>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {formatCurrency(selectedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Status</span>
                <span className="font-bold uppercase text-brand-600 dark:text-emerald-400">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Date</span>
                <span>{new Date(selectedTx.created_at).toLocaleString('id-ID')}</span>
              </div>
              {selectedTx.description && (
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Description</span>
                  <span>{selectedTx.description}</span>
                </div>
              )}
              {selectedTx.failure_reason && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
                  Failure Reason: {selectedTx.failure_reason}
                </div>
              )}
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-navy-900 font-bold text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-200 flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
