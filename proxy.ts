/**
 * Next.js Middleware — Auth session refresh + route protection
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request (prevents expiry)
 * 2. Redirect unauthenticated users away from /decision → /paywall
 *
 * Admin bypass:
 * - ?admin=heed in the URL sets the heed_admin_bypass cookie (1 year, non-HttpOnly)
 * - Any request with that cookie skips the auth redirect for protected routes
 * - app/decision/page.tsx reads the same cookie to skip the subscription check
 *
 * NOTE: Subscription status is NOT checked here (requires a DB call that
 * would slow every request). That check is done in app/decision/page.tsx
 * as a server component, which runs after middleware clears auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server';

// Routes that require a Supabase auth session
const PROTECTED_ROUTES = ['/decision'];

const ADMIN_SECRET = 'heed';
const ADMIN_COOKIE = 'heed_admin_bypass';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  // ── Admin bypass ────────────────────────────────────────────────────────────
  // If ?admin=heed is present, write the persistent bypass cookie into the
  // response so every subsequent request (including this one) is treated as
  // bypassed. Cookie is non-HttpOnly so the client JS banner can also read it.
  const adminParam = req.nextUrl.searchParams.get('admin');
  if (adminParam === ADMIN_SECRET) {
    res.cookies.set(ADMIN_COOKIE, 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: false, // must stay readable by client JS for the banner
    });
    console.log('[Middleware] Admin bypass cookie set');
  }

  const isAdminBypass =
    adminParam === ADMIN_SECRET ||
    req.cookies.get(ADMIN_COOKIE)?.value === 'true';

  // ── Session refresh ─────────────────────────────────────────────────────────
  // Always call getUser() — refreshes the session cookie if expired.
  const supabase = createSupabaseMiddlewareClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // ── Protected route gate ────────────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  if (isProtected && !user && !isAdminBypass) {
    const url = req.nextUrl.clone();
    url.pathname = '/paywall';
    url.searchParams.set('reason', 'auth');
    console.log('[Middleware] No session — redirecting to /paywall');
    return NextResponse.redirect(url);
  }

  // Return response with refreshed cookies (+ bypass cookie if just set)
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
