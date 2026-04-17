import { requireTenantContext } from '@/lib/auth/require-tenant-context';
import { redirect } from 'next/navigation';
import AdminPanelClient from './AdminPanelClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface OfficeRow {
  id: string;
  naziv: string;
  email: string | null;
  telefon: string | null;
  adresa: string | null;
  pib: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  korisnici_count: number;
  predmeti_count: number;
  admin_email: string | null;
}

export default async function AdminPage() {
  const ctx = await requireTenantContext();

  // Proveriti da li je super admin
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/korisnici?select=is_super_admin&id=eq.${ctx.userId}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        apikey: ANON_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );
  const checkRows = checkRes.ok ? await checkRes.json() : [];
  if (!checkRows?.[0]?.is_super_admin) {
    redirect('/dashboard');
  }

  // Dohvatiti sve kancelarije sa brojevima
  const officesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/offices?select=id,naziv,email,telefon,adresa,pib,status,created_at&order=created_at.desc`,
    {
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        apikey: ANON_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );
  const officesRaw = officesRes.ok ? await officesRes.json() : [];

  // Za svaku kancelariju dohvatiti count korisnika, predmeta i email admina
  const offices: OfficeRow[] = await Promise.all(
    officesRaw.map(async (o: { id: string; naziv: string; email: string | null; telefon: string | null; adresa: string | null; pib: string | null; status: 'pending' | 'active' | 'suspended'; created_at: string }) => {
      const [kRes, pRes, adminRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/korisnici?select=id&office_id=eq.${o.id}`, {
          headers: { Authorization: `Bearer ${ctx.accessToken}`, apikey: ANON_KEY, 'Prefer': 'count=exact', Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch(`${SUPABASE_URL}/rest/v1/predmeti?select=id&office_id=eq.${o.id}`, {
          headers: { Authorization: `Bearer ${ctx.accessToken}`, apikey: ANON_KEY, 'Prefer': 'count=exact', Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch(`${SUPABASE_URL}/rest/v1/korisnici?select=email&office_id=eq.${o.id}&role=eq.admin&limit=1`, {
          headers: { Authorization: `Bearer ${ctx.accessToken}`, apikey: ANON_KEY, Accept: 'application/json' },
          cache: 'no-store',
        }),
      ]);

      const kCount = parseInt(kRes.headers.get('content-range')?.split('/')[1] ?? '0');
      const pCount = parseInt(pRes.headers.get('content-range')?.split('/')[1] ?? '0');
      const adminRows = adminRes.ok ? await adminRes.json() : [];

      return {
        ...o,
        korisnici_count: kCount,
        predmeti_count: pCount,
        admin_email: adminRows?.[0]?.email ?? null,
      };
    })
  );

  return <AdminPanelClient offices={offices} accessToken={ctx.accessToken} />;
}
