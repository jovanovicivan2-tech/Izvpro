'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { prioritet: string; aktivan: number; zavrsen: number }[];
}

export default function RokoPrioriteti({ data }: Props) {
  const total = data.reduce((s, d) => s + d.aktivan + d.zavrsen, 0);

  if (total === 0) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Nema rokova</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="prioritet"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--color-text)',
            boxShadow: 'var(--shadow-md)',
          }}
          cursor={{ fill: 'var(--color-surface-offset)' }}
        />
        <Bar dataKey="aktivan" name="Aktivan" fill="var(--color-warning)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="zavrsen" name="Završen" fill="var(--color-primary-highlight)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
