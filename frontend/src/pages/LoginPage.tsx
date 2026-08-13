import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Landmark, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('budi@simplebank.com');
  const [password, setPassword] = useState<string>('Password123!');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-navy-950">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-brand-500/30 mb-4">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Welcome to SimpleBank
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Web Mobile Banking Simulator Platform
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Sign In to your Account
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                placeholder="you@domain.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-sm hover:opacity-95 shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Seed Demo Accounts Box */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Quick Test Demo Accounts:</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('budi@simplebank.com')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-navy-900 text-[11px] text-center hover:bg-brand-50 dark:hover:bg-navy-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <div className="font-bold text-gray-900 dark:text-white">Budi</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">10M IDR</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('andi@simplebank.com')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-navy-900 text-[11px] text-center hover:bg-brand-50 dark:hover:bg-navy-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <div className="font-bold text-gray-900 dark:text-white">Andi</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">5M IDR</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('siti@simplebank.com')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-navy-900 text-[11px] text-center hover:bg-brand-50 dark:hover:bg-navy-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <div className="font-bold text-gray-900 dark:text-white">Siti</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">2.5M IDR</div>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Default password: <code className="bg-gray-100 dark:bg-navy-900 px-1 py-0.5 rounded">Password123!</code> | PIN: <code className="bg-gray-100 dark:bg-navy-900 px-1 py-0.5 rounded">123456</code>
            </p>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Don't have a bank account?{' '}
            <Link to="/register" className="font-bold text-brand-600 dark:text-emerald-400 hover:underline">
              Open Account Online
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
