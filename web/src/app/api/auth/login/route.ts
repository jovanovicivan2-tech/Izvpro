import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('[TRACE][login] start email=' + email);

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  const cookiesToWrite: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToWrite.push({ name, value, options: options ?? {} });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log('[TRACE][login] signIn hasSession=' + !!data?.session + ' error=' + (error?.message ?? 'none'));
  console.log('[TRACE][login] cookiesToWrite=[' + cookiesToWrite.map(c => c.name).join(',') + ']');

  if (error || !data.session) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
  }

  // Vraćamo HTML koji:
  // 1. Postavlja cookies putem Set-Cookie headera
  // 2. Tek NAKON toga radi JS redirect na /dashboard
  // Ovo garantuje da browser ima cookies pre nego što pošalje GET /dashboard
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prijava...</title>
</head>
<body>
  <script>
    window.location.replace('/dashboard');
  <\/script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  console.log('[TRACE][login] serving html redirect cookies_set=' + cookiesToWrite.length);
  return response;
}
