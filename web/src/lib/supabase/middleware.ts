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
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set(name, value);
        supabaseResponse = NextResponse.next({ request });
        supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set(name, '');
        supabaseResponse = NextResponse.next({ request });
        supabaseResponse.cookies.set(name, '', { ...options as object, maxAge: 0 } as Parameters<typeof supabaseResponse.cookies.set>[2]);
      },
    },
  });

  // getSession() čita token iz cookie-ja lokalno — bez API poziva i bez refresh-a
  // Ovo sprečava "refresh_token_not_found" petlju
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  console.log(`[TRACE][middleware] reqId=${rid} path=${pathname} userId=${user?.id ?? 'null'} error=${sessionError?.message ?? 'none'}`);

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
