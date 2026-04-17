import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';
import type { Rok } from '@/types/database';

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(datum: string): number {
  return Math.round((new Date(datum).getTime() - new Date().getTime()) / 86400000);
}

const PRIORITET_COLORS: Record<string, { border: string; badge_bg: string; badge_color: string }> = {
  hitan:   { border: 'var(--color-error)',   badge_bg: 'rgba(220,38,38,0.1)',   badge_color: 'var(--color-error)' },
  visok:   { border: 'var(--color-warning)', badge_bg: 'rgba(245,158,11,0.1)',  badge_color: 'var(--color-warning)' },
  srednji: { border: 'var(--color-primary)', badge_bg: 'var(--color-primary-highlight)', badge_color: 'var(--color-primary)' },
  nizak:   { border: 'var(--color-border)',  badge_bg: 'var(--color-surface-offset)', badge_color: 'var(--color-text-muted)' },
};
const PRIORITET_LABELS: Record<string, string> = {
  hitan: 'Hitan', visok: 'Visok', srednji: 'Srednji', nizak: 'Nizak',
};

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
};

interface PageProps {
  searchParams: Promise<{ filter?: string; error?: string }>;
}

type RokWithPredmet = Rok & {
  predmeti: { id: string; broj_predmeta: string; godina: number; duznik: string } | null;
};

