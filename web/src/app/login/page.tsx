'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'invalid_credentials'
      ? 'Pogrešan email ili lozinka.'
      : searchParams.get('error')
      ? 'Greška pri prijavi. Pokušajte ponovo.'
      : null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log('[TRACE][login] client signIn start email=' + email);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      console.log('[TRACE][login] client signIn error=' + signInError.message);
      setError('Pogrešan email ili lozinka.');
      setLoading(false);
      return;
    }

    console.log('[TRACE][login] client signIn ok — navigating to /dashboard');
    router.push('/dashboard');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(161,44,123,0.1)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
          Email adresa
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="ime@kancelarija.rs"
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
      </div>

      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
          Lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ background: 'var(--color-primary)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Prijava...' : 'Prijavi se'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: 'var(--color-primary)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M5 18h14" />
              <path d="M7 18V8l5-3 5 3v10" />
              <path d="M10 12h4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>IZVPRO</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Prijavite se na vaš nalog</p>
        </div>

        <Suspense fallback={
          <div
            className="rounded-2xl p-6 border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', minHeight: '280px' }}
          />
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
