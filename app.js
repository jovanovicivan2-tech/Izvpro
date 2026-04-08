const SUPABASE_URL = 'OVDE_STAVI_SVOJ_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'OVDE_STAVI_SVOJ_SUPABASE_ANON_KEY';

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
