import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = (formData.get('email') ?? '').toString().trim();

    if (!email) {
      return NextResponse.redirect(
        new URL('/forgot-password?error=required', request.url),
        { status: 303 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Uvek vraćamo uspeh da ne otkrijemo koji emailovi postoje u sistemu
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://izvpro.vercel.app'}/reset-password`,
    });

    console.log(`[TRACE][forgot-password] reset email sent to=${email}`);

    return NextResponse.redirect(
      new URL('/forgot-password?sent=1', request.url),
      { status: 303 }
    );
  } catch (err) {
    console.error('[TRACE][forgot-password] ERROR:', err);
    return NextResponse.redirect(
      new URL('/forgot-password?error=server_error', request.url),
      { status: 303 }
    );
  }
}
