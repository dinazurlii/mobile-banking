import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Landmark, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-gray-900 via-brand-600 to-emerald-500 dark:from-white dark:via-emerald-400 dark:to-brand-400 bg-clip-text text-transparent">
                SimpleBank
              </span>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-emerald-300 border border-brand-200 dark:border-brand-800">
                Simulator
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
              Web Mobile Banking Learning Platform
            </p>
          </div>
        </Link>

        {/* Right Action Icons & User Info */}
        <div className="flex items-center gap-3">
          
          {/* Security Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-navy-800 text-xs font-medium text-gray-600 dark:text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>PostgreSQL Verified</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
          </button>

          {/* User Profile Avatar & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-800">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
