import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
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
    },
  });

  const pathname = request.nextUrl.pathname;

  // DIAG: koje cookie-je middleware vidi na ovom requestu
  const incomingCookieNames = request.cookies.getAll().map(c => c.name);
  const hasSupabaseCookie = incomingCookieNames.some(n => n.includes('supabase') || n.includes('sb-'));
  console.log(`[DIAG][middleware] path: ${pathname}`);
  console.log(`[DIAG][middleware] incoming cookies:`, incomingCookieNames);
  console.log(`[DIAG][middleware] hasSupabaseCookie: ${hasSupabaseCookie}`);

  const { data: { user } } = await supabase.auth.getUser();

  // DIAG: rezultat getUser
  console.log(`[DIAG][middleware] getUser result: userId=${user?.id ?? 'null'}, email=${user?.email ?? 'null'}`);

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/demo') ||
    pathname === '/';

  console.log(`[DIAG][middleware] isPublicPath: ${isPublicPath}, user: ${user ? 'PRESENT' : 'NULL'}`);

  if (!user && !isPublicPath) {
    console.log(`[DIAG][middleware] REDIRECTING to /login (no user on protected path: ${pathname})`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log(`[DIAG][middleware] PASSING through: ${pathname}`);
  return supabaseResponse;
}
