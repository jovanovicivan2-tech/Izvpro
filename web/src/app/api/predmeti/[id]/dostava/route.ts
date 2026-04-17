import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/predmeti/[id]/dostava
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/deliveries?predmet_id=eq.${params.id}&order=datum_slanja.desc`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ctx.accessToken}`,
      },
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/predmeti/[id]/dostava
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/deliveries`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ctx.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      ...body,
      predmet_id: params.id,
      office_id: ctx.officeId,
    }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
  return NextResponse.json(data[0], { status: 201 });
}

// PATCH /api/predmeti/[id]/dostava?dostavaId=uuid — ažuriranje statusa/datuma prijema
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dostavaId = req.nextUrl.searchParams.get('dostavaId');
  if (!dostavaId) return NextResponse.json({ error: 'dostavaId required' }, { status: 400 });

  const body = await req.json();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/deliveries?id=eq.${dostavaId}&predmet_id=eq.${params.id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
  return NextResponse.json(data[0]);
}

// DELETE /api/predmeti/[id]/dostava?dostavaId=uuid
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dostavaId = req.nextUrl.searchParams.get('dostavaId');
  if (!dostavaId) return NextResponse.json({ error: 'dostavaId required' }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/deliveries?id=eq.${dostavaId}&predmet_id=eq.${params.id}`,
    {
      method: 'DELETE',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ctx.accessToken}`,
      },
    }
  );
  if (!res.ok) {
    const data = await res.json();
    return NextResponse.json({ error: data }, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
