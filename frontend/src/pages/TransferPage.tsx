import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FavoriteAccount, TransferReceiptData, SimulatorScenario } from '../types';
import { PINModal } from '../components/PINModal';
import {
  Send,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download,
  ArrowLeft,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export const TransferPage: React.FC = () => {
  const { account, refreshAccount } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [destAccount, setDestAccount] = useState<string>(searchParams.get('dest') || '');
  const [amount, setAmount] = useState<string>('100000');
  const [description, setDescription] = useState<string>('Fund Transfer');
  const [simulatorScenario, setSimulatorScenario] = useState<string>('SUCCESS');
  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);

  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [receipt, setReceipt] = useState<TransferReceiptData | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const favs = await api.favorites.listFavorites();
        setFavorites(favs || []);

        const scens = await api.simulator.listScenarios('TRANSFER');
        setScenarios(scens || []);
      } catch (err) {
        console.error('Failed to load transfer metadata:', err);
      }
    };
    initData();
  }, []);

  const handleOpenPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!destAccount.trim()) {
      setError('Please provide a valid destination account number');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be strictly greater than 0');
      return;
    }

    if (account && numAmount > account.balance && simulatorScenario === 'SUCCESS') {
      setError('Warning: Amount exceeds available balance (will trigger Insufficient Balance Rejection)');
    }

    setIsPinModalOpen(true);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinModalOpen(false);
    setSubmitting(true);
    setError('');

    const idempotencyKey = `IDEM-TRX-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await api.transfers.performTransfer(
        {
          source_account_number: account?.account_number,
          destination_account_number: destAccount,
          amount: parseFloat(amount),
          pin,
          description,
          simulator_scenario: simulatorScenario,
        },
        idempotencyKey
      );

      setReceipt(res);
      await refreshAccount();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const presetAmounts = [50000, 100000, 250000, 500000, 1000000];

  // If receipt is ready, display Receipt View (PRD Section 18)
  if (receipt) {
    const isSuccess = receipt.status === 'SUCCESS';
    const isTimeout = receipt.status === 'TIMEOUT';
    const isFailed = receipt.status === 'FAILED' || receipt.status === 'REJECTED';

    return (
      <div className="max-w-md mx-auto py-6 space-y-6">
        <button
          onClick={() => {
            setReceipt(null);
            setDestAccount('');
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Make Another Transfer</span>
        </button>

        {/* Digital Transfer Receipt Container */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-2xl relative">
          
          {/* Status Header */}
          <div className="text-center pb-6 border-b border-dashed border-gray-200 dark:border-gray-700">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isSuccess
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : isTimeout
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : isTimeout ? (
                <Clock className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {isSuccess
                ? 'TRANSFER SUCCESSFUL'
                : isTimeout
                ? 'TRANSACTION TIMEOUT'
                : 'TRANSFER FAILED'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              Ref: {receipt.reference_number}
            </p>
          </div>

          {/* Receipt Data Table */}
          <div className="py-6 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Transfer Amount</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                {formatCurrency(receipt.amount)}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Source Account</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {receipt.source_account_number}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Destination Account</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {receipt.destination_account_number}
              </span>
            </div>

            {receipt.destination_owner_name && (
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Recipient Name</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {receipt.destination_owner_name}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Date & Time</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(receipt.created_at).toLocaleString('id-ID')}
              </span>
            </div>

            {receipt.failure_reason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium">
                Reason: {receipt.failure_reason}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-navy-900 text-gray-700 dark:text-gray-200 font-bold text-xs hover:bg-gray-200 dark:hover:bg-navy-700 flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={() => navigate('/history')}
              className="py-2.5 px-3 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 shadow-md flex items-center justify-center gap-1.5"
            >
              <span>View History</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          Transfer Funds
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Simulate bank transfers to internal accounts with live scenario testing
        </p>
      </div>

      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleOpenPin} className="space-y-4">
          
          {/* Source Account Info */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-navy-900 border border-gray-200 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">From Source Account</p>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                {account?.account_number}
              </span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                Bal: {formatCurrency(account?.balance || 0)}
              </span>
            </div>
          </div>

          {/* Favorites Quick Picker */}
          {favorites.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Quick Select Favorite Target:
              </label>
              <div className="flex flex-wrap gap-2">
                {favorites.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => setDestAccount(fav.account_number)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      destAccount === fav.account_number
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-gray-50 dark:bg-navy-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{fav.alias_name} ({fav.account_number})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Destination Account Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Destination Account Number
            </label>
            <input
              type="text"
              required
              value={destAccount}
              onChange={(e) => setDestAccount(e.target.value)}
              placeholder="e.g. 1000888002"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Amount Input & Preset Chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Transfer Amount (IDR)
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />

            <div className="flex flex-wrap gap-2 mt-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-900 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-navy-700 hover:text-brand-600 transition-colors"
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Project payment"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Transaction Simulator Response Selector (Section 17) */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Transaction Simulator Scenario:
              </label>
            </div>
            <select
              value={simulatorScenario}
              onChange={(e) => setSimulatorScenario(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-navy-900 text-gray-900 dark:text-white text-xs font-bold focus:outline-none"
            >
              <option value="SUCCESS">SUCCESS (Normal Successful Transfer)</option>
              <option value="FAILED">FAILED (Simulated Gateway Failure)</option>
              <option value="TIMEOUT">TIMEOUT (Simulated Network Interconnection Timeout)</option>
              <option value="REJECTED">REJECTED (Clearing House Rejection)</option>
              <option value="DESTINATION_NOT_FOUND">DESTINATION_NOT_FOUND (Account Invalid)</option>
            </select>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
              Choose scenario response to test failure, timeout, or success conditions!
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-sm hover:opacity-95 shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all mt-6"
          >
            <Send className="w-4 h-4" />
            <span>Continue to PIN Verification</span>
          </button>
        </form>
      </div>

      <PINModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onConfirm={handleConfirmPin}
        loading={submitting}
        title="Confirm Transfer PIN"
        subtitle={`Confirm transfer of ${formatCurrency(parseFloat(amount) || 0)} to account ${destAccount}`}
      />
    </div>
  );
};
