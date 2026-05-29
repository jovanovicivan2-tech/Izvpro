import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { notFound } from 'next/navigation';
import type { Predmet, Rok } from '@/types/database';
import PrintControls from './print-controls';

function fDatum(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fIznos(v: number | null) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v);
}

interface CaseParty { id: string; tip_stranke: string; ime_prezime: string; jmbg_pib: string | null; adresa: string | null; telefon: string | null; email: string | null; }
interface Payment { id: string; datum_uplate: string; iznos: number; tip_uplate: string | null; opis: string | null; }
interface Delivery { id: string; tip_pismena: string; primalac: string | null; datum_slanja: string | null; datum_prijema: string | null; status: string | null; }

const STATUS_LABELS: Record<string, string> = {
  aktivan: 'Aktivan', obustavljen: 'Obustavljen', zavrsen: 'Završen', arhiviran: 'Arhiviran',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const TH: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', borderBottom: '1.5px solid #333', fontSize: '11px', fontWeight: 700 };
const TD: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: '11px' };
const LABEL: React.CSSProperties = { color: '#555', fontSize: '11px', padding: '3px 8px 3px 0', width: 160, verticalAlign: 'top' };
const VAL: React.CSSProperties = { fontSize: '11px', padding: '3px 0', fontWeight: 600 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ fontSize: '13px', fontWeight: 700, borderBottom: '2px solid #333', paddingBottom: 4, marginBottom: 8 }}>{title}</h2>
      {children}
    </div>
  );
}

