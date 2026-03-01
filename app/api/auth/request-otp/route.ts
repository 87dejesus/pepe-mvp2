/**
 * POST /api/auth/request-otp
 *
 * Sends a 6-digit OTP to the user's email via Supabase Auth.
 * Creates the user account automatically if it doesn't exist.
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
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  // Use anon key — signInWithOtp is a public operation
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // OTP is a 6-digit code, not a magic link
      data: { app: 'the-steady-one' },
    },
  });

  if (error) {
    console.error('[Auth] request-otp error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('[Auth] OTP sent to:', email);
  return NextResponse.json({ ok: true });
}
