import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  console.log('[AUTH-DIAG][ProtectedLayout] entered — calling getUser()');

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log('[AUTH-DIAG][ProtectedLayout] getUser result:', {
    userId: user?.id ?? 'NULL',
    email: user?.email ?? 'NULL',
    error: userError?.message ?? null,
  });

  if (!user) {
    console.log('[AUTH-DIAG][ProtectedLayout] no user — redirecting to /login');
    redirect('/login');
  }

  console.log('[AUTH-DIAG][ProtectedLayout] user OK — rendering layout');

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 p-6">
        {children}
      </main>
    </div>
  );
}
