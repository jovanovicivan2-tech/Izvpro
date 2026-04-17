import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import StatusDonut from '@/components/charts/StatusDonut';
import NaplataBar from '@/components/charts/NaplataBar';
import RokoPrioriteti from '@/components/charts/RokoPrioriteti';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIznos(iznos: number) {
  if (iznos >= 1_000_000) return `${(iznos / 1_000_000).toFixed(1)}M RSD`;
  if (iznos >= 1_000) return `${(iznos / 1_000).toFixed(0)}k RSD`;
  return `${iznos} RSD`;
}

const MESECI = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aktivan:     { label: 'Aktivni',      color: '#3d7a1a' },
  obustavljen: { label: 'Obustavljeni', color: '#8a3d10' },
  zavrsen:     { label: 'Završeni',     color: '#01696f' },
  arhiviran:   { label: 'Arhivirani',   color: '#b4b2ad' },
};

const PRIORITET_LABELS: Record<string, string> = {
  hitan: 'Hitan', visok: 'Visok', srednji: 'Srednji', nizak: 'Nizak',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function StatistikePage() {
  console.log('[TRACE][page] render path=/statistike');

  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const [
    { data: predmeti },
    { data: rokovi },
    { data: nacrtiCount },
  ] = await Promise.all([
    supabase
      .from('predmeti')
      .select('status, iznos_glavnice, created_at')
      .eq('office_id', officeId),
    supabase
      .from('rokovi')
      .select('prioritet, status, created_at')
      .eq('office_id', officeId),
    supabase
      .from('nacrti')
      .select('id', { count: 'exact', head: true })
      .eq('office_id', officeId),
  ]);

  // ── Predmeti po statusu ──────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  let ukupnoGlavnica = 0;
  let aktivnaGlavnica = 0;

  for (const p of predmeti ?? []) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    ukupnoGlavnica += p.iznos_glavnice ?? 0;
    if (p.status === 'aktivan') aktivnaGlavnica += p.iznos_glavnice ?? 0;
  }

  const donutData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: statusCounts[key] ?? 0,
    color: cfg.color,
  }));

  // ── Naplata po mesecima (završeni predmeti — tekuća godina) ───────────────
  const godinaSada = new Date().getFullYear();
  const naplataPoMesec: number[] = Array(12).fill(0);

  for (const p of predmeti ?? []) {
    if (p.status === 'zavrsen' && p.created_at) {
      const d = new Date(p.created_at);
      if (d.getFullYear() === godinaSada) {
        naplataPoMesec[d.getMonth()] += p.iznos_glavnice ?? 0;
      }
    }
  }

  const barData = MESECI.map((mesec, i) => ({ mesec, iznos: naplataPoMesec[i] }));
  // Prikaži samo do trenutnog meseca
  const trenutniMesec = new Date().getMonth();
  const barDataTrimmed = barData.slice(0, trenutniMesec + 1);

  // ── Rokovi po prioritetu ─────────────────────────────────────────────────
  const rokoviMap: Record<string, { aktivan: number; zavrsen: number }> = {};
  for (const r of rokovi ?? []) {
    if (!rokoviMap[r.prioritet]) rokoviMap[r.prioritet] = { aktivan: 0, zavrsen: 0 };
    if (r.status === 'zavrsen') rokoviMap[r.prioritet].zavrsen++;
    else rokoviMap[r.prioritet].aktivan++;
  }

  const prioritetOrder = ['hitan', 'visok', 'srednji', 'nizak'];
  const rokoviData = prioritetOrder.map(p => ({
    prioritet: PRIORITET_LABELS[p],
    aktivan: rokoviMap[p]?.aktivan ?? 0,
    zavrsen: rokoviMap[p]?.zavrsen ?? 0,
  }));

  // ── Stopa završenosti ────────────────────────────────────────────────────
  const ukupnoPredmeta = predmeti?.length ?? 0;
  const zavrseniPredmeti = statusCounts['zavrsen'] ?? 0;
  const stopaZavrsenosti = ukupnoPredmeta > 0
    ? Math.round((zavrseniPredmeti / ukupnoPredmeta) * 100)
    : 0;

  const ukupnoRokova = rokovi?.length ?? 0;
  const zavrseniRokovi = (rokovi ?? []).filter(r => r.status === 'zavrsen').length;
  const stopaRokova = ukupnoRokova > 0
    ? Math.round((zavrseniRokovi / ukupnoRokova) * 100)
    : 0;

  // ── Summary KPI ──────────────────────────────────────────────────────────
  const summaryKpi = [
    {
      label: 'Ukupno predmeta', value: String(ukupnoPredmeta),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      accent: 'var(--color-primary)',
      accentBg: 'var(--color-primary-subtle)',
    },
    {
      label: 'Ukupna glavnica', value: formatIznos(ukupnoGlavnica),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      accent: 'var(--color-success)',
      accentBg: 'var(--color-success-highlight)',
    },
    {
      label: 'Stopa završenosti', value: `${stopaZavrsenosti}%`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      accent: stopaZavrsenosti >= 50 ? 'var(--color-success)' : 'var(--color-warning)',
      accentBg: stopaZavrsenosti >= 50 ? 'var(--color-success-highlight)' : 'var(--color-warning-highlight)',
    },
    {
      label: 'AI Nacrta', value: String(nacrtiCount ?? 0),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
          <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
        </svg>
      ),
      accent: 'var(--color-primary)',
      accentBg: 'var(--color-primary-subtle)',
    },
  ];

  const sectionCard = (title: string, subtitle: string, children: React.ReactNode, footer?: React.ReactNode) => (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{title}</p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</p>
      </div>
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>
      {footer && (
        <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)' }}>Statistika</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Pregled kancelarije · {new Date().toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {summaryKpi.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              borderLeft: `3px solid ${kpi.accent}`,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-md)',
              background: kpi.accentBg,
              color: kpi.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {kpi.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '1.35rem', fontWeight: 700, color: kpi.accent, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {kpi.value}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, fontWeight: 500 }}>
                {kpi.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Grafikoni — gornji red */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Donut — status predmeta */}
        {sectionCard(
          'Predmeti po statusu',
          `${ukupnoPredmeta} ukupno`,
          <>
            <StatusDonut data={donutData} />
            {/* Legenda ispod */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.75rem', justifyContent: 'center' }}>
              {donutData.filter(d => d.value > 0).map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {d.name} <strong style={{ color: 'var(--color-text)' }}>{d.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </>,
        )}

        {/* Bar — naplata po mesecima */}
        {sectionCard(
          'Glavnica po mesecima',
          `Završeni predmeti · ${godinaSada}. godina`,
          <NaplataBar data={barDataTrimmed} />,
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Aktivna glavnica: <strong style={{ color: 'var(--color-text)' }}>{formatIznos(aktivnaGlavnica)}</strong>
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Završeni: <strong style={{ color: 'var(--color-success)' }}>{zavrseniPredmeti}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Grafikoni — donji red */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>

        {/* Bar — rokovi po prioritetu */}
        {sectionCard(
          'Rokovi po prioritetu',
          `${ukupnoRokova} ukupno · ${stopaRokova}% završeno`,
          <RokoPrioriteti data={rokoviData} />,
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-warning)', display: 'inline-block' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Aktivan</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary-highlight)', display: 'inline-block' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Završen</span>
            </div>
          </div>
        )}

        {/* Tekstualni summary */}
        {sectionCard(
          'Pregled kancelarije',
          'Ključni pokazatelji',
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              {
                label: 'Aktivni predmeti',
                value: `${statusCounts['aktivan'] ?? 0} / ${ukupnoPredmeta}`,
                bar: ukupnoPredmeta > 0 ? ((statusCounts['aktivan'] ?? 0) / ukupnoPredmeta) * 100 : 0,
                color: 'var(--color-success)',
              },
              {
                label: 'Obustavljeni',
                value: `${statusCounts['obustavljen'] ?? 0} / ${ukupnoPredmeta}`,
                bar: ukupnoPredmeta > 0 ? ((statusCounts['obustavljen'] ?? 0) / ukupnoPredmeta) * 100 : 0,
                color: 'var(--color-warning)',
              },
              {
                label: 'Završeni',
                value: `${statusCounts['zavrsen'] ?? 0} / ${ukupnoPredmeta}`,
                bar: stopaZavrsenosti,
                color: 'var(--color-primary)',
              },
              {
                label: 'Završeni rokovi',
                value: `${zavrseniRokovi} / ${ukupnoRokova}`,
                bar: stopaRokova,
                color: 'var(--color-primary)',
              },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 9999, background: 'var(--color-surface-offset)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, row.bar)}%`, background: row.color, borderRadius: 9999, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
