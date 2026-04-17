'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export interface TenantContext {
  userId: string;
  userEmail: string;
  officeId: string;
}

const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;
const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cHlpdnFkaW5lbWhmcnJqZGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODM5NzksImV4cCI6MjA5MTA1OTk3OX0.OQVRAWRmCxqcsc1T0jwHVrvlgifgrnc3MwiXLUOgj8k';

interface StoredSession {
  access_token: string;
  refresh_token?: string;
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
  const accessToken = session!.access_token;

  // Direktan fetch ka Supabase REST API — zaobilazimo auth SDK i refresh logiku
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/korisnici?select=office_id&id=eq.${userId}&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': ANON_KEY,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }
  );

  const rows = res.ok ? await res.json() : [];
  const officeId = rows?.[0]?.office_id ?? null;

  console.log('[TRACE][tenant] status=' + res.status + ' officeId=' + officeId);

  if (!officeId) {
    console.log('[TRACE][tenant] no_office_id → redirect /login');
    redirect('/login');
  }

  return { userId, userEmail, officeId };
}
