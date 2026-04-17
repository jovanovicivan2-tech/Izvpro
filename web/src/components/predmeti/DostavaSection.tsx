'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Delivery, TipPismena, StatusDostave } from '@/types/database';

const TIP_LABELS: Record<TipPismena, string> = {
  resenje:     'Rešenje',
  zakljucak:   'Zaključak',
  dopis:       'Dopis',
  obavestenje: 'Obaveštenje',
  nalog:       'Nalog',
  ostalo:      'Ostalo',
};

const STATUS_LABELS: Record<StatusDostave, string> = {
  poslato:  'Poslato',
  primljeno: 'Primljeno',
  vraceno:  'Vraćeno',
  odbijeno: 'Odbijeno',
};

const STATUS_COLORS: Record<StatusDostave, { bg: string; color: string }> = {
  poslato:  { bg: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  primljeno: { bg: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  vraceno:  { bg: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  odbijeno: { bg: 'var(--color-error-highlight)',   color: 'var(--color-error)' },
};

function formatDatum(d: string | null) {
  if (!d) return '—';
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
  tip_pismena: 'resenje' as TipPismena,
  primalac: '',
  adresa_dostave: '',
  datum_slanja: new Date().toISOString().split('T')[0],
  napomena: '',
};

export default function DostavaSection({ predmetId }: { predmetId: string }) {
  const [dostave, setDostave] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/dostava`);
      const data = await res.json();
      setDostave(Array.isArray(data) ? data : []);
    } catch {
      setError('Greška pri učitavanju dostava.');
    } finally {
      setLoading(false);
    }
  }, [predmetId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/dostava`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch {
      setError('Greška pri čuvanju.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(d: Delivery, newStatus: StatusDostave) {
    setUpdatingId(d.id);
    try {
      const patch: Partial<Delivery> = { status: newStatus };
      if (newStatus === 'primljeno' && !d.datum_prijema) {
        patch.datum_prijema = new Date().toISOString().split('T')[0];
      }
      await fetch(`/api/predmeti/${predmetId}/dostava?dostavaId=${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await load();
    } catch {
      setError('Greška pri ažuriranju statusa.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovu dostavu?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/predmeti/${predmetId}/dostava?dostavaId=${id}`, { method: 'DELETE' });
      await load();
    } catch {
      setError('Greška pri brisanju.');
    } finally {
      setDeletingId(null);
    }
  }

  // Statistike
  const ukupno = dostave.length;
  const primljeno = dostave.filter(d => d.status === 'primljeno').length;
  const ceka = dostave.filter(d => d.status === 'poslato').length;
  const problem = dostave.filter(d => d.status === 'vraceno' || d.status === 'odbijeno').length;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Dostava pismena</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{ukupno} pismena</span>
          <button
            onClick={() => { setShowForm(!showForm); setError(null); }}
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showForm ? 'Otkaži' : '+ Dodaj'}
          </button>
        </div>
      </div>

      {/* Mini statistika */}
      {ukupno > 0 && (
        <div style={{ display: 'flex', gap: '1px', background: 'var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          {[
            { label: 'Primljeno', value: primljeno, color: 'var(--color-success)' },
            { label: 'Čeka', value: ceka, color: 'var(--color-primary)' },
            { label: 'Problem', value: problem, color: problem > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '0.6rem 1rem', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forma */}
      {showForm && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Tip pismena *</label>
                <select
                  value={form.tip_pismena}
                  onChange={e => setForm(f => ({ ...f, tip_pismena: e.target.value as TipPismena }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {(Object.keys(TIP_LABELS) as TipPismena[]).map(t => (
                    <option key={t} value={t}>{TIP_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Primalac *</label>
                <input
                  value={form.primalac}
                  onChange={e => setForm(f => ({ ...f, primalac: e.target.value }))}
                  placeholder="Ime i prezime / naziv"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Adresa dostave</label>
                <input
                  value={form.adresa_dostave}
                  onChange={e => setForm(f => ({ ...f, adresa_dostave: e.target.value }))}
                  placeholder="npr. Ulica 1, Beograd"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Datum slanja *</label>
                <input
                  type="date"
                  value={form.datum_slanja}
                  onChange={e => setForm(f => ({ ...f, datum_slanja: e.target.value }))}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Napomena</label>
              <input
                value={form.napomena}
                onChange={e => setForm(f => ({ ...f, napomena: e.target.value }))}
                placeholder="Opcionalno..."
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

      {/* Lista dostava */}
      {loading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Učitavam...</p>
        </div>
      ) : dostave.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Nema evidentiranih dostava.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              + Dodaj prvu dostavu
            </button>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '0.5rem' }}>
          {dostave.map((d) => {
            const sc = STATUS_COLORS[d.status] ?? STATUS_COLORS.poslato;
            const isProblem = d.status === 'vraceno' || d.status === 'odbijeno';
            return (
              <li
                key={d.id}
                style={{
                  padding: '0.75rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '2px',
                  borderLeft: isProblem ? '3px solid var(--color-error)' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Vrsta + status */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {TIP_LABELS[d.tip_pismena]}
                      </span>
                      <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </div>
                    {/* Primalac + adresa */}
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                      {d.primalac}{d.adresa_dostave ? ` · ${d.adresa_dostave}` : ''}
                    </p>
                    {/* Datumi */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                        Poslato: {formatDatum(d.datum_slanja)}
                      </span>
                      {d.datum_prijema && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                          Primljeno: {formatDatum(d.datum_prijema)}
                        </span>
                      )}
                    </div>
                    {d.napomena && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic', marginTop: 2 }}>{d.napomena}</p>
                    )}
                  </div>

                  {/* Akcije */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                    {d.status === 'poslato' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(d, 'primljeno')}
                          disabled={updatingId === d.id}
                          style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 600, border: '1px solid var(--color-success)', color: 'var(--color-success)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          ✓ Primljeno
                        </button>
                        <button
                          onClick={() => handleStatusChange(d, 'vraceno')}
                          disabled={updatingId === d.id}
                          style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 600, border: '1px solid var(--color-warning)', color: 'var(--color-warning)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Vraćeno
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
