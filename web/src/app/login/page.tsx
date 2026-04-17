'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    invalid_credentials: 'Pogrešan email ili lozinka.',
    office_pending: 'Vaš nalog čeka aktivaciju od strane administratora.',
    office_suspended: 'Nalog Vaše kancelarije je deaktiviran. Kontaktirajte podršku.',
    office_inactive: 'Nalog nije aktivan. Kontaktirajte podršku.',
    server_error: 'Serverska greška. Pokušajte ponovo.',
  };
  const errorMessage = error ? (errorMessages[error] ?? 'Greška pri prijavi. Pokušajte ponovo.') : null;

  return (
    <form
      method="POST"
      action="/api/auth/login"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {errorMessage && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            background: 'var(--color-error-highlight)',
            color: 'var(--color-error)',
            border: '1px solid rgba(155,32,96,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="email"
          style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
        >
          Email adresa
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="ime@kancelarija.rs"
          style={{
            width: '100%',
            padding: '0.6rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="password"
          style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}
        >
          Lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          style={{
            width: '100%',
            padding: '0.6rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
        />
      </div>

      <button
        type="submit"
        style={{
          width: '100%',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: '#fff',
          background: 'var(--color-primary)',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.01em',
          boxShadow: '0 1px 4px rgba(1,105,111,0.25)',
        }}
      >
        Prijavi se
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary)',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(1,105,111,0.3)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              marginBottom: '0.4rem',
            }}
          >
            IZVPRO
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Upravljanje izvršnim predmetima
          </p>
        </div>

        <Suspense fallback={
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              minHeight: 280,
              boxShadow: 'var(--shadow-lg)',
            }}
          />
        }>
          <LoginForm />
        </Suspense>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
          Nemate nalog?{' '}
          <a href="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Registrujte kancelariju</a>
        </p>
      </div>
    </div>
  );
}
