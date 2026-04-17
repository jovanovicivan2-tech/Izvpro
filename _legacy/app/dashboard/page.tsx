import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardKPI from '@/components/dashboard/DashboardKPI'
import PredmetiTable from '@/components/dashboard/PredmetiTable'
import RokoviAlert from '@/components/dashboard/RokoviAlert'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const today = new Date().toISOString().split('T')[0]
  const endOfWeek = new Date()
  endOfWeek.setDate(endOfWeek.getDate() + 7)
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0]
  const [
    { count: ukupno },
    { count: aktivni },
    { count: rokoviDanas },
    { count: rokoviNedelja },
    { data: poslednjiPredmeti },
    { data: hitniRokovi },
  ] = await Promise.all([
    supabase.from('predmeti').select('*', { count: 'exact', head: true }),
    supabase.from('predmeti').select('*', { count: 'exact', head: true }).eq('status', 'aktivan'),
    supabase.from('rokovi').select('*', { count: 'exact', head: true }).eq('datum_roka', today).eq('status', 'otvoren'),
    supabase.from('rokovi').select('*', { count: 'exact', head: true }).gte('datum_roka', today).lte('datum_roka', endOfWeekStr).eq('status', 'otvoren'),
    supabase.from('predmeti').select('id, broj_predmeta, poverilac, duznik, status, datum_prijema, rok_sledece_radnje').order('created_at', { ascending: false }).limit(10),
    supabase.from('rokovi').select('id, naziv_roka, datum_roka, prioritet, predmet_id, predmeti(broj_predmeta, duznik)').gte('datum_roka', today).lte('datum_roka', endOfWeekStr).eq('status', 'otvoren').order('datum_roka', { ascending: true }).limit(5),
  ])
  return (
    <main className="dashboard-layout">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <span className="dashboard-datum">{new Date().toLocaleDateString('sr-RS', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <DashboardKPI data={{ ukupno: ukupno ?? 0, aktivni: aktivni ?? 0, rokoviDanas: rokoviDanas ?? 0, rokoviNedelja: rokoviNedelja ?? 0 }} />
      <div className="dashboard-grid">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Poslednji predmeti</h2>
            <a href="/predmeti" className="link-see-all">Svi predmeti →</a>
          </div>
          <PredmetiTable predmeti={poslednjiPredmeti ?? []} />
        </section>
        <aside className="dashboard-aside">
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Rokovi — narednih 7 dana</h2>
              <a href="/rokovi" className="link-see-all">Svi rokovi →</a>
            </div>
            <RokoviAlert rokovi={hitniRokovi ?? []} today={today} />
          </section>
        </aside>
      </div>
    </main>
  )
}
