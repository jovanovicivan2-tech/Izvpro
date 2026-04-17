import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
  }

  // Pravimo response objekat unapred — cookies se upisuju direktno u njega
  const successResponse = NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });
  const errorResponse = () => NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Upisujemo direktno u response koji idemo da vratimo
          successResponse.cookies.set(name, value, options as Parameters<typeof successResponse.cookies.set>[2]);
          console.log(`[TRACE][login] cookie set: ${name}`);
        },
        remove(name: string, options: CookieOptions) {
          successResponse.cookies.set(name, '', { ...options as object, maxAge: 0 } as Parameters<typeof successResponse.cookies.set>[2]);
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log(`[TRACE][login] signIn ok=${!!data?.session} error=${error?.message ?? 'none'}`);

  if (error || !data.session) {
    return errorResponse();
  }

  // Cookies su već upisani u successResponse tokom signInWithPassword
  const cookieNames = successResponse.cookies.getAll().map(c => c.name);
  console.log(`[TRACE][login] cookies_in_response=[${cookieNames.join(',')}] → redirect=/dashboard`);

  return successResponse;
}
