import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SimulatorScenario } from '../types';
import { Wrench, PlusCircle, CheckCircle2, Sliders, ShieldCheck } from 'lucide-react';

export const DevToolsPage: React.FC = () => {
  const { account, refreshAccount } = useAuth();

  const [topupAmount, setTopupAmount] = useState<string>('1000000');
  const [loadingTopup, setLoadingTopup] = useState<boolean>(false);
  const [topupSuccess, setTopupSuccess] = useState<string>('');

  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);

  const loadScenarios = async () => {
    setLoadingScenarios(true);
    try {
      const list = await api.simulator.listScenarios();
      setScenarios(list || []);
    } catch (err) {
      console.error('Failed to load simulator scenarios:', err);
    } finally {
      setLoadingScenarios(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingTopup(true);
    setTopupSuccess('');

    try {
      const res = await api.dev.topUpBalance(parseFloat(topupAmount), account?.account_number);
      setTopupSuccess(`Added ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(res.added_amount)}! New Balance: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(res.new_balance)}`);
      await refreshAccount();
    } catch (err: any) {
      alert(err.message || 'Topup failed');
    } finally {
      setLoadingTopup(false);
    }
  };

  const handleSetDefault = async (scenario: SimulatorScenario) => {
    try {
      await api.simulator.setDefaultScenario(scenario.id, true, true);
      await loadScenarios();
    } catch (err) {
      console.error('Failed to update default scenario:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          Simulator & Developer Tools
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Development utilities for balance top-up and banking scenario configuration
        </p>
      </div>

      {/* Development Balance Top-Up Tool (Section 24) */}
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent dark:from-amber-950/40 dark:via-orange-950/40 rounded-3xl p-6 sm:p-8 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Development Balance Top Up (Section 24)
            </h2>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Instantly credit test balance to your account (Guarded: Dev Environment only!)
            </p>
          </div>
        </div>

        {topupSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{topupSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAddBalance} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="number"
              min="1000"
              required
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Amount IDR"
              className="w-full px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-navy-900 font-bold text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loadingTopup}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 whitespace-nowrap transition-colors"
          >
            {loadingTopup ? 'Adding...' : '+ Add Test Balance'}
          </button>
        </form>

        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Current Balance: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(account?.balance || 0)}</strong>
        </div>
      </div>

      {/* Simulator Scenario Configuration (Section 17 & 22) */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <Sliders className="w-5 h-5 text-brand-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Active Simulator Scenario Manager
          </h2>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Scenarios stored in PostgreSQL database table <code className="bg-gray-100 dark:bg-navy-900 px-1 py-0.5 rounded">transaction_simulator_scenarios</code>. Set default outcome for background simulations:
        </p>

        {loadingScenarios ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading simulator scenarios...</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {scenarios.map((sc) => (
              <div key={sc.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-navy-900 text-gray-800 dark:text-gray-200">
                      {sc.transaction_type}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {sc.scenario_name} ({sc.scenario_code})
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {sc.description}
                  </p>
                </div>

                <button
                  onClick={() => handleSetDefault(sc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    sc.is_default
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-navy-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {sc.is_default && <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{sc.is_default ? 'Active Default' : 'Set Active'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
