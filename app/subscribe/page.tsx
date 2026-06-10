'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { cacheServerAccess, invalidateAccessCache, type AccessStatus } from '@/lib/access';

const ADMIN_EMAIL = 'luhciano.sj@gmail.com';

const NAVY = '#0A2540';
const GREEN = '#00A651';
const LINE = 'rgba(255,255,255,.14)';
const SERIF = 'var(--font-caslon), Georgia, serif';

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
// One-time payment, no trial. Re-unlock language for returning buyers.

const REASON_COPY: Record<string, { heading: string; body: string }> = {
  trial_ended: {
    heading: 'Your 30 days are up',
    body: "Re-unlock the honest read on every place you're weighing. $9.49, one time.",
  },
  canceled: {
    heading: 'Your 30 days are up',
    body: "Re-unlock the honest read on every place you're weighing. $9.49, one time.",
  },
  payment_failed: {
    heading: 'Update your card',
    body: 'Your card was declined and your access is paused. Fix the card to turn it back on. No new charge to set up.',
  },
};

const DEFAULT_COPY = {
  heading: 'Unlock the truth on every match',
  body: "The same honest check you saw free, on every place you're weighing. $9.49, one time.",
};

const UNLOCK: [string, string, string][] = [
  ['🧮', 'Will you qualify', 'The income bar and your path, on every listing.'],
  ['💸', 'The real cost to move in', 'Deposit, first month, fees. Not just the sticker.'],
  ['🛡️', 'A scam check before you pay', 'Flags places priced too good to be true.'],
  ['📋', 'The fine print to ask', 'What to confirm before you sign, every time.'],
];

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', width: 30, height: 30, border: '2px solid rgba(255,255,255,.18)', borderTopColor: GREEN, borderRadius: 999, margin: '0 auto 14px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13.5 }}>{message}</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spinner (inline button) ───────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }} />
      Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        {children}
      </div>
    </div>
  );
}

