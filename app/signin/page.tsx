'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { cacheServerAccess } from '@/lib/access';

const OTP_COOLDOWN_SECONDS = 60;

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
  width: '100%', height: 52, borderRadius: 12, background: GREEN, color: '#fff',
  fontWeight: 700, fontSize: 15, border: 'none', marginTop: 14, cursor: 'pointer',
  boxShadow: '0 6px 24px rgba(0,166,81,.28)',
};
const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,.5)', fontWeight: 700, marginBottom: 7,
};

function SignInContent() {
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

  // Countdown timer for resend cooldown
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

    setLoading(true);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setStep('otp');
      setNextResendAt(Date.now() + OTP_COOLDOWN_SECONDS * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      // shouldCreateUser: false returns a specific error for unknown emails
      if (msg.toLowerCase().includes('signups not allowed') || msg.toLowerCase().includes('user not found')) {
        setError('No account found for that email. Make sure you use the same email you originally signed up with.');
      } else {
        setError(`Could not send code: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

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
        throw new Error('Verification failed — no session returned. Try requesting a new code.');
      }

      // Admin bypass — go directly to /decision
      if ((data.user?.email ?? '').toLowerCase().trim() === 'luhciano.sj@gmail.com') {
        cacheServerAccess({ status: 'active', trial_ends_at: null });
        window.location.href = '/decision';
        return;
      }

      // Route through post-auth orchestration — handles trialing, active, canceled, etc.
      window.location.href = '/onboarding/post-auth';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      setError('Code expired or invalid. Request a new code.');
      console.error('[signin] verifyOtp failed:', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendSent(false);
    setError(null);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setResendSent(true);
      setNextResendAt(Date.now() + OTP_COOLDOWN_SECONDS * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      setError(`Resend failed: ${msg}`);
    } finally {
      setResendLoading(false);
    }
  }

  function resetToEmailStep() {
    setStep('email');
    setOtp('');
    setError(null);
    setResendSent(false);
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        <div style={{ flex: 1, padding: '18px 22px 28px' }}>
          {/* hero */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: GREEN, fontWeight: 700, marginBottom: 10 }}>
              Welcome back
            </div>
            <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 28, fontWeight: 400, lineHeight: 1.12 }}>
              {step === 'email' ? 'Sign in to your desk.' : 'Check your inbox.'}
            </h1>
            {step === 'email' && (
              <>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 9, lineHeight: 1.5 }}>
                  Use the email you signed up with. We send a one-time code, no password to remember.
                </p>
                <p style={{ color: GREEN, fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>
                  Signing in never charges you again.
                </p>
              </>
            )}
          </div>

          {/* card */}
          <div style={{ padding: 18, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 16 }}>
            {step === 'email' && (
              <form onSubmit={handleContinue}>
                <label style={lblStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoFocus
                  style={inputStyle}
                />
                {error && (
                  <p style={{ marginTop: 12, color: '#ff8a80', background: 'rgba(212,80,74,.12)', border: '1px solid rgba(212,80,74,.4)', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading || !normalizedEmail} style={{ ...ctaStyle, opacity: loading || !normalizedEmail ? 0.5 : 1 }}>
                  {loading ? <Spinner /> : 'Send code'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyCode}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Enter your 6-digit code</p>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                  We sent it to <span style={{ color: '#fff', fontWeight: 600 }}>{normalizedEmail}</span>. Enter it below to sign in.
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  autoFocus
                  style={{ ...inputStyle, height: 62, textAlign: 'center', fontSize: 30, letterSpacing: '.3em', fontWeight: 600 }}
                />
                {error && (
                  <p style={{ marginTop: 12, color: '#ff8a80', background: 'rgba(212,80,74,.12)', border: '1px solid rgba(212,80,74,.4)', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading || otp.length !== 6} style={{ ...ctaStyle, opacity: loading || otp.length !== 6 ? 0.5 : 1 }}>
                  {loading ? <Spinner /> : 'Verify and sign in'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 }}>
                  <button type="button" onClick={handleResend} disabled={resendLoading || resendSecondsLeft > 0} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.75)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', opacity: resendLoading || resendSecondsLeft > 0 ? 0.5 : 1 }}>
                    {resendLoading ? 'Sending…' : resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend code'}
                  </button>
                  <span style={{ color: 'rgba(255,255,255,.2)' }}>|</span>
                  <button type="button" onClick={resetToEmailStep} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>
                    Change email
                  </button>
                </div>
                {resendSent && (
                  <p style={{ marginTop: 12, color: GREEN, background: 'rgba(0,166,81,.12)', border: '1px solid rgba(0,166,81,.3)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13 }}>
                    Code resent. Check your inbox.
                  </p>
                )}
              </form>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }}>← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
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
