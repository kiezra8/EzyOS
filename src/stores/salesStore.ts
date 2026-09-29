import { create } from 'zustand';
import { db, type Sale, type SaleItem, type Expense } from '../lib/db';
import { localInsert } from '../lib/syncEngine';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

// ─── Sales Store ───────────────────────────────────────────────────────────────
interface SalesState {
  sales: Sale[];
  saleItems: SaleItem[];
  isLoading: boolean;
  loadSales: (userId: string, from?: Date, to?: Date) => Promise<void>;
  createSale: (userId: string, sale: Omit<Sale, 'id' | 'user_id' | 'sale_number' | 'created_at' | 'updated_at'>, items: Omit<SaleItem, 'id' | 'created_at' | 'sale_id' | 'user_id'>[]) => Promise<Sale>;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  saleItems: [],
  isLoading: false,

  loadSales: async (userId, from, to) => {
    set({ isLoading: true });
    try {
      let query = db.sales.where('user_id').equals(userId);
      const sales = await query.toArray();
      const filtered = sales.filter((s) => {
        const d = new Date(s.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      set({ sales: filtered });
    } finally {
      set({ isLoading: false });
    }
  },

  createSale: async (userId, saleData, itemsData) => {
    const now = new Date().toISOString();
    const saleId = crypto.randomUUID();

    // Generate sale number: SL-YYYYMMDD-XXXX
    const today = format(new Date(), 'yyyyMMdd');
    const count = await db.sales.where('user_id').equals(userId).count();
    const saleNumber = `SL-${today}-${String(count + 1).padStart(4, '0')}`;

    const sale: Sale = {
      ...saleData,
      id: saleId,
      user_id: userId,
      sale_number: saleNumber,
      created_at: now,
      updated_at: now,
    };

    const items: SaleItem[] = itemsData.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      user_id: userId,
      sale_id: saleId,
      created_at: now,
    }));

    // Write to Dexie and enqueue for sync
    await db.transaction('rw', db.sales, db.sale_items, db.batches, async () => {
      await db.sales.add(sale);
      await db.sale_items.bulkAdd(items);

      // Deduct stock from batches (FIFO)
      for (const item of items) {
        if (item.batch_id) {
          const batch = await db.batches.get(item.batch_id);
          if (batch) {
            await db.batches.update(batch.id, {
              quantity: Math.max(0, batch.quantity - item.quantity),
              updated_at: now,
            });
          }
        }
      }
    });

    // Enqueue for background sync
    await localInsert('sales', sale);
    for (const item of items) {
      await localInsert('sale_items', item);
    }

    set((s) => ({ sales: [sale, ...s.sales] }));
    return sale;
  },
}));

// ─── Expenses Store ────────────────────────────────────────────────────────────
interface ExpensesState {
  expenses: Expense[];
  isLoading: boolean;
  loadExpenses: (userId: string) => Promise<void>;
  addExpense: (userId: string, data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],
  isLoading: false,

  loadExpenses: async (userId) => {
    set({ isLoading: true });
    try {
      const expenses = await db.expenses.where('user_id').equals(userId).toArray();
      expenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
      set({ expenses });
    } finally {
      set({ isLoading: false });
    }
  },

  addExpense: async (userId, data) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await localInsert('expenses', expense);
    set((s) => ({ expenses: [expense, ...s.expenses] }));
  },

  deleteExpense: async (id) => {
    await db.expenses.delete(id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },
}));

// ─── Reporting Engine ─────────────────────────────────────────────────────────

export interface ReportPeriod { from: Date; to: Date; label: string; }
export interface DailyMetric { date: string; revenue: number; profit: number; expenses: number; }

export interface ReportData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalSales: number;
  avgOrderValue: number;
  dailyMetrics: DailyMetric[];
  topProducts: { name: string; qty: number; revenue: number }[];
  paymentBreakdown: { method: string; amount: number }[];
}

export async function generateReport(userId: string, period: ReportPeriod): Promise<ReportData> {
  // Fetch sales within period
  const allSales = await db.sales.where('user_id').equals(userId).toArray();
  const sales = allSales.filter((s) => {
    const d = new Date(s.created_at);
    return d >= period.from && d <= period.to;
  });

  const saleIds = sales.map((s) => s.id);
  const allItems = saleIds.length
    ? await db.sale_items.where('sale_id').anyOf(saleIds).toArray()
    : [];

  // Fetch expenses within period
  const allExpenses = await db.expenses.where('user_id').equals(userId).toArray();
  const expenses = allExpenses.filter((e) => {
    const d = new Date(e.expense_date);
    return d >= period.from && d <= period.to;
  });

  // Aggregate totals
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalCost = allItems.reduce((s, i) => s + i.cost_price * i.quantity, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  // Daily breakdown
  const dailyMap: Record<string, DailyMetric> = {};
  for (const sale of sales) {
    const dateKey = format(new Date(sale.created_at), 'yyyy-MM-dd');
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, revenue: 0, profit: 0, expenses: 0 };
    }
    dailyMap[dateKey].revenue += sale.total;
  }
  for (const item of allItems) {
    const sale = sales.find((s) => s.id === item.sale_id);
    if (!sale) continue;
    const dateKey = format(new Date(sale.created_at), 'yyyy-MM-dd');
    if (dailyMap[dateKey]) {
      dailyMap[dateKey].profit += item.total - item.cost_price * item.quantity;
    }
  }
  for (const exp of expenses) {
    const dateKey = exp.expense_date;
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, revenue: 0, profit: 0, expenses: 0 };
    }
    dailyMap[dateKey].expenses += exp.amount;
  }

  const dailyMetrics = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const item of allItems) {
    if (!productMap[item.product_id]) {
      productMap[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
    }
    productMap[item.product_id].qty += item.quantity;
    productMap[item.product_id].revenue += item.total;
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Payment breakdown
  const payMap: Record<string, number> = {};
  for (const sale of sales) {
    payMap[sale.payment_method] = (payMap[sale.payment_method] ?? 0) + sale.total;
  }
  const paymentBreakdown = Object.entries(payMap).map(([method, amount]) => ({ method, amount }));

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    totalExpenses,
    netProfit,
    totalSales: sales.length,
    avgOrderValue: sales.length ? totalRevenue / sales.length : 0,
    dailyMetrics,
    topProducts,
    paymentBreakdown,
  };
}

export function getPresetPeriods(): ReportPeriod[] {
  const now = new Date();
  return [
    { from: startOfDay(now), to: endOfDay(now), label: 'Today' },
    { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }), label: 'This Week' },
    { from: startOfMonth(now), to: endOfMonth(now), label: 'This Month' },
  ];
}
