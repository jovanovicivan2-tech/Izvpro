
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Pogrešan email ili lozinka.');
      setLoading(false);
      return;
    }

    // Hard redirect — zaobilazi Next.js router
    window.location.href = '/predmeti';
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
              type="email"
              required
              autoComplete="username"
              placeholder="ime@kancelarija.rs"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  );
}
