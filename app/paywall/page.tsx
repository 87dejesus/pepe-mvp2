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
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar código.');
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.');
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
      if (!res.ok) throw new Error(data.error ?? 'Código inválido.');
      setUserId(data.userId);
      setStep('stripe');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.');
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
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erro ao iniciar checkout.');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.');
      setLoading(false);
    }
  }

  const stepIndex = { email: 0, otp: 1, stripe: 2 } as const;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
        <div className="max-w-sm w-full">

          {/* Mascot + Headline */}
          <div className="text-center mb-5">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full border-4 border-white/30 object-cover"
            />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              Make one clear decision.
            </h1>
            <p className="text-white/70 text-sm mt-2">
              Stop scrolling. The Steady One helps you commit — or consciously wait.
            </p>
          </div>

          {/* Value card */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] p-4 sm:p-5 mb-4">
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

          {/* Auth + Checkout card */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] p-4 sm:p-5 mb-4">

            {/* Pricing */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-black">$2.49</span>
              <span className="text-gray-500 text-sm">/ week</span>
            </div>
            <p className="text-[#00A651] font-bold text-sm mb-4">
              3 days free — no charge during trial
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-5">
              {(['email', 'otp', 'stripe'] as Step[]).map((s, i) => {
                const done = stepIndex[step] > i;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                      done ? 'bg-[#00A651] border-[#00A651] text-white'
                           : active ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                           : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 ${done ? 'bg-[#00A651]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
              <span className="text-xs text-gray-500 ml-2 shrink-0">
                {step === 'email' ? 'Seu email' : step === 'otp' ? 'Código' : 'Iniciar trial'}
              </span>
            </div>

            {/* Step 1 — Email */}
            {step === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                    Seu email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                    autoFocus
                    className="w-full border-2 border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-[#1E3A8A] text-white font-extrabold text-base py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Continuar →'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Vamos enviar um código de 6 dígitos para o seu email.
                </p>
              </form>
            )}

            {/* Step 2 — OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                    Código enviado para {email}
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
                    className="w-full border-2 border-black px-3 py-2.5 text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#1E3A8A] text-white font-extrabold text-base py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? <Spinner /> : 'Verificar →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  ← Mudar email
                </button>
              </form>
            )}

            {/* Step 3 — Stripe */}
            {step === 'stripe' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Conta criada para <span className="font-bold">{email}</span>.
                  Agora inicia o trial gratuito:
                </p>
                <button
                  onClick={handleStartTrial}
                  disabled={loading}
                  className="w-full bg-[#00A651] text-white font-extrabold text-base py-4 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 disabled:pointer-events-none transition-all select-none"
                >
                  {loading ? <Spinner /> : 'Start 3-day free trial →'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Cancel anytime. No charge for 3 days.
                </p>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2">
                {error}
              </p>
            )}
          </div>

          {/* Dev mock helper */}
          {IS_DEV_MOCK && (
            <div className="bg-amber-50 border-2 border-amber-400 p-4 mb-4">
              <p className="text-xs font-bold uppercase text-amber-700 mb-2">
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
            <Link href="/" className="text-xs text-white/50 hover:text-white underline">
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
      Aguardando…
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
      className="w-full text-left text-xs font-semibold px-3 py-2 border border-amber-400 bg-white text-amber-800 hover:bg-amber-50 active:bg-amber-100"
    >
      {label}
    </button>
  );
}
