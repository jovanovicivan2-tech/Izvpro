import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[DIAG][middleware] MISSING env vars — NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // --- getAll/setAll (bulk interface) ---
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Partial<ResponseCookie> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
      // --- get/set/remove (@supabase/ssr@0.3.0 storage.setItem uses this interface) ---
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Partial<ResponseCookie>) {
        console.log('[DIAG][middleware] set() called for:', name);
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

  const pathname = request.nextUrl.pathname;

  const incomingCookieNames = request.cookies.getAll().map(c => c.name);
  const hasSupabaseCookie = incomingCookieNames.some(n => n.includes('supabase') || n.includes('sb-'));
  console.log(`[DIAG][middleware] path: ${pathname}`);
  console.log(`[DIAG][middleware] cookies: [${incomingCookieNames.join(', ')}]`);
  console.log(`[DIAG][middleware] hasSupabaseCookie: ${hasSupabaseCookie}`);

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError) {
    console.log(`[DIAG][middleware] getUser ERROR: message="${getUserError.message}" status=${(getUserError as any).status ?? 'n/a'}`);
  } else {
    console.log(`[DIAG][middleware] getUser OK: userId=${user?.id ?? 'null'} email=${user?.email ?? 'null'}`);
  }

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/demo') ||
    pathname === '/';

  if (!user && !isPublicPath) {
    console.log(`[DIAG][middleware] DECISION: REDIRECTING to /login — no user on protected path: ${pathname}`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log(`[DIAG][middleware] DECISION: PASSING through: ${pathname}`);
  return supabaseResponse;
}
