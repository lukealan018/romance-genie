import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="themed-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {sent ? (
          <div className="text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--accent))]" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">
              We sent a password reset link to <span className="text-[hsl(var(--accent))] font-semibold">{email}</span>
            </p>
            <Link to="/login" className="text-sm text-[hsl(var(--accent))] hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
              <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))' }}
                />
              </div>
              {error && (
                <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-theme-primary w-full py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-[hsl(var(--accent))] hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
