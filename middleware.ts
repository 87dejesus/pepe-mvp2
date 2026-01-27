import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Explicitly allow root path to render without redirects
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }
  // Allow all other paths to proceed normally
  return NextResponse.next()
}
