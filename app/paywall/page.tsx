'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { cacheServerAccess } from '@/lib/access';
import { trackFunnel } from '@/lib/funnel';

const OTP_COOLDOWN_SECONDS = 60;
const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';

// OTP webview resilience: on mobile (esp. the Reddit in-app browser) the user
// leaves this tab to fetch the code from their email app. The OS can reload or
// kill the tab, wiping React state and stranding them back at the email step
// with a code they can no longer use. We persist the email + "enter code" step
// so returning to the tab restores it. Only restored while the code is still
// plausibly valid.
const OTP_SESSION_KEY = 'steady_otp_session_v1';
const OTP_RESTORE_WINDOW_MS = 15 * 60 * 1000;

type OtpSession = { email: string; step: 'otp'; sentAt: number };

function loadOtpSession(): OtpSession | null {
  try {
    const raw = localStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as OtpSession;
    return s && s.email ? s : null;
  } catch {
    return null;
  }
}
function saveOtpSession(email: string): void {
  try {
    localStorage.setItem(OTP_SESSION_KEY, JSON.stringify({ email, step: 'otp', sentAt: Date.now() }));
  } catch {
    // ignore blocked/full storage — persistence is best-effort
  }
}
function clearOtpSession(): void {
  try {
    localStorage.removeItem(OTP_SESSION_KEY);
  } catch {
    // ignore
  }
}

const NAVY = '#0A2540';
const GREEN = '#00A651';
const LINE = 'rgba(255,255,255,.14)';
const SERIF = 'var(--font-caslon), Georgia, serif';

type Step = 'email' | 'otp';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 50, borderRadius: 12, background: 'rgba(255,255,255,.06)',
  border: `1px solid ${LINE}`, color: '#fff', fontSize: 15, padding: '0 14px',
  fontFamily: 'var(--font-inter), system-ui, sans-serif', outline: 'none',
};
const ctaStyle: React.CSSProperties = {
  width: '100%', height: 54, borderRadius: 13, background: GREEN, color: '#fff',
  fontWeight: 700, fontSize: 16, border: 'none', marginTop: 12, cursor: 'pointer',
  boxShadow: '0 6px 24px rgba(0,166,81,.3)',
};
const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,.5)', fontWeight: 700, marginBottom: 7,
};

