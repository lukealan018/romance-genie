import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let retryTimerId: NodeJS.Timeout;
    
    const handleAuthCallback = async () => {
      // Check for auth params in URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      // Check for access_token (hash fragment) or code (PKCE)
      const accessToken = hashParams.get('access_token');
      const code = queryParams.get('code');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
      
      if (errorDescription) {
        setError(errorDescription);
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // If there's a code (PKCE flow), exchange it
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError(error.message);
            clearTimeout(timeoutId);
            clearTimeout(retryTimerId);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
          if (data.session) {
            clearTimeout(timeoutId);
            clearTimeout(retryTimerId);
            navigate('/');
            return;
          }
        } catch (err: any) {
          console.error('PKCE exchange error:', err);
          setError(err.message || 'Authentication failed');
          clearTimeout(timeoutId);
          clearTimeout(retryTimerId);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      // If there's an access_token in hash, wait for Supabase to auto-process
      if (accessToken) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Check for existing session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Invalid token') || error.message.includes('expired')) {
            setError('This link has expired or is invalid. Please request a new one.');
          } else {
            setError(error.message);
          }
          clearTimeout(timeoutId);
          clearTimeout(retryTimerId);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (session) {
          clearTimeout(timeoutId);
          clearTimeout(retryTimerId);
          navigate('/');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Something went wrong');
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        setTimeout(() => navigate('/login'), 3000);
      }
    };
    
    // Set up auth state listener to handle token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        navigate('/');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        navigate('/');
      } else if (event === 'USER_UPDATED' && session) {
        clearTimeout(timeoutId);
        clearTimeout(retryTimerId);
        navigate('/');
      }
    });

    // Show "Taking too long?" option after 3 seconds
    retryTimerId = setTimeout(() => setShowRetry(true), 3000);

    // Set 10-second timeout for authentication
    timeoutId = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError('Authentication timed out. The link may have expired or been used already. Please request a new one.');
          setTimeout(() => navigate('/login'), 3000);
        }
      });
    }, 10000);

    // Handle the auth callback
    handleAuthCallback();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
      clearTimeout(retryTimerId);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Oops!</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-sm text-slate-500">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-spin" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Signing you in…</h2>
        <p className="text-slate-400 mb-4">Just a moment while we verify your magic link ✨</p>
        
        {showRetry && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-500 text-sm mb-3">Taking too long?</p>
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              Request a new magic link →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
