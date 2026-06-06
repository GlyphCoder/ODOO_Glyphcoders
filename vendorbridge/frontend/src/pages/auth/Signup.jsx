import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Boxes, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { VideoBackground } from '../../components/layout/VideoBackground';
import { toast } from 'sonner';
import api from '../../lib/api';

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  role: z.enum(['procurement_officer', 'manager', 'vendor']),
  terms: z.boolean().refine(v => v === true, 'You must accept the terms'),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

const fieldStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.20)',
  color: '#fff',
  borderRadius: '0.75rem',
  padding: '0.625rem 1rem',
  fontSize: '0.875rem',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
};

export default function Signup() {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'procurement_officer' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.full_name } },
      });
      if (error) throw error;

      // Sign in immediately to get session for profile update
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInErr) throw signInErr;

      // Update profile via backend
      await api.post('/auth/signup', {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
      }).catch(() => {});

      toast.success('Account created! Welcome to VendorBridge.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    ...fieldStyle,
    border: hasError ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.20)',
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-card rounded-3xl shadow-2xl p-10">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(90,225,76,0.89)' }}>
              <Boxes size={20} className="text-[#0e1311]" strokeWidth={2.5} />
            </div>
            <span className="font-schibsted font-semibold text-white text-xl tracking-tight">VendorBridge</span>
          </div>
          <h1 className="font-fustat font-bold text-white text-3xl tracking-tight mb-1">Create account</h1>
          <p className="font-inter text-white/70 text-sm mb-7">Join your procurement workspace</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Full Name *</label>
                <input type="text" {...register('full_name')} style={inputStyle(errors.full_name)} placeholder="John Doe" />
                {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Phone</label>
                <input type="tel" {...register('phone')} style={fieldStyle} placeholder="+91 98765..." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Email Address *</label>
              <input type="email" {...register('email')} style={inputStyle(errors.email)} placeholder="you@company.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Role *</label>
              <select {...register('role')} style={{ ...fieldStyle, appearance: 'none' }}>
                <option value="procurement_officer" style={{ background: '#1a1a1a' }}>Procurement Officer</option>
                <option value="manager" style={{ background: '#1a1a1a' }}>Manager</option>
                <option value="vendor" style={{ background: '#1a1a1a' }}>Vendor</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} {...register('password')} style={inputStyle(errors.password)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Confirm Password *</label>
                <input type="password" {...register('confirm_password')} style={inputStyle(errors.confirm_password)} placeholder="••••••••" />
                {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer mt-2">
              <input type="checkbox" {...register('terms')} className="w-4 h-4 rounded" />
              <span className="text-sm text-white/70 font-inter">I agree to the Terms & Conditions</span>
            </label>
            {errors.terms && <p className="text-red-400 text-xs">{errors.terms.message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-inter font-semibold text-sm mt-2"
              style={{ background: '#000', color: '#fff' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm font-inter mt-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
