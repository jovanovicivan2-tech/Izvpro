import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/predmeti/[id]/beleske
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/beleske?predmet_id=eq.${id}&order=created_at.desc`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/predmeti/[id]/beleske
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const tekst = (body?.tekst ?? '').toString().trim();
  if (!tekst) return NextResponse.json({ error: 'Tekst je obavezan.' }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/beleske`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ctx.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      tekst,
      predmet_id: id,
      office_id: ctx.officeId,
      autor_email: ctx.userEmail,
      created_by: ctx.userId,
    }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
  return NextResponse.json(data[0], { status: 201 });
}

// DELETE /api/predmeti/[id]/beleske?beleskaId=uuid
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const beleskaId = req.nextUrl.searchParams.get('beleskaId');
  if (!beleskaId) return NextResponse.json({ error: 'beleskaId required' }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/beleske?id=eq.${beleskaId}&predmet_id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        apikey: ANON_KEY,
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
