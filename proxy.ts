/**
 * Next.js Middleware — Auth session refresh + route protection
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request (prevents expiry)
 *
 * Auth/subscription gating for /decision is done entirely in DecisionClient
 * (client-side) so the admin bypass (localStorage heed_admin_bypass) can
 * intercept before any redirect fires. PROTECTED_ROUTES is intentionally empty.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server';

// Auth-gated routes — subscription/access is handled client-side in DecisionClient
// so the admin bypass (localStorage) can intercept before any redirect fires.
// /decision is intentionally NOT listed here.
const PROTECTED_ROUTES: string[] = [];

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createSupabaseMiddlewareClient(req, res);

  // Always call getUser() — this refreshes the session cookie if expired.
  // Required by @supabase/ssr to keep sessions alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Check protected routes — only gate on auth (not subscription)
  const isProtected = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/paywall';
    url.searchParams.set('reason', 'auth');
    console.log('[Middleware] No session — redirecting to /paywall');
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static files and images.
     * Runs on: pages, API routes (except /api/webhooks which is public).
     */
    '/((?!_next/static|_next/image|favicon\\.ico|brand/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|api/webhooks).*)',
  ],
};
