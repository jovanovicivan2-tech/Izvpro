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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Dohvati office_id iz tabele korisnici (ili users)
  const { data: profile, error: profileError } = await supabase
    .from('korisnici')
    .select('office_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.office_id) {
    // Korisnik postoji u auth ali nema profil — loša konfiguracija
    redirect('/login');
  }

  return {
    userId: user.id,
    userEmail: user.email ?? '',
    officeId: profile.office_id,
  };
}
