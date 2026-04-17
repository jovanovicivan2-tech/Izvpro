import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/predmeti/[id] — izmena predmeta
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  console.log(`[TRACE][api/predmeti/${id}] PATCH`);

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    const formData = await request.formData();

    const updates: Record<string, unknown> = {};

    const stringFields = ['broj_predmeta', 'poverilac', 'duznik', 'duznik_adresa', 'vrsta_predmeta', 'napomena', 'status'];
    for (const field of stringFields) {
      const val = formData.get(field);
      if (val !== null) {
        updates[field] = (val as string).trim() || null;
      }
    }

    const godina = formData.get('godina');
    if (godina !== null) {
      updates['godina'] = parseInt(godina as string) || new Date().getFullYear();
    }

    const iznos = formData.get('iznos_glavnice');
    if (iznos !== null) {
      updates['iznos_glavnice'] = (iznos as string) ? parseFloat(iznos as string) : null;
    }

    const rok = formData.get('rok_sledece_radnje');
    if (rok !== null) {
      updates['rok_sledece_radnje'] = (rok as string) || null;
    }

    const { error } = await supabase
      .from('predmeti')
      .update(updates)
      .eq('id', id)
      .eq('office_id', officeId); // tenant filter — obavezno

    if (error) {
      console.error(`[TRACE][api/predmeti/${id}] PATCH error:`, error.message);
      return NextResponse.redirect(
        new URL(`/predmeti/${id}/izmeni?error=${encodeURIComponent(error.message)}`, request.url),
        { status: 303 }
      );
    }

    console.log(`[TRACE][api/predmeti/${id}] PATCH OK → redirect /predmeti/${id}`);
    return NextResponse.redirect(new URL(`/predmeti/${id}`, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error(`[TRACE][api/predmeti/${id}] PATCH exception:`, msg);
    return NextResponse.redirect(
      new URL(`/predmeti/${id}/izmeni?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    );
  }
}

// POST /api/predmeti/[id] — koristi se za status promenu, brisanje i izmenu
// (HTML forme ne podržavaju PATCH/DELETE nativno — _method field kao method override)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get('_action') as string;

  console.log(`[TRACE][api/predmeti/${id}] POST action=${action}`);

  try {
    const { officeId } = await requireTenantContext();
    const supabase = await createClient();

    // Status promena
    if (action === 'set_status') {
      const status = formData.get('status') as string;
      const validStatuses = ['aktivan', 'obustavljen', 'zavrsen', 'arhiviran'];
      if (!validStatuses.includes(status)) {
        return NextResponse.redirect(new URL(`/predmeti/${id}?error=invalid_status`, request.url), { status: 303 });
      }

      const { error } = await supabase
        .from('predmeti')
        .update({ status })
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        console.error(`[TRACE][api/predmeti/${id}] set_status error:`, error.message);
        return NextResponse.redirect(new URL(`/predmeti/${id}?error=${encodeURIComponent(error.message)}`, request.url), { status: 303 });
      }

      return NextResponse.redirect(new URL(`/predmeti/${id}`, request.url), { status: 303 });
    }

    // Izmena predmeta (method override — forma šalje _action=update)
    if (action === 'update') {
      const updates: Record<string, unknown> = {};
      const stringFields = ['broj_predmeta', 'poverilac', 'duznik', 'duznik_adresa', 'vrsta_predmeta', 'napomena', 'status'];
      for (const field of stringFields) {
        const val = formData.get(field);
        if (val !== null) updates[field] = (val as string).trim() || null;
      }
      const godina = formData.get('godina');
      if (godina !== null) updates['godina'] = parseInt(godina as string) || new Date().getFullYear();
      const iznos = formData.get('iznos_glavnice');
      if (iznos !== null) updates['iznos_glavnice'] = (iznos as string) ? parseFloat(iznos as string) : null;
      const rok = formData.get('rok_sledece_radnje');
      if (rok !== null) updates['rok_sledece_radnje'] = (rok as string) || null;

      const { error } = await supabase.from('predmeti').update(updates).eq('id', id).eq('office_id', officeId);
      if (error) {
        return NextResponse.redirect(new URL(`/predmeti/${id}/izmeni?error=${encodeURIComponent(error.message)}`, request.url), { status: 303 });
      }
      return NextResponse.redirect(new URL(`/predmeti/${id}`, request.url), { status: 303 });
    }

    // Brisanje predmeta
    if (action === 'delete') {
      const { error } = await supabase
        .from('predmeti')
        .delete()
        .eq('id', id)
        .eq('office_id', officeId);

      if (error) {
        console.error(`[TRACE][api/predmeti/${id}] delete error:`, error.message);
        return NextResponse.redirect(new URL(`/predmeti/${id}?error=${encodeURIComponent(error.message)}`, request.url), { status: 303 });
      }

      return NextResponse.redirect(new URL('/predmeti', request.url), { status: 303 });
    }

    return NextResponse.redirect(new URL(`/predmeti/${id}`, request.url), { status: 303 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    console.error(`[TRACE][api/predmeti/${id}] POST exception:`, msg);
    return NextResponse.redirect(new URL(`/predmeti/${id}?error=${encodeURIComponent(msg)}`, request.url), { status: 303 });
  }
}
