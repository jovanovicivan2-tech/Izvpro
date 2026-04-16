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
  console.log('[AUTH-DIAG][loginAction] cookies BEFORE signIn:', beforeCookies.map(c => c.name));

  let cookiesWritten: string[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // --- getAll/setAll (koristi middleware i server components) ---
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesWritten = cookiesToSet.map(c => c.name);
          console.log('[AUTH-DIAG][loginAction] setAll called, cookies to set:', cookiesWritten);
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
              console.log('[AUTH-DIAG][loginAction] setAll SET OK:', name);
            } catch (e) {
              console.error('[AUTH-DIAG][loginAction] setAll SET FAILED:', name, String(e));
            }
          });
        },
        // --- get/set/remove (@supabase/ssr@0.3.0 storage.setItem koristi ovaj interfejs) ---
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesWritten.push(name);
          console.log('[AUTH-DIAG][loginAction] set() called for:', name);
          try {
            cookieStore.set(name, value, options);
            console.log('[AUTH-DIAG][loginAction] set() SET OK:', name);
          } catch (e) {
            console.error('[AUTH-DIAG][loginAction] set() SET FAILED:', name, String(e));
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (e) {
            console.error('[AUTH-DIAG][loginAction] remove() FAILED:', name, String(e));
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log('[AUTH-DIAG][loginAction] signInWithPassword result:', {
    hasSession: !!data?.session,
    hasUser: !!data?.user,
    userId: data?.user?.id ?? null,
    error: error?.message ?? null,
    cookiesWritten,
  });

  if (error) {
    redirect('/login?error=invalid_credentials');
  }

  const afterCookies = cookieStore.getAll();
  console.log('[AUTH-DIAG][loginAction] cookies AFTER signIn (pre-redirect):', afterCookies.map(c => c.name));

  redirect('/dashboard');
}
