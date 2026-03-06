'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { createBrowserClient } from '@supabase/ssr';

const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true';
const REDIRECT_URL = 'https://thesteadyone.com/auth/callback';

type Step = 'email' | 'link_sent';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Inner content ────────────────────────────────────────────────────────────

function PaywallContent() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const isAdmin = email.trim().toLowerCase() === 'luhciano.sj@gmail.com';

  async function sendLink(targetEmail: string): Promise<boolean> {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabase();
      console.log('[AUTH] Sending magic link to:', targetEmail, '→', REDIRECT_URL);
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: REDIRECT_URL,
        },
      });
      console.log('[AUTH] signInWithOtp result:', error ? error.message : 'ok');
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link. Try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    const ok = await sendLink(email.trim().toLowerCase());
    if (ok) setStep('link_sent');
  }

  async function handleResend() {
    setResent(false);
    const ok = await sendLink(email.trim().toLowerCase());
    if (ok) setResent(true);
  }

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

            {/* ── Step 1 — Email ── */}
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
                {isAdmin && (
                  <p className="text-xs text-[#00A651] text-center font-medium">
                    Admin account — full access after verification.
                  </p>
                )}
              </form>
            )}

            {/* ── Step 2 — Link sent ── */}
            {step === 'link_sent' && (
              <div className="space-y-4">
                <div className="bg-[#F0F9F4] border border-[#00A651]/25 rounded-lg px-4 py-4">
                  <p className="text-[#0A2540] font-semibold text-sm mb-1">
                    Check your inbox
                  </p>
                  <p className="text-[#666666] text-sm leading-relaxed">
                    We sent a confirmation link to{' '}
                    <span className="font-semibold text-[#0A2540]">{email}</span>.
                    Click it to verify and continue.
                  </p>
                  <p className="text-[#666666] text-xs mt-2">
                    Also check your spam folder if you don&apos;t see it.
                  </p>
                </div>

                {isAdmin && (
                  <p className="text-xs text-[#00A651] text-center font-medium">
                    Admin account — full access granted after clicking the link.
                  </p>
                )}

                {resent && (
                  <p className="text-center text-xs font-medium text-[#00A651]">
                    New link sent — check your inbox.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full h-11 rounded-lg border border-[#E5E5E5] bg-white text-[#0A2540] font-semibold text-sm hover:bg-[#F8F6F3] disabled:opacity-50 transition-all"
                >
                  {loading ? <Spinner dark /> : 'Resend link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(null); setResent(false); }}
                  className="w-full text-xs text-[#666666] hover:text-[#0A2540] underline"
                >
                  ← Change email
                </button>
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
