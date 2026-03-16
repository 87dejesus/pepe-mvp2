'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const ADMIN_EMAIL = 'luhciano.sj@gmail.com';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type State = 'verifying' | 'success' | 'expired';

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('verifying');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createSupabase();
    let settled = false;

    function onSuccess(email?: string | null) {
      if (settled) return;
      settled = true;
      if (email === ADMIN_EMAIL) setIsAdmin(true);
      setState('success');
      setTimeout(() => router.replace('/decision'), 800);
    }

    function onExpired() {
      if (settled) return;
      settled = true;
      setState('expired');
    }

    async function run() {
      // Try PKCE code exchange (standard magic link flow)
      const code = searchParams.get('code');
      if (code) {
        console.log('[CALLBACK] Exchanging PKCE code…');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session) {
          console.log('[CALLBACK] Code exchange success:', data.session.user?.email);
          onSuccess(data.session.user?.email);
          return;
        }
        console.log('[CALLBACK] Code exchange failed:', error?.message);
      }

      // Check for an already-established session (e.g. fragment-based flow)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[CALLBACK] Existing session found:', session.user?.email);
        onSuccess(session.user?.email);
        return;
      }

      // Wait up to 4s for onAuthStateChange to fire (fragment token exchange)
      setTimeout(() => {
        if (!settled) {
          console.log('[CALLBACK] Timeout — showing expired screen');
          onExpired();
        }
      }, 4000);
    }

    // Listen for auth state changes as a backup (handles implicit token in URL fragment)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CALLBACK] onAuthStateChange:', event, session?.user?.email);
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        onSuccess(session.user?.email);
      }
    });

    run();

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  // ── Expired screen ───────────────────────────────────────────────────────────
  if (state === 'expired') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8F6F3] px-4">
        <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#0A2540] font-semibold mb-2">Link expired</p>
          <p className="text-[#666666] text-sm mb-5 leading-relaxed">
            This link has expired or already been used. Request a new one from the signup page.
          </p>
          <a
            href="/paywall"
            className="block w-full h-11 rounded-lg bg-[#0A2540] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#0d2f52] transition-all"
          >
            Request new link →
          </a>
        </div>
      </div>
    );
  }

  // ── Success screen (brief flash before redirect) ──────────────────────────
  if (state === 'success') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8F6F3] px-4">
        <div className="max-w-sm w-full bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#00A651]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#00A651]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[#0A2540] font-semibold mb-1">Verified!</p>
          {isAdmin ? (
            <p className="text-[#00A651] text-sm font-medium">Admin account — full access granted.</p>
          ) : (
            <p className="text-[#666666] text-sm">Taking you to your matches…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Verifying (default) ───────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F6F3]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#0A2540]/30 border-t-[#0A2540] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#0A2540] font-semibold text-sm">Verifying…</p>
      </div>
    </div>
  );
}
