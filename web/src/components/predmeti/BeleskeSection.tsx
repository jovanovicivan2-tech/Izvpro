'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Beleska } from '@/types/database';

function formatKada(d: string) {
  return new Date(d).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BeleskeSection({ predmetId }: { predmetId: string }) {
  const [beleske, setBeleske] = useState<Beleska[]>([]);
  const [loading, setLoading] = useState(true);
  const [tekst, setTekst] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/beleske`);
      const data = await res.json();
      setBeleske(Array.isArray(data) ? data : []);
    } catch {
      setError('Greška pri učitavanju beleški.');
    } finally {
      setLoading(false);
    }
  }, [predmetId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tekst.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/beleske`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tekst }),
      });
      if (!res.ok) throw new Error();
      setTekst('');
      await load();
    } catch {
      setError('Greška pri čuvanju beleške.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovu belešku?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/predmeti/${predmetId}/beleske?beleskaId=${id}`, { method: 'DELETE' });
      await load();
    } catch {
      setError('Greška pri brisanju.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Beleške</p>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{beleske.length} ukupno</span>
      </div>

      {/* Forma */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            value={tekst}
            onChange={e => setTekst(e.target.value)}
            placeholder="Dodajte belešku o predmetu…"
            rows={2}
            style={{
              padding: '0.5rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</p>}
          <div>
            <button
              type="submit"
              disabled={saving || !tekst.trim()}
              style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: (saving || !tekst.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !tekst.trim()) ? 0.6 : 1 }}
            >
              {saving ? 'Čuvam…' : 'Dodaj belešku'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Učitavam…</p>
        </div>
      ) : beleske.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Nema beleški.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '0.5rem' }}>
          {beleske.map((b) => (
            <li
              key={b.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', whiteSpace: 'pre-wrap', marginBottom: 4 }}>{b.tekst}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  {b.autor_email || 'nepoznato'} · {formatKada(b.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={deletingId === b.id}
                style={{ flexShrink: 0, padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: deletingId === b.id ? 'not-allowed' : 'pointer', opacity: deletingId === b.id ? 0.5 : 1 }}
              >
                Briši
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
