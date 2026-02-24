import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'xga-access-token';
const PUBLIC_ROUTES = new Set([
  '/',
  '/dashboard',
  '/compose',
  '/ideas',
  '/schedule',
  '/calendar',
  '/library',
  '/analytics',
  '/hooks',
  '/repurpose',
  '/settings',
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith('/library/')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname.includes('.')) return true;
  return false;
}

async function verifySupabaseAccessToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  return res.ok;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/settings';
    redirectUrl.searchParams.set('auth', 'required');
    return NextResponse.redirect(redirectUrl);
  }

  const isValid = await verifySupabaseAccessToken(token);
  if (isValid) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/settings';
  redirectUrl.searchParams.set('auth', 'required');
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export const config = {
  matcher: '/:path*',
};
