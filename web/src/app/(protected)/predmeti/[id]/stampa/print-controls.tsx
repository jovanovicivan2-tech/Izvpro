'use client';

import Link from 'next/link';

export default function PrintControls({ predmetId }: { predmetId: string }) {
  return (
    <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
      <button
        onClick={() => window.print()}
        style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        🖨 Štampaj / Sačuvaj kao PDF
      </button>
      <Link
        href={`/predmeti/${predmetId}`}
        style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', textDecoration: 'none' }}
      >
        ← Nazad
      </Link>
    </div>
  );
}
