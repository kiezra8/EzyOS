import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/25 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, leftAddon, rightAddon, className, id, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative flex items-center">
      {leftAddon && <span className="absolute left-3 text-slate-400">{leftAddon}</span>}
      <input
        id={id}
        className={clsx(
          'w-full bg-slate-800/80 border text-slate-100 rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
          error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600',
          leftAddon && 'pl-9',
          rightAddon && 'pr-9',
          className
        )}
        {...props}
      />
      {rightAddon && <span className="absolute right-3 text-slate-400">{rightAddon}</span>}
    </div>
    {error && <p className="text-xs text-red-400 flex items-center gap-1">{error}</p>}
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, id, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <select
      id={id}
      className={clsx(
        'w-full bg-slate-800/80 border text-slate-100 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
        error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600',
        className
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ className?: string; children: React.ReactNode; onClick?: () => void }> = ({
  className, children, onClick,
}) => (
  <div
    onClick={onClick}
    className={clsx(
      'bg-slate-800/60 border border-slate-700/50 rounded-2xl',
      onClick && 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-200',
      className
    )}
  >
    {children}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const Badge: React.FC<{ variant?: BadgeVariant; children: React.ReactNode; className?: string }> = ({
  variant = 'default', children, className,
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50',
    warning: 'bg-amber-900/60 text-amber-400 border border-amber-700/50',
    danger: 'bg-red-900/60 text-red-400 border border-red-700/50',
    info: 'bg-indigo-900/60 text-indigo-400 border border-indigo-700/50',
  };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-fade-up', sizes[size])}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'indigo' | 'emerald' | 'amber' | 'red';
}> = ({ title, value, subtitle, icon, trend, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30',
    emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    amber: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    red: 'bg-red-600/20 text-red-400 border-red-600/30',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2.5 rounded-xl border', colorMap[color])}>{icon}</div>
        {trend && (
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded-lg', trend.value >= 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400')}>
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </Card>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({
  icon, title, description, action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 bg-slate-800 rounded-2xl mb-4 text-slate-500">{icon}</div>
    <h3 className="text-lg font-bold text-slate-300 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs mb-5">{description}</p>
    {action}
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={clsx(sizes[size], 'animate-spin text-indigo-500')} />
    </div>
  );
};
