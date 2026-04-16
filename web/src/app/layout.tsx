import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IZVPRO',
  description: 'Softver za izvršiteljske kancelarije',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
