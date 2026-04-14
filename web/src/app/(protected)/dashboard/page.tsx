import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Kontrolna tabla</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Dobrodošli, {user?.email}
        </p>
      </div>

      {/* KPI kartice - placeholder za sada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Aktivni predmeti', value: '—' },
          { label: 'Rokovi danas', value: '—' },
          { label: 'AI nacrti', value: '—' },
          { label: 'Nenaplaeni troškovi', value: '—' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-5 border"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder za listu predmeta */}
      <div
        className="rounded-xl border p-5"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Poslednje aktivnosti</p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Podaci će biti učitani kada se poveže Supabase baza.</p>
      </div>
    </div>
  );
}
