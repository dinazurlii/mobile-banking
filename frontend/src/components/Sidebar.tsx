import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Send,
  Smartphone,
  History,
  Star,
  Wrench,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/account', label: 'Account Detail', icon: CreditCard },
    { to: '/transfer', label: 'Transfer', icon: Send },
    { to: '/topup', label: 'E-Wallet Top Up', icon: Smartphone },
    { to: '/history', label: 'History', icon: History },
    { to: '/favorites', label: 'Favorite Accounts', icon: Star },
    { to: '/dev-tools', label: 'Simulator & Dev Tools', icon: Wrench },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-navy-900/50 min-h-[calc(100vh-4rem)] p-4 space-y-1">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
};
