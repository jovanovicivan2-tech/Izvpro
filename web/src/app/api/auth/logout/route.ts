import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  console.log('[TRACE][logout] POST');

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, '', { ...options as object, maxAge: 0 } as Parameters<typeof response.cookies.set>[2]);
        },
      },
    }
  );

  await supabase.auth.signOut();

  console.log('[TRACE][logout] signOut OK → redirect /login');
  return response;
}
