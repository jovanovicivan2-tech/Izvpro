import { NextRequest, NextResponse } from 'next/server';

// PRIVREMENI debug endpoint — obrisati posle fixa
export async function GET(request: NextRequest) {
  const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
  const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

  const allCookies = request.cookies.getAll().map(c => ({ name: c.name, len: c.value.length, first30: c.value.slice(0, 30) }));
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  let parseResult: string = 'not attempted';
  let userId: string | null = null;
  let jwtExp: number | null = null;
  let error: string | null = null;

  if (sessionCookie?.value) {
    try {
      const raw = sessionCookie.value;
      parseResult = `raw_len=${raw.length} starts_with=${raw.slice(0, 10)}`;

      let session: { access_token?: string } | null = null;

      // Pokušaj direktno
      try {
        session = JSON.parse(raw);
      } catch {
        // Pokušaj URL decode
        try {
          session = JSON.parse(decodeURIComponent(raw));
          parseResult += ' (needed urldecode)';
        } catch (e2) {
          error = `json_parse_failed: ${String(e2).slice(0, 80)}`;
        }
      }

      if (session?.access_token) {
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
          // atob decode
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
          const payload = JSON.parse(atob(padded));
          userId = payload.sub ?? null;
          jwtExp = payload.exp ?? null;
          parseResult += ' jwt_ok';
        } else {
          error = `jwt_parts=${parts.length}`;
        }
      } else {
        error = `no_access_token session_keys=${Object.keys(session ?? {}).join(',')}`;
      }
    } catch (e) {
      error = `unexpected: ${String(e).slice(0, 100)}`;
    }
  }

  const now = Math.floor(Date.now() / 1000);

  return NextResponse.json({
    cookies: allCookies,
    session_cookie_present: !!sessionCookie,
    parse_result: parseResult,
    user_id: userId,
    jwt_exp: jwtExp,
    now,
    jwt_expired: jwtExp ? jwtExp < now : null,
    error,
  });
}
