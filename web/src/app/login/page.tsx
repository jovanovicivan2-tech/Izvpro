'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessage =
    error === 'invalid_credentials'
      ? 'Pogrešan email ili lozinka.'
      : error
      ? 'Greška pri prijavi. Pokušajte ponovo.'
      : null;

  return (
    <form
      action={loginAction}
      className="rounded-2xl p-6 border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {errorMessage && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(161,44,123,0.1)', color: 'var(--color-error)' }}
        >
          {errorMessage}
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
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ background: 'var(--color-primary)', cursor: 'pointer' }}
      >
        Prijavi se
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
