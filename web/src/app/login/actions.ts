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

  console.log('[TRACE][login] start email=' + email);
  console.log('[TRACE][login] cookies_before=[' + cookieStore.getAll().map(c => c.name).join(',') + ']');

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
          cookiesWritten = cookiesToSet.map(c => c.name);
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch (e) {
              console.log('[TRACE][login] cookie_set_failed name=' + name + ' err=' + String(e));
            }
          });
        },
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesWritten.push(name);
          try {
            cookieStore.set(name, value, options);
          } catch (e) {
            console.log('[TRACE][login] cookie_set_failed name=' + name + ' err=' + String(e));
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (e) {
            console.log('[TRACE][login] cookie_remove_failed name=' + name + ' err=' + String(e));
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log('[TRACE][login] signIn hasSession=' + !!data?.session + ' hasUser=' + !!data?.user + ' userId=' + (data?.user?.id ?? 'null') + ' error=' + (error?.message ?? 'none'));
  console.log('[TRACE][login] cookies_written=[' + cookiesWritten.join(',') + ']');

  if (error) {
    console.log('[TRACE][login] redirect=/login?error=invalid_credentials');
    redirect('/login?error=invalid_credentials');
  }

  console.log('[TRACE][login] redirect=/dashboard');
  redirect('/dashboard');
}
