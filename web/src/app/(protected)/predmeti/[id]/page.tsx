import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Predmet, Rok } from '@/types/database';

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

  const [{ data: rokovi }, { data: nacrti }] = await Promise.all([
    supabase.from('rokovi').select('*').eq('predmet_id', id).eq('office_id', officeId).order('datum_roka', { ascending: true }),
    supabase.from('nacrti').select('id, tip_akta, created_at').eq('predmet_id', id).eq('office_id', officeId).order('created_at', { ascending: false }).limit(5),
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
    </div>
  );
}
