import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import * as XLSX from 'xlsx';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const { searchParams } = new URL(request.url);

    // Opcioni filteri (isti kao na /predmeti listi)
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    let url = `${SUPABASE_URL}/rest/v1/predmeti?select=broj_predmeta,godina,poverilac,duznik,duznik_adresa,iznos_glavnice,vrsta_predmeta,status,napomena,created_at&order=created_at.desc&limit=5000`;

    if (status) url += `&status=eq.${status}`;
    if (q) url += `&or=(broj_predmeta.ilike.*${q}*,poverilac.ilike.*${q}*,duznik.ilike.*${q}*)`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        apikey: ANON_KEY,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Greška pri dohvatanju podataka.' }, { status: 500 });
    }

    const predmeti = await res.json();

    // Kreirati Excel
    const wsData = predmeti.map((p: Record<string, unknown>) => ({
      'Broj predmeta': p.broj_predmeta,
      'Godina': p.godina,
      'Poverilac': p.poverilac,
      'Dužnik': p.duznik,
      'Adresa dužnika': p.duznik_adresa ?? '',
      'Iznos glavnice': p.iznos_glavnice ?? '',
      'Vrsta predmeta': p.vrsta_predmeta ?? '',
      'Status': p.status,
      'Napomena': p.napomena ?? '',
      'Datum unosa': p.created_at ? new Date(p.created_at as string).toLocaleDateString('sr-RS') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);

    // Širina kolona
    ws['!cols'] = [
      { wch: 20 }, // Broj predmeta
      { wch: 8 },  // Godina
      { wch: 30 }, // Poverilac
      { wch: 30 }, // Dužnik
      { wch: 35 }, // Adresa
      { wch: 15 }, // Iznos
      { wch: 20 }, // Vrsta
      { wch: 12 }, // Status
      { wch: 40 }, // Napomena
      { wch: 15 }, // Datum
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Predmeti');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const datum = new Date().toISOString().slice(0, 10);
    const filename = `predmeti_${datum}.xlsx`;

    console.log(`[TRACE][izvoz] office=${ctx.officeId} redova=${predmeti.length}`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[TRACE][izvoz] EXCEPTION:', err);
    return NextResponse.json({ error: 'Serverska greška.' }, { status: 500 });
  }
}
