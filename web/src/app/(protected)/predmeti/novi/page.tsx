import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NoviPredmetPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mb-6">
        <Link
          href="/predmeti"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginBottom: '0.75rem',
          }}
        >
          ← Nazad na predmete
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Novi predmet</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Unesite podatke o novom predmetu</p>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <form action={kreirajPredmet}>
          <div style={{ display: 'grid', gap: '1.25rem' }}>

            {/* Broj predmeta + godina */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
              <div>
                <label
                  htmlFor="broj_predmeta"
                  style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
                >
                  Broj predmeta *
                </label>
                <input
                  id="broj_predmeta"
                  name="broj_predmeta"
                  type="text"
                  required
                  placeholder="npr. 123"
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 100 }}>
                <label
                  htmlFor="godina"
                  style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
                >
                  Godina
                </label>
                <input
                  id="godina"
                  name="godina"
                  type="number"
                  defaultValue={new Date().getFullYear()}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Poverilac */}
            <div>
              <label
                htmlFor="poverilac"
                style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
              >
                Poverilac *
              </label>
              <input
                id="poverilac"
                name="poverilac"
                type="text"
                required
                placeholder="Naziv poverioca"
                style={inputStyle}
              />
            </div>

            {/* Dužnik */}
            <div>
              <label
                htmlFor="duznik"
                style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
              >
                Dužnik *
              </label>
              <input
                id="duznik"
                name="duznik"
                type="text"
                required
                placeholder="Ime i prezime / naziv dužnika"
                style={inputStyle}
              />
            </div>

            {/* Adresa dužnika */}
            <div>
              <label
                htmlFor="duznik_adresa"
                style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
              >
                Adresa dužnika
              </label>
              <input
                id="duznik_adresa"
                name="duznik_adresa"
                type="text"
                placeholder="Ulica i broj, mesto"
                style={inputStyle}
              />
            </div>

            {/* Iznos glavnice + vrsta predmeta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  htmlFor="iznos_glavnice"
                  style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
                >
                  Iznos glavnice (RSD)
                </label>
                <input
                  id="iznos_glavnice"
                  name="iznos_glavnice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="vrsta_predmeta"
                  style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
                >
                  Vrsta predmeta
                </label>
                <input
                  id="vrsta_predmeta"
                  name="vrsta_predmeta"
                  type="text"
                  placeholder="npr. komunalije, kredit..."
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Rok sledeće radnje */}
            <div>
              <label
                htmlFor="rok_sledece_radnje"
                style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
              >
                Rok sledeće radnje
              </label>
              <input
                id="rok_sledece_radnje"
                name="rok_sledece_radnje"
                type="date"
                style={inputStyle}
              />
            </div>

            {/* Napomena */}
            <div>
              <label
                htmlFor="napomena"
                style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
              >
                Napomena
              </label>
              <textarea
                id="napomena"
                name="napomena"
                rows={3}
                placeholder="Opcionalna napomena..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Dugmad */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <Link
                href="/predmeti"
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  background: 'var(--color-surface)',
                }}
              >
                Otkaži
              </Link>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sačuvaj predmet
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
};

async function kreirajPredmet(formData: FormData) {
  'use server';

  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const broj_predmeta = (formData.get('broj_predmeta') as string).trim();
  const godina = parseInt(formData.get('godina') as string) || new Date().getFullYear();
  const poverilac = (formData.get('poverilac') as string).trim();
  const duznik = (formData.get('duznik') as string).trim();
  const duznik_adresa = (formData.get('duznik_adresa') as string)?.trim() || null;
  const iznos_raw = formData.get('iznos_glavnice') as string;
  const iznos_glavnice = iznos_raw ? parseFloat(iznos_raw) : null;
  const vrsta_predmeta = (formData.get('vrsta_predmeta') as string)?.trim() || null;
  const rok_raw = formData.get('rok_sledece_radnje') as string;
  const rok_sledece_radnje = rok_raw || null;
  const napomena = (formData.get('napomena') as string)?.trim() || null;

  const { error } = await supabase.from('predmeti').insert({
    office_id: officeId,
    broj_predmeta,
    godina,
    poverilac,
    duznik,
    duznik_adresa,
    iznos_glavnice,
    vrsta_predmeta,
    rok_sledece_radnje,
    napomena,
    status: 'aktivan',
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/predmeti');
}
