'use client';

/**
 * /auth/callback
 *
 * Users land here after clicking the Supabase magic-link email.
 * Tokens arrive in the URL hash (#access_token=...&type=magiclink).
 *
 * Strategy (avoids getSession() race):
 *   1. Subscribe to onAuthStateChange FIRST — catches the SIGNED_IN event
 *      that fires when the SDK exchanges the hash tokens.
 *   2. Also call getSession() immediately — catches the case where the SDK
 *      already processed the hash before this component mounted.
 *   3. 8-second timeout → show expired-link error with resend form.
 *
 * On success → call /api/stripe/create-checkout → redirect to Stripe.
 *              Stripe success_url → /decision?checkout_success=1
 * On error  → "Link expired" screen with email input + resend button.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

type Phase = 'verifying' | 'stripe' | 'expired' | 'config_error';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setPhase('config_error');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let settled = false;

    // Called once when we have a confirmed session
    async function onVerified(userId: string, email: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();

      setPhase('stripe');

      try {
        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userId }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error ?? 'Stripe error');
        window.location.href = data.url;
      } catch (err) {
        console.error('[Auth] Stripe checkout error:', err);
        // Fall back to paywall stripe step so the user can retry
        const params = new URLSearchParams({ step: 'stripe', userId, email });
        router.replace(`/paywall?${params.toString()}`);
      }
    }

    // 1. Listen for SIGNED_IN (fires when SDK processes the hash tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          onVerified(session.user.id, session.user.email ?? '');
        }
      }
    );

    // 2. Check for an already-established session (hash processed before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        onVerified(session.user.id, session.user.email ?? '');
      }
    });

    // 3. Timeout — link expired or invalid
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        subscription.unsubscribe();
        setPhase('expired');
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);
    setResendDone(false);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send link.');
      setResendDone(true);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setResendLoading(false);
    }
  }

  // ── Expired / error screen ────────────────────────────────────────────────
  if (phase === 'expired' || phase === 'config_error') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
            <p className="text-[#0A2540] font-semibold mb-1">
              {phase === 'config_error' ? 'Configuration error' : 'Link expired'}
            </p>
            <p className="text-[#666666] text-sm mb-5 leading-relaxed">
              {phase === 'config_error'
                ? 'App configuration error — please contact support.'
                : 'This link has expired or already been used. Enter your email to get a new one.'}
            </p>

            {phase === 'expired' && !resendDone && (
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
            )}

            {resendDone && (
              <div className="bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-4 py-3 text-center">
                <p className="text-[#0A2540] font-semibold text-sm">New link sent!</p>
                <p className="text-[#666666] text-xs mt-1">
                  Check your inbox for <span className="font-medium">{resendEmail}</span>.
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

  // ── Verifying / initiating Stripe ─────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#0A2540] font-semibold">
            {phase === 'stripe' ? 'Starting your trial…' : 'Verifying your email…'}
          </p>
          <p className="text-[#666666] text-sm mt-1">Just a moment.</p>
        </div>
      </div>
    </div>
  );
}
