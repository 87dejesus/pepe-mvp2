'use client';

/**
 * /auth/callback
 *
 * Legacy route kept in case any cached magic-link emails are still clicked.
 * OTP flow no longer routes through here — verification happens inline in /paywall.
 * Attempts to detect an existing session and redirect; otherwise sends to /paywall.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let settled = false;

    async function run() {
      // Try to exchange a PKCE code if present (old magic-link emails)
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          settled = true;
          router.replace('/decision');
          return;
        }
      }

      // Check for an already-established session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        settled = true;
        router.replace('/decision');
        return;
      }

      // Nothing worked — show expired message
      setTimeout(() => {
        if (!settled) setExpired(true);
      }, 3000);
    }

    run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !settled) {
        settled = true;
        router.replace('/decision');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  if (expired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F6F3] px-4">
        <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm text-center">
          <p className="text-[#0A2540] font-semibold mb-2">Link expired</p>
          <p className="text-[#666666] text-sm mb-4">
            This link has expired. Use the 6-digit code sent to your email, or request a new one.
          </p>
          <a
            href="/paywall"
            className="block w-full h-11 rounded-lg bg-[#0A2540] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#0d2f52] transition-all"
          >
            Back to signup →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F3]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#0A2540] font-semibold text-sm">Verifying…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F6F3]">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
