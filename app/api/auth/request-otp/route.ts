/**
 * POST /api/auth/request-otp
 *
 * Sends a magic-link email via Supabase Auth.
 * The link redirects to /auth/callback where the session is established,
 * then the user continues to Stripe checkout.
 *
 * Body: { email: string }
 * Returns: { ok: true } or { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const origin = req.headers.get('origin') ?? 'https://www.thesteadyone.com';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback`,
      data: { app: 'the-steady-one' },
    },
  });

  if (error) {
    console.error('[Auth] send-magic-link error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('[Auth] Magic link sent to:', email);
  return NextResponse.json({ ok: true });
}
