import type { GenerateDraftWithAiInput } from '@/features/ai/types';

/**
 * Fallback renderer — koristi se kada OpenAI nije dostupan.
 * Zamenjuje placeholder oznake u šablonu sa stvarnim podacima.
 * Ako podatak nedostaje, ostavlja PROVERITI PODATAK.
 */
export function buildFallbackDraftText(input: GenerateDraftWithAiInput): string {
  const p = input.predmetData;

  function safe(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return 'PROVERITI PODATAK';
    if (typeof value === 'string' && !value.trim()) return 'PROVERITI PODATAK';
    if (typeof value === 'number' && isNaN(value)) return 'PROVERITI PODATAK';
    return String(value);
  }

  const replacements: Record<string, string> = {
    '{{BROJ_PREDMETA}}': `${safe(p.broj_predmeta)}/${safe(p.godina)}`,
    '{{POVERILAC}}': safe(p.poverilac),
    '{{DUZNIK}}': safe(p.duznik),
    '{{DUZNIK_ADRESA}}': safe(p.duznik_adresa),
    '{{IZNOS_GLAVNICE}}': safe(p.iznos_glavnice),
    '{{VRSTA_PREDMETA}}': safe(p.vrsta_predmeta),
    '{{NAPOMENA}}': safe(p.napomena),
    '{{DATUM}}': new Date().toLocaleDateString('sr-RS'),
    '{{TIP_AKTA}}': safe(input.tipAkta),
  };

  let text = input.templateText;

  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.replaceAll(placeholder, value);
  }

  if (input.userNote?.trim()) {
    text += `\n\nNAPOMENA: ${input.userNote.trim()}`;
  }

  return text;
}
