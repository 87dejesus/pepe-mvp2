'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { createBrowserClient } from '@supabase/ssr';

// Dev mock — only active when NEXT_PUBLIC_DEV_MOCK_ENABLED=true
const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';

type Step = 'email' | 'otp';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Inner content ────────────────────────────────────────────────────────────

function PaywallContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: null },
      });
      if (error) throw error;
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  async function handleResend() {
    setError(null);
    setResent(false);
    setLoading(true);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: null },
      });
      if (error) throw error;
      setResent(true);
      setOtp('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP → /decision ─────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'signup',
      });
      if (error) throw error;
      // Session established — admin gets full access, everyone else hits paywall check in /decision
      router.push('/decision');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message.includes('expired') || err.message.includes('invalid')
            ? 'Incorrect or expired code. Check your email or request a new code.'
            : err.message
          : 'Verification failed. Try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = email.trim().toLowerCase() === 'luhciano.sj@gmail.com';
  const stepIndex: Record<Step, number> = { email: 0, otp: 1 };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header variant="light" />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
        <div className="max-w-sm w-full">

          {/* Mascot + Headline */}
          <div className="text-center mb-5">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Heed"
              className="max-w-[80px] w-full h-auto object-contain mx-auto mb-3"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-[#0A2540] leading-tight">
              Make one clear decision.
            </h1>
            <p className="text-[#666666] text-sm mt-2">
              Stop scrolling. The Steady One helps you commit — or consciously wait.
            </p>
          </div>

          {/* Value card */}
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

          {/* Auth card */}
          <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 sm:p-5 mb-4">

            {/* Pricing */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-[#0A2540]">$2.49</span>
              <span className="text-[#666666] text-sm">/ week</span>
            </div>
            <p className="text-[#00A651] font-semibold text-sm mb-4">
              3 days free — no charge during trial
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              {(['email', 'otp'] as Step[]).map((s, i) => {
                const done = stepIndex[step] > i;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 transition-colors ${
                      done   ? 'bg-[#00A651] border-[#00A651] text-white'
                             : active ? 'bg-[#0A2540] border-[#0A2540] text-white'
                             : 'bg-[#F8F6F3] border-[#E5E5E5] text-[#666666]'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < 1 && (
                      <div className={`flex-1 h-0.5 ${done ? 'bg-[#00A651]' : 'bg-[#E5E5E5]'}`} />
                    )}
                  </div>
                );
              })}
              <span className="text-xs text-[#666666] ml-1 shrink-0">
                {step === 'email' ? 'Your email' : 'Enter code'}
              </span>
            </div>

            {/* ── Step 1 — Email ── */}
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
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
                  disabled={loading || !email.trim()}
                  className="w-full h-14 rounded-lg bg-[#0A2540] text-white font-semibold text-base hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Send code →'}
                </button>
                <p className="text-xs text-[#666666] text-center">
                  We&apos;ll send a 6-digit code to your email.
                </p>
                {isAdmin && (
                  <p className="text-xs text-[#00A651] text-center font-medium">
                    Admin account — full access after verification.
                  </p>
                )}
              </form>
            )}

            {/* ── Step 2 — OTP ── */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div className="bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-4 py-3">
                  <p className="text-[#0A2540] font-semibold text-sm mb-0.5">
                    We sent a 6-digit code to your email.
                  </p>
                  <p className="text-[#666666] text-xs">
                    Sent to <span className="font-medium text-[#0A2540]">{email}</span>. Check your inbox and spam folder.
                  </p>
                </div>

                {resent && (
                  <p className="text-center text-xs font-medium text-[#00A651]">
                    New code sent — check your inbox.
                  </p>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#666666] mb-1 uppercase tracking-wide">
                      6-digit code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full border border-[#E5E5E5] rounded-lg px-3 py-3 text-2xl font-bold text-center text-[#0A2540] tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full h-14 rounded-lg bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all"
                  >
                    {loading ? <Spinner /> : 'Verify →'}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); setError(null); setResent(false); }}
                    className="text-xs text-[#666666] hover:text-[#0A2540] underline"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-xs text-[#666666] hover:text-[#0A2540] underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>

          {/* Dev mock helper */}
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

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PaywallPage() {
  return (
    <Suspense>
      <PaywallContent />
    </Suspense>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
