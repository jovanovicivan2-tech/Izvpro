'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Payment, TipUplate } from '@/types/database';

const TIP_LABELS: Record<TipUplate, string> = {
  uplata:   'Uplata',
  povracaj: 'Povraćaj',
  troskovi: 'Troškovi',
  kamata:   'Kamata',
};

const TIP_COLORS: Record<TipUplate, { bg: string; color: string }> = {
  uplata:   { bg: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  povracaj: { bg: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  troskovi: { bg: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  kamata:   { bg: 'var(--color-error-highlight)',   color: 'var(--color-error)' },
};

function formatIznos(iznos: number) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency', currency: 'RSD', maximumFractionDigits: 2,
  }).format(iznos);
}

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.65rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const EMPTY_FORM = {
  tip_uplate: 'uplata' as TipUplate,
  datum_uplate: new Date().toISOString().split('T')[0],
  iznos: '',
  opis: '',
};

export default function FinansijeSection({
  predmetId,
  iznosGlavnice,
}: {
  predmetId: string;
  iznosGlavnice: number | null;
}) {
  const [uplate, setUplate] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/uplate`);
      const data = await res.json();
      setUplate(Array.isArray(data) ? data : []);
    } catch {
      setError('Greška pri učitavanju uplata.');
    } finally {
      setLoading(false);
    }
  }, [predmetId]);

  useEffect(() => { load(); }, [load]);

  // Finansijski sažetak
  const ukupnoUplaceno = uplate
    .filter(u => u.tip_uplate === 'uplata')
    .reduce((s, u) => s + Number(u.iznos), 0);
  const ukupnoTroskovi = uplate
    .filter(u => u.tip_uplate === 'troskovi')
    .reduce((s, u) => s + Number(u.iznos), 0);
  const ukupnoKamata = uplate
    .filter(u => u.tip_uplate === 'kamata')
    .reduce((s, u) => s + Number(u.iznos), 0);
  const preostalo = iznosGlavnice != null ? Math.max(0, iznosGlavnice - ukupnoUplaceno) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.iznos || parseFloat(form.iznos) <= 0) {
      setError('Iznos mora biti veći od 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/uplate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Greška pri čuvanju.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch {
      setError('Greška pri čuvanju uplate.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovu uplatu?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/predmeti/${predmetId}/uplate?uplataId=${id}`, { method: 'DELETE' });
      await load();
    } catch {
      setError('Greška pri brisanju.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Finansije</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{uplate.length} unosa</span>
          <button
            onClick={() => { setShowForm(!showForm); setError(null); }}
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showForm ? 'Otkaži' : '+ Dodaj'}
          </button>
        </div>
      </div>

      {/* Sažetak */}
      {(iznosGlavnice != null || uplate.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1px', background: 'var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          {iznosGlavnice != null && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 3 }}>Glavnica</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatIznos(iznosGlavnice)}</p>
            </div>
          )}
          <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 3 }}>Naplaćeno</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>{formatIznos(ukupnoUplaceno)}</p>
          </div>
          {ukupnoTroskovi > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 3 }}>Troškovi</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatIznos(ukupnoTroskovi)}</p>
            </div>
          )}
          {ukupnoKamata > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 3 }}>Kamata</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-error)', fontVariantNumeric: 'tabular-nums' }}>{formatIznos(ukupnoKamata)}</p>
            </div>
          )}
          {preostalo != null && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 3 }}>Preostalo</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: preostalo === 0 ? 'var(--color-success)' : 'var(--color-warning)', fontVariantNumeric: 'tabular-nums' }}>
                {preostalo === 0 ? '✓ Izmireno' : formatIznos(preostalo)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Forma */}
      {showForm && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Tip *</label>
                <select
                  value={form.tip_uplate}
                  onChange={e => setForm(f => ({ ...f, tip_uplate: e.target.value as TipUplate }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {(Object.keys(TIP_LABELS) as TipUplate[]).map(t => (
                    <option key={t} value={t}>{TIP_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Datum *</label>
                <input
                  type="date"
                  value={form.datum_uplate}
                  onChange={e => setForm(f => ({ ...f, datum_uplate: e.target.value }))}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Iznos (RSD) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.iznos}
                  onChange={e => setForm(f => ({ ...f, iznos: e.target.value }))}
                  placeholder="npr. 15000"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Opis</label>
              <input
                value={form.opis}
                onChange={e => setForm(f => ({ ...f, opis: e.target.value }))}
                placeholder="Opcionalno — npr. rata po sporazumu"
                style={inputStyle}
              />
            </div>
            {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Čuvam...' : 'Sačuvaj'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
                style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                Otkaži
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista uplata */}
      {loading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Učitavam...</p>
        </div>
      ) : uplate.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Nema evidentiranih uplata.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              + Dodaj prvu uplatu
            </button>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '0.5rem' }}>
          {uplate.map((u) => {
            const tipCfg = TIP_COLORS[u.tip_uplate] ?? TIP_COLORS.uplata;
            return (
              <li
                key={u.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '2px' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: tipCfg.bg, color: tipCfg.color, whiteSpace: 'nowrap' }}>
                    {TIP_LABELS[u.tip_uplate]}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatIznos(Number(u.iznos))}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDatum(u.datum_uplate)}</span>
                      {u.opis && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>{u.opis}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  style={{ flexShrink: 0, padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: deletingId === u.id ? 'not-allowed' : 'pointer', opacity: deletingId === u.id ? 0.5 : 1 }}
                >
                  Briši
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
