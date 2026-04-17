import Link from 'next/link';

export default function RegisterPendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">IZVPRO</h1>
        </div>

        <div className="bg-white py-10 px-8 shadow-sm rounded-xl border border-gray-200 text-center">
          {/* Ikonica */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zahtev primljen</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Vaša kancelarija je uspešno registrovana i čeka aktivaciju.
            Administrator će pregledati Vaš zahtev i aktivirati nalog u roku od <strong>24 sata</strong>.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sledeći koraci</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Administrator pregleda Vaš zahtev
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Dobijate email sa potvrdom aktivacije
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Prijavite se i počnite sa radom
              </li>
            </ul>
          </div>

          <Link
            href="/login"
            className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
          >
            Nazad na prijavu
          </Link>
        </div>
      </div>
    </div>
  );
}
