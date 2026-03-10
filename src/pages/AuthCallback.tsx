import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let retryTimerId: ReturnType<typeof setTimeout>;

    const handleAuthCallback = async () => {
      // FAST PATH: existing session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) { navigate('/'); return; }

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get('access_token');
      const code = queryParams.get('code');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      if (errorDescription) {
        setError(errorDescription);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) { setError(error.message); setTimeout(() => navigate('/login'), 3000); return; }
          if (data.session) { navigate('/'); return; }
        } catch (err: any) {
          setError(err.message || 'Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      if (accessToken) await new Promise(r => setTimeout(r, 200));

      try {
        const { data: s, error } = await supabase.auth.getSession();
        if (error) { setError(error.message); setTimeout(() => navigate('/login'), 3000); return; }
        if (s?.session) navigate('/');
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    const { data: authStateData } = supabase.auth.onAuthStateChange((event, session) => {
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session) {
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        navigate('/');
      }
    });

    retryTimerId = setTimeout(() => setShowRetry(true), 3000);
    timeoutId = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data?.session) {
          setError('Authentication timed out. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        }
      });
    }, 10000);

    handleAuthCallback();

    return () => {
      authStateData?.subscription?.unsubscribe();
      clearTimeout(timeoutId);
      clearTimeout(retryTimerId);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="themed-page-bg min-h-screen flex items-center justify-center p-4">
        <div className="card-glass rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-destructive mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="themed-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--accent))] animate-spin" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Verifying your account…</h2>
        <p className="text-muted-foreground mb-4">Just a moment ✨</p>
        {showRetry && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-muted-foreground text-sm mb-3">Taking too long?</p>
            <button onClick={() => navigate('/login')} className="text-[hsl(var(--accent))] hover:underline text-sm font-medium">
              Go back to login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
