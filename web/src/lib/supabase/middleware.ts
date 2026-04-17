import { NextResponse, type NextRequest } from 'next/server';

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

/**
 * Čita session cookie i dekoduje JWT access token lokalno (bez API poziva).
 * Ovo sprečava "refresh_token_not_found" petlju koju pravi supabase.auth.getUser()
 * kad pokušava da refreshuje token na svakom requestu.
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
      raw = combined || undefined;
    }

    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.access_token) return null;

    // Dekodujem JWT payload lokalno (bez verifikacije signature — samo za middleware routing)
    const parts = session.access_token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    // Proveri expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log(`[TRACE][middleware] JWT expired at=${payload.exp} now=${now}`);
      return null;
    }

    const userId = payload.sub;
    if (!userId) return null;

    return { userId };
  } catch (e) {
    console.error('[TRACE][middleware] cookie parse error:', e);
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
