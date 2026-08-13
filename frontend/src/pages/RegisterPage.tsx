import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Landmark, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '1996-01-01',
    address: '',
    password: '',
    pin: '',
  });

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.pin.length !== 6 || !/^\d+$/.test(formData.pin)) {
      setError('PIN must be exactly 6 numeric digits');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-navy-950 py-12">
      <div className="w-full max-w-lg">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xl mb-3">
            <Landmark className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Open SimpleBank Account
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Online Bank Account Opening Simulation
          </p>
        </div>

        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Budi Santoso"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="08123456789"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  required
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Residential Address
              </label>
              <textarea
                name="address"
                required
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Jl. Sudirman No. 123, Jakarta"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 chars"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  6-Digit Transaction PIN
                </label>
                <input
                  type="password"
                  name="pin"
                  required
                  maxLength={6}
                  value={formData.pin}
                  onChange={handleChange}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-sm hover:opacity-95 shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 mt-4 transition-all"
            >
              {loading ? 'Opening Saving Account...' : 'Open Account Now'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 dark:text-emerald-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
