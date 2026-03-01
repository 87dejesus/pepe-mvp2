/**
 * POST /api/auth/verify-otp
 *
 * Verifies the 6-digit OTP and establishes a Supabase Auth session.
 * Session cookies are written to the response so middleware can read them.
 *
 * Body: { email: string, token: string }
 * Returns: { ok: true, userId: string } or { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();
  const token = (body.token ?? '').trim();

  if (!email || !token) {
    return NextResponse.json({ error: 'Email e código são obrigatórios.' }, { status: 400 });
  }

  // We need to set cookies on the response, so we build the response first
  const res = NextResponse.json({ ok: false }); // placeholder, replaced below

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !data.session) {
    console.error('[Auth] verify-otp error:', error?.message);
    return NextResponse.json(
      { error: error?.message ?? 'Código inválido. Tente novamente.' },
      { status: 400 }
    );
  }

  const userId = data.session.user.id;
  console.log('[Auth] OTP verified, userId:', userId);

  // Build a fresh success response (so cookies from setAll() transfer over)
  const successRes = NextResponse.json({ ok: true, userId });
  // Copy cookies set during verifyOtp onto the success response
  res.cookies.getAll().forEach(({ name, value, ...options }) => {
    successRes.cookies.set(name, value, options);
  });

  return successRes;
}
