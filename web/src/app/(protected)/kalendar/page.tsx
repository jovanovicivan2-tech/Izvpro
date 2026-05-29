import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';
import type { Rok } from '@/types/database';

const PRIORITET_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  hitan:   { bg: 'rgba(220,38,38,0.12)',  color: 'var(--color-error)',   dot: 'var(--color-error)' },
  visok:   { bg: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', dot: 'var(--color-warning)' },
  srednji: { bg: 'var(--color-primary-highlight)', color: 'var(--color-primary)', dot: 'var(--color-primary)' },
  nizak:   { bg: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', dot: 'var(--color-text-muted)' },
};
const PRIORITET_LABELS: Record<string, string> = {
  hitan: 'Hitan', visok: 'Visok', srednji: 'Srednji', nizak: 'Nizak',
};

const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

type RokWithPredmet = Rok & {
  predmeti: { id: string; broj_predmeta: string; godina: number; duznik: string } | null;
};

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function KalendarPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/kalendar');

  const { month: monthParam } = await searchParams;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const now = new Date();
  const ym = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [year, month] = ym.split('-').map(Number); // month: 1-12

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // ponedeljak = 0
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const prevYm = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const nextYm = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  const naslovMeseca = firstOfMonth.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });

  // Rokovi u mesecu (uz tenant filter)
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${pad(daysInMonth)}`;
  const { data: rokovi, error } = await supabase
    .from('rokovi')
    .select('*, predmeti(id, broj_predmeta, godina, duznik)')
    .eq('office_id', officeId)
    .gte('datum_roka', monthStart)
    .lte('datum_roka', monthEnd)
    .order('datum_roka', { ascending: true });

  const byDay = new Map<string, RokWithPredmet[]>();
  for (const r of (rokovi as RokWithPredmet[] | null) ?? []) {
    const key = r.datum_roka.slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(r);
    byDay.set(key, arr);
  }

  // Ćelije: prazne pre prvog dana + dani u mesecu
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const navBtnStyle: React.CSSProperties = {
    padding: '0.4rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Kalendar rokova</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {naslovMeseca} · {rokovi?.length ?? 0} rokova
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href={`/kalendar?month=${prevYm}`} style={navBtnStyle}>← Prethodni</Link>
          <Link href="/kalendar" style={{ ...navBtnStyle, background: 'var(--color-primary)', color: '#fff', border: '1px solid var(--color-primary)' }}>Danas</Link>
          <Link href={`/kalendar?month=${nextYm}`} style={navBtnStyle}>Sledeći →</Link>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(PRIORITET_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITET_COLORS[key].dot, display: 'inline-block' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>Greška pri učitavanju: {error.message}</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Nazivi dana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Dani */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e${idx}`} style={{ minHeight: 104, borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />;
              }
              const dayStr = `${ym}-${pad(day)}`;
              const dayRokovi = byDay.get(dayStr) ?? [];
              const isToday = dayStr === todayStr;
              return (
                <div
                  key={dayStr}
                  style={{
                    minHeight: 104,
                    padding: '0.35rem',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                    borderBottom: '1px solid var(--color-border)',
                    background: isToday ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    alignSelf: 'flex-end',
                  }}>
                    {day}
                  </span>
                  {dayRokovi.map((r) => {
                    const pc = PRIORITET_COLORS[r.prioritet] ?? PRIORITET_COLORS['nizak'];
                    const isZavrsen = r.status === 'zavrsen';
                    const content = (
                      <div
                        style={{
                          background: pc.bg,
                          color: pc.color,
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.15rem 0.35rem',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: isZavrsen ? 0.5 : 1,
                          textDecoration: isZavrsen ? 'line-through' : 'none',
                        }}
                        title={`${r.naziv_roka}${r.predmeti ? ` — ${r.predmeti.broj_predmeta}/${r.predmeti.godina} ${r.predmeti.duznik}` : ''}`}
                      >
                        {r.naziv_roka}
                      </div>
                    );
                    return r.predmeti ? (
                      <Link key={r.id} href={`/predmeti/${r.predmeti.id}`} style={{ textDecoration: 'none' }}>
                        {content}
                      </Link>
                    ) : (
                      <div key={r.id}>{content}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
