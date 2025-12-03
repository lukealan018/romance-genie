import React, { useState } from 'react';
import { Mail, Sparkles, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleMagicLink = async () => {
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setEmailSent(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMagicLink();
    }
  };

  if (emailSent) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--page-gradient)', transition: 'background 0.35s ease' }}
      >
        <div 
          className="rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
          style={{ 
            background: 'var(--card-surface-gradient)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="mb-6">
            <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Check Your Email!</h2>
            <p className="text-[rgba(255,255,255,0.6)]">
              We sent a magic link to <span style={{ color: 'var(--theme-accent)' }} className="font-semibold">{email}</span>
            </p>
          </div>

          <div 
            className="rounded-lg p-4 mb-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-sm text-[rgba(255,255,255,0.75)] mb-2">
              Click the link in your email to sign in instantly.
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.45)]">
              The link expires in 60 minutes.
            </p>
          </div>

          <button
            onClick={() => {
              setEmailSent(false);
              setEmail('');
            }}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--theme-accent)' }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--page-gradient)', transition: 'background 0.35s ease' }}
    >
      <div 
        className="rounded-2xl shadow-2xl p-8 max-w-md w-full"
        style={{ 
          background: 'var(--card-surface-gradient)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div className="text-center mb-8">
          <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--theme-accent)' }} />
          <h1 className="text-4xl font-bold text-white mb-2">Romance Genie</h1>
          <p className="text-[rgba(255,255,255,0.6)]">Your perfect night out awaits ✨</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.75)] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgba(255,255,255,0.4)] w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="your@email.com"
                className="w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none text-lg text-white placeholder-[rgba(255,255,255,0.4)]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleMagicLink}
            disabled={loading || !email}
            className="w-full py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            style={{
              background: 'var(--btn-primary-bg)',
              border: '1.5px solid var(--btn-primary-border)',
              color: 'var(--btn-primary-text)',
              boxShadow: 'var(--btn-primary-glow)',
            }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Send Magic Link
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[rgba(255,255,255,0.45)]">
            No password needed! We'll email you a link to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
