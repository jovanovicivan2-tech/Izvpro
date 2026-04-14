import { redirect } from 'next/navigation';

export default function HomePage() {
  // Root uvek redirektuje na dashboard ili login
  redirect('/login');
}
