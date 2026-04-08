const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yCHAiRyqvEx9Jeof7EEP3w_r0pDFzew';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatNumber(value) {
  return new Intl.NumberFormat('sr-RS').format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('sr-RS').format(new Date(value));
}

function getDeadlineBadge(status) {
  const s = (status || '').toLowerCase();

  if (s.includes('overdue') || s.includes('kasni')) {
    return '<span class="status danger">Kasni</span>';
  }

  if (s.includes('today') || s.includes('danas')) {
    return '<span class="status danger">Danas</span>';
  }

  if (s.includes('soon') || s.includes('uskoro')) {
    return '<span class="status warning">Uskoro</span>';
  }

  if (s.includes('completed') || s.includes('done') || s.includes('zavrs')) {
    return '<span class="status success">Završen</span>';
  }

  return '<span class="status success">Aktivan</span>';
}

async function loadDashboard() {
  const { data: kpiData, error: kpiError } = await db
    .from('v_dashboard_kpis')
    .select('*')
    .limit(1)
    .single();

  const { data: casesData, error: casesError } = await db
    .from('v_cases_dashboard')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 3);

  const { data: deadlinesData, error: deadlinesError } = await db
    .from('v_deadlines_dashboard')
    .select('*')
    .order('due_date', { ascending: true })
    .range(0, 2);

  if (kpiError) {
    console.error('KPI GRESKA:', kpiError);
    return;
  }

  if (casesError) {
    console.error('CASES GRESKA:', casesError);
  }

  if (deadlinesError) {
    console.error('DEADLINES GRESKA:', deadlinesError);
  }

  const kpis = kpiData || {};
  const cases = casesData || [];
  const deadlines = deadlinesData || [];

  const metricEls = document.querySelectorAll('.metric');
  const metaEls = document.querySelectorAll('.meta');

  if (metricEls[0]) metricEls[0].textContent = formatNumber(kpis.total_cases);
  if (metaEls[0]) metaEls[0].textContent = `${formatNumber(kpis.active_cases)} aktivnih / ${formatNumber(kpis.closed_cases)} zatvorenih`;

  const openDeadlines = cases.reduce((sum, item) => sum + Number(item.deadlines_open || 0), 0);
  const overdueDeadlines = cases.reduce((sum, item) => sum + Number(item.deadlines_overdue || 0), 0);

  if (metricEls[1]) metricEls[1].textContent = formatNumber(openDeadlines);
  if (metaEls[1]) metaEls[1].textContent = `${formatNumber(overdueDeadlines)} rokova kasni`;

  if (metricEls[2]) metricEls[2].textContent = formatCurrency(kpis.total_claim_amount);
  if (metaEls[2]) metaEls[2].textContent = `Aktivna potraživanja: ${formatCurrency(kpis.active_claim_amount)}`;

  if (metricEls[3]) metricEls[3].textContent = formatNumber(kpis.urgent_cases);
  if (metaEls[3]) metaEls[3].textContent = `Visok prioritet: ${formatNumber(kpis.high_priority_cases)}`;

  const urgentList = document.querySelector('.grid-2 .card:nth-child(2) .list');
  if (urgentList) {
    urgentList.innerHTML = deadlines.map(item => `
      <div class="list-item">
        <div>
          <strong>${item.case_number || '-'}</strong>
          <small>${item.title || '-'} — ${formatDate(item.due_date)}</small>
        </div>
        ${getDeadlineBadge(item.dashboard_status)}
      </div>
    `).join('');
  }

  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.innerHTML = cases.map(item => `
      <tr>
        <td>${item.case_number || '-'}</td>
        <td>${item.last_status_note || item.title || '-'}</td>
        <td>Sistem</td>
        <td>${formatDate(item.last_status_changed_at || item.created_at)}</td>
        <td><span class="status success">${item.status || '-'}</span></td>
      </tr>
    `).join('');
  }

  const sidebarNumber = document.querySelector('.sidebar-card strong');
  const sidebarMeta = document.querySelector('.sidebar-card .meta');
  if (sidebarNumber) sidebarNumber.textContent = formatNumber(kpis.urgent_cases || 0);
  if (sidebarMeta) sidebarMeta.textContent = 'hitnih stavki za proveru';
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
