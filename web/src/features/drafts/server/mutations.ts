'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { generateDraftWithAi } from '@/features/ai/server/generate-draft-with-ai';
import type { CreateDraftInput, CreateDraftResult, UpdateDraftInput, UpdateDraftResult } from '@/features/drafts/types';

// -------------------------------------------------------
// Kreiranje nacrta (AI ili fallback)
// -------------------------------------------------------
export async function createNacrt(input: CreateDraftInput): Promise<CreateDraftResult> {
  const { officeId, userId } = await requireTenantContext();
  const supabase = await createClient();

  if (!input.predmet_id || !input.sablon_id || !input.tip_akta) {
    return { success: false, error: 'Nedostaju obavezni podaci za kreiranje nacrta.' };
  }

  // Dohvati predmet (uz tenant check)
  const { data: predmet, error: predmetError } = await supabase
    .from('predmeti')
    .select('id, office_id, broj_predmeta, godina, poverilac, duznik, duznik_adresa, iznos_glavnice, vrsta_predmeta, napomena')
    .eq('id', input.predmet_id)
    .eq('office_id', officeId)
    .single();

  if (predmetError || !predmet) {
    return { success: false, error: 'Predmet nije pronađen ili nemate pristup.' };
  }

  // Dohvati sablon (uz tenant check i aktivan filter)
  const { data: sablon, error: sablonError } = await supabase
    .from('sabloni')
    .select('id, office_id, tip_akta, template_text, aktivan')
    .eq('id', input.sablon_id)
    .eq('office_id', officeId)
    .eq('tip_akta', input.tip_akta)
    .eq('aktivan', true)
    .single();

  if (sablonError || !sablon) {
    return { success: false, error: 'Aktivan šablon za izabrani tip akta nije pronađen.' };
  }

  // Generiši tekst nacrta
  const aiResult = await generateDraftWithAi({
    tipAkta: input.tip_akta,
    templateText: sablon.template_text,
    userNote: input.user_note,
    predmetData: {
      broj_predmeta: predmet.broj_predmeta,
      godina: predmet.godina,
      poverilac: predmet.poverilac,
      duznik: predmet.duznik,
      duznik_adresa: predmet.duznik_adresa,
      iznos_glavnice: predmet.iznos_glavnice,
      vrsta_predmeta: predmet.vrsta_predmeta,
      napomena: predmet.napomena,
    },
  });

  if (!aiResult.success) {
    return { success: false, error: aiResult.error };
  }

  // Sačuvaj nacrt u bazu
  const { data, error: insertError } = await supabase
    .from('nacrti')
    .insert({
      predmet_id: input.predmet_id,
      office_id: officeId,
      sablon_id: sablon.id,
      tip_akta: input.tip_akta,
      generated_text: aiResult.text,
      edited_text: aiResult.text,
      created_by: userId,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    return { success: false, error: 'Nacrt nije sačuvan. Proveri tabelu nacrti i RLS pravila.' };
  }

  revalidatePath(`/predmeti/${input.predmet_id}`);
  revalidatePath('/nacrti');

  return { success: true, nacrtId: data.id, fallbackUsed: aiResult.fallbackUsed };
}

// -------------------------------------------------------
// Ažuriranje (ručna dorada) teksta nacrta
// -------------------------------------------------------
export async function updateNacrtText(input: UpdateDraftInput): Promise<UpdateDraftResult> {
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  if (!input.nacrtId || !input.edited_text.trim()) {
    return { success: false, error: 'Nedostaju podaci za ažuriranje nacrta.' };
  }

  const { error } = await supabase
    .from('nacrti')
    .update({ edited_text: input.edited_text })
    .eq('id', input.nacrtId)
    .eq('office_id', officeId);

  if (error) {
    return { success: false, error: 'Greška pri čuvanju nacrta: ' + error.message };
  }

  revalidatePath('/nacrti');

  return { success: true };
}
