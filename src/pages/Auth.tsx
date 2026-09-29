import React, { useState } from 'react';
import { Store, Lock, Mail, Eye, EyeOff, Building2, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '../lib/schemas';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Select } from '../components/ui';
import clsx from 'clsx';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) as any });
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { business_type: 'hybrid' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setError('');
    try {
      await signIn(data.email, data.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setError('');
    try {
      await signUp(data.email, data.password, data.business_name, data.business_type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex gradient-bg">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-indigo-950/40 border-r border-slate-700/50 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">EzyOS</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Smart Business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Management
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            The all-in-one platform for retail and wholesale businesses. POS, inventory, expenses, and reports — all in one place.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative space-y-4">
          {[
            { icon: '⚡', text: 'Lightning-fast Point of Sale with offline support' },
            { icon: '📦', text: 'Batch tracking with automatic expiry alerts' },
            { icon: '📊', text: 'Real-time P&L reports and inventory valuation' },
            { icon: '🔄', text: 'Works offline, syncs to cloud automatically' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <span className="text-slate-300 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-white">EzyOS</span>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-2xl p-1 mb-8">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize',
                  mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <Input
                id="login-email"
                label="Email Address"
                type="email"
                placeholder="you@business.com"
                leftAddon={<Mail className="w-4 h-4" />}
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <div className="relative">
                <Input
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftAddon={<Lock className="w-4 h-4" />}
                  rightAddon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />
              </div>
              <Button variant="primary" size="lg" className="w-full mt-2" type="submit" isLoading={isLoading}>
                Sign In to EzyOS
              </Button>
              <p className="text-center text-xs text-slate-500 mt-2">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <Input
                id="reg-biz"
                label="Business Name"
                placeholder="My Awesome Shop"
                leftAddon={<Building2 className="w-4 h-4" />}
                error={registerForm.formState.errors.business_name?.message}
                {...registerForm.register('business_name')}
              />
              <Select
                id="reg-type"
                label="Business Type"
                options={[
                  { value: 'retail', label: '🛍️ Retail — Sell directly to customers' },
                  { value: 'wholesale', label: '🏭 Wholesale — Bulk orders & distributors' },
                  { value: 'hybrid', label: '⚡ Hybrid — Both retail & wholesale' },
                ]}
                error={registerForm.formState.errors.business_type?.message}
                {...registerForm.register('business_type')}
              />
              <Input
                id="reg-email"
                label="Email Address"
                type="email"
                placeholder="you@business.com"
                leftAddon={<Mail className="w-4 h-4" />}
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <Input
                id="reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                leftAddon={<Lock className="w-4 h-4" />}
                rightAddon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={registerForm.formState.errors.password?.message}
                {...registerForm.register('password')}
              />
              <Button variant="primary" size="lg" className="w-full mt-2" type="submit" isLoading={isLoading} leftIcon={<ShieldCheck className="w-5 h-5" />}>
                Create My Business Account
              </Button>
              <p className="text-center text-xs text-slate-500">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
