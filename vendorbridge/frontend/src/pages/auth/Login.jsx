import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Boxes, Loader2, ShieldCheck, Briefcase, ClipboardList, Building2, ChevronDown, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { VideoBackground } from '../../components/layout/VideoBackground';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

const INTERNAL_DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@vendorbridge.com',
    password: 'Demo@12345',
    icon: ShieldCheck,
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.15)',
    description: 'Full access',
  },
  {
    label: 'Manager',
    email: 'manager@vendorbridge.com',
    password: 'Demo@12345',
    icon: Briefcase,
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.15)',
    description: 'Approvals & reports',
  },
  {
    label: 'Officer',
    email: 'officer@vendorbridge.com',
    password: 'Demo@12345',
    icon: ClipboardList,
    color: 'rgba(90,225,76,0.89)',
    bg: 'rgba(90,225,76,0.12)',
    description: 'RFQs & POs',
  },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorError, setVendorError] = useState('');
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);
  const vendorMenuCloseTimer = useRef(null);
  const navigate = useNavigate();
  const { initialize } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  useEffect(() => {
    let mounted = true;

    const loadVendors = async () => {
      setVendorLoading(true);
      setVendorError('');
      try {
        const { data } = await api.get('/auth/demo-vendors');
        if (mounted) setVendors(data.data || []);
      } catch (err) {
        if (mounted) setVendorError(err.message || 'Unable to load vendors');
      } finally {
        if (mounted) setVendorLoading(false);
      }
    };

    loadVendors();

    return () => {
      mounted = false;
      if (vendorMenuCloseTimer.current) clearTimeout(vendorMenuCloseTimer.current);
    };
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await initialize();
    toast.success('Welcome back!');
    navigate('/dashboard');
  };

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (account) => {
    setDemoLoading(account.label);
    try {
      await signIn(account.email, account.password);
    } catch (err) {
      toast.error(`Demo login failed: ${err.message}`);
    } finally {
      setDemoLoading(null);
    }
  };

  const loginAsVendor = async (vendor) => {
    setDemoLoading(vendor.email);
    try {
      await signIn(vendor.email, 'Demo@12345');
    } catch (err) {
      toast.error(`Vendor login failed: ${err.message}`);
    } finally {
      setDemoLoading(null);
    }
  };

  const openVendorMenu = () => {
    if (vendorMenuCloseTimer.current) {
      clearTimeout(vendorMenuCloseTimer.current);
      vendorMenuCloseTimer.current = null;
    }
    setVendorMenuOpen(true);
  };

  const closeVendorMenu = () => {
    if (vendorMenuCloseTimer.current) clearTimeout(vendorMenuCloseTimer.current);
    vendorMenuCloseTimer.current = setTimeout(() => setVendorMenuOpen(false), 140);
  };

  const vendorCount = vendors.length;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <VideoBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-3xl shadow-2xl p-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(90,225,76,0.89)' }}>
              <Boxes size={20} className="text-[#0e1311]" strokeWidth={2.5} />
            </div>
            <span className="font-schibsted font-semibold text-white text-xl tracking-tight">VendorBridge</span>
          </div>

          {/* Headline */}
          <h1 className="font-fustat font-bold text-white text-3xl tracking-tight mb-1">Welcome back</h1>
          <p className="font-inter text-white/70 text-sm mb-6">Sign in to your procurement workspace</p>

          {/* Demo Account Quick Login */}
          <div className="mb-6">
            <p className="text-xs font-schibsted font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTERNAL_DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                const isLoading = demoLoading === account.label;
                return (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => loginAsDemo(account)}
                    disabled={!!demoLoading || loading}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-250 disabled:opacity-50"
                    style={{
                      background: account.bg,
                      border: `1px solid ${account.color}40`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = account.bg.replace('0.1', '0.2').replace('0.12', '0.22').replace('0.15', '0.25')}
                    onMouseLeave={e => e.currentTarget.style.background = account.bg}
                  >
                    {isLoading
                      ? <Loader2 size={15} className="animate-spin shrink-0" style={{ color: account.color }} />
                      : <Icon size={15} className="shrink-0" style={{ color: account.color }} />
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-schibsted font-semibold text-white leading-none">{account.label}</p>
                      <p className="text-xs font-inter mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{account.description}</p>
                    </div>
                  </button>
                );
              })}

              <div
                className="relative col-span-2"
                onMouseEnter={openVendorMenu}
                onMouseLeave={closeVendorMenu}
              >
                <button
                  type="button"
                  onClick={() => setVendorMenuOpen(v => !v)}
                  disabled={vendorLoading || !!vendorError}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-250 disabled:opacity-50"
                  style={{
                    background: 'rgba(217,119,6,0.15)',
                    border: '1px solid rgba(217,119,6,0.25)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.20)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.15)'}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,6,0.18)' }}>
                    {vendorLoading
                      ? <Loader2 size={15} className="animate-spin" style={{ color: '#f59e0b' }} />
                      : <Store size={15} style={{ color: '#f59e0b' }} />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-schibsted font-semibold text-white leading-none">Vendor</p>
                    <p className="text-xs font-inter mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {vendorLoading ? 'Loading vendor accounts...' : `${vendorCount} account${vendorCount === 1 ? '' : 's'} available`}
                    </p>
                  </div>
                  <ChevronDown size={15} className={`shrink-0 transition-transform ${vendorMenuOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.55)' }} />
                </button>

                {vendorMenuOpen && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-2xl p-2 shadow-2xl"
                    style={{
                      background: 'rgba(12, 16, 15, 0.96)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      backdropFilter: 'blur(18px)',
                      WebkitBackdropFilter: 'blur(18px)',
                    }}
                    onMouseEnter={openVendorMenu}
                    onMouseLeave={closeVendorMenu}
                  >
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {vendorLoading ? (
                        <div className="rounded-xl px-3 py-4 text-center text-xs font-inter" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                          Loading vendor accounts...
                        </div>
                      ) : vendors.length === 0 ? (
                        <div className="rounded-xl px-3 py-4 text-center text-xs font-inter" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                          No vendors found
                        </div>
                      ) : vendors.map((vendor) => {
                        const isLoading = demoLoading === vendor.email;
                        return (
                          <button
                            key={vendor.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setVendorMenuOpen(false);
                              loginAsVendor(vendor);
                            }}
                            disabled={!!demoLoading || loading}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-250 disabled:opacity-50"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,6,0.16)' }}>
                              {isLoading
                                ? <Loader2 size={15} className="animate-spin" style={{ color: '#f59e0b' }} />
                                : <Building2 size={15} style={{ color: '#f59e0b' }} />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-schibsted font-semibold text-white truncate">{vendor.company_name}</p>
                              <p className="text-xs font-inter mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {vendor.contact_person || vendor.category || vendor.email}
                              </p>
                            </div>
                            <span className="text-[11px] font-inter shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {vendor.email}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {vendorError ? (
              <p className="mt-2 text-xs font-inter text-center" style={{ color: '#fca5a5' }}>
                {vendorError}
              </p>
            ) : null}
            <p className="text-xs font-inter mt-2 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              All demo accounts use password: <span className="font-semibold text-white/50">Demo@12345</span>
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span className="text-white/40 text-xs font-inter">or sign in manually</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Email address</label>
              <input
                type="email"
                {...register('email')}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-inter outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: errors.email ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.20)',
                  color: '#fff',
                }}
                onFocus={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                onBlur={e => e.target.style.background = 'rgba(255,255,255,0.10)'}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1 font-inter">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-inter outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    border: errors.password ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.20)',
                    color: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1 font-inter">{errors.password.message}</p>}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('remember')} className="rounded" />
                <span className="text-sm text-white/70 font-inter">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-white/70 hover:text-white font-inter transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!demoLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-inter font-semibold text-sm transition-all"
              style={{ background: '#fff', color: '#0e1311' }}
              onMouseEnter={e => !(loading || demoLoading) && (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = '#fff')}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span className="text-white/40 text-xs font-inter">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <p className="text-center text-sm font-inter" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-white font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
