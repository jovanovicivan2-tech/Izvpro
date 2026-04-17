'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export interface TenantContext {
  userId: string;
  userEmail: string;
  officeId: string;
}

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

interface StoredSession {
  access_token: string;
  refresh_token: string;
  user?: { id: string; email?: string };
}

async function readSessionFromCookie(): Promise<StoredSession | null> {
  try {
    const cookieStore = await cookies();

    let raw = cookieStore.get(SESSION_COOKIE)?.value;

    if (!raw) {
      let combined = '';
      for (let i = 0; i < 10; i++) {
        const chunk = cookieStore.get(`${SESSION_COOKIE}.${i}`)?.value;
        if (!chunk) break;
        combined += chunk;
      }
      if (combined) raw = combined;
    }

    if (!raw) return null;

    let session: StoredSession;
    try {
      session = JSON.parse(raw);
    } catch {
      session = JSON.parse(decodeURIComponent(raw));
    }

    if (!session?.access_token) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireTenantContext(): Promise<TenantContext> {
  const session = await readSessionFromCookie();

  console.log('[TRACE][tenant] session=' + !!session + ' userId=' + (session?.user?.id ?? 'null'));

  if (!session?.access_token || !session?.user?.id) {
    console.log('[TRACE][tenant] no_session → redirect /login');
    redirect('/login');
  }

  const userId = session!.user!.id;
  const userEmail = session!.user?.email ?? '';

  // Koristimo @supabase/ssr createServerClient koji ispravno radi sa REST API
  // i setujemo sesiju direktno iz cookie vrednosti — bez refresh API poziva
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Postavljamo sesiju direktno — ovo ne okida refresh jer imamo oba tokena
  await supabase.auth.setSession({
    access_token: session!.access_token,
    refresh_token: session!.refresh_token ?? '',
  });

  const { data: profile, error: profileError } = await supabase
    .from('korisnici')
    .select('office_id')
    .eq('id', userId)
    .single();

  console.log('[TRACE][tenant] officeId=' + (profile?.office_id ?? 'null') + ' error=' + (profileError?.message ?? 'none'));

  if (profileError || !profile?.office_id) {
    console.log('[TRACE][tenant] no_office_id → redirect /login');
    redirect('/login');
  }

  return {
    userId,
    userEmail,
    officeId: profile!.office_id,
  };
}
