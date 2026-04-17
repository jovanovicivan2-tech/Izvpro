'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ForgotPasswordForm() {
  const params = useSearchParams();
  const sent = params.get('sent');
  const error = params.get('error');
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Email poslat</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Ako nalog sa tim email-om postoji, dobićete link za reset lozinke u roku od nekoliko minuta.
          Proverite i spam folder.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline font-medium">
          Nazad na prijavu
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Zaboravili ste lozinku?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Unesite email adresu — poslaćemo Vam link za reset lozinke.
      </p>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Došlo je do greške. Pokušajte ponovo.
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const fd = new FormData(e.currentTarget);
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            body: fd,
          });
          if (res.redirected) {
            window.location.href = res.url;
          } else {
            window.location.href = '/forgot-password?sent=1';
          }
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email adresa
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="ime@kancelarija.rs"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Slanje...' : 'Pošalji link za reset'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Nazad na prijavu
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">IZVPRO</h1>
          <p className="mt-2 text-gray-500 text-sm">Sistem za upravljanje izvršnim predmetima</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <Suspense fallback={<div className="text-gray-400 text-sm">Učitavanje...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
