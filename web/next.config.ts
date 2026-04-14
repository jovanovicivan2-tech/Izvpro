import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supabase slike ako bude potrebno
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
