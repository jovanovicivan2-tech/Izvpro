export default function PredmetiPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Predmeti</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Lista svih predmeta kancelarije</p>
      </div>
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Tabela predmeta — u razvoju</p>
      </div>
    </div>
  );
}
