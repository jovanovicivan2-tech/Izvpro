import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

// POST /api/korisnici — pozivanje novog korisnika u kancelariju
// Kreira Supabase Auth korisnika i unos u korisnici tabelu
export async function POST(request: NextRequest) {
  console.log('[TRACE][api/korisnici] POST invite');

  try {
    const { officeId, userId } = await requireTenantContext();
    const supabase = await createClient();

    // Provjeri da li je trenutni korisnik admin
    const { data: currentUser } = await supabase
      .from('korisnici')
      .select('role')
      .eq('id', userId)
      .single();

    if (currentUser?.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/podesavanja?error=unauthorized', request.url),
        { status: 303 }
      );
    }

    const formData = await request.formData();
    const ime_prezime = (formData.get('ime_prezime') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const role = (formData.get('role') as string) || 'operater';

    if (!ime_prezime || !email) {
      return NextResponse.redirect(new URL('/podesavanja?error=validation', request.url), { status: 303 });
    }

    const validRoles = ['admin', 'operater', 'pregled'];
    if (!validRoles.includes(role)) {
      return NextResponse.redirect(new URL('/podesavanja?error=invalid_role', request.url), { status: 303 });
    }

    // Generiši privremenu lozinku
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!';

    // Kreiraj korisnika u Supabase Auth (admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData?.user) {
      console.error('[TRACE][api/korisnici] auth.admin.createUser error:', authError?.message);
      return NextResponse.redirect(
        new URL(`/podesavanja?error=${encodeURIComponent(authError?.message ?? 'Auth greška')}`, request.url),
        { status: 303 }
      );
    }

    // Unesi u korisnici tabelu
    const { error: dbError } = await supabase.from('korisnici').insert({
      id: authData.user.id,
      office_id: officeId,
      ime_prezime,
      email,
      role,
      aktivan: true,
    });

    if (dbError) {
      console.error('[TRACE][api/korisnici] insert korisnici error:', dbError.message);
      // Rollback — obriši auth korisnika
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.redirect(
        new URL(`/podesavanja?error=${encodeURIComponent(dbError.message)}`, request.url),
        { status: 303 }
      );
    }

    console.log(`[TRACE][api/korisnici] korisnik kreiran email=${email} role=${role} tempPwd=${tempPassword}`);
    // U produkciji ovde ide slanje emaila — za sada redirect sa tempPassword u URL za prikaz
    return NextResponse.redirect(
      new URL(`/podesavanja?success=korisnik&email=${encodeURIComponent(email)}&pwd=${encodeURIComponent(tempPassword)}`, request.url),
      { status: 303 }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error('[TRACE][api/korisnici] exception:', msg);
    return NextResponse.redirect(
      new URL(`/podesavanja?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
