'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface TenantContext {
  userId: string;
  userEmail: string;
  officeId: string;
}

/**
 * Koristi se na vrhu svakog server componenta i server actiona.
 * Vraća { userId, userEmail, officeId } ili redirectuje na /login.
 * Nikad ne vraća null — ako nema korisnika ili office_id, redirect.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();

  console.log('[AUTH-DIAG][TenantContext] entered — calling getUser()');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[AUTH-DIAG][TenantContext] getUser result:', {
    userId: user?.id ?? 'NULL',
    error: authError?.message ?? null,
  });

  if (authError || !user) {
    console.log('[AUTH-DIAG][TenantContext] no user — redirecting to /login');
    redirect('/login');
  }

  console.log('[AUTH-DIAG][TenantContext] querying korisnici for user:', user!.id);

  const { data: profile, error: profileError } = await supabase
    .from('korisnici')
    .select('office_id')
    .eq('id', user!.id)
    .single();

  console.log('[AUTH-DIAG][TenantContext] korisnici result:', {
    officeId: profile?.office_id ?? 'NULL',
    error: profileError?.message ?? null,
    errorCode: profileError?.code ?? null,
  });

  if (profileError || !profile?.office_id) {
    console.log('[AUTH-DIAG][TenantContext] no office_id — redirecting to /login');
    redirect('/login');
  }

  console.log('[AUTH-DIAG][TenantContext] OK — returning context for office:', profile!.office_id);

  return {
    userId: user!.id,
    userEmail: user!.email ?? '',
    officeId: profile!.office_id,
  };
}
