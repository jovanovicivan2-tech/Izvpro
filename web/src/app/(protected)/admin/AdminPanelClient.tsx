'use client';

import { useState } from 'react';
import type { OfficeRow } from './page';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Na čekanju', color: '#92400e', bg: '#fef3c7' },
  active: { label: 'Aktivan', color: '#065f46', bg: '#d1fae5' },
  suspended: { label: 'Suspendovan', color: '#991b1b', bg: '#fee2e2' },
};

export default function AdminPanelClient({
  offices: initialOffices,
  accessToken,
}: {
  offices: OfficeRow[];
  accessToken: string;
}) {
  const [offices, setOffices] = useState<OfficeRow[]>(initialOffices);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  const changeStatus = async (officeId: string, newStatus: 'active' | 'suspended' | 'pending') => {
    setLoading(officeId);
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOffices((prev) =>
          prev.map((o) => (o.id === officeId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert('Greška pri promeni statusa.');
      }
    } catch {
      alert('Greška pri promeni statusa.');
    } finally {
      setLoading(null);
    }
  };

  const filtered = filter === 'all' ? offices : offices.filter((o) => o.status === filter);

  const counts = {
    all: offices.length,
    pending: offices.filter((o) => o.status === 'pending').length,
    active: offices.filter((o) => o.status === 'active').length,
    suspended: offices.filter((o) => o.status === 'suspended').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super-admin panel</h1>
        <p className="text-sm text-gray-500 mt-1">Upravljanje kancelarijama i aktivacijama</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['all', 'pending', 'active', 'suspended'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-4 rounded-xl border text-left transition-all ${
              filter === s
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{counts[s]}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {s === 'all' ? 'Sve kancelarije' : STATUS_LABELS[s].label}
            </div>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nema kancelarija u ovom filteru.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kancelarija</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Korisnici</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Predmeti</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((office) => {
                const st = STATUS_LABELS[office.status];
                const isLoading = loading === office.id;
                return (
                  <tr key={office.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">{office.naziv}</div>
                      {office.adresa && (
                        <div className="text-xs text-gray-400 mt-0.5">{office.adresa}</div>
                      )}
                      {office.pib && (
                        <div className="text-xs text-gray-400">PIB: {office.pib}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{office.admin_email ?? '—'}</div>
                      {office.telefon && (
                        <div className="text-xs text-gray-400">{office.telefon}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{office.korisnici_count}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{office.predmeti_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: st.color, backgroundColor: st.bg }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(office.created_at).toLocaleDateString('sr-RS')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {office.status === 'pending' && (
                          <button
                            onClick={() => changeStatus(office.id, 'active')}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : 'Aktiviraj'}
                          </button>
                        )}
                        {office.status === 'active' && (
                          <button
                            onClick={() => changeStatus(office.id, 'suspended')}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : 'Suspenduj'}
                          </button>
                        )}
                        {office.status === 'suspended' && (
                          <>
                            <button
                              onClick={() => changeStatus(office.id, 'active')}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isLoading ? '...' : 'Aktiviraj'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
