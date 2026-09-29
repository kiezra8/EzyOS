import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, RefreshCw } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { generateReport, getPresetPeriods, type ReportData, type ReportPeriod } from '../stores/salesStore';
import { Card, StatCard } from '../components/ui';
import clsx from 'clsx';

const ReportsPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const currency = profile?.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const presets = getPresetPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(presets[2]); // This Month
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await generateReport(user.id, selectedPeriod);
      setReportData(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, selectedPeriod]);

  const profitMargin = reportData && reportData.totalRevenue > 0
    ? (reportData.totalProfit / reportData.totalRevenue) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-0.5">Financial overview · {selectedPeriod.label}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setSelectedPeriod(p)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  selectedPeriod.label === p.label ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading || !reportData ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value={fmt(reportData.totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="indigo" subtitle={`${reportData.totalSales} transactions`} />
            <StatCard title="Gross Profit" value={fmt(reportData.totalProfit)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" subtitle={`${profitMargin.toFixed(1)}% margin`} />
            <StatCard title="Total Expenses" value={fmt(reportData.totalExpenses)} icon={<TrendingDown className="w-5 h-5" />} color="red" />
            <StatCard
              title="Net Profit"
              value={fmt(reportData.netProfit)}
              icon={<BarChart3 className="w-5 h-5" />}
              color={reportData.netProfit >= 0 ? 'emerald' : 'red'}
              subtitle="After all expenses"
            />
          </div>

          {/* P&L Chart */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-white mb-5">Profit & Loss — {selectedPeriod.label}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={reportData.dailyMetrics} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => {
                    try { return format(new Date(v), 'dd MMM'); } catch { return v; }
                  }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                  labelFormatter={(v) => { try { return format(new Date(v as string), 'dd MMM yyyy'); } catch { return v as string; } }}
                />
                <Legend formatter={(v) => <span className="text-xs capitalize text-slate-400">{v}</span>} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Products Table */}
          {reportData.topProducts.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-white mb-4">Top Selling Products</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="text-left py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="text-right py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Units Sold</th>
                    <th className="text-right py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topProducts.map((p, i) => (
                    <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-800/30">
                      <td className="py-2.5 text-slate-500 text-xs">{i + 1}</td>
                      <td className="py-2.5 font-medium text-slate-100">{p.name}</td>
                      <td className="py-2.5 text-right text-slate-300">{p.qty}</td>
                      <td className="py-2.5 text-right font-bold text-indigo-400">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-white mb-4">Period Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Revenue', value: fmt(reportData.totalRevenue), color: 'text-indigo-400' },
                { label: 'Cost of Goods', value: fmt(reportData.totalCost), color: 'text-slate-300' },
                { label: 'Gross Profit', value: fmt(reportData.totalProfit), color: 'text-emerald-400' },
                { label: 'Net Profit', value: fmt(reportData.netProfit), color: reportData.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/30">
                  <p className={clsx('text-xl font-black', color)}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
