import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/rokovi/[id] — završi rok ili obriši
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get('_action') as string;
  const redirect_to = (formData.get('redirect_to') as string) || '/rokovi';

  console.log(`[TRACE][api/rokovi/${id}] POST action=${action}`);

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    if (action === 'zavrsiti') {
      const { error } = await supabase
        .from('rokovi')
        .update({ status: 'zavrsen' })
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        return NextResponse.redirect(
          new URL(`${redirect_to}?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL(redirect_to, request.url), { status: 303 });
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('rokovi')
        .delete()
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        return NextResponse.redirect(
          new URL(`${redirect_to}?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL(redirect_to, request.url), { status: 303 });
    }

    return NextResponse.redirect(new URL(redirect_to, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error(`[TRACE][api/rokovi/${id}] exception:`, msg);
    return NextResponse.redirect(
      new URL(`${redirect_to}?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
