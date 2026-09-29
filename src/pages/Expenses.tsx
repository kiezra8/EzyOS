import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ReceiptText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { useExpensesStore } from '../stores/salesStore';
import { Button, Card, Badge, Modal, Input, Select, EmptyState, StatCard } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseFormData } from '../lib/schemas';

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: '🏢 Rent' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'salaries', label: '👥 Salaries' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'supplies', label: '📦 Supplies' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'general', label: '💼 General' },
  { value: 'other', label: '📌 Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  rent: 'bg-purple-900/40 text-purple-400 border-purple-700/40',
  utilities: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
  salaries: 'bg-blue-900/40 text-blue-400 border-blue-700/40',
  marketing: 'bg-pink-900/40 text-pink-400 border-pink-700/40',
  maintenance: 'bg-orange-900/40 text-orange-400 border-orange-700/40',
  supplies: 'bg-cyan-900/40 text-cyan-400 border-cyan-700/40',
  transport: 'bg-teal-900/40 text-teal-400 border-teal-700/40',
  general: 'bg-slate-700/60 text-slate-300 border-slate-600',
  other: 'bg-slate-700/60 text-slate-300 border-slate-600',
};

const AddExpenseModal: React.FC<{ isOpen: boolean; onClose: () => void; userId: string }> = ({
  isOpen, onClose, userId,
}) => {
  const { addExpense } = useExpensesStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      category: 'general',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    await addExpense(userId, data);
    reset({ expense_date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'cash', category: 'general' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Expense" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Category *"
          options={EXPENSE_CATEGORIES}
          error={errors.category?.message}
          {...register('category')}
        />
        <Input label="Description *" error={errors.description?.message} {...register('description')} placeholder="e.g. Monthly rent payment" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount *" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Input label="Date *" type="date" error={errors.expense_date?.message} {...register('expense_date')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'mobile', label: 'Mobile' },
            ]}
            {...register('payment_method')}
          />
          <Input label="Reference #" {...register('reference')} placeholder="e.g. INV-001" />
        </div>
        <Input label="Notes" {...register('notes')} placeholder="Optional" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="danger" type="submit" isLoading={isSubmitting} leftIcon={<ReceiptText className="w-4 h-4" />}>
            Log Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ExpensesPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { expenses, isLoading, loadExpenses, deleteExpense } = useExpensesStore();
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const currency = profile?.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  useEffect(() => {
    if (user) loadExpenses(user.id);
  }, [user, loadExpenses]);

  const filtered = filterCat === 'all' ? expenses : expenses.filter((e) => e.category === filterCat);

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  const totalToday = expenses
    .filter((e) => e.expense_date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((s, e) => s + e.amount, 0);

  const byCategory = EXPENSE_CATEGORIES.map(({ value, label }) => ({
    value,
    label,
    total: expenses.filter((e) => e.category === value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-0.5">{expenses.length} total records</p>
        </div>
        <Button variant="danger" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Log Expense
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today" value={fmt(totalToday)} icon={<ReceiptText className="w-5 h-5" />} color="red" />
        <StatCard title="This Month" value={fmt(totalThisMonth)} icon={<ReceiptText className="w-5 h-5" />} color="amber" />
        <StatCard title="Total Records" value={expenses.length} icon={<ReceiptText className="w-5 h-5" />} color="indigo" />
        <StatCard title="Top Category" value={byCategory[0]?.label.replace(/^.+? /, '') ?? '—'} icon={<Filter className="w-5 h-5" />} color="indigo" subtitle={byCategory[0] ? fmt(byCategory[0].total) : ''} />
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-white mb-4">Spending by Category</h2>
          <div className="space-y-3">
            {byCategory.map(({ value, label, total }) => {
              const pct = totalThisMonth > 0 ? (total / totalThisMonth) * 100 : 0;
              return (
                <div key={value}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-bold text-white">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        {/* Category Filter */}
        <div className="flex gap-2 p-4 border-b border-slate-700/50 overflow-x-auto">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
          >
            All
          </button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filterCat === c.value ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="w-10 h-10" />}
            title="No expenses logged"
            description="Start tracking your business expenses."
            action={<Button variant="danger" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Log First Expense</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filtered.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30 transition-all group">
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.general}`}>
                  {expense.category}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{expense.description}</p>
                  <p className="text-[11px] text-slate-500">{format(new Date(expense.expense_date), 'dd MMM yyyy')} · {expense.payment_method}{expense.reference ? ` · ${expense.reference}` : ''}</p>
                </div>
                <p className="text-sm font-black text-red-400">{fmt(expense.amount)}</p>
                <button
                  onClick={() => deleteExpense(expense.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddExpenseModal isOpen={showModal} onClose={() => setShowModal(false)} userId={user?.id ?? ''} />
    </div>
  );
};

export default ExpensesPage;
