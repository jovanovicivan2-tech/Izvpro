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
const PRIORITET_BORDER: Record<string, string> = {
  hitan:   'var(--color-error)',
  visok:   'var(--color-warning)',
  srednji: 'var(--color-primary)',
  nizak:   'var(--color-border)',
};

export default async function DashboardPage() {
  const { officeId, userEmail } = await requireTenantContext();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  const [
    { count: ukupno },
    { count: aktivni },
    { count: rokoviDanas },
    { count: rokoviNedelja },
    { data: poslednjiPredmeti },
    { data: hitniRokovi },
  ] = await Promise.all([
    supabase.from('predmeti').select('*', { count: 'exact', head: true }).eq('office_id', officeId),
    supabase.from('predmeti').select('*', { count: 'exact', head: true }).eq('office_id', officeId).eq('status', 'aktivan'),
    supabase.from('rokovi').select('*', { count: 'exact', head: true }).eq('office_id', officeId).eq('datum_roka', today).neq('status', 'zavrsen'),
    supabase.from('rokovi').select('*', { count: 'exact', head: true }).eq('office_id', officeId).gte('datum_roka', today).lte('datum_roka', endOfWeekStr).neq('status', 'zavrsen'),
    supabase.from('predmeti').select('id, broj_predmeta, godina, poverilac, duznik, status, iznos_glavnice, rok_sledece_radnje').eq('office_id', officeId).order('created_at', { ascending: false }).limit(8),
    supabase.from('rokovi').select('id, naziv_roka, datum_roka, prioritet, predmet_id, predmeti(broj_predmeta, godina, duznik)').eq('office_id', officeId).gte('datum_roka', today).lte('datum_roka', endOfWeekStr).neq('status', 'zavrsen').order('datum_roka', { ascending: true }).limit(6),
  ]);

  const kpiData = [
    { label: 'Ukupno predmeta',  value: ukupno ?? 0,       icon: '📁', danger: false, warn: false },
    { label: 'Aktivni predmeti', value: aktivni ?? 0,      icon: '⚡', danger: false, warn: false },
    { label: 'Rokovi danas',     value: rokoviDanas ?? 0,  icon: '🔴', danger: (rokoviDanas ?? 0) > 0, warn: false },
    { label: 'Rokovi (7 dana)',  value: rokoviNedelja ?? 0,icon: '📅', danger: false, warn: (rokoviNedelja ?? 0) > 0 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Kontrolna tabla</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Dobrodošli, {userEmail} · {new Date().toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/predmeti/novi"
          style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1.1rem',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + Novi predmet
        </Link>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-5 border flex items-center gap-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{kpi.icon}</span>
            <div>
              <p
                className="text-2xl font-bold"
                style={{
                  color: kpi.danger ? 'var(--color-error)' : kpi.warn ? 'var(--color-warning)' : 'var(--color-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {kpi.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: tabela + rokovi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Poslednji predmeti — 2/3 */}
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Poslednji predmeti</p>
            <Link href="/predmeti" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', textDecoration: 'none' }}>
              Svi predmeti →
            </Link>
          </div>

          {!poslednjiPredmeti || poslednjiPredmeti.length === 0 ? (
            <div className="p-10 text-center">
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Nema predmeta. <Link href="/predmeti/novi" style={{ color: 'var(--color-primary)' }}>Dodaj prvi.</Link></p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-offset)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Predmet</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dužnik</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Glavnica</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sledeća radnja</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(poslednjiPredmeti as Predmet[]).map((p, idx) => {
                    const rokIstice = p.rok_sledece_radnje != null && p.rok_sledece_radnje <= today;
                    const sc = STATUS_COLORS[p.status] ?? { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' };
                    return (
                      <tr key={p.id} style={{ borderBottom: idx < poslednjiPredmeti.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                          <Link href={`/predmeti/${p.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}>
                            {p.broj_predmeta}/{p.godina}
                          </Link>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: 'var(--color-text)', fontWeight: 500 }}>{p.duznik}</td>
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatIznos(p.iznos_glavnice)}</td>
                        <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap', color: rokIstice ? 'var(--color-error)' : 'var(--color-text-muted)', fontWeight: rokIstice ? 600 : 400 }}>
                          {rokIstice ? '⚠ ' : ''}{formatDatum(p.rok_sledece_radnje)}
                        </td>
                        <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, ...sc }}>
                            {STATUS_LABELS[p.status] ?? p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rokovi — 1/3 */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Rokovi — 7 dana</p>
            <Link href="/rokovi" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', textDecoration: 'none' }}>
              Svi →
            </Link>
          </div>

          {!hitniRokovi || hitniRokovi.length === 0 ? (
            <div className="p-6 text-center">
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>✓ Nema rokova u narednih 7 dana.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(hitniRokovi as (Rok & { predmeti: { broj_predmeta: string; godina: number; duznik: string } | null })[]).map((r) => {
                const days = daysUntil(r.datum_roka);
                const borderColor = PRIORITET_BORDER[r.prioritet] ?? 'var(--color-border)';
                const daysLabel = days === 0 ? 'Danas' : days === 1 ? 'Sutra' : `Za ${days} d.`;
                const daysColor = days === 0 ? 'var(--color-error)' : days === 1 ? 'var(--color-warning)' : 'var(--color-text-muted)';
                return (
                  <li
                    key={r.id}
                    style={{
                      padding: '0.7rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `3px solid ${borderColor}`,
                      background: 'var(--color-surface-offset)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>{r.naziv_roka}</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: daysColor, whiteSpace: 'nowrap' }}>{daysLabel}</span>
                    </div>
                    {r.predmeti && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        <Link href={`/predmeti/${r.predmet_id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                          {r.predmeti.broj_predmeta}/{r.predmeti.godina}
                        </Link>
                        {' · '}{r.predmeti.duznik}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
