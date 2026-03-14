'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { cacheServerAccess } from '@/lib/access';

const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';

type Step = 'email' | 'otp';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function PaywallContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!normalizedEmail) return;

    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      console.log('[OTP] env check — URL present:', !!supabaseUrl, '| KEY present:', !!supabaseKey);

      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      console.log('[OTP] signInWithOtp result — error:', error);
      if (error) throw error;
      setStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] send failed:', err);
      setError(`Send failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(value: string) {
    const numbersOnly = value.replace(/\D/g, '').slice(0, 6);
    setOtp(numbersOnly);
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

      console.log('[OTP] verifyOtp result — error:', error, '| session:', !!data?.session, '| user:', data?.user?.email ?? null);

      if (error) throw error;

      // Check server-authoritative access state now that the user is authenticated
      const accessRes = await fetch('/api/auth/access-status');
      if (!accessRes.ok) {
        throw new Error(`access-status ${accessRes.status}`);
      }
      const accessData = await accessRes.json() as {
        status: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
      };
      console.log('[OTP] access-status:', accessData);

      if (accessData.status === 'new_user') {
        // First time — start the 3-day trial (server enforces one-per-user)
        const trialRes = await fetch('/api/auth/start-trial', { method: 'POST' });
        if (trialRes.ok) {
          const trialData = await trialRes.json() as { status: string; trial_ends_at: string };
          cacheServerAccess({ status: 'trialing', trial_ends_at: trialData.trial_ends_at });
          console.log('[OTP] trial started — pushing to /decision');
          router.push('/decision');
        } else if (trialRes.status === 409) {
          // Race condition — trial was already created; re-fetch current state
          const retryRes = await fetch('/api/auth/access-status');
          const retryData = await retryRes.json() as { status: string; trial_ends_at: string | null; current_period_end: string | null };
          cacheServerAccess(retryData as Parameters<typeof cacheServerAccess>[0]);
          router.push('/decision');
        } else {
          throw new Error(`start-trial ${trialRes.status}`);
        }
        return;
      }

      if (accessData.status === 'trialing' || accessData.status === 'active') {
        cacheServerAccess(accessData as Parameters<typeof cacheServerAccess>[0]);
        console.log('[OTP] has access — pushing to /decision');
        router.push('/decision');
        return;
      }

      if (accessData.status === 'canceled') {
        // Allow access if still within the paid period (grace period)
        const gracePeriodEnd = accessData.current_period_end ? new Date(accessData.current_period_end) : null;
        if (gracePeriodEnd && gracePeriodEnd > new Date()) {
          cacheServerAccess(accessData as Parameters<typeof cacheServerAccess>[0]);
          console.log('[OTP] canceled but within grace period — pushing to /decision');
          router.push('/decision');
        } else {
          console.log('[OTP] canceled and grace period expired — pushing to /subscribe');
          router.push('/subscribe?reason=canceled');
        }
        return;
      }

      if (accessData.status === 'payment_failed') {
        console.log('[OTP] payment_failed — pushing to /subscribe');
        router.push('/subscribe?reason=payment_failed');
        return;
      }

      // 'none' or unknown — trial has expired, no active subscription
      console.log('[OTP] no access (status:', accessData.status, ') — pushing to /subscribe');
      router.push('/subscribe?reason=trial_ended');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] verifyOtp failed:', msg);
      setError('Code expired or invalid. Request new code');
    } finally {
      setLoading(false);
    }
  }

  function resetToEmailStep() {
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
      console.log('[OTP] resend result — error:', error);
      if (error) throw error;
      setResendSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('[OTP] resend failed:', err);
      setError(`Resend failed: ${msg}`);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
        <div className="max-w-sm w-full">
          <div className="text-center mb-5">
            <Image
              src="/brand/heed-mascot.png"
              alt="Heed mascot"
              width={96}
              height={96}
              className="object-contain mx-auto mb-3"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-[#0A2540] leading-tight">
              Make one clear decision.
            </h1>
            <p className="text-[#666666] text-sm mt-2">
              Stop scrolling. The Steady One helps you commit — or consciously wait.
            </p>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 sm:p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-3">
              What you get
            </p>
            <ul className="space-y-2.5">
              {[
                'Match score based on your real constraints',
                'Apply Today vs Wait Thoughtfully — no false urgency',
                'Incentive detection: free months, no-fee deals',
                "Heed's take on every listing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                  <span className="text-[#00A651] font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 sm:p-5 mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-[#0A2540]">$2.49</span>
              <span className="text-[#666666] text-sm">/ week</span>
            </div>
            <p className="text-[#00A651] font-semibold text-sm mb-4">
              3 days free — no charge during trial
            </p>

            {step === 'email' && (
              <form onSubmit={handleContinue} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1 uppercase tracking-wide">
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
                <button
                  type="submit"
                  disabled={loading || !normalizedEmail}
                  className="w-full h-14 rounded-lg bg-[#0A2540] text-white font-semibold text-base hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Continue'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="font-semibold text-[#0A2540]">Check your inbox</p>
                  <p className="text-sm text-[#666666]">
                    We sent a 6-digit verification code to{' '}
                    <span className="font-medium text-[#0A2540]">{normalizedEmail}</span>.
                    Enter it below to verify your email and continue.
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  autoFocus
                  className="w-full text-center text-3xl tracking-[0.3em] font-semibold border border-[#E5E5E5] rounded-lg px-3 py-4 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 rounded-lg bg-[#0A2540] text-white font-semibold text-base hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Verify Code'}
                </button>
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="text-sm text-[#0A2540] underline underline-offset-2 hover:text-[#0d2f52] disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending…' : 'Resend code'}
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

            {error && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  {error}
                </p>
                {step === 'email' && (
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="w-full h-11 rounded-lg border border-[#E5E5E5] bg-white text-[#0A2540] font-semibold text-sm hover:bg-[#F8F6F3] transition-all"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>

          {IS_DEV_MOCK && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold uppercase text-amber-700 mb-2">
                Dev mode — test without Stripe or email
              </p>
              <div className="flex flex-col gap-1.5">
                <DevMockButton scenario="trialing" label="Simulate trial (full access)" />
                <DevMockButton scenario="active" label="Simulate paid subscription" />
                <DevMockButton scenario="canceled" label="Simulate canceled (paywall)" />
                <DevMockButton scenario={null} label="Clear mock (real state)" />
              </div>
            </div>
          )}

          <p className="text-[10px] text-[#999999] text-center mt-2 leading-relaxed">
            Admin access is for owner only — all other users are charged $2.49/wk after the 3-day trial.
          </p>

          <div className="text-center mt-4 pb-safe">
            <Link href="/" className="text-xs text-[#666666] hover:text-[#0A2540] underline">
              ← Back to home
            </Link>
          </div>
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

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span
        className={`w-4 h-4 border-2 rounded-full animate-spin ${
          dark ? 'border-[#0A2540]/30 border-t-[#0A2540]' : 'border-white/40 border-t-white'
        }`}
      />
      Loading…
    </span>
  );
}

function DevMockButton({
  scenario,
  label,
}: {
  scenario: 'trialing' | 'active' | 'canceled' | null;
  label: string;
}) {
  function apply() {
    if (scenario === null) {
      localStorage.removeItem('steady_dev_mock');
    } else {
      localStorage.setItem('steady_dev_mock', scenario);
    }
    window.location.href = '/decision';
  }

  return (
    <button
      onClick={apply}
      className="w-full text-left text-xs font-medium px-3 py-2 border border-amber-200 rounded-lg bg-white text-amber-800 hover:bg-amber-50 active:bg-amber-100"
    >
      {label}
    </button>
  );
}
