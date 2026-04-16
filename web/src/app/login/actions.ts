'use server';

import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=invalid_credentials');
  }

  const cookieStore = await cookies();

  // DIAG: cookie-ji pre loginAction
  const beforeCookies = cookieStore.getAll();
  console.log('[DIAG][loginAction] cookies BEFORE signIn:', beforeCookies.map(c => c.name));

  let cookiesWritten: string[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // DIAG: beleži koji cookie-ji se pokušavaju upisati
          cookiesWritten = cookiesToSet.map(c => c.name);
          console.log('[DIAG][loginAction] setAll called, cookies to set:', cookiesWritten);
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
              console.log('[DIAG][loginAction] cookie SET OK:', name);
            } catch (e) {
              console.error('[DIAG][loginAction] cookie SET FAILED:', name, e);
            }
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // DIAG: rezultat signIn
  console.log('[DIAG][loginAction] signInWithPassword result:', {
    hasSession: !!data?.session,
    hasUser: !!data?.user,
    userId: data?.user?.id ?? null,
    error: error?.message ?? null,
    cookiesWritten,
  });

  if (error) {
    redirect('/login?error=invalid_credentials');
  }

  // DIAG: cookie-ji posle signIn, neposredno pre redirect-a
  const afterCookies = cookieStore.getAll();
  console.log('[DIAG][loginAction] cookies AFTER signIn (pre-redirect):', afterCookies.map(c => c.name));

  redirect('/dashboard');
}
