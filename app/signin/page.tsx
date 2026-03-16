"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Step = "email" | "otp" | "done";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (authErr) {
      // shouldCreateUser: false returns an error for unknown emails — surface a clear message
      if (authErr.message.toLowerCase().includes("signups not allowed")) {
        setError("No account found for that email. If you subscribed on a different device, make sure to use the same email address.");
      } else {
        setError(authErr.message);
      }
      return;
    }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (verifyErr) {
      setError("Invalid or expired code. Please check the code and try again.");
      return;
    }
    // Auth confirmed — route through post-auth orchestration layer
    router.push("/onboarding/post-auth");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <a href="/" className="text-4xl font-bold tracking-tight text-zinc-900 no-underline dark:text-zinc-50">
            Heed
          </a>
        </div>

        {step === "email" && (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Sign in
            </h1>
            <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
              Enter the email you used when you subscribed. We&apos;ll send a one-time code.
            </p>
            <form onSubmit={sendOtp} className="flex flex-col gap-4">
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Check your email
            </h1>
            <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
              We sent a 6-digit code to <strong className="text-zinc-800 dark:text-zinc-200">{email}</strong>. Enter it below.
            </p>
            <form onSubmit={verifyOtp} className="flex flex-col gap-4">
              <input
                type="text"
                required
                autoFocus
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-center text-2xl tracking-widest text-zinc-900 placeholder-zinc-300 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Verifying…" : "Verify and sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Use a different email
              </button>
            </form>
          </>
        )}

        <p className="mt-10 text-center text-sm text-zinc-400 dark:text-zinc-600">
          <a href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Back to home
          </a>
        </p>
      </div>
    </div>
  );
}
