import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const TIP_AKTA_LABELS: Record<string, string> = {
  dopis: 'Dopis', zakljucak: 'Zaključak', resenje: 'Rešenje', obavestenje: 'Obaveštenje',
};

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function NacrtDetailPage({ params, searchParams }: PageProps) {
  console.log('[TRACE][page] render path=/ai-nacrti/[id]');

  const { id } = await params;
  const { error, success } = await searchParams;
  const { officeId } = await requireTenantContext();
  const supabase = await createClient();

  const { data: nacrt, error: fetchError } = await supabase
    .from('nacrti')
    .select('*, predmeti(id, broj_predmeta, godina, duznik), sabloni(naziv)')
    .eq('id', id)
    .eq('office_id', officeId)
    .single();

  if (fetchError || !nacrt) notFound();

  const predmet = nacrt.predmeti as { id: string; broj_predmeta: string; godina: number; duznik: string } | null;
  const sablon = nacrt.sabloni as { naziv: string } | null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <Link href="/ai-nacrti" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
            ← Nazad na nacrte
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {TIP_AKTA_LABELS[nacrt.tip_akta] ?? nacrt.tip_akta}
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {predmet && (
              <Link href={`/predmeti/${predmet.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                {predmet.broj_predmeta}/{predmet.godina}
              </Link>
            )}
            {predmet && ` · ${predmet.duznik}`}
            {sablon && ` · ${sablon.naziv}`}
            {' · '}{formatDatum(nacrt.created_at)}
          </p>
        </div>

        <form method="POST" action={`/api/nacrti/${id}`}>
          <input type="hidden" name="_action" value="delete" />
          <button type="submit" style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent', cursor: 'pointer' }}>
            Obriši
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-error-highlight)', borderColor: 'var(--color-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error === 'empty' ? 'Tekst ne može biti prazan.' : `Greška: ${decodeURIComponent(error)}`}
          </p>
        </div>
      )}
      {success === 'saved' && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--color-success-highlight)', borderColor: 'var(--color-success)' }}>
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>Nacrt je sačuvan.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Editor — 2/3 */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Tekst nacrta</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Editujte direktno u polju ispod</p>
            </div>
            <div className="p-5">
              <form method="POST" action={`/api/nacrti/${id}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="_action" value="save_text" />
                <textarea
                  name="edited_text"
                  defaultValue={nacrt.edited_text ?? nacrt.generated_text}
                  rows={28}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    fontFamily: 'Georgia, serif',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Sačuvaj izmene
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Info panel — 1/3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Originalni generirani tekst */}
          {nacrt.edited_text !== nacrt.generated_text && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Originalni AI tekst</p>
              </div>
              <div className="p-4">
                <pre style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', lineHeight: 1.6, maxHeight: 300, overflow: 'auto' }}>
                  {nacrt.generated_text}
                </pre>
              </div>
            </div>
          )}

          {/* Podaci o predmetu */}
          {predmet && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Predmet</p>
              </div>
              <div className="p-4">
                <Link href={`/predmeti/${predmet.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
                  {predmet.broj_predmeta}/{predmet.godina}
                </Link>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>{predmet.duznik}</p>
              </div>
            </div>
          )}

          {/* Akcije */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Akcije</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href={`/ai-nacrti?tab=novi&predmet_id=${predmet?.id ?? ''}`}
                style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'transparent', textDecoration: 'none', textAlign: 'center' as const }}
              >
                Generiši novi nacrt
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
