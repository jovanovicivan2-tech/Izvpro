'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

interface UvozResult {
  uvezeno: number;
  duplikati: number;
  greske: number;
  detalji_gresaka: string[];
}

export default function UvozPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UvozResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Podržani formati: .xlsx, .xls, .csv');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/predmeti/uvoz', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Greška pri uvozu.');
      } else {
        setResult(data);
        setFile(null);
      }
    } catch {
      setError('Serverska greška. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Kreirati CSV template za preuzimanje
    const header = 'Broj predmeta,Godina,Poverilac,Duznik,Adresa duznika,Iznos glavnice,Vrsta predmeta,Status,Napomena';
    const example = 'I-123/2025,2025,Banka Srbije d.o.o.,Petar Petrović,Bulevar 1 Beograd,150000,Novčano potraživanje,aktivan,';
    const blob = new Blob(['\uFEFF' + header + '\n' + example], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'izvpro_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Link href="/predmeti" className="hover:text-gray-600">Predmeti</Link>
          <span>/</span>
          <span className="text-gray-600">Uvoz</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Uvoz predmeta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Uvezite predmete iz Excel ili CSV fajla (npr. iz Cronus / Stanković Soft).
        </p>
      </div>

      {/* Template download */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Pre uvoza</p>
          <p className="text-xs text-blue-700 mt-0.5 mb-2">
            Fajl mora imati koloneu: <strong>Broj predmeta, Poverilac, Duznik</strong> (obavezno).
            Ostale kolone su opcione. Duplikati se automatski preskačau.
          </p>
          <button
            onClick={downloadTemplate}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 underline"
          >
            Preuzmi template (CSV)
          </button>
        </div>
      </div>

      {/* Drop zona */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 text-sm">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="mt-2 text-xs text-red-500 hover:text-red-700"
            >
              Ukloni
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Prevucite fajl ovde</p>
            <p className="text-xs text-gray-400 mt-1">ili kliknite da izaberete</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Dugme */}
      {file && (
        <button
          onClick={onUpload}
          disabled={loading}
          className="mt-4 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Uvoz u toku...' : 'Pokreni uvoz'}
        </button>
      )}

      {/* Rezultat */}
      {result && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Rezultat uvoza</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{result.uvezeno}</div>
              <div className="text-xs text-green-600 mt-0.5">Uvezeno</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{result.duplikati}</div>
              <div className="text-xs text-yellow-600 mt-0.5">Preskočeno (duplikati)</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{result.greske}</div>
              <div className="text-xs text-red-600 mt-0.5">Greške</div>
            </div>
          </div>

          {result.detalji_gresaka.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Detalji grešaka:</p>
              <ul className="space-y-1">
                {result.detalji_gresaka.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/predmeti"
            className="mt-4 inline-block w-full text-center py-2 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Pogledaj predmete
          </Link>
        </div>
      )}
    </div>
  );
}
