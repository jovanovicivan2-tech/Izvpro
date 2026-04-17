import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

export async function POST(req: NextRequest) {
  console.log('[TRACE][api] POST /api/lozinka');

  try {
    const { userId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await req.formData();
    const stara = formData.get('stara_lozinka') as string | null;
    const nova = formData.get('nova_lozinka') as string | null;
    const potvrda = formData.get('potvrda_lozinke') as string | null;

    if (!stara || !nova || !potvrda) {
      return NextResponse.redirect(
        new URL('/podesavanja?tab=lozinka&error=validation', req.url),
        303
      );
    }

    if (nova !== potvrda) {
      return NextResponse.redirect(
        new URL('/podesavanja?tab=lozinka&error=mismatch', req.url),
        303
      );
    }

    if (nova.length < 8) {
      return NextResponse.redirect(
        new URL('/podesavanja?tab=lozinka&error=too_short', req.url),
        303
      );
    }

    // Verifikuj staru lozinku — pokušaj re-sign-in sa trenutnim emailom
    const { data: korisnikRow } = await supabase
      .from('korisnici')
      .select('email')
      .eq('id', userId)
      .single();

    if (!korisnikRow?.email) {
      return NextResponse.redirect(
        new URL('/podesavanja?tab=lozinka&error=server', req.url),
        303
      );
    }

    // Importuj admin client za server-side update
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verifikuj staru lozinku kroz sign-in
    const { error: signInError } = await adminClient.auth.signInWithPassword({
      email: korisnikRow.email,
      password: stara,
    });

    if (signInError) {
      return NextResponse.redirect(
        new URL('/podesavanja?tab=lozinka&error=wrong_password', req.url),
        303
      );
    }

    // Ažuriraj lozinku
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: nova,
    });

    if (updateError) {
      return NextResponse.redirect(
        new URL(`/podesavanja?tab=lozinka&error=${encodeURIComponent(updateError.message)}`, req.url),
        303
      );
    }

    return NextResponse.redirect(
      new URL('/podesavanja?tab=lozinka&success=lozinka', req.url),
      303
    );
  } catch (e) {
    console.error('[TRACE][api] /api/lozinka error:', e);
    return NextResponse.redirect(
      new URL('/podesavanja?tab=lozinka&error=server', req.url),
      303
    );
  }
}
