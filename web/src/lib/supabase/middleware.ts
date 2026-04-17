import { NextResponse, type NextRequest } from 'next/server';

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

/**
 * Dekoduje base64url string — koristi atob() koji radi u Edge Runtime.
 * Buffer.from() NIJE dostupan u Edge Runtime.
 */
function base64urlDecode(str: string): string {
  // base64url → base64 (zameni - i _ sa + i /)
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Dodaj padding ako treba
  const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Čita session cookie i dekoduje JWT access token lokalno (bez API poziva).
 * Radi u Edge Runtime — koristi samo Web APIs (atob, JSON.parse).
 */
function getSessionFromCookies(request: NextRequest): { userId: string } | null {
  try {
    // Pokušaj direktan cookie
    let raw = request.cookies.get(SESSION_COOKIE)?.value;

    // Ako ne postoji, pokušaj chunked (.0, .1, ...)
    if (!raw) {
      let combined = '';
      for (let i = 0; i < 10; i++) {
        const chunk = request.cookies.get(`${SESSION_COOKIE}.${i}`)?.value;
        if (!chunk) break;
        combined += chunk;
      }
      if (combined) raw = combined;
    }

    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.access_token) return null;

    // Dekodujem JWT payload lokalno
    const parts = (session.access_token as string).split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64urlDecode(parts[1]));

    // Proveri expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log(`[TRACE][middleware] JWT expired at=${payload.exp} now=${now}`);
      return null;
    }

    const userId = payload.sub as string | undefined;
    if (!userId) return null;

    return { userId };
  } catch (e) {
    console.error('[TRACE][middleware] session parse error:', e);
    return null;
  }
}

export async function updateSession(request: NextRequest, reqId?: string) {
  const pathname = request.nextUrl.pathname;
  const rid = reqId ?? '?';

  const session = getSessionFromCookies(request);
  const userId = session?.userId ?? null;

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} userId=${userId ?? 'null'}`);

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/demo') ||
    pathname === '/';

  if (!userId && !isPublicPath) {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=REDIRECT_LOGIN`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=PASS`);
  return NextResponse.next({ request });
}
