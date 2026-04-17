'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CaseParty, TipStranke } from '@/types/database';

const TIP_LABELS: Record<TipStranke, string> = {
  duznik:            'Dužnik',
  poverilac:         'Poverilac',
  zastupnik_duznika: 'Zastupnik dužnika',
  zastupnik_pov:     'Zastupnik pov.',
  trece_lice:        'Treće lice',
};

const TIP_COLORS: Record<TipStranke, { bg: string; color: string }> = {
  duznik:            { bg: 'var(--color-error-highlight)',   color: 'var(--color-error)' },
  poverilac:         { bg: 'var(--color-success-highlight)', color: 'var(--color-success)' },
  zastupnik_duznika: { bg: 'var(--color-warning-highlight)', color: 'var(--color-warning)' },
  zastupnik_pov:     { bg: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  trece_lice:        { bg: 'var(--color-surface-offset)',    color: 'var(--color-text-muted)' },
};

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
  tip_stranke: 'duznik' as TipStranke,
  ime_prezime: '',
  jmbg_pib: '',
  adresa: '',
  telefon: '',
  email: '',
  napomena: '',
};

export default function StrankeSection({ predmetId }: { predmetId: string }) {
  const [stranke, setStranke] = useState<CaseParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predmeti/${predmetId}/stranke`);
      const data = await res.json();
      setStranke(Array.isArray(data) ? data : []);
    } catch {
      setError('Greška pri učitavanju stranaka.');
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
      const res = await fetch(`/api/predmeti/${predmetId}/stranke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Greška pri čuvanju.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch {
      setError('Greška pri čuvanju stranke.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovu stranku?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/predmeti/${predmetId}/stranke?strankaId=${id}`, { method: 'DELETE' });
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
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Stranke</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{stranke.length} ukupno</span>
          <button
            onClick={() => { setShowForm(!showForm); setError(null); }}
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showForm ? 'Otkaži' : '+ Dodaj'}
          </button>
        </div>
      </div>

      {/* Forma za dodavanje */}
      {showForm && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Tip stranke *</label>
                <select
                  value={form.tip_stranke}
                  onChange={e => setForm(f => ({ ...f, tip_stranke: e.target.value as TipStranke }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  required
                >
                  {(Object.keys(TIP_LABELS) as TipStranke[]).map(t => (
                    <option key={t} value={t}>{TIP_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Ime i prezime / naziv *</label>
                <input
                  value={form.ime_prezime}
                  onChange={e => setForm(f => ({ ...f, ime_prezime: e.target.value }))}
                  placeholder="npr. Petar Petrović"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>JMBG / PIB</label>
                <input
                  value={form.jmbg_pib}
                  onChange={e => setForm(f => ({ ...f, jmbg_pib: e.target.value }))}
                  placeholder="npr. 0101990..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Telefon</label>
                <input
                  value={form.telefon}
                  onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
                  placeholder="npr. 063..."
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Adresa</label>
              <input
                value={form.adresa}
                onChange={e => setForm(f => ({ ...f, adresa: e.target.value }))}
                placeholder="npr. Ulica 1, Beograd"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>Email</label>
              <input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                type="email"
                placeholder="npr. ime@email.com"
                style={inputStyle}
              />
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
                {saving ? 'Čuvam...' : 'Sačuvaj stranku'}
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

      {/* Lista stranaka */}
      {loading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Učitavam...</p>
        </div>
      ) : stranke.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Nema evidentiranih stranaka.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              + Dodaj prvu stranku
            </button>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '0.5rem' }}>
          {stranke.map((s) => {
            const tipCfg = TIP_COLORS[s.tip_stranke] ?? TIP_COLORS.trece_lice;
            return (
              <li
                key={s.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '2px' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  {/* Tip badge */}
                  <span style={{ display: 'inline-block', flexShrink: 0, marginTop: 2, padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: tipCfg.bg, color: tipCfg.color, whiteSpace: 'nowrap' }}>
                    {TIP_LABELS[s.tip_stranke]}
                  </span>
                  {/* Podaci */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{s.ime_prezime}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem' }}>
                      {s.jmbg_pib && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>JMBG/PIB: {s.jmbg_pib}</span>}
                      {s.adresa && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{s.adresa}</span>}
                      {s.telefon && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>tel: {s.telefon}</span>}
                      {s.email && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{s.email}</span>}
                      {s.napomena && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>{s.napomena}</span>}
                    </div>
                  </div>
                </div>
                {/* Briši */}
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  style={{ flexShrink: 0, padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-faint)', background: 'transparent', cursor: deletingId === s.id ? 'not-allowed' : 'pointer', opacity: deletingId === s.id ? 0.5 : 1 }}
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
