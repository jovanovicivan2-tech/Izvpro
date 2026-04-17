import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/nacrti/[id] — čuvanje editovanog teksta ili brisanje
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get('_action') as string;

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    if (action === 'save_text') {
      const edited_text = (formData.get('edited_text') as string)?.trim();
      if (!edited_text) {
        return NextResponse.redirect(new URL(`/ai-nacrti/${id}?error=empty`, request.url), { status: 303 });
      }
      const { error } = await supabase
        .from('nacrti').update({ edited_text }).eq('id', id).eq('office_id', officeId);
      if (error) {
        return NextResponse.redirect(
          new URL(`/ai-nacrti/${id}?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL(`/ai-nacrti/${id}?success=saved`, request.url), { status: 303 });
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('nacrti').delete().eq('id', id).eq('office_id', officeId);
      if (error) {
        return NextResponse.redirect(
          new URL(`/ai-nacrti/${id}?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL('/ai-nacrti', request.url), { status: 303 });
    }

    return NextResponse.redirect(new URL(`/ai-nacrti/${id}`, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return NextResponse.redirect(
      new URL(`/ai-nacrti/${id}?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
