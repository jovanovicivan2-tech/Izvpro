import Link from 'next/link'
type Predmet = { id: string; broj_predmeta: string; poverilac: string; duznik: string; status: string; datum_prijema: string | null; rok_sledece_radnje: string | null }
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  aktivan: { label: 'Aktivan', cls: 'badge--green' },
  zatvoren: { label: 'Zatvoren', cls: 'badge--gray' },
  suspendovan: { label: 'Suspendovan', cls: 'badge--yellow' },
  arhiviran: { label: 'Arhiviran', cls: 'badge--gray' },
}
function formatDatum(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export default function PredmetiTable({ predmeti }: { predmeti: Predmet[] }) {
  if (predmeti.length === 0) return <div className="empty-state"><p>Nema predmeta.</p><a href="/predmeti/novi" className="btn btn-primary">+ Novi predmet</a></div>
  const today = new Date().toISOString().split('T')[0]
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead><tr><th>Broj predmeta</th><th>Dužnik</th><th>Poverilac</th><th>Status</th><th>Datum prijema</th><th>Sledeća radnja</th></tr></thead>
        <tbody>
          {predmeti.map((p) => {
            const s = STATUS_LABELS[p.status] ?? { label: p.status, cls: 'badge--gray' }
            const rokIstice = p.rok_sledece_radnje != null && p.rok_sledece_radnje < today
            return (
              <tr key={p.id}>
                <td><Link href={`/predmeti/${p.id}`} className="table-link">{p.broj_predmeta}</Link></td>
                <td className="td-primary">{p.duznik}</td>
                <td className="td-muted">{p.poverilac}</td>
                <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                <td className="td-muted">{formatDatum(p.datum_prijema)}</td>
                <td className={rokIstice ? 'td-danger' : 'td-muted'}>{formatDatum(p.rok_sledece_radnje)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
