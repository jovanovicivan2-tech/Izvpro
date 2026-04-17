import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import Link from 'next/link';

const TIP_AKTA_LABELS: Record<string, string> = {
  dopis: 'Dopis', zakljucak: 'Zaključak', resenje: 'Rešenje', obavestenje: 'Obaveštenje',
};

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
  color: 'var(--color-text)', fontSize: 'var(--text-sm)', outline: 'none', boxSizing: 'border-box',
};

interface PageProps {
  searchParams: Promise<{ tab?: string; error?: string; success?: string; predmet_id?: string }>;
}

export default async function AiNacrtiPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/ai-nacrti');
  const { tab, error, success, predmet_id } = await searchParams;
  const activeTab = tab || 'nacrti';
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const [
    { data: nacrti },
    { data: sabloni },
    { data: predmeti },
  ] = await Promise.all([
    supabase.from('nacrti')
      .select('id, tip_akta, created_at, predmeti(broj_predmeta, godina, duznik)')
      .eq('office_id', officeId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('sabloni')
      .select('*').eq('office_id', officeId).order('created_at', { ascending: false }),
    supabase.from('predmeti')
      .select('id, broj_predmeta, godina, duznik').eq('office_id', officeId)
      .eq('status', 'aktivan').order('broj_predmeta'),
  ]);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '0.5rem 1.1rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-sm)',
    fontWeight: activeTab === t ? 700 : 400, textDecoration: 'none',
    background: activeTab === t ? 'var(--color-primary)' : 'var(--color-surface)',
    color: activeTab === t ? '#fff' : 'var(--color-text-muted)',
    border: `1px solid ${activeTab === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
  });

  const errorMsg =
    error === 'validation' ? 'Popunite sva obavezna polja.' :
    error === 'predmet_not_found' ? 'Predmet nije pronađen.' :
    error === 'sablon_not_found' ? 'Sablon nije pronađen ili nije aktivan.' :
    error ? `Greška: ${decodeURIComponent(error)}` : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>AI Nacrti</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Generisanje nacrta akata po šablonu</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{errorMsg}</p>
        </div>
      )}
      {(success === 'sablon') && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-success-highlight)', borderColor: 'var(--color-success)' }}>
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>Šablon je sačuvan.</p>
        </div>
      )}

      {/* Tabovi */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Link href="/ai-nacrti" style={tabStyle('nacrti')}>Nacrti ({nacrti?.length ?? 0})</Link>
        <Link href="/ai-nacrti?tab=novi" style={tabStyle('novi')}>+ Novi nacrt</Link>
        <Link href="/ai-nacrti?tab=sabloni" style={tabStyle('sabloni')}>Šabloni ({sabloni?.length ?? 0})</Link>
      </div>

      {/* TAB: Lista nacrta */}
      {activeTab === 'nacrti' && (
        <div>
          {!nacrti || nacrti.length === 0 ? (
            <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                Nema nacrta. <Link href="/ai-nacrti?tab=novi" style={{ color: 'var(--color-primary)' }}>Generiši prvi nacrt.</Link>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-offset)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Tip akta', 'Predmet', 'Dužnik', 'Datum'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(nacrti as unknown as { id: string; tip_akta: string; created_at: string; predmeti: { broj_predmeta: string; godina: number; duznik: string } | null }[]).map((n, idx) => (
                    <tr key={n.id} style={{ borderBottom: idx < nacrti.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Link href={`/ai-nacrti/${n.id}`} style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
                          {TIP_AKTA_LABELS[n.tip_akta] ?? n.tip_akta}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {n.predmeti ? `${n.predmeti.broj_predmeta}/${n.predmeti.godina}` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {n.predmeti?.duznik ?? '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDatum(n.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Novi nacrt */}
      {activeTab === 'novi' && (
        <div style={{ maxWidth: 640 }}>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Generiši novi nacrt</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Izaberi predmet, tip akta i šablon — AI popunjava tekst</p>
            </div>
            <div className="p-5">
              {(!predmeti || predmeti.length === 0) ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Nema aktivnih predmeta. <Link href="/predmeti/novi" style={{ color: 'var(--color-primary)' }}>Dodaj predmet.</Link>
                </p>
              ) : (!sabloni || sabloni.length === 0) ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Nema šablona. <Link href="/ai-nacrti?tab=sabloni" style={{ color: 'var(--color-primary)' }}>Dodaj šablon.</Link>
                </p>
              ) : (
                <form method="POST" action="/api/nacrti" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Predmet *</label>
                    <select name="predmet_id" required defaultValue={predmet_id ?? ''} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">— Izaberi predmet —</option>
                      {predmeti.map(p => (
                        <option key={p.id} value={p.id}>{p.broj_predmeta}/{p.godina} — {p.duznik}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Šablon *</label>
                    <select name="sablon_id" required style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">— Izaberi šablon —</option>
                      {sabloni.filter(s => s.aktivan).map(s => (
                        <option key={s.id} value={s.id}>{s.naziv} ({TIP_AKTA_LABELS[s.tip_akta] ?? s.tip_akta})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Tip akta *</label>
                    <select name="tip_akta" required style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">— Izaberi tip —</option>
                      <option value="dopis">Dopis</option>
                      <option value="zakljucak">Zaključak</option>
                      <option value="resenje">Rešenje</option>
                      <option value="obavestenje">Obaveštenje</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Napomena za AI</label>
                    <textarea name="user_note" rows={3} placeholder="Opciono uputstvo AI-u — npr. 'naglasi kašnjenje od 30 dana'" style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Generiši nacrt
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Šabloni */}
      {activeTab === 'sabloni' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lista šablona */}
          <div>
            {!sabloni || sabloni.length === 0 ? (
              <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Nema šablona. Dodajte prvi.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {sabloni.map((s, idx) => (
                  <div key={s.id} style={{ padding: '0.85rem 1.25rem', borderBottom: idx < sabloni.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{s.naziv}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{TIP_AKTA_LABELS[s.tip_akta]} · {s.template_text.length} znakova</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, background: s.aktivan ? 'var(--color-success-highlight)' : 'var(--color-surface-offset)', color: s.aktivan ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {s.aktivan ? 'Aktivan' : 'Neaktivan'}
                      </span>
                      <form method="POST" action={`/api/sabloni/${s.id}`} style={{ display: 'inline' }} onSubmit={(e) => { if (!confirm('Obrisati šablon?')) e.preventDefault(); }}>
                        <input type="hidden" name="_action" value="delete" />
                        <button type="submit" style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Forma za novi šablon */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Novi šablon</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Koristite {'{{DUZNIK}}'}, {'{{POVERILAC}}'}, {'{{BROJ_PREDMETA}}'} kao placeholder</p>
            </div>
            <div className="p-5">
              <form method="POST" action="/api/sabloni" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Naziv šablona *</label>
                  <input name="naziv" type="text" required placeholder="npr. Zaključak o izvršenju" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Tip akta *</label>
                  <select name="tip_akta" required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">— Izaberi tip —</option>
                    <option value="dopis">Dopis</option>
                    <option value="zakljucak">Zaključak</option>
                    <option value="resenje">Rešenje</option>
                    <option value="obavestenje">Obaveštenje</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Tekst šablona *</label>
                  <textarea name="template_text" rows={10} required placeholder={'ZAKLJUČAK O IZVRŠENJU\n\nBr. {{BROJ_PREDMETA}}\n\nPoverilac: {{POVERILAC}}\nDužnik: {{DUZNIK}}\nAdresa: {{DUZNIK_ADRESA}}\n\nGlavnica: {{IZNOS_GLAVNICE}} RSD\n\nDatum: {{DATUM}}'} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} />
                </div>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Sačuvaj šablon
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
