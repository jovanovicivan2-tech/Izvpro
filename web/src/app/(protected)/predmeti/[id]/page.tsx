import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Predmet, Rok } from '@/types/database';
import StrankeSection from '@/components/predmeti/StrankeSection';
import FinansijeSection from '@/components/predmeti/FinansijeSection';

function formatDatum(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatIznos(iznos: number | null) {
  if (iznos === null || iznos === undefined) return '—';
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(iznos);
}
function daysUntil(datum: string): number {
  return Math.round((new Date(datum).getTime() - new Date().getTime()) / 86400000);
}

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  aktivan:     { background: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  obustavljen: { background: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  zavrsen:     { background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  arhiviran:   { background: 'var(--color-surface-offset)',    color: 'var(--color-text-muted)' },
};
const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan', obustavljen: 'Obustavljen', zavrsen: 'Završen', arhiviran: 'Arhiviran',
};
const STATUS_TRANSITIONS: Record<string, { value: string; label: string; color: string }[]> = {
  aktivan:     [{ value: 'obustavljen', label: 'Obustavi', color: 'var(--color-warning)' }, { value: 'zavrsen', label: 'Završi', color: 'var(--color-primary)' }],
  obustavljen: [{ value: 'aktivan', label: 'Reaktiviraj', color: 'var(--color-success)' }, { value: 'arhiviran', label: 'Arhiviraj', color: 'var(--color-text-muted)' }],
  zavrsen:     [{ value: 'arhiviran', label: 'Arhiviraj', color: 'var(--color-text-muted)' }],
  arhiviran:   [],
};
const PRIORITET_BORDER: Record<string, string> = {
  hitan: 'var(--color-error)', visok: 'var(--color-warning)', srednji: 'var(--color-primary)', nizak: 'var(--color-border)',
};
const PRIORITET_LABELS: Record<string, string> = {
  hitan: 'Hitan', visok: 'Visok', srednji: 'Srednji', nizak: 'Nizak',
};

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.65rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function PredmetDetailPage({ params, searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/predmeti/[id]');

  const { id } = await params;
  const { error, success } = await searchParams;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const { data: predmet, error: fetchError } = await supabase
    .from('predmeti').select('*').eq('id', id).eq('office_id', officeId).single();
  if (fetchError || !predmet) notFound();

  const [{ data: rokovi }, { data: nacrti }, { data: activityLog }] = await Promise.all([
    supabase.from('rokovi').select('*').eq('predmet_id', id).eq('office_id', officeId).order('datum_roka', { ascending: true }),
    supabase.from('nacrti').select('id, tip_akta, created_at').eq('predmet_id', id).eq('office_id', officeId).order('created_at', { ascending: false }).limit(5),
    supabase.from('activity_log').select('*').eq('predmet_id', id).eq('office_id', officeId).order('created_at', { ascending: false }).limit(30),
  ]);

  const p = predmet as Predmet;
  const sc = STATUS_COLORS[p.status] ?? { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' };
  const today = new Date().toISOString().split('T')[0];
  const transitions = STATUS_TRANSITIONS[p.status] ?? [];

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Broj predmeta', value: `${p.broj_predmeta}/${p.godina}` },
    { label: 'Poverilac', value: p.poverilac },
    { label: 'Dužnik', value: p.duznik },
    { label: 'Adresa dužnika', value: p.duznik_adresa || '—' },
    { label: 'Vrsta predmeta', value: p.vrsta_predmeta || '—' },
    { label: 'Iznos glavnice', value: formatIznos(p.iznos_glavnice) },
    {
      label: 'Rok sledeće radnje',
      value: p.rok_sledece_radnje
        ? <span style={{ color: p.rok_sledece_radnje <= today ? 'var(--color-error)' : 'var(--color-text)', fontWeight: p.rok_sledece_radnje <= today ? 700 : 400 }}>
            {p.rok_sledece_radnje <= today ? '⚠ ' : ''}{formatDatum(p.rok_sledece_radnje)}
          </span>
        : '—',
    },
    { label: 'Kreiran', value: formatDatum(p.created_at) },
  ];

  const TIP_AKTA_LABELS: Record<string, string> = {
    dopis: 'Dopis', zakljucak: 'Zaključak', resenje: 'Rešenje', obavestenje: 'Obaveštenje',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <Link href="/predmeti" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
            ← Nazad na predmete
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
              {p.broj_predmeta}/{p.godina}
            </h1>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 700, ...sc }}>
              {STATUS_LABELS[p.status] ?? p.status}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{p.duznik} · {p.poverilac}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {transitions.map((t) => (
            <form key={t.value} method="POST" action={`/api/predmeti/${id}`} style={{ display: 'inline' }}>
              <input type="hidden" name="_action" value="set_status" />
              <input type="hidden" name="status" value={t.value} />
              <button type="submit" style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: `1px solid ${t.color}`, color: t.color, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            </form>
          ))}
          <Link href={`/predmeti/${id}/izmeni`} style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Izmeni
          </Link>
          <form method="POST" action={`/api/predmeti/${id}`} style={{ display: 'inline' }}>
            <input type="hidden" name="_action" value="delete" />
            <button type="submit" style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Obriši
            </button>
          </form>
        </div>
      </div>

      {/* Poruke */}
      {error && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>Greška: {decodeURIComponent(error)}</p>
        </div>
      )}
      {success === 'rok' && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-success-highlight)', borderColor: 'var(--color-success)' }}>
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>Rok je dodat.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Leva kolona — podaci + nacrti */}
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Osnovni podaci */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Podaci o predmetu</p>
            </div>
            <div style={{ padding: '0.25rem 0' }}>
              {infoRows.map((row, idx) => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', padding: '0.65rem 1.25rem', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-offset)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Napomena */}
          {p.napomena && (
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Napomena</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{p.napomena}</p>
            </div>
          )}

          {/* Nacrti */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Nacrti akata</p>
              <Link href={`/ai-nacrti?predmet_id=${id}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                + Novi nacrt
              </Link>
            </div>
            {!nacrti || nacrti.length === 0 ? (
              <div className="p-5 text-center">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Nema nacrta za ovaj predmet.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: '0.5rem' }}>
                {nacrti.map((n) => (
                  <li key={n.id}>
                    <Link href={`/ai-nacrti/${n.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'var(--color-text)' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{TIP_AKTA_LABELS[n.tip_akta] ?? n.tip_akta}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDatum(n.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Desna kolona — rokovi + dodaj rok */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Lista rokova */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Rokovi</p>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{rokovi?.length ?? 0} ukupno</span>
            </div>
            {!rokovi || rokovi.length === 0 ? (
              <div className="p-5 text-center">
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Nema rokova.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(rokovi as Rok[]).map((r) => {
                  const days = daysUntil(r.datum_roka);
                  const isPast = r.datum_roka < today;
                  const isZavrsen = r.status === 'zavrsen';
                  const borderColor = PRIORITET_BORDER[r.prioritet] ?? 'var(--color-border)';
                  const daysLabel = isZavrsen ? '✓' : isPast ? `Kasnio` : days === 0 ? 'Danas' : days === 1 ? 'Sutra' : `Za ${days} d.`;
                  const daysColor = isZavrsen ? 'var(--color-success)' : isPast ? 'var(--color-error)' : days <= 1 ? 'var(--color-warning)' : 'var(--color-text-muted)';
                  return (
                    <li key={r.id} style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${borderColor}`, background: 'var(--color-surface-offset)', opacity: isZavrsen ? 0.55 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>{r.naziv_roka}</span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: daysColor, whiteSpace: 'nowrap' }}>{daysLabel}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDatum(r.datum_roka)}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>· {PRIORITET_LABELS[r.prioritet]}</span>
                        {!isZavrsen && (
                          <form method="POST" action={`/api/rokovi/${r.id}`} style={{ marginLeft: 'auto' }}>
                            <input type="hidden" name="_action" value="zavrsiti" />
                            <input type="hidden" name="redirect_to" value={`/predmeti/${id}?success=rok`} />
                            <button type="submit" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-success)', color: 'var(--color-success)', background: 'transparent', cursor: 'pointer' }}>
                              Završi
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Forma: dodaj rok direktno */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Dodaj rok</p>
            </div>
            <div className="p-4">
              <form method="POST" action="/api/rokovi" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="hidden" name="predmet_id" value={id} />
                <input type="hidden" name="redirect_to" value={`/predmeti/${id}?success=rok`} />
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Naziv roka *</label>
                  <input name="naziv_roka" type="text" required placeholder="npr. Dostava rešenja" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Datum *</label>
                    <input name="datum_roka" type="date" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Prioritet</label>
                    <select name="prioritet" defaultValue="srednji" style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="hitan">Hitan</option>
                      <option value="visok">Visok</option>
                      <option value="srednji">Srednji</option>
                      <option value="nizak">Nizak</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Dodaj rok
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Stranke predmeta */}
      <div style={{ marginTop: '1.5rem' }}>
        <StrankeSection predmetId={id} />
      </div>

      {/* Finansije */}
      <div style={{ marginTop: '1.5rem' }}>
        <FinansijeSection predmetId={id} iznosGlavnice={p.iznos_glavnice ?? null} />
      </div>

      {/* Istorija izmena — Audit Log */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>Istorija izmena</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>Sve akcije na ovom predmetu</p>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{activityLog?.length ?? 0} unosa</span>
          </div>

          {!activityLog || activityLog.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Nema zabeleženih izmena.</p>
            </div>
          ) : (
            <div>
              {activityLog.map((entry: {
                id: string;
                akcija: string;
                korisnik_email: string | null;
                detalji: Record<string, unknown> | null;
                created_at: string;
              }, idx: number) => {
                const datum = new Date(entry.created_at);
                const datumStr = datum.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const vremStr = datum.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

                const AKCIJA_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                  kreiran: {
                    label: 'Predmet kreiran',
                    color: 'var(--color-success)',
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                  },
                  izmenjen: {
                    label: 'Predmet izmenjen',
                    color: 'var(--color-primary)',
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
                  },
                  status_promenjen: {
                    label: 'Status promenjen',
                    color: 'var(--color-warning)',
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
                  },
                  obrisan: {
                    label: 'Predmet obrisan',
                    color: 'var(--color-error)',
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>,
                  },
                };

                const cfg = AKCIJA_LABELS[entry.akcija] ?? {
                  label: entry.akcija,
                  color: 'var(--color-text-muted)',
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
                };

                // Čitljiv opis detalja
                let detaljTekst: string | null = null;
                if (entry.akcija === 'status_promenjen' && entry.detalji) {
                  const STATUS_L: Record<string, string> = { aktivan: 'Aktivan', obustavljen: 'Obustavljen', zavrsen: 'Završen', arhiviran: 'Arhiviran' };
                  detaljTekst = `${STATUS_L[entry.detalji.stari as string] ?? entry.detalji.stari} → ${STATUS_L[entry.detalji.novi as string] ?? entry.detalji.novi}`;
                } else if (entry.akcija === 'izmenjen' && entry.detalji) {
                  const promene = Object.entries(entry.detalji)
                    .filter(([k]) => !['office_id'].includes(k))
                    .map(([k]) => k.replace(/_/g, ' '))
                    .join(', ');
                  if (promene) detaljTekst = `Izmenjeno: ${promene}`;
                } else if (entry.akcija === 'kreiran' && entry.detalji) {
                  detaljTekst = `${entry.detalji.broj_predmeta}/${entry.detalji.godina} · ${entry.detalji.duznik}`;
                }

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.875rem',
                      padding: '0.85rem 1.25rem',
                      borderBottom: idx < activityLog.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    {/* Ikona */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 'var(--radius-full)',
                      background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                      color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Tekst */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {detaljTekst && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            — {detaljTekst}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2 }}>
                        {entry.korisnik_email ?? 'sistem'}
                      </p>
                    </div>

                    {/* Datum/vreme */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{datumStr}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 1 }}>{vremStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
