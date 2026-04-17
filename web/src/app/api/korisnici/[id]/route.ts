import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/korisnici/[id] — izmena role ili deaktivacija korisnika
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get('_action') as string;

  console.log(`[TRACE][api/korisnici/${id}] POST action=${action}`);

  try {
    const { officeId, userId } = await requireTenantContext();
    const supabase = await createClient();

    // Samo admin može
    const { data: currentUser } = await supabase
      .from('korisnici')
      .select('role')
      .eq('id', userId)
      .single();

    if (currentUser?.role !== 'admin') {
      return NextResponse.redirect(new URL('/podesavanja?error=unauthorized', request.url), { status: 303 });
    }

    // Ne može sam sebi da menja status
    if (id === userId && action === 'deactivate') {
      return NextResponse.redirect(new URL('/podesavanja?error=cannot_deactivate_self', request.url), { status: 303 });
    }

    if (action === 'set_role') {
      const role = formData.get('role') as string;
      const validRoles = ['admin', 'operater', 'pregled'];
      if (!validRoles.includes(role)) {
        return NextResponse.redirect(new URL('/podesavanja?error=invalid_role', request.url), { status: 303 });
      }

      const { error } = await supabase
        .from('korisnici')
        .update({ role })
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        return NextResponse.redirect(
          new URL(`/podesavanja?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL('/podesavanja?success=role', request.url), { status: 303 });
    }

    if (action === 'deactivate') {
      const { error } = await supabase
        .from('korisnici')
        .update({ aktivan: false })
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        return NextResponse.redirect(
          new URL(`/podesavanja?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL('/podesavanja?success=deactivated', request.url), { status: 303 });
    }

    if (action === 'activate') {
      const { error } = await supabase
        .from('korisnici')
        .update({ aktivan: true })
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        return NextResponse.redirect(
          new URL(`/podesavanja?error=${encodeURIComponent(error.message)}`, request.url),
          { status: 303 }
        );
      }
      return NextResponse.redirect(new URL('/podesavanja?success=activated', request.url), { status: 303 });
    }

    return NextResponse.redirect(new URL('/podesavanja', request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return NextResponse.redirect(
      new URL(`/podesavanja?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}
