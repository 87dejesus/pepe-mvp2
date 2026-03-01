/**
 * Next.js Middleware — Auth session refresh + route protection
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request (prevents expiry)
 * 2. Redirect unauthenticated users away from /decision → /paywall
 *
 * NOTE: Subscription status is NOT checked here (requires a DB call that
 * would slow every request). That check is done in app/decision/page.tsx
 * as a server component, which runs after middleware clears auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server';

// Routes that require a Supabase auth session
const PROTECTED_ROUTES = ['/decision'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createSupabaseMiddlewareClient(req, res);

  // Always call getUser() — this refreshes the session cookie if expired.
  // Required by @supabase/ssr to keep sessions alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Check protected routes
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

  // Return response with refreshed cookies
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
