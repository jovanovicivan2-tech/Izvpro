import type { SupabaseClient } from '@supabase/supabase-js';

interface LogParams {
  supabase: SupabaseClient;
  officeId: string;
  predmetId: string | null;
  korisnikId: string;
  korisnikEmail: string;
  akcija: string;
  detalji?: Record<string, unknown>;
}

/**
 * Upisuje unos u activity_log.
 * Fire-and-forget — greška ne blokira glavni tok.
 */
export async function logActivity({
  supabase,
  officeId,
  predmetId,
  korisnikId,
  korisnikEmail,
  akcija,
  detalji,
}: LogParams): Promise<void> {
  const { error } = await supabase.from('activity_log').insert({
    office_id: officeId,
    predmet_id: predmetId,
    korisnik_id: korisnikId,
    korisnik_email: korisnikEmail,
    akcija,
    detalji: detalji ?? null,
  });
  if (error) {
    console.error('[TRACE][activity_log] insert error:', error.message);
  }
}
