import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import * as XLSX from 'xlsx';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mapiranje kolona iz Excel-a na polja u bazi
// Podržavamo i srpske nazive (Cronus) i naše nazive
function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    'broj predmeta': 'broj_predmeta',
    'broj_predmeta': 'broj_predmeta',
    'br. predmeta': 'broj_predmeta',
    'predmet': 'broj_predmeta',
    'godina': 'godina',
    'poverilac': 'poverilac',
    'poverilac (tražilac)': 'poverilac',
    'trazilac': 'poverilac',
    'tražilac': 'poverilac',
    'duznik': 'duznik',
    'dužnik': 'duznik',
    'dužnik (ime)': 'duznik',
    'adresa duznika': 'duznik_adresa',
    'adresa dužnika': 'duznik_adresa',
    'duznik_adresa': 'duznik_adresa',
    'iznos': 'iznos_glavnice',
    'iznos glavnice': 'iznos_glavnice',
    'iznos_glavnice': 'iznos_glavnice',
    'glavnica': 'iznos_glavnice',
    'vrsta predmeta': 'vrsta_predmeta',
    'vrsta_predmeta': 'vrsta_predmeta',
    'vrsta': 'vrsta_predmeta',
    'status': 'status',
    'napomena': 'napomena',
    'napomene': 'napomena',
  };
  return map[h.toLowerCase().trim()] ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fajl nije priložen.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel fajl je prazan.' }, { status: 400 });
    }

    // Normalizovati header-e
    const normalized = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        const mapped = normalizeHeader(k);
        if (mapped) out[mapped] = v;
      }
      return out;
    });

    // Validacija i priprema redova
    const toInsert = [];
    const errors: string[] = [];

    for (let i = 0; i < normalized.length; i++) {
      const row = normalized[i];
      const rowNum = i + 2; // +2 jer je red 1 header

      const broj_predmeta = String(row.broj_predmeta ?? '').trim();
      const poverilac = String(row.poverilac ?? '').trim();
      const duznik = String(row.duznik ?? '').trim();

      if (!broj_predmeta) {
        errors.push(`Red ${rowNum}: nedostaje broj predmeta.`);
        continue;
      }
      if (!poverilac) {
        errors.push(`Red ${rowNum}: nedostaje poverilac.`);
        continue;
      }
      if (!duznik) {
        errors.push(`Red ${rowNum}: nedostaje dužnik.`);
        continue;
      }

      // Parsirati godinu iz broja predmeta ako nije eksplicitno data
      let godina = parseInt(String(row.godina ?? ''), 10);
      if (!godina) {
        const match = broj_predmeta.match(/(\d{4})/);
        godina = match ? parseInt(match[1]) : new Date().getFullYear();
      }

      // Parsirati iznos
      let iznos_glavnice: number | null = null;
      if (row.iznos_glavnice !== '' && row.iznos_glavnice !== undefined) {
        const parsed = parseFloat(String(row.iznos_glavnice).replace(',', '.').replace(/[^\d.]/g, ''));
        if (!isNaN(parsed)) iznos_glavnice = parsed;
      }

      // Status
      const validStatusi = ['aktivan', 'obustavljen', 'zavrsen', 'arhiviran'];
      const rawStatus = String(row.status ?? '').toLowerCase().trim();
      const status = validStatusi.includes(rawStatus) ? rawStatus : 'aktivan';

      toInsert.push({
        office_id: ctx.officeId,
        broj_predmeta,
        godina,
        poverilac,
        duznik,
        duznik_adresa: String(row.duznik_adresa ?? '').trim() || null,
        iznos_glavnice,
        vrsta_predmeta: String(row.vrsta_predmeta ?? '').trim() || null,
        status,
        napomena: String(row.napomena ?? '').trim() || null,
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        error: 'Nema validnih redova za uvoz.',
        errors,
      }, { status: 400 });
    }

    // Batch INSERT u Supabase (po 100 redova)
    let uvezeno = 0;
    let duplikati = 0;
    const batchSize = 100;

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/predmeti`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ctx.accessToken}`,
            apikey: ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates,return=representation',
          },
          body: JSON.stringify(batch),
        }
      );

      if (res.ok) {
        const inserted = await res.json();
        uvezeno += Array.isArray(inserted) ? inserted.length : 0;
        duplikati += batch.length - (Array.isArray(inserted) ? inserted.length : 0);
      } else {
        const err = await res.text();
        console.error('[TRACE][uvoz] batch error:', err);
      }
    }

    console.log(`[TRACE][uvoz] office=${ctx.officeId} uvezeno=${uvezeno} duplikati=${duplikati} greske=${errors.length}`);

    return NextResponse.json({
      success: true,
      uvezeno,
      duplikati,
      greske: errors.length,
      detalji_gresaka: errors,
    });
  } catch (err) {
    console.error('[TRACE][uvoz] EXCEPTION:', err);
    return NextResponse.json({ error: 'Serverska greška.' }, { status: 500 });
  }
}
