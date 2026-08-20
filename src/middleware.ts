import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Define your base domains (for local and prod)
  const isLocal = hostname.includes('localhost') || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  const baseDomain = isLocal ? hostname : 'gymos.in';

  // Example: vgym.gymos.in -> vgym
  const subdomain = hostname.replace(`.${baseDomain}`, '');
  
  // If it's a subdomain (and not the base domain), rewrite to /[domain]
  if (hostname !== baseDomain && subdomain && subdomain !== hostname) {
    // Exclude API routes and static files from being rewritten
    if (!url.pathname.startsWith('/api') && !url.pathname.includes('.')) {
      url.pathname = `/${subdomain}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Handle Supabase Auth session refresh and route protection
  return await updateSession(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
