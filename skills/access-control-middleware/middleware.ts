/**
 * Next.js Middleware — Access Control
 * File location: /middleware.ts (project root, NOT inside /app)
 *
 * Runs on Edge runtime. Checks the `steady_access` cookie to gate /decision.
 * The cookie is set by /api/auth/check-access after a successful subscription check.
 *
 * NOTE: This middleware cannot call Supabase directly (no Node.js runtime).
 * It relies on the cookie being refreshed by the client after subscription changes.
 */

import { NextRequest, NextResponse } from 'next/server';

// Routes that require an active subscription (or trial)
const PROTECTED_ROUTES = ['/decision'];

// Routes that are always public
const PUBLIC_ROUTES = ['/', '/flow', '/exit', '/paywall', '/api'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public routes and API routes
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isPublic) return NextResponse.next();

  // Check protected routes
  const isProtected = PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (!isProtected) return NextResponse.next();

  // Read the access cookie
  const accessCookie = req.cookies.get('steady_access');

  if (!accessCookie) {
    // No cookie — send to paywall
    const url = req.nextUrl.clone();
    url.pathname = '/paywall';
    url.searchParams.set('reason', 'no_subscription');
    url.searchParams.set('next', pathname);
    console.log(`[Steady Debug] Middleware: no access cookie, redirecting to /paywall`);
    return NextResponse.redirect(url);
  }

  // Cookie exists — validate it is not the 'blocked' sentinel value
  // The API sets it to 'blocked' when subscription is canceled/past_due
  if (accessCookie.value === 'blocked') {
    const url = req.nextUrl.clone();
    url.pathname = '/paywall';
    url.searchParams.set('reason', 'blocked');
    return NextResponse.redirect(url);
  }

  // Cookie is present and valid — allow through
  // (Full validation of subscription state happens in the client hook)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public/ assets
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$).*)',
  ],
};
