import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[TRACE][api] GET /api/nacrti/[id]/pdf');

  const { id } = await params;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const { data: nacrt, error } = await supabase
    .from('nacrti')
    .select('*, predmeti(broj_predmeta, godina, duznik, poverilac), sabloni(naziv), offices(naziv)')
    .eq('id', id)
    .eq('office_id', officeId)
    .single();

  if (error || !nacrt) {
    return new NextResponse('Nacrt nije pronađen.', { status: 404 });
  }

  const TIP_LABELS: Record<string, string> = {
    dopis: 'DOPIS', zakljucak: 'ZAKLJUČAK', resenje: 'REŠENJE', obavestenje: 'OBAVEŠTENJE',
  };

  const predmet = nacrt.predmeti as { broj_predmeta: string; godina: number; duznik: string; poverilac: string } | null;
  const sablon = nacrt.sabloni as { naziv: string } | null;
  const office = nacrt.offices as { naziv: string } | null;
  const tipLabel = TIP_LABELS[nacrt.tip_akta] ?? nacrt.tip_akta.toUpperCase();
  const tekst = nacrt.edited_text ?? nacrt.generated_text ?? '';
  const datum = new Date(nacrt.created_at).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Escape HTML
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tekstEscaped = escapeHtml(tekst);

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tipLabel}${predmet ? ` — ${predmet.broj_predmeta}/${predmet.godina}` : ''}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 0;
    }
    .page {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 2px solid #000;
    }
    .office-name {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .office-meta {
      font-size: 9pt;
      color: #444;
      margin-top: 4px;
    }
    .doc-date {
      text-align: right;
      font-size: 10pt;
      color: #444;
    }
    .doc-type {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 32px 0 8px 0;
    }
    .doc-meta {
      text-align: center;
      font-size: 9.5pt;
      color: #555;
      margin-bottom: 28px;
    }
    .content {
      white-space: pre-wrap;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.75;
      color: #000;
    }
    .footer {
      margin-top: 48px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
    .print-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1a56db;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
    }
    .print-bar button {
      background: #fff;
      color: #1a56db;
      border: none;
      border-radius: 6px;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-bar .close-btn {
      background: transparent;
      color: rgba(255,255,255,0.8);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      .print-bar { display: none !important; }
      .page { padding: 20mm; }
      body { padding: 0; }
    }
    @page {
      size: A4;
      margin: 20mm;
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span>📄 ${tipLabel}${predmet ? ` · Predmet ${predmet.broj_predmeta}/${predmet.godina}` : ''}</span>
    <div style="display:flex;gap:8px">
      <button onclick="window.print()">Štampaj / Sačuvaj PDF</button>
      <button class="close-btn" onclick="window.close()">Zatvori</button>
    </div>
  </div>

  <div class="page" style="margin-top:50px">
    <div class="header">
      <div>
        <div class="office-name">${escapeHtml(office?.naziv ?? 'Kancelarija')}</div>
        ${predmet ? `<div class="office-meta">Predmet br. ${escapeHtml(predmet.broj_predmeta + '/' + predmet.godina)} · ${escapeHtml(predmet.duznik)}</div>` : ''}
        ${sablon ? `<div class="office-meta">Šablon: ${escapeHtml(sablon.naziv)}</div>` : ''}
      </div>
      <div class="doc-date">
        Datum: ${datum}
      </div>
    </div>

    <div class="doc-type">${tipLabel}</div>
    ${predmet ? `<div class="doc-meta">Poverilac: ${escapeHtml(predmet.poverilac ?? '')} &nbsp;|&nbsp; Dužnik: ${escapeHtml(predmet.duznik)}</div>` : ''}

    <div class="content">${tekstEscaped}</div>

    <div class="footer">
      <span>Generisano: ${datum}</span>
      <span>${escapeHtml(office?.naziv ?? '')}</span>
    </div>
  </div>

  <script>
    // Auto-open print dialog on load (optional — korisnik može i ručno da pritisne dugme)
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
