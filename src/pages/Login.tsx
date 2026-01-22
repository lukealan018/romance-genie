import React, { useState } from 'react';
import { Mail, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;

    setVerifying(true);
    setError('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (error) throw error;

      // Successfully verified - redirect to home
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Invalid code. Please try again.');
      setOtpCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setOtpCode('');
    setError('');
    await handleMagicLink();
  };

  if (emailSent) {
    return (
      <div className="themed-page-bg min-h-screen flex items-center justify-center p-4">
        <div className="card-glass rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Enter Your Code</h2>
            <p className="text-[rgba(255,255,255,0.6)] text-sm">
              We sent a 6-digit code to <span style={{ color: 'var(--theme-accent)' }} className="font-semibold">{email}</span>
            </p>
            <p className="text-[rgba(255,255,255,0.45)] text-xs mt-1">
              Look for the code below the magic link in your email
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
                onComplete={handleVerifyOtp}
                className="gap-2"
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                  <InputOTPSlot index={1} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                  <InputOTPSlot index={2} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                  <InputOTPSlot index={3} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                  <InputOTPSlot index={4} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                  <InputOTPSlot index={5} className="w-12 h-14 bg-white/5 border-0 border-b-2 border-white/20 rounded-none text-white text-xl font-semibold focus-within:border-[var(--theme-accent)]" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={verifying || otpCode.length !== 6}
            className="btn-theme-primary w-full py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {verifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>

          <div 
            className="rounded-lg p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs text-[rgba(255,255,255,0.45)]">
              Didn't receive the code? Check your spam folder.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleResendCode}
              disabled={loading}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--theme-accent)' }}
            >
              {loading ? 'Sending...' : 'Resend code'}
            </button>
            <span className="text-[rgba(255,255,255,0.3)]">•</span>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
                setOtpCode('');
                setError('');
              }}
              className="text-sm font-medium text-[rgba(255,255,255,0.6)] flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="themed-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Sparkles className="themed-icon w-16 h-16 mx-auto mb-4" />
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
            className="btn-theme-primary w-full py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending magic link...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
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
