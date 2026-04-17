import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = (formData.get('email') ?? '') as string;
    const password = (formData.get('password') ?? '') as string;

    if (!email || !password) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    // Response se kreira unapred da bi cookies.set() mogao da upisuje direktno u njega
    const response = NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // @supabase/ssr 0.3.0 poziva get/set/remove — ne getAll/setAll
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log(`[TRACE][login] cookie.set name=${name}`);
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options as object, maxAge: 0 } as Parameters<typeof response.cookies.set>[2]);
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log(`[TRACE][login] ok=${!!data?.session} error=${error?.message ?? 'none'}`);
    console.log(`[TRACE][login] cookies_in_response=[${response.cookies.getAll().map(c => c.name).join(',')}]`);

    if (error || !data?.session) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    return response;
  } catch (err) {
    console.error('[TRACE][login] ERROR:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url), { status: 303 });
  }
}
