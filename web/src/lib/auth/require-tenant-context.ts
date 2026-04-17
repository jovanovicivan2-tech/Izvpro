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
 *
 * Koristi getSession() umesto getUser() da izbegne API poziv koji može
 * failovati zbog refresh_token_not_found greške.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();

  console.log('[TRACE][tenant] enter getSession');

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  console.log('[TRACE][tenant] getSession userId=' + (user?.id ?? 'null') + ' error=' + (sessionError?.message ?? 'none'));

  if (sessionError || !user) {
    console.log('[TRACE][tenant] no_user redirect=/login');
    redirect('/login');
  }

  console.log('[TRACE][tenant] query korisnici userId=' + user!.id);

  const { data: profile, error: profileError } = await supabase
    .from('korisnici')
    .select('office_id')
    .eq('id', user!.id)
    .single();

  console.log('[TRACE][tenant] korisnici officeId=' + (profile?.office_id ?? 'null') + ' error=' + (profileError?.message ?? 'none') + ' code=' + (profileError?.code ?? 'none'));

  if (profileError || !profile?.office_id) {
    console.log('[TRACE][tenant] no_office_id redirect=/login');
    redirect('/login');
  }

  console.log('[TRACE][tenant] ok officeId=' + profile!.office_id);

  return {
    userId: user!.id,
    userEmail: user!.email ?? '',
    officeId: profile!.office_id,
  };
}
