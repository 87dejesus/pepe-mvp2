'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { cacheServerAccess } from '@/lib/access';

const OTP_COOLDOWN_SECONDS = 60;

type Step = 'email' | 'otp';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-10 overflow-y-auto">
        <div className="max-w-sm w-full">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0A2540] leading-tight mb-2">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#666666] leading-relaxed">
              Enter the email you used when you signed up. We&apos;ll send a one-time code to restore your access.
            </p>
            <p className="text-xs text-[#00A651] font-medium mt-2">
              You will not be charged again just for signing in.
            </p>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5">
            {step === 'email' && (
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1.5 uppercase tracking-wide">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    autoFocus
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !normalizedEmail}
                  className="w-full h-12 rounded-lg bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Send code'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-1">
                  <p className="font-semibold text-[#0A2540] text-sm">Check your inbox</p>
                  <p className="text-sm text-[#666666]">
                    We sent a 6-digit code to{' '}
                    <span className="font-medium text-[#0A2540]">{normalizedEmail}</span>.
                    Enter it below to sign in.
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  autoFocus
                  className="w-full text-center text-3xl tracking-[0.3em] font-semibold border border-[#E5E5E5] rounded-lg px-3 py-4 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                />
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 rounded-lg bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Verify and sign in'}
                </button>
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading || resendSecondsLeft > 0}
                    className="text-sm text-[#0A2540] underline underline-offset-2 hover:text-[#0d2f52] disabled:opacity-50 disabled:no-underline"
                  >
                    {resendLoading ? 'Sending…' : resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend code'}
                  </button>
                  <span className="text-[#E5E5E5]">|</span>
                  <button
                    type="button"
                    onClick={resetToEmailStep}
                    className="text-sm text-[#666666] underline underline-offset-2 hover:text-[#0A2540]"
                  >
                    Change email
                  </button>
                </div>
                {resendSent && (
                  <p className="text-sm text-[#00A651] bg-[#DCFCE7] border border-[#86EFAC] rounded-lg p-3 text-center">
                    Code resent — check your inbox.
                  </p>
                )}
              </form>
            )}
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs text-[#666666] hover:text-[#0A2540] underline">
              ← Back to home
            </Link>
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
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      Loading…
    </span>
  );
}
