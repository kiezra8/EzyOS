import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';

// Lazy-loaded pages
const AuthPage = React.lazy(() => import('./pages/Auth'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const POSScreen = React.lazy(() => import('./pages/POS'));
const InventoryPage = React.lazy(() => import('./pages/Inventory'));
const ExpensesPage = React.lazy(() => import('./pages/Expenses'));
const ReportsPage = React.lazy(() => import('./pages/Reports'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));

// ─── Protected Route Wrapper ──────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-bg">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm mt-3">Loading EzyOS...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen gradient-bg">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Routes>
          {/* Public: Auth */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected: App Shell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/pos" element={<POSScreen />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/expenses" element={<ExpensesPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
