'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

// Mock panel always visible — steady_dev_mock works on any environment
const IS_DEV_MOCK = true;

export default function PaywallPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartTrial() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout. Try again.');
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-sm w-full">

          {/* Mascot + Headline */}
          <div className="text-center mb-6">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-white/30 object-cover"
            />
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              Make one clear decision.
            </h1>
            <p className="text-white/70 text-sm mt-2">
              Stop scrolling. The Steady One helps you commit — or consciously wait.
            </p>
          </div>

          {/* Value card */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] p-5 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              What you get
            </p>
            <ul className="space-y-2.5">
              {[
                'Match score based on your real constraints',
                'ACT NOW vs WAIT CONSCIOUSLY — no false urgency',
                'Incentive detection: free months, no-fee deals',
                "Pepe's take on every listing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-[#00A651] font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing card */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] p-5 mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-black">$2.49</span>
              <span className="text-gray-500 text-sm">/ week</span>
            </div>
            <p className="text-[#00A651] font-bold text-sm mb-4">
              3 days free — no charge during trial
            </p>

            {/* CTA */}
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full bg-[#00A651] text-white font-extrabold text-base py-4 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening Stripe…
                </span>
              ) : (
                'Start 3-day free trial →'
              )}
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2">
                {error}
              </p>
            )}

            <p className="mt-3 text-xs text-gray-400 text-center">
              Cancel anytime. No charge for 3 days.
            </p>
          </div>

          {/* Dev mock helper — only visible when DEV_MOCK_ENABLED=true */}
          {IS_DEV_MOCK && (
            <div className="bg-amber-50 border-2 border-amber-400 p-4 mb-4">
              <p className="text-xs font-bold uppercase text-amber-700 mb-2">
                Dev mode — test without Stripe
              </p>
              <div className="flex flex-col gap-1.5">
                <DevMockButton scenario="trialing" label="Simulate trial (full access)" />
                <DevMockButton scenario="active" label="Simulate paid subscription" />
                <DevMockButton scenario="canceled" label="Simulate canceled (paywall)" />
                <DevMockButton scenario={null} label="Clear mock (real state)" />
              </div>
            </div>
          )}

          <p className="text-center text-xs text-white/40 mt-2">
            Using Stripe test mode — no real charges.
          </p>

          <div className="text-center mt-4">
            <Link href="/" className="text-xs text-white/50 hover:text-white underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
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
    // Navigate to /decision so the effect is immediately visible
    window.location.href = '/decision';
  }

  return (
    <button
      onClick={apply}
      className="w-full text-left text-xs font-semibold px-3 py-2 border border-amber-400 bg-white text-amber-800 hover:bg-amber-50 active:bg-amber-100"
    >
      {label}
    </button>
  );
}
