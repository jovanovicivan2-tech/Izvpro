import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/korisnici?select=id,ime_prezime,email,role,is_super_admin&id=eq.${ctx.userId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          apikey: ANON_KEY,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const rows = res.ok ? await res.json() : [];
    const user = rows?.[0] ?? null;

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      ime_prezime: user.ime_prezime,
      role: user.role,
      is_super_admin: user.is_super_admin ?? false,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