export default async function RokoviPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/rokovi');

  const { filter, error } = await searchParams;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  // Dohvati sve aktivne rokove sa podacima o predmetu
  let query = supabase
    .from('rokovi')
    .select('*, predmeti(id, broj_predmeta, godina, duznik)')
    .eq('office_id', officeId)
    .order('datum_roka', { ascending: true });

  if (filter === 'danas') {
    query = query.eq('datum_roka', today).neq('status', 'zavrsen');
  } else if (filter === 'nedelja') {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    query = query.gte('datum_roka', today).lte('datum_roka', endOfWeek.toISOString().split('T')[0]).neq('status', 'zavrsen');
  } else if (filter === 'zavrsen') {
    query = query.eq('status', 'zavrsen');
  } else {
    // default: svi aktivni
    query = query.neq('status', 'zavrsen');
  }

  const { data: rokovi, error: rokoviError } = await query;

  // Dohvati listu predmeta za formu
  const { data: predmeti } = await supabase
    .from('predmeti')
    .select('id, broj_predmeta, godina, duznik')
    .eq('office_id', officeId)
    .eq('status', 'aktivan')
    .order('broj_predmeta', { ascending: true });

  const activeFilter = filter || 'aktivni';
  const filterStyle = (f: string): React.CSSProperties => ({
    padding: '0.35rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-sm)',
    fontWeight: activeFilter === f ? 700 : 400,
    textDecoration: 'none',
    background: activeFilter === f ? 'var(--color-primary)' : 'var(--color-surface)',
    color: activeFilter === f ? '#fff' : 'var(--color-text-muted)',
    border: `1px solid ${activeFilter === f ? 'var(--color-primary)' : 'var(--color-border)'}`,
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Rokovi</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {rokovi?.length ?? 0} {activeFilter === 'zavrsen' ? 'završenih' : 'aktivnih'} rokova
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error === 'validation' ? 'Popunite sva obavezna polja.' : `Greška: ${decodeURIComponent(error)}`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lista rokova — 2/3 */}
        <div className="lg:col-span-2">

          {/* Filteri */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <Link href="/rokovi" style={filterStyle('aktivni')}>Svi aktivni</Link>
            <Link href="/rokovi?filter=danas" style={filterStyle('danas')}>Danas</Link>
            <Link href="/rokovi?filter=nedelja" style={filterStyle('nedelja')}>Ova nedelja</Link>
            <Link href="/rokovi?filter=zavrsen" style={filterStyle('zavrsen')}>Završeni</Link>
          </div>

          {rokoviError ? (
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>Greška pri učitavanju: {rokoviError.message}</p>
            </div>
          ) : !rokovi || rokovi.length === 0 ? (
            <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {activeFilter === 'danas' ? 'Nema rokova za danas.' :
                 activeFilter === 'nedelja' ? 'Nema rokova u narednih 7 dana.' :
                 activeFilter === 'zavrsen' ? 'Nema završenih rokova.' :
                 'Nema aktivnih rokova.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(rokovi as RokWithPredmet[]).map((r) => {
                const days = daysUntil(r.datum_roka);
                const isPast = r.datum_roka < today;
                const isZavrsen = r.status === 'zavrsen';
                const pc = PRIORITET_COLORS[r.prioritet] ?? PRIORITET_COLORS['nizak'];
                const daysLabel = isZavrsen ? 'Završen' : isPast ? `Kasnio ${Math.abs(days)} d.` : days === 0 ? 'Danas' : days === 1 ? 'Sutra' : `Za ${days} d.`;
                const daysColor = isZavrsen ? 'var(--color-success)' : isPast ? 'var(--color-error)' : days === 0 ? 'var(--color-error)' : days === 1 ? 'var(--color-warning)' : 'var(--color-text-muted)';

                return (
                  <div
                    key={r.id}
                    className="rounded-xl border"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderLeft: `4px solid ${pc.border}`,
                      padding: '1rem 1.25rem',
                      opacity: isZavrsen ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{r.naziv_roka}</span>
                          <span style={{ padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, background: pc.badge_bg, color: pc.badge_color }}>
                            {PRIORITET_LABELS[r.prioritet]}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDatum(r.datum_roka)}</span>
                          {r.predmeti && (
                            <>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>·</span>
                              <Link href={`/predmeti/${r.predmeti.id}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                {r.predmeti.broj_predmeta}/{r.predmeti.godina}
                              </Link>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{r.predmeti.duznik}</span>
                            </>
                          )}
                        </div>
                        {r.napomena && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{r.napomena}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: daysColor, whiteSpace: 'nowrap' }}>{daysLabel}</span>

                        {!isZavrsen && (
                          <form method="POST" action={`/api/rokovi/${r.id}`} style={{ display: 'inline' }}>
                            <input type="hidden" name="_action" value="zavrsiti" />
                            <input type="hidden" name="redirect_to" value={`/rokovi${filter ? `?filter=${filter}` : ''}`} />
                            <button
                              type="submit"
                              title="Označi kao završen"
                              style={{ padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-success)', color: 'var(--color-success)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              ✓ Završi
                            </button>
                          </form>
                        )}

                        <form method="POST" action={`/api/rokovi/${r.id}`} style={{ display: 'inline' }}>
                          <input type="hidden" name="_action" value="delete" />
                          <input type="hidden" name="redirect_to" value={`/rokovi${filter ? `?filter=${filter}` : ''}`} />
                          <button
                            type="submit"
                            title="Obriši rok"
                            style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Forma za novi rok — 1/3 */}
        <div>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Dodaj rok</p>
            </div>
            <div className="p-5">
              {!predmeti || predmeti.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Nema aktivnih predmeta. <Link href="/predmeti/novi" style={{ color: 'var(--color-primary)' }}>Dodaj predmet.</Link>
                </p>
              ) : (
                <form method="POST" action="/api/rokovi" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="hidden" name="redirect_to" value="/rokovi" />

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                      Predmet *
                    </label>
                    <select name="predmet_id" required style={{ ...inputStyle, width: '100%' }}>
                      <option value="">— Izaberi predmet —</option>
                      {predmeti.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.broj_predmeta}/{p.godina} — {p.duznik}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                      Naziv roka *
                    </label>
                    <input name="naziv_roka" type="text" required placeholder="npr. Dostava rešenja" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                      Datum roka *
                    </label>
                    <input name="datum_roka" type="date" required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                      Prioritet
                    </label>
                    <select name="prioritet" defaultValue="srednji" style={{ ...inputStyle, width: '100%' }}>
                      <option value="hitan">Hitan</option>
                      <option value="visok">Visok</option>
                      <option value="srednji">Srednji</option>
                      <option value="nizak">Nizak</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                      Napomena
                    </label>
                    <textarea name="napomena" rows={2} placeholder="Opcionalno..." style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Dodaj rok
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
