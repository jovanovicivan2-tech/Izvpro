import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const SESSION_COOKIE = 'sb-bwpyivqdinemhfrrjdhu-auth-token';
  const hasCookie =
    !!cookieStore.get(SESSION_COOKIE)?.value ||
    !!cookieStore.get(`${SESSION_COOKIE}.0`)?.value;

  if (hasCookie) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
