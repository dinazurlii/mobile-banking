import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { TransferPage } from './pages/TransferPage';
import { TopUpPage } from './pages/TopUpPage';
import { HistoryPage } from './pages/HistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { DevToolsPage } from './pages/DevToolsPage';

const ProtectedLayout: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950 text-xs font-semibold text-gray-500">
        Loading SimpleBank Session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-navy-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto flex pb-20 md:pb-6">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/account" element={<AccountDetailPage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/topup" element={<TopUpPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/dev-tools" element={<DevToolsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
