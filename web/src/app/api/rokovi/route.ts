import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

// POST /api/rokovi — kreiranje novog roka
export async function POST(request: NextRequest) {
  console.log('[TRACE][api/rokovi] POST kreiranje roka');

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();

    const predmet_id = (formData.get('predmet_id') as string)?.trim();
    const naziv_roka = (formData.get('naziv_roka') as string)?.trim();
    const datum_roka = (formData.get('datum_roka') as string)?.trim();
    const prioritet = (formData.get('prioritet') as string) || 'srednji';
    const napomena = (formData.get('napomena') as string)?.trim() || null;
    const redirect_to = (formData.get('redirect_to') as string) || '/rokovi';

    if (!predmet_id || !naziv_roka || !datum_roka) {
      return NextResponse.redirect(
        new URL(`${redirect_to}?error=validation`, request.url),
        { status: 303 }
      );
    }

    const { error } = await supabase.from('rokovi').insert({
      office_id: officeId,
      predmet_id,
      naziv_roka,
      datum_roka,
      prioritet,
      napomena,
      status: 'aktivan',
    });

    if (error) {
      console.error('[TRACE][api/rokovi] insert error:', error.message);
      return NextResponse.redirect(
        new URL(`${redirect_to}?error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    console.log('[TRACE][api/rokovi] rok kreiran OK → redirect', redirect_to);
    return NextResponse.redirect(new URL(redirect_to, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error('[TRACE][api/rokovi] exception:', msg);
    return NextResponse.redirect(
      new URL(`/rokovi?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
