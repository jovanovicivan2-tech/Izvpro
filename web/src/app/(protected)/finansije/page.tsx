import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';

function fIznos(v: number) {
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v);
}

interface PredmetRow { id: string; broj_predmeta: string; godina: number; duznik: string; iznos_glavnice: number | null; status: string; }
interface PaymentRow { predmet_id: string; iznos: number; }

export default async function FinansijePage() {
  console.log('[TRACE][page] render path=/finansije');

  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const [{ data: predmetiData }, { data: paymentsData }] = await Promise.all([
    supabase.from('predmeti')
      .select('id, broj_predmeta, godina, duznik, iznos_glavnice, status')
      .eq('office_id', officeId)
      .limit(5000),
    supabase.from('payments')
      .select('predmet_id, iznos')
      .eq('office_id', officeId)
      .limit(20000),
  ]);

  const predmeti = (predmetiData as PredmetRow[] | null) ?? [];
  const payments = (paymentsData as PaymentRow[] | null) ?? [];

  // Agregacija uplata po predmetu
  const uplateMap = new Map<string, number>();
  for (const p of payments) {
    uplateMap.set(p.predmet_id, (uplateMap.get(p.predmet_id) ?? 0) + (Number(p.iznos) || 0));
  }

  const redovi = predmeti.map((p) => {
    const glavnica = Number(p.iznos_glavnice) || 0;
    const uplaceno = uplateMap.get(p.id) ?? 0;
    const preostalo = Math.max(0, glavnica - uplaceno);
    const pct = glavnica > 0 ? Math.min(100, Math.round((uplaceno / glavnica) * 100)) : (uplaceno > 0 ? 100 : 0);
    return { ...p, glavnica, uplaceno, preostalo, pct };
  }).sort((a, b) => b.preostalo - a.preostalo);

  const totalGlavnica = redovi.reduce((s, r) => s + r.glavnica, 0);
  const totalUplaceno = redovi.reduce((s, r) => s + r.uplaceno, 0);
  const totalPreostalo = Math.max(0, totalGlavnica - totalUplaceno);
  const totalPct = totalGlavnica > 0 ? Math.round((totalUplaceno / totalGlavnica) * 100) : 0;

  const kpis = [
    { label: 'Ukupna glavnica', value: fIznos(totalGlavnica), color: 'var(--color-primary)' },
    { label: 'Ukupno uplaćeno', value: fIznos(totalUplaceno), color: 'var(--color-success)' },
    { label: 'Preostalo za naplatu', value: fIznos(totalPreostalo), color: 'var(--color-warning)' },
    { label: 'Procenat naplate', value: `${totalPct}%`, color: 'var(--color-primary)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Finansijski izveštaj</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Pregled naplate po predmetima · {redovi.length} predmeta
          </p>
        </div>
        <a
          href="/api/finansije/izvoz"
          style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.1rem', fontSize: 'var(--text-sm)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          ⬇ Izvoz u Excel
        </a>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', borderLeft: `3px solid ${k.color}`, boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: k.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {redovi.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Nema predmeta.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-offset)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Predmet</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dužnik</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Glavnica</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Uplaćeno</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preostalo</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 140 }}>Naplata</th>
                </tr>
              </thead>
              <tbody>
                {redovi.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: idx < redovi.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                      <Link href={`/predmeti/${r.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}>
                        {r.broj_predmeta}/{r.godina}
                      </Link>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: 'var(--color-text)' }}>{r.duznik}</td>
                    <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{fIznos(r.glavnica)}</td>
                    <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--color-success)' }}>{fIznos(r.uplaceno)}</td>
                    <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: r.preostalo > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontWeight: r.preostalo > 0 ? 600 : 400 }}>{fIznos(r.preostalo)}</td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--color-surface-offset)', overflow: 'hidden', minWidth: 50 }}>
                          <div style={{ width: `${r.pct}%`, height: '100%', background: r.pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-offset)', fontWeight: 700 }}>
                  <td style={{ padding: '0.7rem 1rem' }} colSpan={2}>Ukupno</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fIznos(totalGlavnica)}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--color-success)' }}>{fIznos(totalUplaceno)}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--color-warning)' }}>{fIznos(totalPreostalo)}</td>
                  <td style={{ padding: '0.7rem 1rem', fontVariantNumeric: 'tabular-nums' }}>{totalPct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
