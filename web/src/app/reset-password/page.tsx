'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: true,
    },
  }
);

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  // Supabase šalje token u URL fragment (#access_token=...)
  // Moramo ga pročitati i postaviti sesiju pre nego što dozvolimo reset
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.slice(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') ?? '';
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (!error) setTokenReady(true);
            else setError('Link je istekao ili nije validan. Zatražite novi reset.');
          });
      }
    } else {
      setError('Nevažeći link. Zatražite novi reset lozinke.');
    }
  }, []);

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Lozinka promenjena</h2>
        <p className="text-sm text-gray-500 mb-6">Možete se prijaviti sa novom lozinkom.</p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Prijavite se
        </button>
      </div>
    );
  }

  if (!tokenReady && !error) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">Proveravanje linka...</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Nova lozinka</h2>
      <p className="text-sm text-gray-500 mb-6">Unesite novu lozinku za Vaš nalog.</p>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <div className="mt-2">
            <a href="/forgot-password" className="text-blue-600 hover:underline font-medium">
              Zatražite novi reset link
            </a>
          </div>
        </div>
      )}

      {tokenReady && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            const fd = new FormData(e.currentTarget);
            const password = fd.get('password') as string;
            const password2 = fd.get('password2') as string;

            if (password !== password2) {
              setError('Lozinke se ne poklapaju.');
              setLoading(false);
              return;
            }

            if (password.length < 8) {
              setError('Lozinka mora imati najmanje 8 karaktera.');
              setLoading(false);
              return;
            }

            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
              setError('Greška pri promeni lozinke. Pokušajte ponovo.');
              setLoading(false);
              return;
            }

            setSuccess(true);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nova lozinka
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              placeholder="Najmanje 8 karaktera"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
              Potvrda lozinke
            </label>
            <input
              type="password"
              id="password2"
              name="password2"
              required
              placeholder="Ponovite lozinku"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj novu lozinku'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">IZVPRO</h1>
          <p className="mt-2 text-gray-500 text-sm">Sistem za upravljanje izvršnim predmetima</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <Suspense fallback={<div className="text-gray-400 text-sm">Učitavanje...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
