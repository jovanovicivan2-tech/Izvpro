// DEMO STRANICA — samo za lokalni razvoj
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan',
  obustavljen: 'Obustavljen',
  zavrsen: 'Završen',
  arhiviran: 'Arhiviran',
};

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  aktivan: { background: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  obustavljen: { background: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  zavrsen: { background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  arhiviran: { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' },
};

function formatIznos(iznos: number | null) {
  if (iznos === null) return '—';
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(iznos);
}

function formatDatum(datum: string | null) {
  if (!datum) return '—';
  return new Date(datum).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isRokUskoro(rok: string | null): boolean {
  if (!rok) return false;
  const danas = new Date();
  const rokDatum = new Date(rok);
  const razlika = (rokDatum.getTime() - danas.getTime()) / (1000 * 60 * 60 * 24);
  return razlika >= 0 && razlika <= 7;
}

const MOCK_PREDMETI = [
  {
    id: '1',
    broj_predmeta: '142',
    godina: 2024,
    duznik: 'Petar Petrović',
    duznik_adresa: 'Bulevar Oslobođenja 12, Beograd',
    poverilac: 'NLB Komercijalna banka',
    iznos_glavnice: 850000,
    rok_sledece_radnje: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'aktivan',
  },
  {
    id: '2',
    broj_predmeta: '87',
    godina: 2024,
    duznik: 'DOO Gradnja Plus',
    duznik_adresa: 'Vojvode Stepe 48, Beograd',
    poverilac: 'Raiffeisen Bank',
    iznos_glavnice: 2350000,
    rok_sledece_radnje: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'aktivan',
  },
  {
    id: '3',
    broj_predmeta: '211',
    godina: 2024,
    duznik: 'Marija Nikolić',
    duznik_adresa: 'Cara Dušana 5, Niš',
    poverilac: 'OTP Banka',
    iznos_glavnice: 320000,
    rok_sledece_radnje: null,
    status: 'obustavljen',
  },
  {
    id: '4',
    broj_predmeta: '56',
    godina: 2023,
    duznik: 'Zoran Jovanović',
    duznik_adresa: 'Kneza Miloša 22, Kragujevac',
    poverilac: 'Intesa Banka',
    iznos_glavnice: 175000,
    rok_sledece_radnje: null,
    status: 'zavrsen',
  },
  {
    id: '5',
    broj_predmeta: '99',
    godina: 2023,
    duznik: 'Ana Stojanović',
    duznik_adresa: null,
    poverilac: 'UniCredit Banka',
    iznos_glavnice: 490000,
    rok_sledece_radnje: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'aktivan',
  },
  {
    id: '6',
    broj_predmeta: '304',
    godina: 2024,
    duznik: 'STR Moda i Stil',
    duznik_adresa: 'Trg Republike 3, Novi Sad',
    poverilac: 'Addiko Bank',
    iznos_glavnice: null,
    rok_sledece_radnje: null,
    status: 'arhiviran',
  },
];

const navItems = [
  {
    href: '/demo/predmeti',
    label: 'Kontrolna tabla',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    active: false,
  },
  {
    href: '/demo/predmeti',
    label: 'Predmeti',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    active: true,
  },
  {
    href: '/demo/predmeti',
    label: 'Rokovi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    active: false,
  },
  {
    href: '/demo/predmeti',
    label: 'AI Nacrti',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
      </svg>
    ),
    active: false,
  },
];

export default function DemoPredmetiPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/login');
  }
  const predmeti = MOCK_PREDMETI;
  const ukupnoAktivnih = predmeti.filter((p) => p.status === 'aktivan').length;
  const ukupnoRokovaUskoro = predmeti.filter((p) => isRokUskoro(p.rok_sledece_radnje)).length;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col sticky top-0 h-screen shrink-0"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M5 18h14" />
              <path d="M7 18V8l5-3 5 3v10" />
              <path d="M10 12h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>IZVPRO</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Demo prikaz</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--color-text-faint)' }}>
            Navigacija
          </p>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm"
              style={{
                background: item.active ? 'var(--color-primary-highlight)' : 'transparent',
                color: item.active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: item.active ? 600 : 400,
                cursor: 'default',
              }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>

        {/* Demo banner */}
        <div className="px-3 pb-5">
          <div
            className="rounded-lg px-3 py-2 text-xs text-center"
            style={{
              background: 'var(--color-warning-highlight)',
              color: 'var(--color-warning)',
              fontWeight: 600,
            }}
          >
            ⚠ Demo prikaz — mock podaci
          </div>
        </div>
      </aside>

      {/* Sadrzaj */}
      <main className="flex-1 min-w-0 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Predmeti</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {predmeti.length} predmeta ukupno · {ukupnoAktivnih} aktivnih
              {ukupnoRokovaUskoro > 0 && (
                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                  {' '}· {ukupnoRokovaUskoro} rok uskoro
                </span>
              )}
            </p>
          </div>
          <button
            disabled
            style={{
              display: 'inline-block',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 1.1rem',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              opacity: 0.6,
              cursor: 'not-allowed',
              border: 'none',
            }}
          >
            + Novi predmet
          </button>
        </div>

        {/* Tabela */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--text-sm)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-offset)',
                  }}
                >
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
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {predmet.broj_predmeta}/{predmet.godina}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{predmet.duznik}</div>
                      {predmet.duznik_adresa && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {predmet.duznik_adresa}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {predmet.poverilac}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {formatIznos(predmet.iznos_glavnice)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {predmet.rok_sledece_radnje ? (
                        <span
                          style={{
                            color: isRokUskoro(predmet.rok_sledece_radnje)
                              ? 'var(--color-warning)'
                              : 'var(--color-text)',
                            fontWeight: isRokUskoro(predmet.rok_sledece_radnje) ? 700 : 400,
                          }}
                        >
                          {isRokUskoro(predmet.rok_sledece_radnje) ? '⚠ ' : ''}
                          {formatDatum(predmet.rok_sledece_radnje)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          ...(STATUS_COLORS[predmet.status] ?? {
                            background: 'var(--color-surface-offset)',
                            color: 'var(--color-text-muted)',
                          }),
                        }}
                      >
                        {STATUS_LABELS[predmet.status] ?? predmet.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
