// Ovaj route handler više nije u upotrebi.
// Login se sada obavlja client-side putem createBrowserClient iz @supabase/ssr.
// Fajl je zadržan radi kompatibilnosti ali ne treba biti pozivan.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Deprecated. Use client-side login.' }, { status: 410 });
}
