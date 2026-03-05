'use client';

/**
 * /auth/callback
 *
 * Landing page after a user clicks the Supabase magic-link email.
 * Supabase embeds access_token + refresh_token in the URL fragment (#).
 * The JS SDK processes the fragment automatically on createClient(), so
 * calling getSession() here returns the authenticated session.
 *
 * On success  → redirect to /paywall?step=stripe&userId=...&email=...
 * On failure  → show error with a link back to /paywall to retry
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setErrMsg('App configuration error. Please contact support.');
      setFailed(true);
      return;
    }

    // createClient() reads window.location.hash and processes auth tokens
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session?.user) {
        console.error('[Auth] Callback: no session after magic link', error?.message);
        setErrMsg('Verification failed or the link has expired. Please request a new one.');
        setFailed(true);
        return;
      }

      console.log('[Auth] Callback: session confirmed for', session.user.email);

      const params = new URLSearchParams({
        step: 'stripe',
        userId: session.user.id,
        email: session.user.email ?? '',
      });
      router.replace(`/paywall?${params.toString()}`);
    });
  }, [router]);

  if (failed) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 text-center shadow-sm">
            <p className="text-[#0A2540] font-semibold mb-2">Verification failed</p>
            <p className="text-[#666666] text-sm mb-5 leading-relaxed">{errMsg}</p>
            <a
              href="/paywall"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] transition-all"
            >
              Try again
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#0A2540] font-semibold">Verifying your email…</p>
          <p className="text-[#666666] text-sm mt-1">Just a moment.</p>
        </div>
      </div>
    </div>
  );
}
