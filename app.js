const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yCHAiRyqvEx9Jeof7EEP3w_r0pDFzew';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await db
    .from('v_dashboard_kpis')
    .select('*')
    .limit(1);

  if (error) {
    console.error('GRESKA:', error);
    return;
  }

  console.log('USPESNO POVEZANO:', data);
});
