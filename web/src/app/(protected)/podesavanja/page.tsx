import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import type { Korisnik, Office } from '@/types/database';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  boxSizing: 'border-box',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator', operater: 'Operater', pregled: 'Pregled',
};
const ROLE_COLORS: Record<string, { background: string; color: string }> = {
  admin:    { background: 'var(--color-error-highlight)',   color: 'var(--color-error)' },
  operater: { background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' },
  pregled:  { background: 'var(--color-surface-offset)',    color: 'var(--color-text-muted)' },
};

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string; email?: string; pwd?: string }>;
}

export default async function PodesavanjaPage({ searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/podesavanja');

  const { error, success, email: invEmail, pwd: invPwd } = await searchParams;
  const { officeId, userId } = await requireTenantContext();
  const supabase = await createClient();

  const [{ data: office }, { data: korisnici }, { data: currentUser }] = await Promise.all([
    supabase.from('offices').select('*').eq('id', officeId).single(),
    supabase.from('korisnici').select('*').eq('office_id', officeId).order('created_at', { ascending: true }),
    supabase.from('korisnici').select('role').eq('id', userId).single(),
  ]);

  const isAdmin = currentUser?.role === 'admin';
  const o = office as Office | null;
  const errorMsg =
    error === 'validation' ? 'Popunite sva obavezna polja.' :
    error === 'unauthorized' ? 'Nemate ovlašćenje za ovu akciju.' :
    error === 'cannot_deactivate_self' ? 'Ne možete deaktivirati sopstveni nalog.' :
    error === 'invalid_role' ? 'Neispravna uloga.' :
    error ? `Greška: ${decodeURIComponent(error)}` : null;

  const successMsg =
    success === 'office' ? 'Podaci kancelarije su sačuvani.' :
    success === 'role' ? 'Uloga korisnika je promenjena.' :
    success === 'deactivated' ? 'Korisnik je deaktiviran.' :
    success === 'activated' ? 'Korisnik je aktiviran.' :
    success === 'korisnik' ? null : null;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Podešavanja</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Kancelarija i korisnici</p>
      </div>

      {/* Poruke */}
      {errorMsg && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-success-highlight)', borderColor: 'var(--color-success)' }}>
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>{successMsg}</p>
        </div>
      )}

      {/* Novi korisnik kreiran — prikaži kredencijale */}
      {success === 'korisnik' && invEmail && invPwd && (
        <div className="rounded-xl border p-5 mb-5" style={{ background: 'var(--color-warning-highlight)', borderColor: 'var(--color-warning)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-warning)' }}>Korisnik kreiran — sačuvajte kredencijale</p>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>Email: <strong>{decodeURIComponent(invEmail)}</strong></p>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>Privremena lozinka: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{decodeURIComponent(invPwd)}</strong></p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Prosledite ove podatke korisniku. Neka promeni lozinku pri prvoj prijavi.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Podaci o kancelariji */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Podaci o kancelariji</p>
          </div>
          <div className="p-5">
            {isAdmin ? (
              <form method="POST" action="/api/office" style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Naziv kancelarije *</label>
                    <input name="naziv" type="text" required defaultValue={o?.naziv ?? ''} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Email</label>
                    <input name="email" type="email" defaultValue={o?.email ?? ''} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Adresa</label>
                    <input name="adresa" type="text" defaultValue={o?.adresa ?? ''} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Telefon</label>
                    <input name="telefon" type="text" defaultValue={o?.telefon ?? ''} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Sačuvaj
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem 1rem' }}>
                {[['Naziv', o?.naziv], ['Email', o?.email], ['Adresa', o?.adresa], ['Telefon', o?.telefon]].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{value || '—'}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Korisnici */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Korisnici</p>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{korisnici?.length ?? 0} ukupno</span>
          </div>
          <div>
            {(korisnici as Korisnik[] ?? []).map((k, idx) => {
              const rc = ROLE_COLORS[k.role] ?? ROLE_COLORS['pregled'];
              const isSelf = k.id === userId;
              return (
                <div
                  key={k.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: idx < (korisnici?.length ?? 0) - 1 ? '1px solid var(--color-border)' : 'none',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    opacity: k.aktivan ? 1 : 0.5,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                        {k.ime_prezime}
                        {isSelf && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>(vi)</span>}
                      </span>
                      <span style={{ padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, ...rc }}>
                        {ROLE_LABELS[k.role] ?? k.role}
                      </span>
                      {!k.aktivan && (
                        <span style={{ padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, background: 'var(--color-surface-offset)', color: 'var(--color-text-faint)' }}>
                          Neaktivan
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{k.email}</p>
                  </div>

                  {isAdmin && !isSelf && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      {/* Promena role */}
                      <form method="POST" action={`/api/korisnici/${k.id}`} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input type="hidden" name="_action" value="set_role" />
                        <select
                          name="role"
                          defaultValue={k.role}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                        >
                          <option value="admin">Admin</option>
                          <option value="operater">Operater</option>
                          <option value="pregled">Pregled</option>
                        </select>
                        <button type="submit" style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>
                          Sačuvaj
                        </button>
                      </form>

                      {/* Aktivacija/deaktivacija */}
                      <form method="POST" action={`/api/korisnici/${k.id}`}>
                        <input type="hidden" name="_action" value={k.aktivan ? 'deactivate' : 'activate'} />
                        <button
                          type="submit"
                          style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            border: `1px solid ${k.aktivan ? 'var(--color-error)' : 'var(--color-success)'}`,
                            color: k.aktivan ? 'var(--color-error)' : 'var(--color-success)',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {k.aktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pozovi novog korisnika — samo admin */}
        {isAdmin && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Pozovi korisnika</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Kreira nalog i generiše privremenu lozinku</p>
            </div>
            <div className="p-5">
              <form method="POST" action="/api/korisnici" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Ime i prezime *</label>
                  <input name="ime_prezime" type="text" required placeholder="Marko Petrović" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Email adresa *</label>
                  <input name="email" type="email" required placeholder="marko@kancelarija.rs" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Uloga</label>
                  <select name="role" defaultValue="operater" style={{ ...inputStyle, cursor: 'pointer', width: 'auto' }}>
                    <option value="admin">Administrator</option>
                    <option value="operater">Operater</option>
                    <option value="pregled">Pregled</option>
                  </select>
                </div>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Pozovi
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// React je potreban za Fragment
import React from 'react';
