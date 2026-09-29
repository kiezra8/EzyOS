import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, ReceiptText,
  TrendingUp, Settings, LogOut, Wifi, WifiOff, Bell,
  ChevronLeft, ChevronRight, Store, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'Point of Sale' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/expenses', icon: ReceiptText, label: 'Expenses' },
  { to: '/reports', icon: TrendingUp, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const { profile, signOut } = useAuthStore();
  const { getLowStockProducts, getExpiringBatches } = useInventoryStore();
  const navigate = useNavigate();

  const lowStockCount = getLowStockProducts().length;
  const expiringCount = getExpiringBatches(7).length; // expiring within 7 days
  const alertCount = lowStockCount + expiringCount;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-full gradient-bg overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={clsx(
          'flex flex-col h-full border-r border-slate-700/50 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 flex-shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={clsx('flex items-center h-16 px-4 border-b border-slate-700/50 flex-shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-black text-white tracking-tight">EzyOS</span>
                <p className="text-[10px] text-slate-500 -mt-0.5 truncate max-w-[100px]">{profile?.business_name}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                  collapsed && 'justify-center'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-5 h-5 flex-shrink-0', isActive && 'text-indigo-400')} />
                  {!collapsed && <span className="text-sm font-medium">{label}</span>}

                  {/* Alert badge for inventory */}
                  {label === 'Inventory' && alertCount > 0 && (
                    <span className={clsx(
                      'ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center',
                      collapsed && 'absolute top-1 right-1'
                    )}>
                      {alertCount}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-14 bg-slate-800 border border-slate-700 text-white text-xs font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Status Bar */}
        <div className={clsx('p-3 border-t border-slate-700/50 space-y-2', collapsed && 'px-2')}>
          {/* Online status */}
          <div className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-lg', collapsed && 'justify-center')}>
            {isOnline
              ? <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              : <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            {!collapsed && (
              <span className={clsx('text-xs font-medium', isOnline ? 'text-emerald-400' : 'text-amber-400')}>
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className={clsx(
              'flex items-center gap-2 w-full px-2 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all text-xs font-medium',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700/50 bg-slate-900/40 backdrop-blur flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            {alertCount > 0 && (
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/40 border border-amber-700/50 text-amber-400 text-xs font-semibold rounded-xl hover:bg-amber-900/60 transition-all pulse-warning"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {alertCount} Alert{alertCount !== 1 ? 's' : ''}
              </button>
            )}
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {profile?.business_name?.charAt(0).toUpperCase() ?? 'B'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
