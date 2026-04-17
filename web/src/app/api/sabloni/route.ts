import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

export async function POST(request: NextRequest) {
  console.log('[TRACE][api/sabloni] POST kreiranje sablona');
  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();
    const naziv = (formData.get('naziv') as string)?.trim();
    const tip_akta = (formData.get('tip_akta') as string)?.trim();
    const template_text = (formData.get('template_text') as string)?.trim();

    if (!naziv || !tip_akta || !template_text) {
      return NextResponse.redirect(new URL('/ai-nacrti?tab=sabloni&error=validation', request.url), { status: 303 });
    }

    const { error } = await supabase.from('sabloni').insert({
      office_id: officeId, naziv, tip_akta, template_text, aktivan: true,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/ai-nacrti?tab=sabloni&error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    return NextResponse.redirect(new URL('/ai-nacrti?tab=sabloni&success=sablon', request.url), { status: 303 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return NextResponse.redirect(
      new URL(`/ai-nacrti?tab=sabloni&error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
