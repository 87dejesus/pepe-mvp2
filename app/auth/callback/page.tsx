'use client';

/**
 * /auth/callback
 *
 * Handles two URL formats Supabase may send:
 *   PKCE flow:     ?code=xxx  (default in @supabase/ssr)
 *   Implicit flow: #access_token=xxx&refresh_token=xxx&type=magiclink
 *
 * Strategy:
 *   1. Check ?code= query param → exchangeCodeForSession()
 *   2. Check #access_token= hash fragment → setSession()
 *   3. onAuthStateChange catches SIGNED_IN from either path
 *   4. getSession() catches already-established session
 *   5. 10-second timeout → "Link expired" screen with resend form
 *
 * On success → router.replace('/decision')
 * On error   → show resend form with new-link button
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Header from '@/components/Header';

type Phase = 'verifying' | 'error';

// ─── Inner component (needs useSearchParams → must be inside Suspense) ────────

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let settled = false;

    function onSuccess() {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      console.log('[AUTH] Session verified — redirecting to /decision');
      router.replace('/decision');
    }

    function onError(reason: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      console.error('[AUTH] Auth error:', reason);
      setPhase('error');
    }

    // 1. Listen for SIGNED_IN — fires after any successful code/token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH] onAuthStateChange:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          onSuccess();
        }
      }
    );

    // 2a. PKCE flow — ?code= in query string
    const code = searchParams.get('code');
    if (code) {
      console.log('[AUTH] Found ?code= — calling exchangeCodeForSession');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          onError(`exchangeCodeForSession: ${error.message}`);
        } else if (data.session) {
          // onAuthStateChange may not fire in all SDK versions; guard here
          onSuccess();
        }
      });
    }

    // 2b. Implicit flow — #access_token= in hash fragment
    // window.location.hash is not available during SSR; access it inside useEffect
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!code && hash.includes('access_token=')) {
      console.log('[AUTH] Found #access_token= — parsing hash tokens');
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            if (error) {
              onError(`setSession: ${error.message}`);
            } else if (data.session) {
              onSuccess();
            }
          });
      } else {
        onError('Hash present but access_token/refresh_token missing');
      }
    }

    // 3. Check for already-established session (covers repeated visits / fast SDK)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('[AUTH] getSession returned active session');
        onSuccess();
      }
    });

    // 4. If neither code nor hash is present, start the timeout immediately
    if (!code && !hash.includes('access_token=')) {
      console.warn('[AUTH] No ?code or #access_token in URL — waiting for onAuthStateChange');
    }

    // 5. Timeout — catches misconfigured links, expired codes, missing verifier
    const timeoutId = setTimeout(() => {
      if (!settled) onError('Timeout after 10s — no session established');
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router, searchParams]);

  // ── Resend handler — also hardcodes production redirectTo ────────────────
  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);
    setResendDone(false);
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : 'https://thesteadyone.com/auth/callback';
    console.log('[AUTH] Resend — using redirectTo:', redirectTo);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: resendEmail.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
      setResendDone(true);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setResendLoading(false);
    }
  }

  // ── Error / expired screen ────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
        <Header variant="light" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
            <p className="text-[#0A2540] font-semibold mb-1">Link expired</p>
            <p className="text-[#666666] text-sm mb-5 leading-relaxed">
              This link has expired or already been used. Enter your email below
              to get a fresh link. Check your inbox <em>and</em> spam folder.
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
                  Check your inbox for{' '}
                  <span className="font-medium">{resendEmail}</span>.
                  Also check spam.
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
      </div>
    );
  }

  // ── Verifying screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#0A2540] font-semibold">Verifying your email…</p>
          <p className="text-[#666666] text-sm mt-1">Just a moment.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F6F3]">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
