import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { createClient } from '@/lib/supabase/server';
import { generateDraftWithAi } from '@/features/ai/server/generate-draft-with-ai';

export async function POST(request: NextRequest) {
  console.log('[TRACE][api/nacrti] POST generisanje nacrta');

  try {
    const { officeId, userId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();
    const predmet_id = (formData.get('predmet_id') as string)?.trim();
    const sablon_id = (formData.get('sablon_id') as string)?.trim();
    const tip_akta = (formData.get('tip_akta') as string)?.trim();
    const user_note = (formData.get('user_note') as string)?.trim() || '';

    if (!predmet_id || !sablon_id || !tip_akta) {
      return NextResponse.redirect(new URL('/ai-nacrti?error=validation', request.url), { status: 303 });
    }

    // Dohvati predmet
    const { data: predmet, error: predmetError } = await supabase
      .from('predmeti').select('*').eq('id', predmet_id).eq('office_id', officeId).single();
    if (predmetError || !predmet) {
      return NextResponse.redirect(new URL('/ai-nacrti?error=predmet_not_found', request.url), { status: 303 });
    }

    // Dohvati sablon
    const { data: sablon, error: sablonError } = await supabase
      .from('sabloni').select('*').eq('id', sablon_id).eq('office_id', officeId).eq('aktivan', true).single();
    if (sablonError || !sablon) {
      return NextResponse.redirect(new URL('/ai-nacrti?error=sablon_not_found', request.url), { status: 303 });
    }

    // Generiši tekst
    const aiResult = await generateDraftWithAi({
      tipAkta: tip_akta,
      templateText: sablon.template_text,
      userNote: user_note,
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
      return NextResponse.redirect(
        new URL(`/ai-nacrti?error=${encodeURIComponent(aiResult.error)}`, request.url),
        { status: 303 }
      );
    }

    // Sačuvaj u bazu
    const { data, error: insertError } = await supabase.from('nacrti').insert({
      predmet_id,
      office_id: officeId,
      sablon_id,
      tip_akta,
      generated_text: aiResult.text,
      edited_text: aiResult.text,
      created_by: userId,
    }).select('id').single();

    if (insertError || !data) {
      return NextResponse.redirect(
        new URL(`/ai-nacrti?error=${encodeURIComponent(insertError?.message ?? 'Insert error')}`, request.url),
        { status: 303 }
      );
    }

    console.log(`[TRACE][api/nacrti] nacrt kreiran id=${data.id} provider=${aiResult.provider}`);
    return NextResponse.redirect(new URL(`/ai-nacrti/${data.id}`, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error('[TRACE][api/nacrti] exception:', msg);
    return NextResponse.redirect(
      new URL(`/ai-nacrti?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
