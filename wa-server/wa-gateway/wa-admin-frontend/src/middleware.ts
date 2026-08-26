import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_NAME = 'admin_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CRITICAL FIX: Bypass middleware logic for static files, images, and API routes.
  // This prevents 400 Bad Request errors caused by cookie parsing on static assets
  // or unnecessary redirect loops.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Exclude files with extensions (css, js, png, ico, etc)
  ) {
    return NextResponse.next();
  }
 
  const token = request.cookies.get(TOKEN_NAME)?.value;

  const isDashboardRoute = !pathname.startsWith('/login');

  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/login') && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // We keep the matcher to let Next.js optimize, but the internal check above is the safety net.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
