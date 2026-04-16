import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

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
      setAll(cookiesToSet: { name: string; value: string; options: Partial<ResponseCookie> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Partial<ResponseCookie>) {
        request.cookies.set(name, value);
        supabaseResponse = NextResponse.next({ request });
        supabaseResponse.cookies.set(name, value, options);
      },
      remove(name: string, options: Partial<ResponseCookie>) {
        request.cookies.set(name, '');
        supabaseResponse = NextResponse.next({ request });
        supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError) {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} getUser=error msg="${getUserError.message}"`);
  } else {
    console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} getUser=ok userId=${user?.id ?? 'null'}`);
  }

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
