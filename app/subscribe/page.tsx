'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { cacheServerAccess, invalidateAccessCache, type AccessStatus } from '@/lib/access';

const ADMIN_EMAIL = 'luhciano.sj@gmail.com';

type ServerAccessData = {
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

function hasGrantedAccess(data: ServerAccessData): boolean {
  if (data.status === 'trialing' || data.status === 'active') return true;
  if (data.status === 'canceled' && data.current_period_end) {
    return new Date(data.current_period_end) > new Date();
  }
  return false;
}

// ── Copy map ──────────────────────────────────────────────────────────────────

const REASON_COPY: Record<string, { heading: string; body: string }> = {
  trial_ended: {
    heading: 'Your free trial has ended',
    body: "Your 3-day trial is up. Subscribe to keep access to Heed's NYC apartment analysis — $9.49 / 30 days.",
  },
  canceled: {
    heading: 'Your subscription has ended',
    body: 'Your access period has expired. Re-subscribe at $9.49 / 30 days to continue using Heed.',
  },
  payment_failed: {
    heading: 'Update your payment method',
    body: "Your card was declined and your subscription is paused. Update your payment method to restore access — no new subscription needed.",
  },
};

const DEFAULT_COPY = {
  heading: 'Subscribe to continue',
  body: "Get full access to Heed's NYC apartment analysis for $9.49 / 30 days.",
};

const FEATURES = [
  'Match score based on your real constraints',
  'Apply Today vs Wait Thoughtfully — no false urgency',
  'Incentive detection: free months, no-fee deals',
  "Heed's take on every listing",
];

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0A2540]/40 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#666666]">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ── Spinner (inline button) ───────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      Loading…
    </span>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? '';
  const checkoutSuccess = searchParams.get('checkout_success') === '1';
  const portalReturn = searchParams.get('portal_return') === '1';
  const sessionId = searchParams.get('session_id') ?? null;

  const isPaymentFailed = reason === 'payment_failed';
  const copy = REASON_COPY[reason] ?? DEFAULT_COPY;

  // Phase states:
  // 'loading'           — auth + access check in progress (or redirect happening)
  // 'verifying_payment' — returned from Stripe checkout or portal, polling for webhook
  // 'ready'             — user must act (subscribe or update card)
  // 'payment_pending'   — polling exhausted, action completed but webhook not yet
  type Phase = 'loading' | 'verifying_payment' | 'ready' | 'payment_pending';
  const [phase, setPhase] = useState<Phase>('loading');

  // Which return path triggered payment_pending (affects copy in that phase)
  const [pendingContext, setPendingContext] = useState<'checkout' | 'portal'>('checkout');

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when server returned no_stripe_customer — needs support, not retry
  const [noCustomer, setNoCustomer] = useState(false);

  // Auto-retry: counts down in payment_pending and fires handleRecheck once automatically
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const autoRetried = useRef(false);

  // Direct session verification — bypasses webhook timing.
  // Defined at component scope so it can be called from both init() and handleRecheck().
  async function checkSessionDirect(sid: string): Promise<boolean> {
    try {
      console.log('[subscribe] check-session pre-flight for', sid);
      const res = await fetch(`/api/stripe/check-session?session_id=${sid}`);
      const data = await res.json() as { status?: string; trial_ends_at?: string | null; current_period_end?: string | null; error?: string };
      console.log('[subscribe] check-session result:', res.status, data);
      if (res.ok && (data.status === 'trialing' || data.status === 'active')) {
        cacheServerAccess({
          status: data.status as AccessStatus,
          trial_ends_at: data.trial_ends_at ?? null,
          current_period_end: data.current_period_end ?? null,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[subscribe] check-session threw — falling back to poll:', e);
      return false;
    }
  }

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function fetchAccess(): Promise<ServerAccessData | null> {
      try {
        const res = await fetch('/api/auth/access-status');
        if (!res.ok) return null;
        return res.json() as Promise<ServerAccessData>;
      } catch {
        return null;
      }
    }

    // Shared polling helper — used by both checkoutSuccess and portalReturn paths
    async function pollForAccess(): Promise<boolean> {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
        console.log(`[subscribe] pollForAccess attempt ${attempt + 1}/5`);
        const data = await fetchAccess();
        console.log(`[subscribe] access-status response: ${data?.status ?? 'null'}`);
        if (data && hasGrantedAccess(data)) {
          cacheServerAccess({
            status: data.status as AccessStatus,
            trial_ends_at: data.trial_ends_at,
            current_period_end: data.current_period_end,
          });
          return true;
        }
      }
      console.log('[subscribe] pollForAccess exhausted — access not yet granted');
      return false;
    }

    async function init() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/paywall');
        return;
      }

      // Admin always has full access
      if ((user.email ?? '').toLowerCase().trim() === ADMIN_EMAIL) {
        router.replace('/decision');
        return;
      }

      // ── Returning from Stripe checkout ─────────────────────────────────────
      if (checkoutSuccess) {
        invalidateAccessCache();
        setPhase('verifying_payment');
        console.log('[subscribe] Returned from checkout — session_id:', sessionId ?? '(none)');

        // Fast-path: verify session directly from Stripe API, no webhook needed
        if (sessionId?.startsWith('cs_')) {
          const granted = await checkSessionDirect(sessionId);
          if (granted) {
            router.replace('/decision');
            return;
          }
        }

        // Fallback: poll access-status waiting for webhook to update the DB
        const granted = await pollForAccess();
        if (granted) {
          router.replace('/decision');
          return;
        }
        setPendingContext('checkout');
        setPhase('payment_pending');
        return;
      }

      // ── Returning from Stripe billing portal ───────────────────────────────
      // Stripe retries open invoices automatically when a payment method is updated.
      // Poll for the resulting webhook to update subscription_status to 'active'.
      if (portalReturn) {
        invalidateAccessCache();
        setPhase('verifying_payment');
        const granted = await pollForAccess();
        if (granted) {
          router.replace('/decision');
          return;
        }
        setPendingContext('portal');
        setPhase('payment_pending');
        return;
      }

      // ── Normal page load ───────────────────────────────────────────────────
      // Redirect away if user already has valid access (e.g. navigated here manually)
      const data = await fetchAccess();
      if (data && hasGrantedAccess(data)) {
        cacheServerAccess({
          status: data.status as AccessStatus,
          trial_ends_at: data.trial_ends_at,
          current_period_end: data.current_period_end,
        });
        router.replace('/decision');
        return;
      }

      setPhase('ready');
    }

    init();
  }, [checkoutSuccess, portalReturn, sessionId, router]);

  // Auto-retry: when stuck in payment_pending, count down 15s and fire one automatic recheck.
  // This covers the case where the Stripe subscription is briefly in 'incomplete' state
  // (payment processing) and becomes 'active' a few seconds after the redirect.
  useEffect(() => {
    if (phase !== 'payment_pending' || autoRetried.current) return;
    autoRetried.current = true;
    let remaining = 15;
    setRetryCountdown(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      setRetryCountdown(remaining > 0 ? remaining : null);
      if (remaining <= 0) {
        clearInterval(interval);
        handleRecheck();
      }
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Manual recheck from payment_pending state.
  // Mirrors the same check-session + polling combo used during init().
  async function handleRecheck() {
    setPhase('verifying_payment');
    try {
      // Direct session check — writes DB without needing a webhook
      if (sessionId?.startsWith('cs_')) {
        const granted = await checkSessionDirect(sessionId);
        if (granted) {
          router.replace('/decision');
          return;
        }
      }

      // Poll access-status — catches webhook updates that may have arrived
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch('/api/auth/access-status');
        if (res.ok) {
          const data: ServerAccessData = await res.json();
          if (hasGrantedAccess(data)) {
            cacheServerAccess({
              status: data.status as AccessStatus,
              trial_ends_at: data.trial_ends_at,
              current_period_end: data.current_period_end,
            });
            router.replace('/decision');
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    setPhase('payment_pending');
  }

  // New subscription via Stripe Checkout (trial_ended, canceled)
  async function handleSubscribe() {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout session');
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setCheckoutLoading(false);
    }
  }

  // Update payment method via Stripe Billing Portal (payment_failed only)
  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    setNoCustomer(false);
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === 'no_stripe_customer') {
          setNoCustomer(true);
          setPortalLoading(false);
          return;
        }
        throw new Error(data.error ?? 'Failed to open billing portal');
      }
      if (!data.url) throw new Error('No portal URL returned');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPortalLoading(false);
    }
  }

  // ── Phase renders ─────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return <LoadingScreen message="Checking your access…" />;
  }

  if (phase === 'verifying_payment') {
    return <LoadingScreen message={portalReturn ? 'Restoring your access…' : 'Confirming your access…'} />;
  }

  if (phase === 'payment_pending') {
    const pendingHeading =
      pendingContext === 'portal'
        ? 'Payment update in progress'
        : 'Checkout complete — activating access';
    const pendingBody =
      pendingContext === 'portal'
        ? "Your payment method was updated. Stripe is retrying your invoice — this usually takes a few seconds."
        : "Your payment was received. Access confirmation is taking a moment longer than usual — click below to check. You will not be charged again.";

    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
        <Header variant="light" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="max-w-sm w-full">
            <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h1 className="text-lg font-bold text-[#0A2540] mb-2">{pendingHeading}</h1>
              <p className="text-sm text-[#666666] leading-relaxed mb-6">{pendingBody}</p>
              <button
                onClick={handleRecheck}
                className="w-full h-12 rounded-xl bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] transition-all mb-3"
              >
                Check access now
              </button>
              <p className="text-xs text-[#999999] leading-relaxed mb-3">
                {retryCountdown !== null
                  ? `Checking automatically in ${retryCountdown}s…`
                  : 'Still processing? Click above to check again. You can also close this page and come back — your access will be ready once it activates.'}
              </p>
              <Link
                href="/paywall"
                className="text-xs text-[#666666] underline underline-offset-2 hover:text-[#0A2540]"
              >
                ← Back to sign-in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── phase === 'ready' ─────────────────────────────────────────────────────

  // payment_failed: simplified card — update payment method, no new subscription
  if (isPaymentFailed) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
        <Header variant="light" />

        <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-8 overflow-y-auto">
          <div className="max-w-sm w-full">
            <div className="text-center mb-5">
              <Image
                src="/brand/heed-mascot.png"
                alt="Heed mascot"
                width={80}
                height={80}
                className="object-contain mx-auto mb-3"
              />
              <h1 className="text-xl font-bold text-[#0A2540] leading-tight">{copy.heading}</h1>
              <p className="text-sm text-[#666666] mt-2 leading-relaxed">{copy.body}</p>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 mb-4">
              {noCustomer ? (
                // stripe_customer_id missing — no retry possible
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0A2540] mb-2">Billing account not found</p>
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    We couldn&apos;t locate your billing account. This is unusual — please contact support and we&apos;ll sort it out.
                  </p>
                  <a
                    href="mailto:support@thesteadyone.com"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] transition-all"
                  >
                    Contact support
                  </a>
                </div>
              ) : (
                <>
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full h-12 rounded-xl bg-[#00A651] text-white font-semibold text-sm hover:bg-[#00913f] disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    {portalLoading ? <Spinner /> : 'Update payment method'}
                  </button>

                  {error && (
                    <div className="mt-3">
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        {error}
                      </p>
                      <button
                        onClick={() => setError(null)}
                        className="mt-2 w-full h-10 rounded-lg border border-[#E5E5E5] bg-white text-[#0A2540] font-semibold text-sm hover:bg-[#F8F6F3] transition-all"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-[#999999] text-center leading-relaxed mt-3">
                    You&apos;ll be taken to a secure Stripe page to update your card. Your subscription remains active.
                  </p>
                </>
              )}
            </div>

            <div className="text-center pb-safe">
              <Link href="/paywall" className="text-xs text-[#666666] hover:text-[#0A2540] underline">
                ← Back to sign-in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // trial_ended / canceled / default: full subscribe form with features + price
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-8 overflow-y-auto">
        <div className="max-w-sm w-full">
          <div className="text-center mb-5">
            <Image
              src="/brand/heed-mascot.png"
              alt="Heed mascot"
              width={80}
              height={80}
              className="object-contain mx-auto mb-3"
            />
            <h1 className="text-xl font-bold text-[#0A2540] leading-tight">{copy.heading}</h1>
            <p className="text-sm text-[#666666] mt-2 leading-relaxed">{copy.body}</p>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-3">
              What you get
            </p>
            <ul className="space-y-2.5 mb-5">
              {FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                  <span className="text-[#00A651] font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-[#0A2540]">$9.49</span>
              <span className="text-[#666666] text-sm">/ 30 days</span>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="w-full h-12 rounded-xl bg-[#00A651] text-white font-semibold text-sm hover:bg-[#00913f] disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              {checkoutLoading ? <Spinner /> : 'Subscribe now'}
            </button>

            {error && (
              <div className="mt-3">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 w-full h-10 rounded-lg border border-[#E5E5E5] bg-white text-[#0A2540] font-semibold text-sm hover:bg-[#F8F6F3] transition-all"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#999999] text-center leading-relaxed mb-4">
            Secure checkout via Stripe. You will not be charged during any active free trial period.
          </p>

          <div className="text-center pb-safe">
            <Link href="/paywall" className="text-xs text-[#666666] hover:text-[#0A2540] underline">
              ← Back to sign-in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeContent />
    </Suspense>
  );
}
