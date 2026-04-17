import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = (formData.get('email') ?? '') as string;
    const password = (formData.get('password') ?? '') as string;

    if (!email || !password) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    // Privremeno čuvamo cookies koje Supabase želi da upiše
    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            cookies.forEach((c) => pendingCookies.push({ name: c.name, value: c.value, options: c.options as Record<string, unknown> ?? {} }));
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log(`[TRACE][login] ok=${!!data?.session} cookies=${pendingCookies.map(c => c.name).join(',')} error=${error?.message ?? 'none'}`);

    if (error || !data?.session) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    // Login uspeo — pravimo redirect response i upisujemo cookies
    const response = NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set({
        name,
        value,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        ...(options as object),
      });
    });

    return response;
  } catch (err) {
    console.error('[TRACE][login] UNHANDLED ERROR:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url), { status: 303 });
  }
}
