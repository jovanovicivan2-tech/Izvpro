import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

// DELETE /api/sabloni/[id]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();
    const action = formData.get('_action');

    if (action !== 'delete') {
      return NextResponse.redirect(new URL('/ai-nacrti?tab=sabloni', request.url), { status: 303 });
    }

    const { error } = await supabase
      .from('sabloni')
      .delete()
      .eq('id', params.id)
      .eq('office_id', officeId);

    if (error) {
      return NextResponse.redirect(
        new URL(`/ai-nacrti?tab=sabloni&error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    return NextResponse.redirect(new URL('/ai-nacrti?tab=sabloni', request.url), { status: 303 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return NextResponse.redirect(
      new URL(`/ai-nacrti?tab=sabloni&error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
