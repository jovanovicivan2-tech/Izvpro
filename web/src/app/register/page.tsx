'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  required_fields: 'Sva obavezna polja moraju biti popunjena.',
  password_mismatch: 'Lozinke se ne poklapaju.',
  password_too_short: 'Lozinka mora imati najmanje 8 karaktera.',
  email_taken: 'Nalog sa ovim email-om već postoji.',
  auth_error: 'Greška pri kreiranju naloga. Pokušajte ponovo.',
  office_error: 'Greška pri kreiranju kancelarije. Kontaktirajte podršku.',
  korisnik_error: 'Greška pri kreiranju korisnika. Kontaktirajte podršku.',
  server_error: 'Serverska greška. Pokušajte ponovo.',
};

function RegisterForm() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">IZVPRO</h1>
          <p className="mt-2 text-gray-500 text-sm">Sistem za upravljanje izvršnim predmetima</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Registracija kancelarije</h2>
          <p className="text-sm text-gray-500 mb-6">
            Nakon registracije, nalog čeka aktivaciju od strane administratora (obično unutar 24h).
          </p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {ERROR_MESSAGES[error] ?? 'Došlo je do greške. Pokušajte ponovo.'}
            </div>
          )}

          <form action="/api/auth/register" method="POST" className="space-y-5">
            {/* Podaci o kancelariji */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
                Kancelarija
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="naziv_kancelarije" className="block text-sm font-medium text-gray-700 mb-1">
                    Naziv kancelarije <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="naziv_kancelarije"
                    name="naziv_kancelarije"
                    required
                    placeholder="npr. Javni izvršitelj Jovan Jović"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pib" className="block text-sm font-medium text-gray-700 mb-1">
                      PIB
                    </label>
                    <input
                      type="text"
                      id="pib"
                      name="pib"
                      placeholder="123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="text"
                      id="telefon"
                      name="telefon"
                      placeholder="011/123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="adresa" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresa
                  </label>
                  <input
                    type="text"
                    id="adresa"
                    name="adresa"
                    placeholder="Ulica i broj, grad"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Podaci o korisniku */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
                Nalog administratora
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="ime_prezime" className="block text-sm font-medium text-gray-700 mb-1">
                    Ime i prezime <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ime_prezime"
                    name="ime_prezime"
                    required
                    placeholder="Jovan Jović"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="jovic@kancelarija.rs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Lozinka <span className="text-red-500">*</span>
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
                    Potvrda lozinke <span className="text-red-500">*</span>
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
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Registruj kancelariju
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Već imate nalog?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Prijavite se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Učitavanje...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
