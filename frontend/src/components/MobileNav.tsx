import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, Smartphone, History, Wrench } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const items = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/transfer', label: 'Transfer', icon: Send },
    { to: '/topup', label: 'Top Up', icon: Smartphone },
    { to: '/history', label: 'History', icon: History },
    { to: '/dev-tools', label: 'Dev Tools', icon: Wrench },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-navy-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-2 py-1 flex justify-around items-center">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