function PaywallContent() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [nextResendAt, setNextResendAt] = useState<number | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  const normalizedEmail = email.trim().toLowerCase();

  // Funnel: paywall reached. Fires once on mount.
  useEffect(() => {
    trackFunnel('paywall_view');
  }, []);

  // Restore an in-progress OTP session after a tab reload (see OTP_SESSION_KEY note).
  useEffect(() => {
    const s = loadOtpSession();
    if (!s) return;
    setEmail(s.email);
    if (s.sentAt && Date.now() - s.sentAt < OTP_RESTORE_WINDOW_MS) {
      setStep('otp');
      const nextAt = s.sentAt + OTP_COOLDOWN_SECONDS * 1000;
      if (nextAt > Date.now()) setNextResendAt(nextAt);
    } else {
      clearOtpSession(); // stale code — start clean but keep the email prefilled
    }
  }, []);

  useEffect(() => {
    if (!nextResendAt) return;
    const tick = () => {
      const left = Math.ceil((nextResendAt - Date.now()) / 1000);
      if (left <= 0) {
        setResendSecondsLeft(0);
        setNextResendAt(null);
      } else {
        setResendSecondsLeft(left);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextResendAt]);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!normalizedEmail) return;
    trackFunnel('signup_started');
    setLoading(true);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      trackFunnel('otp_sent');
      saveOtpSession(normalizedEmail);
      setStep('otp');
      setNextResendAt(Date.now() + OTP_COOLDOWN_SECONDS * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] send failed:', err);
      trackFunnel('otp_error');
      setError(`Send failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value.replace(/\D/g, '').slice(0, 6));
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    trackFunnel('otp_submitted');
    setLoading(true);
    try {
      const supabase = createSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp.trim(),
        type: 'email',
      });
      if (error) throw error;
      if (!data?.session) {
        throw new Error('Verification failed. Request a new code.');
      }
      clearOtpSession(); // verified — drop the persisted step
      // Admin bypass: straight to /decision.
      if ((data.user?.email ?? '').toLowerCase().trim() === 'luhciano.sj@gmail.com') {
        cacheServerAccess({ status: 'active', trial_ends_at: null });
        window.location.href = '/decision';
        return;
      }
      // Everyone else: hard-navigate to post-auth (sends session cookies),
      // which routes new users to Stripe checkout and existing users to /decision.
      window.location.href = '/onboarding/post-auth';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] verifyOtp failed:', msg);
      trackFunnel('otp_error');
      setError('Code expired or invalid. Request a new code.');
    } finally {
      setLoading(false);
    }
  }

  function resetToEmailStep() {
    clearOtpSession();
    setStep('email');
    setOtp('');
    setError(null);
    setResendSent(false);
  }

  async function handleResend() {
    setResendLoading(true);
    setResendSent(false);
    setError(null);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      saveOtpSession(normalizedEmail);
      setResendSent(true);
      setNextResendAt(Date.now() + OTP_COOLDOWN_SECONDS * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] resend failed:', err);
      setError(`Resend failed: ${msg}`);
    } finally {
      setResendLoading(false);
    }
  }

  const UNLOCK: [string, string, string][] = [
    ['🧮', 'Will you qualify', 'The income bar and your path, on every listing.'],
    ['💸', 'The real cost to move in', 'Deposit, first month, fees. Not just the sticker.'],
    ['🛡️', 'A scam check before you pay', 'Flags places priced too good to be true.'],
    ['📋', 'The fine print to ask', 'What to confirm before you sign, every time.'],
  ];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {/* hero */}
        <div style={{ padding: '26px 22px 8px', textAlign: 'center' }}>
          <Image src="/brand/heed-mascot.png" alt="Heed" width={74} height={102} style={{ height: 74, width: 'auto', margin: '0 auto 14px', display: 'block' }} unoptimized />
          <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 26, fontWeight: 400, lineHeight: 1.12 }}>Your list is ready when you are.</h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 9, lineHeight: 1.5, maxWidth: '32ch', marginInline: 'auto' }}>You saw one read free. Add your email to see the same honest check on all your matches.</p>
        </div>

        {/* what you unlock */}
        <div style={{ margin: '18px 22px 0', padding: 16, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 12 }}>What you get</div>
          {UNLOCK.map(([ic, t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 11 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(0,166,81,.14)', border: '1px solid rgba(0,166,81,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: 'none' }}>{ic}</span>
              <span style={{ fontSize: 13.5, color: '#fff', fontWeight: 600, lineHeight: 1.35 }}>{t}<small style={{ display: 'block', fontWeight: 400, color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 1 }}>{d}</small></span>
            </div>
          ))}
        </div>

        {/* pay card */}
        <div style={{ margin: '16px 22px 0', padding: 16, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
          <p style={{ color: 'rgba(255,255,255,.62)', fontSize: 13, marginBottom: 14 }}>Enter your email and I&apos;ll send a 6-digit code to open your full list.</p>

          {step === 'email' && (
            <form onSubmit={handleContinue}>
              <label style={lblStyle}>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoFocus autoComplete="email" style={inputStyle} />
              <button type="submit" disabled={loading || !normalizedEmail} style={{ ...ctaStyle, opacity: loading || !normalizedEmail ? 0.5 : 1 }}>
                {loading ? <Spinner /> : 'Send me the code'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 13 }}>
                {['Free', 'No credit card', 'We only email your code'].map((t) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,.72)', fontWeight: 500 }}>
                    <span style={{ color: GREEN, fontWeight: 800, fontSize: 12 }}>✓</span>{t}
                  </span>
                ))}
              </div>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 11, lineHeight: 1.5 }}>
                The code lands in a few seconds. No spam, and we never sell your info.
              </p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode}>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 12, textAlign: 'center' }}>
                We sent a 6-digit code to <span style={{ color: '#fff', fontWeight: 600 }}>{normalizedEmail}</span>. Enter it to continue.
              </p>
              <input type="text" value={otp} onChange={(e) => handleOtpChange(e.target.value)} maxLength={6} inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" placeholder="123456" autoFocus style={{ ...inputStyle, height: 58, textAlign: 'center', fontSize: 28, letterSpacing: '.3em', fontWeight: 600 }} />
              <button type="submit" disabled={loading || otp.length !== 6} style={{ ...ctaStyle, opacity: loading || otp.length !== 6 ? 0.5 : 1 }}>
                {loading ? <Spinner /> : 'Verify code'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 13 }}>
                <button type="button" onClick={handleResend} disabled={resendLoading || resendSecondsLeft > 0} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', opacity: resendLoading || resendSecondsLeft > 0 ? 0.5 : 1 }}>
                  {resendLoading ? 'Sending…' : resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend code'}
                </button>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>|</span>
                <button type="button" onClick={resetToEmailStep} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>
                  Change email
                </button>
              </div>
              {resendSent && (
                <p style={{ marginTop: 12, color: GREEN, background: 'rgba(0,166,81,.12)', border: '1px solid rgba(0,166,81,.3)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13 }}>Code resent. Check your inbox.</p>
              )}
            </form>
          )}

          {error && (
            <p style={{ marginTop: 12, color: '#ff8a80', background: 'rgba(212,80,74,.12)', border: '1px solid rgba(212,80,74,.4)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13 }}>{error}</p>
          )}
        </div>

        {IS_DEV_MOCK && (
          <div style={{ margin: '16px 22px 0', padding: 14, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#fbbf24', marginBottom: 8 }}>Dev mode: test without Stripe or email</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DevMockButton scenario="active" label="Simulate paid (full access)" />
              <DevMockButton scenario="canceled" label="Simulate canceled (paywall)" />
              <DevMockButton scenario={null} label="Clear mock (real state)" />
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '18px 0 24px', marginTop: 'auto' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

export default function PaywallPage() {
  return (
    <Suspense>
      <PaywallContent />
    </Suspense>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }} />
      Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

function DevMockButton({ scenario, label }: { scenario: 'trialing' | 'active' | 'canceled' | null; label: string }) {
  function apply() {
    if (scenario === null) localStorage.removeItem('steady_dev_mock');
    else localStorage.setItem('steady_dev_mock', scenario);
    window.location.href = '/decision';
  }
  return (
    <button onClick={apply} style={{ width: '100%', textAlign: 'left', fontSize: 12, fontWeight: 500, padding: '8px 12px', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: '#fbbf24', cursor: 'pointer' }}>
      {label}
    </button>
  );
}