const ctaStyle: React.CSSProperties = {
  width: '100%', height: 54, borderRadius: 13, background: GREEN, color: '#fff',
  fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
  boxShadow: '0 6px 24px rgba(0,166,81,.3)',
};

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
            // Just paid: ask the one-time referral question (it self-skips if
            // already answered), then on to the decision desk.
            router.replace('/onboarding/source');
            return;
          }
        }

        // Fallback: poll access-status waiting for webhook to update the DB
        const granted = await pollForAccess();
        if (granted) {
          router.replace('/onboarding/source');
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
        : 'Payment received';
    const pendingBody =
      pendingContext === 'portal'
        ? 'Your card was updated. Stripe is retrying your invoice, this usually takes a few seconds.'
        : "Activation is taking a moment longer than usual. Tap below to check. You won't be charged again.";

    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', padding: 24, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 18, textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 999, background: 'rgba(0,166,81,.12)', border: '1px solid rgba(0,166,81,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 14px' }}>⏳</div>
            <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 21, fontWeight: 400, marginBottom: 8 }}>{pendingHeading}</h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13.5, lineHeight: 1.55, marginBottom: 18 }}>{pendingBody}</p>
            <button onClick={handleRecheck} style={ctaStyle}>Check access now</button>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 12, lineHeight: 1.55 }}>
              {retryCountdown !== null
                ? `Checking automatically in ${retryCountdown}s…`
                : 'Still processing? Tap above to check again. You can also close this page and come back, your access will be ready once it activates.'}
            </p>
            <Link href="/paywall" style={{ display: 'inline-block', marginTop: 12, color: 'rgba(255,255,255,.4)', fontSize: 12.5, textDecoration: 'underline', textUnderlineOffset: 2 }}>← Back to sign-in</Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ── phase === 'ready' ─────────────────────────────────────────────────────

  // payment_failed: simplified card — update payment method, no new subscription
  if (isPaymentFailed) {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 22px 0', textAlign: 'center' }}>
            <Image src="/brand/heed-mascot.png" alt="Heed" width={68} height={94} unoptimized style={{ height: 68, width: 'auto', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.4))' }} />
            <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 26, fontWeight: 400, lineHeight: 1.14 }}>{copy.heading}</h1>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 9, lineHeight: 1.5, maxWidth: '32ch', marginInline: 'auto' }}>{copy.body}</p>
          </div>

          <div style={{ margin: '18px 22px 0', padding: 16, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
            {noCustomer ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Billing account not found</p>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13.5, lineHeight: 1.55, marginBottom: 16 }}>
                  We couldn&apos;t locate your billing account. This is unusual. Email us and we&apos;ll sort it out.
                </p>
                <a href="mailto:support@thesteadyone.com" style={{ ...ctaStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: 'auto', padding: '0 24px' }}>Contact support</a>
              </div>
            ) : (
              <>
                <button onClick={handlePortal} disabled={portalLoading} style={{ ...ctaStyle, opacity: portalLoading ? 0.5 : 1 }}>
                  {portalLoading ? <Spinner /> : 'Update payment method'}
                </button>
                {error && (
                  <>
                    <p style={{ marginTop: 12, color: '#ff8a80', background: 'rgba(212,80,74,.12)', border: '1px solid rgba(212,80,74,.4)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13 }}>{error}</p>
                    <button onClick={() => setError(null)} style={{ marginTop: 8, width: '100%', height: 44, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: `1px solid ${LINE}`, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Try again</button>
                  </>
                )}
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 11, lineHeight: 1.5 }}>
                  You&apos;ll go to a secure Stripe page to update your card. Your access stays linked to this email.
                </p>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', padding: '18px 0 24px', marginTop: 'auto' }}>
            <Link href="/paywall" style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }}>← Back to sign-in</Link>
          </div>
        </div>
      </Shell>
    );
  }

  // trial_ended / canceled / default: re-unlock with truths panel + one-time price
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* hero */}
        <div style={{ padding: '8px 22px 0', textAlign: 'center' }}>
          <Image src="/brand/heed-mascot.png" alt="Heed" width={68} height={94} unoptimized style={{ height: 68, width: 'auto', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.4))' }} />
          <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 26, fontWeight: 400, lineHeight: 1.14 }}>{copy.heading}</h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 9, lineHeight: 1.5, maxWidth: '32ch', marginInline: 'auto' }}>{copy.body}</p>
        </div>

        {/* what you unlock */}
        <div style={{ margin: '18px 22px 0', padding: 16, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 12 }}>What you unlock</div>
          {UNLOCK.map(([ic, t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 11 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(0,166,81,.14)', border: '1px solid rgba(0,166,81,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: 'none' }}>{ic}</span>
              <span style={{ fontSize: 13.5, color: '#fff', fontWeight: 600, lineHeight: 1.35 }}>{t}<small style={{ display: 'block', fontWeight: 400, color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 1 }}>{d}</small></span>
            </div>
          ))}
        </div>

        {/* pay card */}
        <div style={{ margin: '16px 22px 0', padding: 16, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: SERIF, color: '#fff', fontSize: 32 }}>$9.49</span>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>/ 30 days</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(0,166,81,.12)', padding: '4px 9px', borderRadius: 7 }}>ONE-TIME</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 14 }}>No subscription. No auto-renew. Pay again only if you come back.</p>

          <button onClick={handleSubscribe} disabled={checkoutLoading} style={{ ...ctaStyle, opacity: checkoutLoading ? 0.5 : 1 }}>
            {checkoutLoading ? <Spinner /> : 'Re-unlock my matches'}
          </button>

          {error && (
            <>
              <p style={{ marginTop: 12, color: '#ff8a80', background: 'rgba(212,80,74,.12)', border: '1px solid rgba(212,80,74,.4)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13 }}>{error}</p>
              <button onClick={() => setError(null)} style={{ marginTop: 8, width: '100%', height: 44, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: `1px solid ${LINE}`, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Try again</button>
            </>
          )}

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 11, lineHeight: 1.5 }}>
            Secure checkout via Stripe. One-time charge, no auto-renew.
          </p>
        </div>

        <div style={{ textAlign: 'center', padding: '18px 0 24px', marginTop: 'auto' }}>
          <Link href="/paywall" style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }}>← Back to sign-in</Link>
        </div>
      </div>
    </Shell>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeContent />
    </Suspense>
  );
}
