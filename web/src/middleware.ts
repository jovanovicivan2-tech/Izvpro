import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const TRACED_PATHS = ['/login', '/dashboard', '/predmeti', '/rokovi', '/ai-nacrti'];

function shouldTrace(pathname: string): boolean {
  return TRACED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const reqId = Math.random().toString(36).slice(2, 8);

  if (shouldTrace(pathname)) {
    console.log(`[TRACE][middleware] path=${pathname} reqId=${reqId}`);
  }

  return await updateSession(request, reqId);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
