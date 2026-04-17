import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Koristimo service_role key da možemo pisati u korisnici tabelu bez RLS ograničenja
// tokom registracije (novi korisnik još nema session)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// SERVICE_ROLE_KEY je potreban za bypass RLS pri registraciji
// Mora biti postavljen kao SUPABASE_SERVICE_ROLE_KEY u Vercel env varijablama
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const naziv_kancelarije = (formData.get('naziv_kancelarije') ?? '').toString().trim();
    const pib = (formData.get('pib') ?? '').toString().trim();
    const adresa = (formData.get('adresa') ?? '').toString().trim();
    const telefon = (formData.get('telefon') ?? '').toString().trim();
    const ime_prezime = (formData.get('ime_prezime') ?? '').toString().trim();
    const email = (formData.get('email') ?? '').toString().trim();
    const password = (formData.get('password') ?? '').toString();
    const password2 = (formData.get('password2') ?? '').toString();

    // Validacija
    if (!naziv_kancelarije || !ime_prezime || !email || !password) {
      return NextResponse.redirect(
        new URL('/register?error=required_fields', request.url),
        { status: 303 }
      );
    }

    if (password !== password2) {
      return NextResponse.redirect(
        new URL('/register?error=password_mismatch', request.url),
        { status: 303 }
      );
    }

    if (password.length < 8) {
      return NextResponse.redirect(
        new URL('/register?error=password_too_short', request.url),
        { status: 303 }
      );
    }

    // Anon klijent za auth.signUp
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    if (!SERVICE_ROLE_KEY) {
      console.error('[TRACE][register] SUPABASE_SERVICE_ROLE_KEY nije postavljen');
      return NextResponse.redirect(
        new URL('/register?error=server_error', request.url),
        { status: 303 }
      );
    }

    // Service role klijent za INSERT bez RLS
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Kreirati Supabase auth korisnika
    const { data: authData, error: authError } = await anonClient.auth.signUp({
      email,
      password,
    });

    if (authError || !authData?.user) {
      console.error('[TRACE][register] auth error:', authError?.message);
      const msg = authError?.message?.includes('already registered')
        ? 'email_taken'
        : 'auth_error';
      return NextResponse.redirect(
        new URL(`/register?error=${msg}`, request.url),
        { status: 303 }
      );
    }

    const userId = authData.user.id;

    // 2. Kreirati offices red sa status='pending'
    const { data: officeData, error: officeError } = await adminClient
      .from('offices')
      .insert({
        naziv: naziv_kancelarije,
        pib: pib || null,
        adresa: adresa || null,
        telefon: telefon || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (officeError || !officeData) {
      console.error('[TRACE][register] office error:', officeError?.message);
      // Rollback auth korisnika
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.redirect(
        new URL('/register?error=office_error', request.url),
        { status: 303 }
      );
    }

    const officeId = officeData.id;

    // 3. Kreirati korisnici red (role=admin jer je prvi korisnik te kancelarije)
    const { error: korisnikError } = await adminClient
      .from('korisnici')
      .insert({
        id: userId,
        office_id: officeId,
        ime_prezime,
        email,
        role: 'admin',
        aktivan: true,
        is_super_admin: false,
      });

    if (korisnikError) {
      console.error('[TRACE][register] korisnik error:', korisnikError?.message);
      // Rollback
      await adminClient.from('offices').delete().eq('id', officeId);
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.redirect(
        new URL('/register?error=korisnik_error', request.url),
        { status: 303 }
      );
    }

    console.log(`[TRACE][register] ok userId=${userId} officeId=${officeId} status=pending`);

    // Redirect na stranicu za potvrdu (čeka aktivaciju)
    return NextResponse.redirect(
      new URL('/register/pending', request.url),
      { status: 303 }
    );
  } catch (err) {
    console.error('[TRACE][register] EXCEPTION:', err);
    return NextResponse.redirect(
      new URL('/register?error=server_error', request.url),
      { status: 303 }
    );
  }
}
