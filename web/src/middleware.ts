import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // [MWARE-PROOF][entry][v2][273e5e7] — if you see this, entry is live
  console.log(`[MWARE-PROOF][entry][v2][273e5e7] hit path: ${request.nextUrl.pathname}`);
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
