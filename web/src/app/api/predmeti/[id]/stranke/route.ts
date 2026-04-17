import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

// GET /api/predmeti/[id]/stranke
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/case_parties?predmet_id=eq.${params.id}&order=created_at.asc`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/predmeti/[id]/stranke
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/case_parties`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        ...body,
        predmet_id: params.id,
        office_id: ctx.officeId,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
  return NextResponse.json(data[0], { status: 201 });
}

// DELETE /api/predmeti/[id]/stranke?strankaId=uuid
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const strankaId = req.nextUrl.searchParams.get('strankaId');
  if (!strankaId) return NextResponse.json({ error: 'strankaId required' }, { status: 400 });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/case_parties?id=eq.${strankaId}&predmet_id=eq.${params.id}`,
    {
      method: 'DELETE',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) {
    const data = await res.json();
    return NextResponse.json({ error: data }, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
