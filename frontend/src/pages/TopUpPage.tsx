import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EWalletProvider, TopUpReceiptData } from '../types';
import { PINModal } from '../components/PINModal';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ArrowLeft,
  Sliders,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

export const TopUpPage: React.FC = () => {
  const { account, refreshAccount } = useAuth();
  const navigate = useNavigate();

  const [providers, setProviders] = useState<EWalletProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('OVO');
  const [phoneNumber, setPhoneNumber] = useState<string>('081234567890');
  const [amount, setAmount] = useState<string>('50000');
  const [simulatorScenario, setSimulatorScenario] = useState<string>('SUCCESS');

  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [receipt, setReceipt] = useState<TopUpReceiptData | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const list = await api.topup.getProviders();
        setProviders(list || []);
        if (list && list.length > 0) {
          setSelectedProvider(list[0].code);
        }
      } catch (err) {
        console.error('Failed to load e-wallet providers from database:', err);
      }
    };
    fetchProviders();
  }, []);

  const handleOpenPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProvider) {
      setError('Please select an E-Wallet provider');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setError('Please provide a valid phone number');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsPinModalOpen(true);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinModalOpen(false);
    setSubmitting(true);
    setError('');

    try {
      const res = await api.topup.performTopUp({
        provider_code: selectedProvider,
        phone_number: phoneNumber,
        amount: parseFloat(amount),
        pin,
        simulator_scenario: simulatorScenario,
      });

      setReceipt(res);
      await refreshAccount();
    } catch (err: any) {
      setError(err.message || 'Top Up failed');
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

  const presetAmounts = [20000, 50000, 100000, 200000, 500000];

  if (receipt) {
    const isSuccess = receipt.status === 'SUCCESS';
    const isTimeout = receipt.status === 'TIMEOUT';

    return (
      <div className="max-w-md mx-auto py-6 space-y-6">
        <button
          onClick={() => setReceipt(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Make Another Top Up</span>
        </button>

        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-2xl relative">
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
                ? 'TOP UP SUCCESSFUL'
                : isTimeout
                ? 'TOP UP TIMEOUT'
                : 'TOP UP FAILED'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              Ref: {receipt.reference_number}
            </p>
          </div>

          <div className="py-6 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">E-Wallet Provider</span>
              <span className="font-extrabold text-gray-900 dark:text-white">
                {receipt.provider_name || receipt.provider_code}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Phone Number</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {receipt.phone_number}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                {formatCurrency(receipt.amount)}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
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
          E-Wallet Top Up
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Top up e-wallet balances (OVO, DANA, GoPay, ShopeePay) directly from database
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
          
          {/* Select Provider Grid (Section 20: Loaded from Database!) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Select E-Wallet Provider (From PostgreSQL):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {providers.map((p) => {
                const isSelected = selectedProvider === p.code;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.code)}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20 font-bold scale-105'
                        : 'bg-gray-50 dark:bg-navy-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <Wallet className="w-5 h-5 mb-0.5" />
                    <span className="text-xs">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Destination Phone Number
            </label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 081234567890"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Amount Input & Preset Chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Top Up Amount (IDR)
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

          {/* E-Wallet Simulator Scenario Selector (Section 22) */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                E-Wallet Simulator Scenario:
              </label>
            </div>
            <select
              value={simulatorScenario}
              onChange={(e) => setSimulatorScenario(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-navy-900 text-gray-900 dark:text-white text-xs font-bold focus:outline-none"
            >
              <option value="SUCCESS">SUCCESS (Normal Successful Top Up)</option>
              <option value="FAILED">FAILED (Provider Service Outage)</option>
              <option value="TIMEOUT">TIMEOUT (Provider Gateway Timeout)</option>
              <option value="PHONE_NOT_FOUND">PHONE_NOT_FOUND (Phone Unregistered)</option>
              <option value="REJECTED">REJECTED (E-Wallet Balance Limit Exceeded)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-sm hover:opacity-95 shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all mt-6"
          >
            <Smartphone className="w-4 h-4" />
            <span>Continue to PIN Verification</span>
          </button>
        </form>
      </div>

      <PINModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onConfirm={handleConfirmPin}
        loading={submitting}
        title="Confirm E-Wallet Top Up"
        subtitle={`Confirm top up of ${formatCurrency(parseFloat(amount) || 0)} to ${selectedProvider} (${phoneNumber})`}
      />
    </div>
  );
};
