import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan',
  obustavljen: 'Obustavljen',
  zavrsen: 'Završen',
  arhiviran: 'Arhiviran',
};

const STATUS_COLORS: Record<string, string> = {
  aktivan: 'background: var(--color-success-highlight); color: var(--color-success)',
  obustavljen: 'background: var(--color-warning-highlight); color: var(--color-warning)',
  zavrsen: 'background: var(--color-primary-highlight); color: var(--color-primary)',
  arhiviran: 'background: var(--color-surface-offset); color: var(--color-text-muted)',
};

function formatBroj(iznos: number | null) {
  if (iznos === null || iznos === undefined) return '—';
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(iznos);
}

function formatDatum(datum: string | null) {
  if (!datum) return '—';
  return new Date(datum).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isRokUskoro(rok: string | null) {
  if (!rok) return false;
  const danas = new Date();
  const rokDatum = new Date(rok);
  const razlika = (rokDatum.getTime() - danas.getTime()) / (1000 * 60 * 60 * 24);
  return razlika >= 0 && razlika <= 7;
}

export default async function PredmetiPage() {
  const supabase = await createClient();

  const { data: predmeti, error } = await supabase
    .from('predmeti')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Predmeti</h1>
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>Greška pri učitavanju predmeta: {error.message}</p>
        </div>
      </div>
    );
  }

  const ukupnoAktivnih = predmeti?.filter(p => p.status === 'aktivan').length ?? 0;
  const ukupnoRokova = predmeti?.filter(p => isRokUskoro(p.rok_sledece_radnje)).length ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Predmeti</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {predmeti?.length ?? 0} predmeta ukupno · {ukupnoAktivnih} aktivnih
            {ukupnoRokova > 0 && (
              <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}> · {ukupnoRokova} rok uskoro</span>
            )}
          </p>
        </div>
        <button
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1.1rem',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Novi predmet
        </button>
      </div>

      {/* Tabela */}
      {!predmeti || predmeti.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Nema predmeta. Dodajte prvi predmet.</p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Broj predmeta</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Dužnik</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Poverilac</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Glavnica</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Rok radnje</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {predmeti.map((predmet, idx) => (
                  <tr
                    key={predmet.id}
                    style={{
                      borderBottom: idx < predmeti.length - 1 ? '1px solid var(--color-border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {predmet.broj_predmeta}/{predmet.godina}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{predmet.duznik}</div>
                      {predmet.duznik_adresa && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{predmet.duznik_adresa}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {predmet.poverilac}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {formatBroj(predmet.iznos_glavnice)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {predmet.rok_sledece_radnje ? (
                        <span style={{
                          color: isRokUskoro(predmet.rok_sledece_radnje) ? 'var(--color-warning)' : 'var(--color-text)',
                          fontWeight: isRokUskoro(predmet.rok_sledece_radnje) ? 700 : 400,
                        }}>
                          {isRokUskoro(predmet.rok_sledece_radnje) ? '⚠ ' : ''}{formatDatum(predmet.rok_sledece_radnje)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        ...(STATUS_COLORS[predmet.status]
                          ? Object.fromEntries(STATUS_COLORS[predmet.status].split(';').filter(Boolean).map(s => s.trim().split(': ')))
                          : {}),
                      }}>
                        {STATUS_LABELS[predmet.status] ?? predmet.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
