import type { GenerateDraftWithAiInput } from '@/features/ai/types';

/**
 * Zamenjuje null/undefined/prazne stringove sa oznakom PROVERITI PODATAK.
 * AI nikad ne dobija prazan string za polje koje ne postoji.
 */
function safe(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'PROVERITI PODATAK';
  if (typeof value === 'string' && !value.trim()) return 'PROVERITI PODATAK';
  if (typeof value === 'number' && isNaN(value)) return 'PROVERITI PODATAK';
  return String(value);
}

export function buildDraftSystemPrompt(): string {
  return [
    'Ti si pravni pomoćni modul za izradu nacrta akata za izvršiteljsku kancelariju u Republici Srbiji.',
    'Radiš isključivo na osnovu dostavljenih podataka iz predmeta i internog šablona kancelarije.',
    'STROGO ZABRANJENO: Ne smeš izmišljati, pretpostavljati niti dopunjavati podatke koji nisu izričito dostavljeni.',
    'Ako podatak nedostaje, zadrži tačno ovu oznaku u tekstu: PROVERITI PODATAK',
    'Stil mora biti formalan, kancelarijski, bez komentara, uvoda, objašnjenja niti markdown formatiranja.',
    'Vrati samo finalni tekst nacrta, spreman za ručnu doradu i potpis izvršitelja.',
  ].join('\n');
}

export function buildDraftUserPrompt(input: GenerateDraftWithAiInput): string {
  const p = input.predmetData;
  return [
    `TIP AKTA: ${safe(input.tipAkta)}`,
    '',
    'PODACI IZ PREDMETA:',
    `- Broj predmeta: ${safe(p.broj_predmeta)}/${safe(p.godina)}`,
    `- Poverilac: ${safe(p.poverilac)}`,
    `- Dužnik: ${safe(p.duznik)}`,
    `- Adresa dužnika: ${safe(p.duznik_adresa)}`,
    `- Vrednost potraživanja (glavnica): ${safe(p.iznos_glavnice)} RSD`,
    `- Vrsta predmeta: ${safe(p.vrsta_predmeta)}`,
    `- Napomena iz predmeta: ${safe(p.napomena)}`,
    '',
    'NAPOMENA KORISNIKA (uputstvo za izradu nacrta):',
    safe(input.userNote) === 'PROVERITI PODATAK' ? '(bez napomene)' : safe(input.userNote),
    '',
    'INTERNI ŠABLON KANCELARIJE:',
    '---',
    input.templateText.trim(),
    '---',
    '',
    'ZADATAK:',
    'Popuni šablon koristeći isključivo dostavljene podatke iz predmeta.',
    'Ako podatak nije dostavljen, ostavi oznaku PROVERITI PODATAK na mestu gde bi taj podatak trebalo da stoji.',
    'Ne dodaj pravna tumačenja, fusnote niti objašnjenje svog rada.',
    'Vrati samo finalni tekst nacrta.',
  ].join('\n');
}
