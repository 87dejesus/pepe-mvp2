'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const code = searchParams.get('code');

    console.log('[AUTH CALLBACK] Page loaded — code present:', !!code);

    const run = async () => {
      try {
        if (code) {
          console.log('[AUTH CALLBACK] Exchanging code...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('[AUTH CALLBACK] Success — redirecting to /decision');
          setStatus('success');
          router.push('/decision');
        } else {
          throw new Error('No session after exchange');
        }
      } catch (err) {
        console.error('[AUTH CALLBACK] Error:', err);
        setStatus('error');
      }
    };

    run();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH CALLBACK] onAuthStateChange:', event);
      if (event === 'SIGNED_IN' && session) {
        router.push('/decision');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [searchParams, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);
    setResendDone(false);
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : 'https://thesteadyone.com/auth/callback';
    console.log('[AUTH CALLBACK] Resend — redirectTo:', redirectTo);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.signInWithOtp({
        email: resendEmail.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setResendDone(true);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setResendLoading(false);
    }
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F6F3] px-4">
        <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <p className="text-[#0A2540] font-semibold mb-1">Link expired</p>
          <p className="text-[#666666] text-sm mb-5 leading-relaxed">
            This link has expired or already been used. Enter your email to get a new one.
            Check your inbox and spam folder.
          </p>

          {!resendDone ? (
            <form onSubmit={handleResend} className="space-y-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@email.com"
                required
                autoFocus
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
              />
              <button
                type="submit"
                disabled={resendLoading || !resendEmail.trim()}
                className="w-full h-11 rounded-lg bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] disabled:opacity-50 transition-all"
              >
                {resendLoading ? 'Sending…' : 'Send new link →'}
              </button>
              {resendError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {resendError}
                </p>
              )}
            </form>
          ) : (
            <div className="bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-4 py-3 text-center">
              <p className="text-[#0A2540] font-semibold text-sm">New link sent!</p>
              <p className="text-[#666666] text-xs mt-1">
                Check your inbox for <span className="font-medium">{resendEmail}</span>. Also check spam.
              </p>
            </div>
          )}

          <a
            href="/paywall"
            className="mt-4 block text-center text-xs text-[#666666] hover:text-[#0A2540] underline"
          >
            ← Back to signup
          </a>
        </div>
      </div>
    );
  }

  // ── Verifying / success screen ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F6F3] px-4">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#0A2540] font-semibold">
          {status === 'success' ? 'Login successful!' : 'Verifying your email…'}
        </p>
        <p className="text-[#666666] text-sm mt-1">Just a moment.</p>
      </div>
    </div>
  );
}

// Suspense required by Next.js App Router when useSearchParams is used in a page
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F6F3]">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
