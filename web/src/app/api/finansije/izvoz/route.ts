import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import * as XLSX from 'xlsx';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface PredmetRow { id: string; broj_predmeta: string; godina: number; duznik: string; poverilac: string; iznos_glavnice: number | null; status: string; }
interface PaymentRow { predmet_id: string; iznos: number; }

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const headers = { Authorization: `Bearer ${ctx.accessToken}`, apikey: ANON_KEY, Accept: 'application/json' };

    const [predRes, payRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/predmeti?select=id,broj_predmeta,godina,duznik,poverilac,iznos_glavnice,status&limit=5000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/payments?select=predmet_id,iznos&limit=20000`, { headers }),
    ]);

    if (!predRes.ok || !payRes.ok) {
      return NextResponse.json({ error: 'Greška pri dohvatanju podataka.' }, { status: 500 });
    }

    const predmeti: PredmetRow[] = await predRes.json();
    const payments: PaymentRow[] = await payRes.json();

    const uplateMap = new Map<string, number>();
    for (const p of payments) {
      uplateMap.set(p.predmet_id, (uplateMap.get(p.predmet_id) ?? 0) + (Number(p.iznos) || 0));
    }

    const rows = predmeti.map((p) => {
      const glavnica = Number(p.iznos_glavnice) || 0;
      const uplaceno = uplateMap.get(p.id) ?? 0;
      const preostalo = Math.max(0, glavnica - uplaceno);
      const pct = glavnica > 0 ? Math.round((uplaceno / glavnica) * 100) : (uplaceno > 0 ? 100 : 0);
      return {
        'Broj predmeta': `${p.broj_predmeta}/${p.godina}`,
        'Dužnik': p.duznik,
        'Poverilac': p.poverilac,
        'Status': p.status,
        'Glavnica': glavnica,
        'Uplaćeno': uplaceno,
        'Preostalo': preostalo,
        'Naplata %': pct,
      };
    }).sort((a, b) => b['Preostalo'] - a['Preostalo']);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finansije');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const datum = new Date().toISOString().slice(0, 10);
    const filename = `finansije_${datum}.xlsx`;

    console.log(`[TRACE][finansije/izvoz] office=${ctx.officeId} redova=${rows.length}`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[TRACE][finansije/izvoz] EXCEPTION:', err);
    return NextResponse.json({ error: 'Serverska greška.' }, { status: 500 });
  }
}
