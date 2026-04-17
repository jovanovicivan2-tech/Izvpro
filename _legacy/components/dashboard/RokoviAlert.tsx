type Rok = { id: string; naziv_roka: string; datum_roka: string; prioritet: string; predmet_id: string; predmeti: { broj_predmeta: string; duznik: string } | null }
const PRIORITET_CLS: Record<string, string> = { visok: 'rok-item--visok', srednji: 'rok-item--srednji', nizak: 'rok-item--nizak' }
function daysUntil(datum: string, today: string) { return Math.round((new Date(datum).getTime() - new Date(today).getTime()) / 86400000) }
function daysLabel(d: number) { return d === 0 ? 'Danas' : d === 1 ? 'Sutra' : `Za ${d} dana` }
export default function RokoviAlert({ rokovi, today }: { rokovi: Rok[]; today: string }) {
  if (rokovi.length === 0) return <div className="empty-state empty-state--small"><p>Nema hitnih rokova u narednih 7 dana.</p></div>
  return (
    <ul className="rokovi-list" role="list">
      {rokovi.map((r) => {
        const days = daysUntil(r.datum_roka, today)
        return (
          <li key={r.id} className={`rok-item ${PRIORITET_CLS[r.prioritet] ?? 'rok-item--nizak'}`}>
            <div className="rok-item-header">
              <span className="rok-naziv">{r.naziv_roka}</span>
              <span className={`rok-badge ${days === 0 ? 'rok-badge--danas' : days === 1 ? 'rok-badge--sutra' : ''}`}>{daysLabel(days)}</span>
            </div>
            {r.predmeti && <div className="rok-predmet"><a href={`/predmeti/${r.predmet_id}`} className="table-link">{r.predmeti.broj_predmeta}</a><span className="td-muted"> — {r.predmeti.duznik}</span></div>}
          </li>
        )
      })}
    </ul>
  )
}
