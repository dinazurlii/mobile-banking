import React, { useState } from 'react';
import { Lock, X, Delete } from 'lucide-react';

interface PINModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  title?: string;
  subtitle?: string;
  loading?: boolean;
}

export const PINModal: React.FC<PINModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Security PIN Required',
  subtitle = 'Enter your 6-digit transaction PIN to confirm',
  loading = false,
}) => {
  const [pin, setPin] = useState<string>('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 6) {
        onConfirm(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleUseDemoPIN = () => {
    setPin('123456');
    onConfirm('123456');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>

        {/* PIN Digit Indicators */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-brand-600 border-brand-600 dark:bg-emerald-400 dark:border-emerald-400 scale-110'
                  : 'border-gray-300 dark:border-gray-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Quick Demo PIN shortcut for fast testing */}
        <div className="text-center mb-4">
          <button
            type="button"
            onClick={handleUseDemoPIN}
            className="text-xs font-semibold text-brand-600 dark:text-emerald-400 hover:underline bg-brand-50 dark:bg-navy-900 px-3 py-1 rounded-full border border-brand-200 dark:border-brand-800"
          >
            ⚡ Auto-fill Demo PIN (123456)
          </button>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={loading}
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl font-bold text-lg text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-navy-900 hover:bg-brand-50 dark:hover:bg-navy-700 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            disabled={loading}
            onClick={() => setPin('')}
            className="h-12 rounded-2xl text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-900 hover:bg-gray-200 dark:hover:bg-navy-700"
          >
            Clear
          </button>
          <button
            disabled={loading}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl font-bold text-lg text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-navy-900 hover:bg-brand-50 dark:hover:bg-navy-700 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            disabled={loading}
            onClick={handleDelete}
            className="h-12 rounded-2xl text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-navy-900 hover:bg-gray-200 dark:hover:bg-navy-700 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
