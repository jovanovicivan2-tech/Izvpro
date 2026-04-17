import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('[TRACE][login] route handler start email=' + email);

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url));
  }

  const cookieStore = await cookies();

  // Skupljamo cookies koje Supabase želi da upiše
  const cookiesToWrite: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToWrite.push({ name, value, options: options ?? {} });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log('[TRACE][login] signIn hasSession=' + !!data?.session + ' hasUser=' + !!data?.user + ' error=' + (error?.message ?? 'none'));
  console.log('[TRACE][login] cookiesToWrite=[' + cookiesToWrite.map(c => c.name).join(',') + ']');

  if (error) {
    console.log('[TRACE][login] redirect=/login?error=invalid_credentials');
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url));
  }

  // Pravimo redirect response i EKSPLICITNO upisujemo sve Supabase cookies u njega
  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  console.log('[TRACE][login] redirect=/dashboard cookies_set=' + cookiesToWrite.length);
  return response;
}
