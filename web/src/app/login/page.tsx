import { Suspense } from 'react';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const hasError = params.error === 'invalid_credentials';
  const hasMissingFields = params.error === 'missing_fields';

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

        <form
          method="POST"
          action="/api/auth/login"
          autoComplete="on"
          className="rounded-2xl p-6 border"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {(hasError || hasMissingFields) && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(161,44,123,0.1)', color: 'var(--color-error)' }}
            >
              {hasMissingFields ? 'Unesite email i lozinku.' : 'Pogrešan email ili lozinka.'}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--color-text)' }}
            >
              Email adresa
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="ime@kancelarija.rs"
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--color-text)' }}
            >
              Lozinka
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: 'var(--color-primary)',
              cursor: 'pointer',
            }}
          >
            Prijavi se
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}
