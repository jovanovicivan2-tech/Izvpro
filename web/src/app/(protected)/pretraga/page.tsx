import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';
import type { Predmet, Rok } from '@/types/database';

function formatDatum(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatIznos(iznos: number | null) {
  if (!iznos) return '—';
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(iznos);
}

const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan', obustavljen: 'Obustavljen', zavrsen: 'Završen', arhiviran: 'Arhiviran',
};
const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  aktivan:     { background: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  obustavljen: { background: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  zavrsen:     { background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  arhiviran:   { background: 'var(--color-surface-offset)',    color: 'var(--color-text-muted)' },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

type RokWithPredmet = Rok & {
  predmeti: { id: string; broj_predmeta: string; godina: number; duznik: string } | null;
};

export default async function PretragaPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/pretraga');

  const { q } = await searchParams;
  // Ukloni znakove koji kvare PostgREST .or() sintaksu
  const search = (q ?? '').trim().replace(/[(),]/g, ' ').trim();
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  let predmeti: Predmet[] = [];
  let rokovi: RokWithPredmet[] = [];

  if (search.length >= 2) {
    const [predmetiRes, rokoviRes] = await Promise.all([
      supabase
        .from('predmeti')
        .select('*')
        .eq('office_id', officeId)
        .or(`broj_predmeta.ilike.%${search}%,duznik.ilike.%${search}%,poverilac.ilike.%${search}%,duznik_adresa.ilike.%${search}%`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('rokovi')
        .select('*, predmeti(id, broj_predmeta, godina, duznik)')
        .eq('office_id', officeId)
        .ilike('naziv_roka', `%${search}%`)
        .order('datum_roka', { ascending: false })
        .limit(30),
    ]);
    predmeti = (predmetiRes.data as Predmet[]) ?? [];
    rokovi = (rokoviRes.data as RokWithPredmet[]) ?? [];
  }

  const ukupno = predmeti.length + rokovi.length;

  const inputStyle: React.CSSProperties = {
    padding: '0.55rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    fontSize: 'var(--text-sm)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Pretraga</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Pretraga predmeta (broj, dužnik, poverilac, adresa) i rokova
        </p>
      </div>

      <form method="GET" action="/pretraga" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          name="q"
          type="search"
          defaultValue={q ?? ''}
          autoFocus
          placeholder="Unesite pojam za pretragu…"
          style={inputStyle}
        />
        <button type="submit" style={{ padding: '0.55rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Traži
        </button>
      </form>

      {search.length < 2 ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Unesite najmanje 2 karaktera za pretragu.
          </p>
        </div>
      ) : ukupno === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Nema rezultata za „{search}".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {ukupno} {ukupno === 1 ? 'rezultat' : 'rezultata'} za „{search}"
          </p>

          {/* Predmeti */}
          {predmeti.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Predmeti ({predmeti.length})
              </h2>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {predmeti.map((p, idx) => {
                  const sc = STATUS_COLORS[p.status] ?? { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' };
                  return (
                    <Link
                      key={p.id}
                      href={`/predmeti/${p.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderBottom: idx < predmeti.length - 1 ? '1px solid var(--color-border)' : 'none',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {p.broj_predmeta}/{p.godina}
                          </span>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{p.duznik}</span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {p.poverilac} · {formatIznos(p.iznos_glavnice)}
                        </div>
                      </div>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap', ...sc }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rokovi */}
          {rokovi.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Rokovi ({rokovi.length})
              </h2>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {rokovi.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={r.predmeti ? `/predmeti/${r.predmeti.id}` : '/rokovi'}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      borderBottom: idx < rokovi.length - 1 ? '1px solid var(--color-border)' : 'none',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>{r.naziv_roka}</span>
                      {r.predmeti && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {r.predmeti.broj_predmeta}/{r.predmeti.godina} · {r.predmeti.duznik}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDatum(r.datum_roka)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
