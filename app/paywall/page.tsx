'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

// Dev mock — only active when NEXT_PUBLIC_DEV_MOCK_ENABLED=true
const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';

type Step = 'email' | 'otp' | 'stripe';

export default function PaywallPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code.');
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ───────────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid code.');
      setUserId(data.userId);
      setStep('stripe');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Stripe checkout ───────────────────────────────────────────────
  async function handleStartTrial() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout.');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  const stepIndex = { email: 0, otp: 1, stripe: 2 } as const;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
        <div className="max-w-sm w-full">

          {/* Mascot + Headline */}
          <div className="text-center mb-5">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Heed"
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full border border-[#E5E5E5] object-cover"
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

          {/* Auth + Checkout card */}
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
            <div className="flex items-center gap-1 mb-5">
              {(['email', 'otp', 'stripe'] as Step[]).map((s, i) => {
                const done = stepIndex[step] > i;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 ${
                      done ? 'bg-[#00A651] border-[#00A651] text-white'
                           : active ? 'bg-[#0A2540] border-[#0A2540] text-white'
                           : 'bg-[#F8F6F3] border-[#E5E5E5] text-[#666666]'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 ${done ? 'bg-[#00A651]' : 'bg-[#E5E5E5]'}`} />
                    )}
                  </div>
                );
              })}
              <span className="text-xs text-[#666666] ml-2 shrink-0">
                {step === 'email' ? 'Your email' : step === 'otp' ? 'Code' : 'Start trial'}
              </span>
            </div>

            {/* Step 1 — Email */}
            {step === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-3">
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
                  {loading ? <Spinner /> : 'Continue →'}
                </button>
                <p className="text-xs text-[#666666] text-center">
                  We&apos;ll send a 6-digit verification code to your email.
                </p>
              </form>
            )}

            {/* Step 2 — OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1 uppercase tracking-wide">
                    Code sent to {email}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-2xl font-bold tracking-widest text-center text-[#0A2540] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 rounded-lg bg-[#0A2540] text-white font-semibold text-base hover:bg-[#0d2f52] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Verify →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                  className="w-full text-xs text-[#666666] hover:text-[#0A2540] underline"
                >
                  ← Change email
                </button>
              </form>
            )}

            {/* Step 3 — Stripe */}
            {step === 'stripe' && (
              <div className="space-y-3">
                <p className="text-sm text-[#666666]">
                  Account created for <span className="font-semibold text-[#0A2540]">{email}</span>.
                  Start your free trial:
                </p>
                <button
                  onClick={handleStartTrial}
                  disabled={loading}
                  className="w-full h-14 rounded-lg bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all select-none"
                >
                  {loading ? <Spinner /> : 'Start 3-day free trial →'}
                </button>
                <p className="text-xs text-[#666666] text-center">
                  Cancel anytime. No charge for 3 days.
                </p>
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
                Dev mode — test without Stripe or OTP
              </p>
              <div className="flex flex-col gap-1.5">
                <DevMockButton scenario="trialing" label="Simulate trial (full access)" />
                <DevMockButton scenario="active" label="Simulate paid subscription" />
                <DevMockButton scenario="canceled" label="Simulate canceled (paywall)" />
                <DevMockButton scenario={null} label="Clear mock (real state)" />
              </div>
            </div>
          )}

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

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
