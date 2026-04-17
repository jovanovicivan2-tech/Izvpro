import Sidebar from '@/components/layout/Sidebar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '1.75rem 2rem',
          maxWidth: '100%',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
