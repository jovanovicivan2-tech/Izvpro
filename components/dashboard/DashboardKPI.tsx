interface KPIData { ukupno: number; aktivni: number; rokoviDanas: number; rokoviNedelja: number }
const kpiConfig = [
  { key: 'ukupno' as const, label: 'Ukupno predmeta', icon: '📁', variant: 'neutral' },
  { key: 'aktivni' as const, label: 'Aktivni predmeti', icon: '⚡', variant: 'primary' },
  { key: 'rokoviDanas' as const, label: 'Rokovi danas', icon: '🔴', variant: 'danger' },
  { key: 'rokoviNedelja' as const, label: 'Rokovi (7 dana)', icon: '📅', variant: 'warning' },
]
export default function DashboardKPI({ data }: { data: KPIData }) {
  return (
    <div className="kpi-grid">
      {kpiConfig.map(({ key, label, icon, variant }) => (
        <div key={key} className={`kpi-card kpi-card--${variant}`}>
          <div className="kpi-icon">{icon}</div>
          <div className="kpi-body">
            <span className="kpi-value">{data[key]}</span>
            <span className="kpi-label">{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
