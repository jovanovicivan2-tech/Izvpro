import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

// POST /api/office — izmena podataka kancelarije
export async function POST(request: NextRequest) {
  console.log('[TRACE][api/office] POST update');

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();
    const naziv = (formData.get('naziv') as string)?.trim();
    const adresa = (formData.get('adresa') as string)?.trim() || null;
    const email = (formData.get('email') as string)?.trim() || null;
    const telefon = (formData.get('telefon') as string)?.trim() || null;

    if (!naziv) {
      return NextResponse.redirect(new URL('/podesavanja?error=validation', request.url), { status: 303 });
    }

    const { error } = await supabase
      .from('offices')
      .update({ naziv, adresa, email, telefon })
      .eq('id', officeId);

    if (error) {
      console.error('[TRACE][api/office] update error:', error.message);
      return NextResponse.redirect(
        new URL(`/podesavanja?error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    return NextResponse.redirect(new URL('/podesavanja?success=office', request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return NextResponse.redirect(
      new URL(`/podesavanja?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
