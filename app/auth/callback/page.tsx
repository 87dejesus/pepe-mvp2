'use client';

/**
 * /auth/callback
 *
 * Users land here after clicking the Supabase magic-link email.
 * Supabase uses PKCE flow by default: the link contains ?code=xxx.
 *
 * Strategy:
 *   1. Read ?code from URL and call exchangeCodeForSession() — this works
 *      because signInWithOtp() was called from the browser, so the PKCE
 *      verifier is already in localStorage.
 *   2. Also subscribe to onAuthStateChange in case the SDK auto-processes
 *      the code before the effect runs.
 *   3. 8-second timeout → show "Link expired" screen with resend form.
 *
 * On success → redirect to /decision
 * On error  → "Link expired" screen with email input + resend button.
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Header from '@/components/Header';

type Phase = 'verifying' | 'error';

// ─── Inner component (needs useSearchParams → must be in Suspense) ────────────

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
      router.replace('/decision');
    }

    function onError() {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      setPhase('error');
    }

    // 1. Subscribe to SIGNED_IN first (fires after any successful exchange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          onSuccess();
        }
      }
    );

    // 2. If there's a PKCE code in the URL, exchange it explicitly
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('[Auth] exchangeCodeForSession error:', error.message);
          onError();
        }
        // On success, onAuthStateChange fires SIGNED_IN → onSuccess()
      });
    }

    // 3. Also check for an already-established session (handles edge cases
    //    where the SDK processed the code before this effect ran)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) onSuccess();
    });

    // 4. Timeout — link expired, wrong URL, or cookie/localStorage mismatch
    const timeoutId = setTimeout(() => {
      if (!settled) onError();
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router, searchParams]);

  // ── Resend form handler ───────────────────────────────────────────────────
  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);
    setResendDone(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: resendEmail.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
              This link has expired or already been used. Enter your email to get a new one.
              Check your inbox (including spam).
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

// ─── Page export (Suspense required for useSearchParams) ──────────────────────

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
