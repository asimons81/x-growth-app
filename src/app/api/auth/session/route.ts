import { NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'xga-access-token';

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();
    const response = NextResponse.json({ success: true });

    if (typeof accessToken === 'string' && accessToken.length > 0) {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

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
  } catch {
    return NextResponse.json({ error: 'Failed to sync session' }, { status: 500 });
  }
}
