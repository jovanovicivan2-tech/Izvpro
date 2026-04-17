import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url));
  }

  const cookiesToWrite: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach((c) => cookiesToWrite.push(c));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log(`[TRACE][login] signIn hasSession=${!!data?.session} hasUser=${!!data?.user} error=${error?.message ?? 'none'}`);
  console.log(`[TRACE][login] cookiesToWrite=[${cookiesToWrite.map(c => c.name).join(',')}]`);

  if (error || !data.session) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url));
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  // Eksplicitno upisujemo sve Supabase cookies u HTTP response
  // Ovo garantuje chunked server-side format koji middleware prepoznaje
  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options as object,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    } as Parameters<typeof response.cookies.set>[2]);
  });

  console.log(`[TRACE][login] redirect=/dashboard cookies_written=${cookiesToWrite.length}`);
  return response;
}
