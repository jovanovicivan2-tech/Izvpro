import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest, reqId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const rid = reqId ?? '?';

  if (!supabaseUrl || !supabaseKey) {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} ERROR=missing_env_vars`);
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  // getSession() čita JWT lokalno iz cookie-ja — bez remote poziva.
  // Dovoljno za routing odluku. Brže i pouzdanije u edge runtimeu.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} session=${!!session} userId=${user?.id ?? 'null'}`);

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/demo') ||
    pathname === '/';

  if (!user && !isPublicPath) {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=REDIRECT_LOGIN`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} decision=PASS`);
  return supabaseResponse;
}
