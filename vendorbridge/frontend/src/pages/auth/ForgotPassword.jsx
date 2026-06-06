import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { VideoBackground } from '../../components/layout/VideoBackground';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-3xl shadow-2xl p-10">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(90,225,76,0.89)' }}>
              <Boxes size={20} className="text-[#0e1311]" strokeWidth={2.5} />
            </div>
            <span className="font-schibsted font-semibold text-white text-xl tracking-tight">VendorBridge</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(90,225,76,0.20)' }}>
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="font-fustat font-bold text-white text-2xl mb-2">Check your inbox</h2>
              <p className="font-inter text-white/70 text-sm mb-6">We sent a password reset link to <strong className="text-white">{email}</strong></p>
              <Link to="/login" className="text-white font-semibold hover:underline font-inter text-sm">← Back to login</Link>
            </div>
          ) : (
            <>
              <h1 className="font-fustat font-bold text-white text-3xl tracking-tight mb-1">Reset password</h1>
              <p className="font-inter text-white/70 text-sm mb-8">Enter your email and we'll send you a reset link</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5 font-inter">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 rounded-xl text-sm font-inter outline-none"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', color: '#fff' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-inter font-semibold text-sm"
                  style={{ background: '#fff', color: '#0e1311' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center mt-5 font-inter text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <Link to="/login" className="text-white font-semibold hover:underline">← Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
