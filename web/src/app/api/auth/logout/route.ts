import { NextRequest, NextResponse } from 'next/server';

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

export async function POST(request: NextRequest) {
  console.log('[TRACE][logout] POST');

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  // Brišemo session cookie i sve moguće chunk varijante
  const cookieOptions = { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' as const };
  response.cookies.set(SESSION_COOKIE, '', cookieOptions);
  for (let i = 0; i < 10; i++) {
    response.cookies.set(`${SESSION_COOKIE}.${i}`, '', cookieOptions);
  }

  console.log('[TRACE][logout] cookies cleared → redirect /login');
  return response;
}
