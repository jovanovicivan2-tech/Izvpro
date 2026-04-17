import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id: officeId } = await params;

    // Proveriti da li je super admin
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/korisnici?select=is_super_admin&id=eq.${ctx.userId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          apikey: ANON_KEY,
          Accept: 'application/json',
        },
      }
    );
    const checkRows = checkRes.ok ? await checkRes.json() : [];
    if (!checkRows?.[0]?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['pending', 'active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Koristiti service role za update (RLS ne dozvoljava update tuđe kancelarije)
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/offices?id=eq.${officeId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error('[TRACE][admin] update error:', err);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    console.log(`[TRACE][admin] officeId=${officeId} status=${status} by=${ctx.userId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[TRACE][admin] EXCEPTION:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
