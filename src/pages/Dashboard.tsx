import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, DollarSign, ShoppingBag, Package,
  BarChart3, AlertTriangle, CalendarX, ArrowRight,
  Zap, Users, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSalesStore, generateReport } from '../../stores/salesStore';
import { StatCard, Card, Badge } from '../ui';
import type { ReportData } from '../../stores/salesStore';
import clsx from 'clsx';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip: React.FC<{ active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string; currency?: string }> = ({
  active, payload, label, currency = 'USD',
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-300 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400 capitalize">{entry.name}:</span>
          <span className="font-bold text-white">{currency} {entry.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { products, batches, loadAll, getLowStockProducts, getExpiringBatches } = useInventoryStore();
  const { sales, loadSales } = useSalesStore();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [weekReportData, setWeekReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');

  const currency = profile?.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lowStockProducts = getLowStockProducts();
  const expiringBatches = getExpiringBatches(7);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      try {
        await loadAll(user.id);
        const todayFrom = startOfDay(new Date());
        const todayTo = endOfDay(new Date());

        const [todayReport, weekReport] = await Promise.all([
          generateReport(user.id, { from: todayFrom, to: todayTo, label: 'Today' }),
          generateReport(user.id, {
            from: subDays(new Date(), chartPeriod === '7d' ? 7 : 30),
            to: new Date(),
            label: chartPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days',
          }),
        ]);

        setReportData(todayReport);
        setWeekReportData(weekReport);
        await loadSales(user.id, todayFrom, todayTo);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user, chartPeriod, loadAll, loadSales]);

  // Generate filled daily data (no gaps)
  const chartData = useMemo(() => {
    if (!weekReportData) return [];
    const days = chartPeriod === '7d' ? 7 : 30;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const existing = weekReportData.dailyMetrics.find((d) => d.date === dateKey);
      result.push({
        date: format(date, chartPeriod === '7d' ? 'EEE' : 'dd MMM'),
        revenue: existing?.revenue ?? 0,
        profit: existing?.profit ?? 0,
        expenses: existing?.expenses ?? 0,
      });
    }
    return result;
  }, [weekReportData, chartPeriod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const today = reportData;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {profile?.business_name} · {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(lowStockProducts.length > 0 || expiringBatches.length > 0) && (
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border border-amber-700/50 text-amber-400 text-sm font-semibold rounded-xl hover:bg-amber-900/50 transition-all pulse-warning"
            >
              <AlertTriangle className="w-4 h-4" />
              {lowStockProducts.length + expiringBatches.length} Alerts
            </button>
          )}
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            Open POS
          </button>
        </div>
      </div>

      {/* ── Today's Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={fmt(today?.totalRevenue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="indigo"
          subtitle={`${today?.totalSales ?? 0} transactions`}
        />
        <StatCard
          title="Today's Profit"
          value={fmt(today?.totalProfit ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          subtitle={`Net: ${fmt(today?.netProfit ?? 0)}`}
        />
        <StatCard
          title="Avg. Order Value"
          value={fmt(today?.avgOrderValue ?? 0)}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="amber"
          subtitle="Today"
        />
        <StatCard
          title="Products"
          value={products.length}
          icon={<Package className="w-5 h-5" />}
          color={lowStockProducts.length > 0 ? 'amber' : 'indigo'}
          subtitle={lowStockProducts.length > 0 ? `${lowStockProducts.length} need restocking` : 'All stocked'}
        />
      </div>

      {/* ── Alert Banners ─────────────────────────────────────────────────── */}
      {(lowStockProducts.length > 0 || expiringBatches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockProducts.length > 0 && (
            <Card className="p-4 border-amber-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Low Stock</span>
                  <Badge variant="warning">{lowStockProducts.length}</Badge>
                </div>
                <button onClick={() => navigate('/inventory')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-[180px]">{p.name}</span>
                    <span className={clsx('font-bold', p.stock_quantity === 0 ? 'text-red-400' : 'text-amber-400')}>
                      {p.stock_quantity} {p.unit} left
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {expiringBatches.length > 0 && (
            <Card className="p-4 border-red-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-red-400">Expiring This Week</span>
                  <Badge variant="danger">{expiringBatches.length}</Badge>
                </div>
                <button onClick={() => navigate('/inventory')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5">
                {expiringBatches.slice(0, 4).map((b) => {
                  const product = products.find((p) => p.id === b.product_id);
                  const days = Math.ceil((new Date(b.expiry_date!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={b.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[180px]">{product?.name ?? '—'}</span>
                      <span className={clsx('font-bold', days < 0 ? 'text-red-400' : days <= 3 ? 'text-red-400' : 'text-amber-400')}>
                        {days < 0 ? `Expired ${Math.abs(days)}d` : `${days}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue & Profit Chart */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Revenue & Profit</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {weekReportData ? `Total: ${fmt(weekReportData.totalRevenue)}` : '—'}
              </p>
            </div>
            <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
              {(['7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                    chartPeriod === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenue-grad)" name="revenue" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profit-grad)" name="profit" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Breakdown Pie */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-white mb-1">Payment Methods</h2>
          <p className="text-xs text-slate-500 mb-4">{chartPeriod === '7d' ? 'Last 7 days' : 'Last 30 days'}</p>
          {weekReportData?.paymentBreakdown && weekReportData.paymentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={weekReportData.paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="amount"
                  nameKey="method"
                  paddingAngle={3}
                >
                  {weekReportData.paymentBreakdown.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${currency} ${v.toFixed(2)}`, '']} />
                <Legend
                  formatter={(value) => <span className="text-xs capitalize text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No sales data yet</div>
          )}
        </Card>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Products Bar Chart */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-white mb-4">Top Products by Revenue</h2>
          {weekReportData?.topProducts && weekReportData.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekReportData.topProducts.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: number) => [`${currency} ${v.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No sales data yet</div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Recent Transactions</h2>
            <button onClick={() => navigate('/pos')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              New Sale <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-600">
                <ShoppingBag className="w-8 h-8 mb-2" />
                <p className="text-sm">No sales today yet</p>
              </div>
            ) : (
              sales.slice(0, 8).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-all">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{sale.sale_number}</p>
                    <p className="text-[10px] text-slate-500">{format(new Date(sale.created_at), 'HH:mm')} · {sale.payment_method} · {sale.sale_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{currency} {sale.total.toFixed(2)}</p>
                    <Badge variant={sale.payment_status === 'paid' ? 'success' : 'warning'}>
                      {sale.payment_status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
