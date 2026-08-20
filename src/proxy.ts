import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export async function proxy(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const hostname = (req.headers.get('host') || '').split(':')[0];

    const isLocal =
      hostname.includes('localhost') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.');
    const isVercelHost = hostname.endsWith('.vercel.app');
    const baseDomain = isLocal || isVercelHost ? hostname : 'gymos.in';

    const subdomain = hostname.replace(`.${baseDomain}`, '');

    if (hostname !== baseDomain && subdomain && subdomain !== hostname) {
      if (!url.pathname.startsWith('/api') && !url.pathname.includes('.')) {
        url.pathname = `/${subdomain}${url.pathname}`;
        return NextResponse.rewrite(url);
      }
    }

    return await updateSession(req);
  } catch (error) {
    console.error('proxy error:', error);
    return NextResponse.next({ request: req });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
