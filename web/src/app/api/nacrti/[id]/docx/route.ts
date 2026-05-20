import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const { data: nacrt, error } = await supabase
    .from('nacrti')
    .select('*, predmeti(broj_predmeta, godina, duznik, poverilac), sabloni(naziv), offices(naziv, adresa, telefon, email)')
    .eq('id', id)
    .eq('office_id', officeId)
    .single();

  if (error || !nacrt) {
    return new NextResponse('Nacrt nije pronađen.', { status: 404 });
  }

  const TIP_LABELS: Record<string, string> = {
    dopis: 'DOPIS',
    zakljucak: 'ZAKLJUČAK',
    resenje: 'REŠENJE',
    obavestenje: 'OBAVEŠTENJE',
  };

  const predmet = nacrt.predmeti as {
    broj_predmeta: string;
    godina: number;
    duznik: string;
    poverilac: string;
  } | null;

  const office = nacrt.offices as {
    naziv: string;
    adresa: string | null;
    telefon: string | null;
    email: string | null;
  } | null;

  const tipLabel = TIP_LABELS[nacrt.tip_akta] ?? nacrt.tip_akta.toUpperCase();
  const tekst: string = nacrt.edited_text ?? nacrt.generated_text ?? '';
  const datum = new Date(nacrt.created_at).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const linije = tekst.split('\n');

  const sadrzajParagrafi = linije.map((linija) => {
    const trimmed = linija.trim();

    if (!trimmed) {
      return new Paragraph({
        children: [new TextRun('')],
        spacing: { after: 120 },
      });
    }

    if (trimmed.includes('[PROVERITI PODATAK]')) {
      const delovi = trimmed.split(/(\[PROVERITI PODATAK\])/g);
      return new Paragraph({
        children: delovi.map((deo) =>
          deo === '[PROVERITI PODATAK]'
            ? new TextRun({ text: '[PROVERITI PODATAK]', color: 'CC0000', bold: true, font: 'Times New Roman', size: 24 })
            : new TextRun({ text: deo, font: 'Times New Roman', size: 24 })
        ),
        spacing: { after: 120 },
      });
    }

    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed,
          font: 'Times New Roman',
          size: 24,
        }),
      ],
      spacing: { after: 120 },
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            margin: {
              top: 1418,
              bottom: 1134,
              left: 1701,
              right: 1134,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: office?.naziv ?? 'Izvršiteljska kancelarija',
                font: 'Times New Roman',
                size: 28,
                bold: true,
                allCaps: true,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: '2B5078',
                space: 1,
              },
            },
          }),

          ...(office?.adresa || office?.telefon || office?.email
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: [office?.adresa, office?.telefon, office?.email]
                        .filter(Boolean)
                        .join(' · '),
                      font: 'Times New Roman',
                      size: 18,
                      color: '666666',
                    }),
                  ],
                  spacing: { after: 360 },
                }),
              ]
            : [
                new Paragraph({
                  children: [new TextRun('')],
                  spacing: { after: 360 },
                }),
              ]),

          new Paragraph({
            children: [
              new TextRun({
                text: `Datum: ${datum}`,
                font: 'Times New Roman',
                size: 20,
                color: '444444',
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 240 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: tipLabel,
                font: 'Times New Roman',
                size: 32,
                bold: true,
                allCaps: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
          }),

          ...(predmet
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Poverilac: ${predmet.poverilac}   |   Dužnik: ${predmet.duznik}`,
                      font: 'Times New Roman',
                      size: 18,
                      color: '555555',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 480 },
                }),
              ]
            : [
                new Paragraph({
                  children: [new TextRun('')],
                  spacing: { after: 480 },
                }),
              ]),

          ...sadrzajParagrafi,

          new Paragraph({ children: [new TextRun('')], spacing: { after: 720 } }),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Izvršitelj:',
                font: 'Times New Roman',
                size: 24,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 360 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '_______________________________',
                font: 'Times New Roman',
                size: 24,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: office?.naziv ?? '',
                font: 'Times New Roman',
                size: 20,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),

          new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { before: 480 },
            border: {
              top: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: 'CCCCCC',
                space: 1,
              },
            },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Generisano: ${datum}   |   IZVPRO softver za izvršiteljske kancelarije`,
                font: 'Times New Roman',
                size: 16,
                color: '999999',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  const predmetBroj = predmet
    ? `${predmet.broj_predmeta}_${predmet.godina}`
    : 'nacrt';
  const filename = `${nacrt.tip_akta}_${predmetBroj}.docx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  });
}
