import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';
import type { Predmet } from '@/types/database';

const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan', obustavljen: 'Obustavljen', zavrsen: 'Završen', arhiviran: 'Arhiviran',
};
const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  aktivan:     { background: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  obustavljen: { background: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  zavrsen:     { background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  arhiviran:   { background: 'var(--color-surface-offset)',    color: 'var(--color-text-muted)' },
};

const PAGE_SIZE = 20;

function formatIznos(iznos: number | null) {
  if (iznos === null || iznos === undefined) return '—';
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(iznos);
}
function formatDatum(datum: string | null) {
  if (!datum) return '—';
  return new Date(datum).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function isRokUskoro(rok: string | null): boolean {
  if (!rok) return false;
  const razlika = (new Date(rok).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  return razlika >= 0 && razlika <= 7;
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string; }>;
}

export default async function PredmetiPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/predmeti');

  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  // Count upit (za paginaciju) — bez .range()
  let countQuery = supabase
    .from('predmeti')
    .select('id', { count: 'exact', head: true })
    .eq('office_id', officeId);

  if (status && status !== 'svi') countQuery = countQuery.eq('status', status);
  if (q && q.trim()) {
    const term = q.trim();
    countQuery = countQuery.or(`duznik.ilike.%${term}%,broj_predmeta.ilike.%${term}%,poverilac.ilike.%${term}%`);
  }

  // Data upit sa paginacijom
  let dataQuery = supabase
    .from('predmeti')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status && status !== 'svi') dataQuery = dataQuery.eq('status', status);
  if (q && q.trim()) {
    const term = q.trim();
    dataQuery = dataQuery.or(`duznik.ilike.%${term}%,broj_predmeta.ilike.%${term}%,poverilac.ilike.%${term}%`);
  }

  const [{ count: totalCount }, { data: predmeti, error }, { data: svi }] = await Promise.all([
    countQuery,
    dataQuery,
    supabase.from('predmeti').select('status').eq('office_id', officeId),
  ]);

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Ukupni broj po statusu za badges (uvek bez pretrage i paginacije)
  const counts = (svi ?? []).reduce((acc: Record<string, number>, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    acc['svi'] = (acc['svi'] ?? 0) + 1;
    return acc;
  }, {});

  const activeStatus = status || 'svi';

  const filterStyle = (s: string): React.CSSProperties => ({
    padding: '0.35rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-sm)',
    fontWeight: activeStatus === s ? 700 : 400,
    textDecoration: 'none',
    background: activeStatus === s ? 'var(--color-primary)' : 'var(--color-surface)',
    color: activeStatus === s ? '#fff' : 'var(--color-text-muted)',
    border: `1px solid ${activeStatus === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
    whiteSpace: 'nowrap' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
  });

  const badgeStyle = (s: string): React.CSSProperties => ({
    padding: '0.05rem 0.45rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.65rem',
    fontWeight: 700,
    background: activeStatus === s ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-offset)',
    color: activeStatus === s ? '#fff' : 'var(--color-text-muted)',
  });

  // Gradi URL sa sačuvanim filterima i page parametrom
  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (params.status && params.status !== 'svi') p.set('status', params.status);
    if (params.page && params.page !== '1') p.set('page', params.page);
    const s = p.toString();
    return `/predmeti${s ? `?${s}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Predmeti</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {total} {q ? 'rezultata pretrage' : 'predmeta'}
            {q && <span> za „<strong>{q}</strong>"</span>}
            {totalPages > 1 && <span> · stranica {page}/{totalPages}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href="/uvoz"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: 'var(--text-sm)', fontWeight: 500, textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Uvoz
          </Link>
          <a
            href="/api/predmeti/izvoz"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: 'var(--text-sm)', fontWeight: 500, textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Izvoz
          </a>
          <Link
            href="/predmeti/novi"
            style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.1rem', fontSize: 'var(--text-sm)', fontWeight: 600, textDecoration: 'none' }}
          >
            + Novi predmet
          </Link>
        </div>
      </div>

      {/* Pretraga + Filteri */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form method="GET" action="/predmeti" style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: 220 }}>
          {status && status !== 'svi' && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            type="text"
            defaultValue={q ?? ''}
            placeholder="Pretraži po dužniku, broju predmeta, poveriocu..."
            style={{
              flex: 1,
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Traži
          </button>
          {q && (
            <Link
              href={buildUrl({ status })}
              style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)', textDecoration: 'none' }}
            >
              ✕
            </Link>
          )}
        </form>
      </div>

      {/* Status filteri */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'svi',        label: 'Svi' },
          { key: 'aktivan',    label: 'Aktivni' },
          { key: 'obustavljen',label: 'Obustavljeni' },
          { key: 'zavrsen',    label: 'Završeni' },
          { key: 'arhiviran',  label: 'Arhivirani' },
        ].map(({ key, label }) => (
          <Link key={key} href={buildUrl({ q, status: key })} style={filterStyle(key)}>
            {label}
            {(counts[key] ?? 0) > 0 && (
              <span style={badgeStyle(key)}>{counts[key]}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border p-5 mb-4" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>Greška: {error.message}</p>
        </div>
      )}

      {/* Prazno stanje */}
      {!predmeti || predmeti.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            {q ? `Nema rezultata za „${q}".` : 'Nema predmeta. '}
            {!q && <Link href="/predmeti/novi" style={{ color: 'var(--color-primary)' }}>Dodaj prvi predmet.</Link>}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
                  {['Broj predmeta', 'Dužnik', 'Poverilac', 'Glavnica', 'Rok radnje', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: h === 'Glavnica' ? 'right' : 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predmeti.map((predmet: Predmet, idx: number) => {
                  const sc = STATUS_COLORS[predmet.status] ?? { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' };
                  const rokUskoro = isRokUskoro(predmet.rok_sledece_radnje);
                  const today = new Date().toISOString().split('T')[0];
                  const rokProsao = predmet.rok_sledece_radnje != null && predmet.rok_sledece_radnje < today;
                  return (
                    <tr key={predmet.id} style={{ borderBottom: idx < predmeti.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <Link href={`/predmeti/${predmet.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', textDecoration: 'none' }}>
                          {predmet.broj_predmeta}/{predmet.godina}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{predmet.duznik}</div>
                        {predmet.duznik_adresa && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{predmet.duznik_adresa}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{predmet.poverilac}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{formatIznos(predmet.iznos_glavnice)}</td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {predmet.rok_sledece_radnje ? (
                          <span style={{ color: rokProsao ? 'var(--color-error)' : rokUskoro ? 'var(--color-warning)' : 'var(--color-text)', fontWeight: (rokProsao || rokUskoro) ? 700 : 400 }}>
                            {rokProsao ? '⚠ ' : rokUskoro ? '⏰ ' : ''}{formatDatum(predmet.rok_sledece_radnje)}
                          </span>
                        ) : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, ...sc }}>
                          {STATUS_LABELS[predmet.status] ?? predmet.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginacija */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} od {total}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {page > 1 && (
                  <Link
                    href={buildUrl({ q, status, page: String(page - 1) })}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)', textDecoration: 'none' }}
                  >
                    ← Prethodna
                  </Link>
                )}
                {/* Stranice */}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) {
                    p = i + 1;
                  } else if (page <= 4) {
                    p = i + 1;
                  } else if (page >= totalPages - 3) {
                    p = totalPages - 6 + i;
                  } else {
                    p = page - 3 + i;
                  }
                  return (
                    <Link
                      key={p}
                      href={buildUrl({ q, status, page: String(p) })}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: p === page ? 700 : 400,
                        border: `1px solid ${p === page ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: p === page ? '#fff' : 'var(--color-text-muted)',
                        background: p === page ? 'var(--color-primary)' : 'var(--color-surface)',
                        textDecoration: 'none',
                        minWidth: '2rem',
                        textAlign: 'center',
                      }}
                    >
                      {p}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ q, status, page: String(page + 1) })}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)', textDecoration: 'none' }}
                  >
                    Sledeća →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';