export default async function PredmetStampaPage({ params }: PageProps) {
  const { id } = await params;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const { data: predmet, error } = await supabase
    .from('predmeti').select('*').eq('id', id).eq('office_id', officeId).single();
  if (error || !predmet) notFound();
  const p = predmet as Predmet;

  const [{ data: stranke }, { data: uplate }, { data: dostave }, { data: rokovi }, { data: office }] = await Promise.all([
    supabase.from('case_parties').select('*').eq('predmet_id', id).eq('office_id', officeId).order('created_at'),
    supabase.from('payments').select('*').eq('predmet_id', id).eq('office_id', officeId).order('datum_uplate', { ascending: false }),
    supabase.from('deliveries').select('*').eq('predmet_id', id).eq('office_id', officeId).order('datum_slanja', { ascending: false }),
    supabase.from('rokovi').select('*').eq('predmet_id', id).eq('office_id', officeId).order('datum_roka'),
    supabase.from('offices').select('naziv, adresa, telefon, email').eq('id', officeId).single(),
  ]);

  const uplaceno = ((uplate as Payment[] | null) ?? []).reduce((s, u) => s + (Number(u.iznos) || 0), 0);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', color: '#111', padding: '8px 4px' }}>
      <style>{`
        @media print {
          aside { display: none !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <PrintControls predmetId={id} />

      {/* Zaglavlje kancelarije */}
      {office && (
        <div style={{ borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>{(office as { naziv: string }).naziv}</div>
          <div style={{ fontSize: '11px', color: '#555' }}>
            {[(office as { adresa: string | null }).adresa, (office as { telefon: string | null }).telefon, (office as { email: string | null }).email].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}

      {/* Naslov */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Predmet {p.broj_predmeta}/{p.godina}</h1>
        <span style={{ fontSize: '11px', color: '#555' }}>Status: {STATUS_LABELS[p.status] ?? p.status}</span>
      </div>

      {/* Osnovni podaci */}
      <Section title="Osnovni podaci">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={LABEL}>Poverilac</td><td style={VAL}>{p.poverilac}</td></tr>
            <tr><td style={LABEL}>Dužnik</td><td style={VAL}>{p.duznik}</td></tr>
            <tr><td style={LABEL}>Adresa dužnika</td><td style={VAL}>{p.duznik_adresa || '—'}</td></tr>
            <tr><td style={LABEL}>Vrsta predmeta</td><td style={VAL}>{p.vrsta_predmeta || '—'}</td></tr>
            <tr><td style={LABEL}>Iznos glavnice</td><td style={VAL}>{fIznos(p.iznos_glavnice)}</td></tr>
            <tr><td style={LABEL}>Rok sledeće radnje</td><td style={VAL}>{fDatum(p.rok_sledece_radnje)}</td></tr>
            <tr><td style={LABEL}>Napomena</td><td style={VAL}>{p.napomena || '—'}</td></tr>
          </tbody>
        </table>
      </Section>

      {/* Stranke */}
      <Section title={`Stranke (${(stranke as CaseParty[] | null)?.length ?? 0})`}>
        {!stranke || (stranke as CaseParty[]).length === 0 ? (
          <p style={{ fontSize: '11px', color: '#777' }}>Nema unetih stranaka.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Tip</th><th style={TH}>Ime / Naziv</th><th style={TH}>JMBG/PIB</th><th style={TH}>Adresa</th><th style={TH}>Kontakt</th></tr></thead>
            <tbody>
              {(stranke as CaseParty[]).map((s) => (
                <tr key={s.id}>
                  <td style={TD}>{s.tip_stranke}</td>
                  <td style={TD}>{s.ime_prezime}</td>
                  <td style={TD}>{s.jmbg_pib || '—'}</td>
                  <td style={TD}>{s.adresa || '—'}</td>
                  <td style={TD}>{[s.telefon, s.email].filter(Boolean).join(' / ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Finansije */}
      <Section title={`Finansije — uplaćeno ${fIznos(uplaceno)}`}>
        {!uplate || (uplate as Payment[]).length === 0 ? (
          <p style={{ fontSize: '11px', color: '#777' }}>Nema evidentiranih uplata.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Datum</th><th style={TH}>Tip</th><th style={TH}>Opis</th><th style={{ ...TH, textAlign: 'right' }}>Iznos</th></tr></thead>
            <tbody>
              {(uplate as Payment[]).map((u) => (
                <tr key={u.id}>
                  <td style={TD}>{fDatum(u.datum_uplate)}</td>
                  <td style={TD}>{u.tip_uplate || '—'}</td>
                  <td style={TD}>{u.opis || '—'}</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fIznos(u.iznos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Dostava */}
      <Section title={`Dostava pismena (${(dostave as Delivery[] | null)?.length ?? 0})`}>
        {!dostave || (dostave as Delivery[]).length === 0 ? (
          <p style={{ fontSize: '11px', color: '#777' }}>Nema evidentirane dostave.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Pismeno</th><th style={TH}>Primalac</th><th style={TH}>Poslato</th><th style={TH}>Primljeno</th><th style={TH}>Status</th></tr></thead>
            <tbody>
              {(dostave as Delivery[]).map((d) => (
                <tr key={d.id}>
                  <td style={TD}>{d.tip_pismena}</td>
                  <td style={TD}>{d.primalac || '—'}</td>
                  <td style={TD}>{fDatum(d.datum_slanja)}</td>
                  <td style={TD}>{fDatum(d.datum_prijema)}</td>
                  <td style={TD}>{d.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Rokovi */}
      <Section title={`Rokovi (${(rokovi as Rok[] | null)?.length ?? 0})`}>
        {!rokovi || (rokovi as Rok[]).length === 0 ? (
          <p style={{ fontSize: '11px', color: '#777' }}>Nema unetih rokova.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Naziv</th><th style={TH}>Datum</th><th style={TH}>Prioritet</th><th style={TH}>Status</th></tr></thead>
            <tbody>
              {(rokovi as Rok[]).map((r) => (
                <tr key={r.id}>
                  <td style={TD}>{r.naziv_roka}</td>
                  <td style={TD}>{fDatum(r.datum_roka)}</td>
                  <td style={TD}>{r.prioritet}</td>
                  <td style={TD}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Potpis */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555' }}>
        <div>Datum štampe: {fDatum(new Date().toISOString())}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: 4, minWidth: 180 }}>Potpis ovlašćenog lica</div>
        </div>
      </div>
    </div>
  );
}
