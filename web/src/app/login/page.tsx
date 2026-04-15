'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError('Pogrešan email ili lozinka.');
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

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
          onSubmit={handleLogin}
          className="rounded-2xl p-6 border"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
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
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
              Email adresa
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
              Lozinka
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: loading ? 'var(--color-text-faint)' : 'var(--color-primary)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  );
}
