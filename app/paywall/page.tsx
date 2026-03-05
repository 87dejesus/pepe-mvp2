'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

// Dev mock — only active when NEXT_PUBLIC_DEV_MOCK_ENABLED=true
const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';

type Step = 'email' | 'link_sent' | 'stripe';

// ─── Inner content (needs useSearchParams → must be inside Suspense) ──────────

function PaywallContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When redirected back with ?step=stripe&userId=...&email=... (legacy fallback)
  useEffect(() => {
    const urlStep = searchParams.get('step');
    const urlUserId = searchParams.get('userId');
    const urlEmail = searchParams.get('email');
    if (urlStep === 'stripe' && urlUserId && urlEmail) {
      setUserId(urlUserId);
      setEmail(decodeURIComponent(urlEmail));
      setStep('stripe');
    }
  }, [searchParams]);

  // ── Step 1: send magic link ────────────────────────────────────────────────
  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    const ok = await doSendLink();
    if (ok) setStep('link_sent');
  }

  async function handleResend() {
    setResent(false);
    const ok = await doSendLink();
    if (ok) setResent(true);
  }

  // Returns true on success, false on error.
  // emailRedirectTo is hardcoded to the production URL so Supabase never
  // generates a localhost link regardless of where signInWithOtp is called.
  async function doSendLink(): Promise<boolean> {
    setError(null);
    setLoading(true);
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : 'https://thesteadyone.com/auth/callback';
    console.log('[AUTH] Using redirectTo:', redirectTo);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
          data: { app: 'the-steady-one' },
        },
      });
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Stripe checkout ────────────────────────────────────────────────
  async function handleStartTrial() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout.');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  const stepIndex: Record<Step, number> = { email: 0, link_sent: 1, stripe: 2 };

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
              {(['email', 'link_sent', 'stripe'] as Step[]).map((s, i) => {
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
                {step === 'email' ? 'Your email' : step === 'link_sent' ? 'Verify' : 'Start trial'}
              </span>
            </div>

            {/* Step 1 — Email */}
            {step === 'email' && (
              <form onSubmit={handleSendLink} className="space-y-3">
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
                  We&apos;ll send a confirmation link to your email.
                </p>
              </form>
            )}

            {/* Step 2 — Link sent */}
            {step === 'link_sent' && (
              <div className="space-y-4">
                <div className="bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-4 py-4 text-center">
                  <p className="text-3xl mb-2">📬</p>
                  <p className="text-[#0A2540] font-semibold text-sm mb-1">
                    Check your inbox
                  </p>
                  <p className="text-[#666666] text-sm leading-relaxed">
                    We sent a confirmation link to{' '}
                    <span className="font-semibold text-[#0A2540]">{email}</span>.
                    Click it to verify and complete signup.
                  </p>
                </div>

                {resent && (
                  <p className="text-center text-xs font-medium text-[#00A651]">
                    Link resent — check your inbox.
                  </p>
                )}

                <p className="text-xs text-[#666666] text-center">
                  Didn&apos;t get it? Check your spam folder, or resend:
                </p>

                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full h-11 rounded-lg border border-[#E5E5E5] bg-white text-[#0A2540] font-semibold text-sm hover:bg-[#F8F6F3] disabled:opacity-50 transition-all"
                >
                  {loading ? <Spinner dark /> : 'Resend link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setResent(false); setError(null); }}
                  className="w-full text-xs text-[#666666] hover:text-[#0A2540] underline"
                >
                  ← Change email
                </button>
              </div>
            )}

            {/* Step 3 — Stripe (reached via /auth/callback redirect) */}
            {step === 'stripe' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-3 py-2.5">
                  <span className="text-[#00A651] font-bold">✓</span>
                  <p className="text-sm text-[#0A2540]">
                    Email verified —{' '}
                    <span className="font-semibold">{email}</span>
                  </p>
                </div>
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

// ─── Page export (Suspense required for useSearchParams) ──────────────────────

export default function PaywallPage() {
  return (
    <Suspense>
      <PaywallContent />
    </Suspense>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className={`w-4 h-4 border-2 rounded-full animate-spin ${
        dark ? 'border-[#0A2540]/30 border-t-[#0A2540]' : 'border-white/40 border-t-white'
      }`} />
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
