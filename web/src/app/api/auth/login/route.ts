import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cookie ime koje @supabase/ssr middleware čita
const PROJECT_REF = 'bwpyivqdinemhfrrjdhu';
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;
const MAX_CHUNK_SIZE = 3180;

function createChunks(key: string, value: string): { name: string; value: string }[] {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }
  const chunks: string[] = [];
  let remaining = encodedValue;
  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_CHUNK_SIZE);
    const lastEscape = head.lastIndexOf('%');
    if (lastEscape > MAX_CHUNK_SIZE - 3) head = head.slice(0, lastEscape);
    chunks.push(decodeURIComponent(head));
    remaining = remaining.slice(head.length);
  }
  return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = (formData.get('email') ?? '') as string;
    const password = (formData.get('password') ?? '') as string;

    console.log(`[TRACE][login] attempt email=${email}`);

    if (!email || !password) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    // Koristimo vanilla supabase-js (bez SSR wrapper-a) da izbegnemo PKCE flow
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log(`[TRACE][login] ok=${!!data?.session} error=${error?.message ?? 'none'}`);

    if (error || !data?.session) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    const session = data.session;

    // Proveriti da li je kancelarija aktivna
    const officeRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/korisnici?select=office_id,offices(status)&id=eq.${session.user.id}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Accept': 'application/json',
        },
      }
    );
    const officeRows = officeRes.ok ? await officeRes.json() : [];
    const officeStatus = officeRows?.[0]?.offices?.status ?? null;
    console.log(`[TRACE][login] officeStatus=${officeStatus}`);

    if (officeStatus === 'pending') {
      return NextResponse.redirect(new URL('/login?error=office_pending', request.url), { status: 303 });
    }
    if (officeStatus === 'suspended') {
      return NextResponse.redirect(new URL('/login?error=office_suspended', request.url), { status: 303 });
    }
    if (!officeStatus || officeStatus !== 'active') {
      return NextResponse.redirect(new URL('/login?error=office_inactive', request.url), { status: 303 });
    }
    // Serializujemo session objekat tačno onako kako @supabase/ssr to očekuje
    const sessionJson = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });

    // Upisujemo chunked cookies koje middleware čita
    const chunks = createChunks(SESSION_COOKIE, sessionJson);
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: session.expires_in ?? 3600,
    };

    for (const chunk of chunks) {
      response.cookies.set(chunk.name, chunk.value, cookieOptions);
      console.log(`[TRACE][login] set cookie=${chunk.name} len=${chunk.value.length}`);
    }

    console.log(`[TRACE][login] redirect=/dashboard cookies=${chunks.length}`);
    return response;
  } catch (err) {
    console.error('[TRACE][login] ERROR:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url), { status: 303 });
  }
}
