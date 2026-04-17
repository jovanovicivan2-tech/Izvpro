import { NextResponse, type NextRequest } from 'next/server';

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

export async function updateSession(request: NextRequest, reqId?: string) {
  const pathname = request.nextUrl.pathname;
  const rid = reqId ?? '?';

  // Proveravamo samo da li cookie postoji — ne dekodujemo JWT u Edge Runtime
  // JWT validacija se radi u requireTenantContext (Node.js runtime)
  const sessionCookie =
    request.cookies.get(SESSION_COOKIE)?.value ||
    request.cookies.get(`${SESSION_COOKIE}.0`)?.value;

  const hasCookie = !!sessionCookie;

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} hasCookie=${hasCookie}`);

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/demo') ||
    pathname === '/';

  if (!hasCookie && !isPublicPath) {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=REDIRECT_LOGIN`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=PASS`);
  return NextResponse.next({ request });
}
