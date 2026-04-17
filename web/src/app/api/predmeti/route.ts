import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  console.log('[TRACE][api/predmeti] POST kreiranje predmeta');

  try {
    const { officeId, userId, userEmail } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();

    const broj_predmeta = (formData.get('broj_predmeta') as string)?.trim();
    const godina = parseInt(formData.get('godina') as string) || new Date().getFullYear();
    const poverilac = (formData.get('poverilac') as string)?.trim();
    const duznik = (formData.get('duznik') as string)?.trim();
    const duznik_adresa = (formData.get('duznik_adresa') as string)?.trim() || null;
    const iznos_raw = formData.get('iznos_glavnice') as string;
    const iznos_glavnice = iznos_raw ? parseFloat(iznos_raw) : null;
    const vrsta_predmeta = (formData.get('vrsta_predmeta') as string)?.trim() || null;
    const rok_raw = formData.get('rok_sledece_radnje') as string;
    const rok_sledece_radnje = rok_raw || null;
    const napomena = (formData.get('napomena') as string)?.trim() || null;

    if (!broj_predmeta || !poverilac || !duznik) {
      return NextResponse.redirect(new URL('/predmeti/novi?error=validation', request.url), { status: 303 });
    }

    const { data: novPredmet, error } = await supabase.from('predmeti').insert({
      office_id: officeId,
      broj_predmeta,
      godina,
      poverilac,
      duznik,
      duznik_adresa,
      iznos_glavnice,
      vrsta_predmeta,
      rok_sledece_radnje,
      napomena,
      status: 'aktivan',
    }).select('id').single();

    if (error) {
      console.error('[TRACE][api/predmeti] insert error:', error.message);
      return NextResponse.redirect(
        new URL(`/predmeti/novi?error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    // Audit log — kreiranje
    await logActivity({
      supabase,
      officeId,
      predmetId: novPredmet?.id ?? null,
      korisnikId: userId,
      korisnikEmail: userEmail,
      akcija: 'kreiran',
      detalji: { broj_predmeta, godina, poverilac, duznik, iznos_glavnice },
    });

    console.log('[TRACE][api/predmeti] predmet kreiran OK → redirect /predmeti');
    return NextResponse.redirect(new URL('/predmeti', request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error('[TRACE][api/predmeti] exception:', msg);
    return NextResponse.redirect(
      new URL(`/predmeti/novi?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
