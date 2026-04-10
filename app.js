// IZVPRO – dashboard + demo case detail

const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yCHAiRyqvEx9Jeof7EEP3w_r0pDFzew';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_TENANT_ID = '8add9c1b-d00b-42b7-9035-e0f7e1df2cd4';
const DEMO_CASE_ID   = '35a1038f-dd21-4b2a-b32e-d819f31e4211';

// ------- FORMAT HELPERI -------

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
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
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

// ------- DASHBOARD LOADER -------

async function loadDashboard() {
  try {
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

    const { count: documentsCount, error: documentsError } = await db
      .from('v_documents_overview')
      .select('*', { count: 'exact', head: true });

    if (kpiError) throw kpiError;
    if (casesError) console.error('CASES GREŠKA:', casesError);
    if (deadlinesError) console.error('DEADLINES GREŠKA:', deadlinesError);
    if (documentsError) console.error('DOCUMENTS GREŠKA:', documentsError);

    const kpis = kpiData || {};
    const cases = casesData || [];
    const deadlines = deadlinesData || [];
    const docsCount = documentsCount || 0;

    const cards = document.querySelectorAll('.kpis .card');

    const totalCasesCard = cards[0];
    const openDeadlinesCard = cards[1];
    const documentsCard = cards[2];
    const urgentCasesCard = cards[3];

    const openDeadlines = cases.reduce(
      (sum, item) => sum + Number(item.deadlines_open || 0),
      0
    );
    const overdueDeadlines = cases.reduce(
      (sum, item) => sum + Number(item.deadlines_overdue || 0),
      0
    );

    if (totalCasesCard) {
      totalCasesCard.querySelector('.metric').textContent = formatNumber(
        kpis.total_cases
      );
      totalCasesCard.querySelector('.meta').textContent = `${formatNumber(
        kpis.active_cases
      )} aktivnih / ${formatNumber(kpis.closed_cases)} zatvorenih`;
    }

    if (openDeadlinesCard) {
      openDeadlinesCard.querySelector('.metric').textContent = formatNumber(
        openDeadlines
      );
      openDeadlinesCard.querySelector('.meta').textContent = `${formatNumber(
        overdueDeadlines
      )} rokova kasni`;
    }

    if (documentsCard) {
      documentsCard.querySelector('.metric').textContent = formatNumber(
        docsCount
      );
      documentsCard.querySelector('.meta').textContent =
        'Ukupan broj dokumenata u sistemu';
    }

    if (urgentCasesCard) {
      urgentCasesCard.querySelector('.metric').textContent = formatNumber(
        kpis.urgent_cases
      );
      urgentCasesCard.querySelector('.meta').textContent = `Visok prioritet: ${formatNumber(
        kpis.high_priority_cases
      )}`;
    }

    const urgentList = document.querySelector('.grid-2 .card:nth-child(2) .list');
    if (urgentList) {
      urgentList.innerHTML = deadlines
        .map(
          (item) => `
        <div class="list-item">
          <div>
            <strong>${item.case_number || '-'}</strong>
            <small>${item.title || '-'} — ${formatDate(item.due_date)}</small>
          </div>
          ${getDeadlineBadge(item.dashboard_status)}
        </div>
      `
        )
        .join('');
    }

    const tbody = document.querySelector('table tbody');
    if (tbody) {
      tbody.innerHTML = cases
        .map(
          (item) => `
        <tr>
          <td>${item.case_number || '-'}</td>
          <td>${item.last_status_note || item.title || '-'}</td>
          <td>Sistem</td>
          <td>${formatDate(item.last_status_changed_at || item.created_at)}</td>
          <td><span class="status success">${item.status || '-'}</span></td>
        </tr>
      `
        )
        .join('');
    }

    const sidebarNumber = document.querySelector('.sidebar-card strong');
    const sidebarMeta = document.querySelector('.sidebar-card .meta');
    if (sidebarNumber) sidebarNumber.textContent = formatNumber(kpis.urgent_cases || 0);
    if (sidebarMeta) sidebarMeta.textContent = 'hitnih stavki za proveru';
  } catch (err) {
    console.error('DASHBOARD GREŠKA:', err);
  }
}

// ------- DEMO CASE DETAIL -------

function ensureCaseDetailSection() {
  const main = document.querySelector('main.content');
  if (!main) return;

  let section = document.querySelector('.case-detail');
  if (section) return;

  section = document.createElement('section');
  section.className = 'card case-detail';
  section.innerHTML = `
    <div class="section-head">
      <h3>Demo predmet – detalji (I.I-003/2026)</h3>
      <span class="pill">Demo tenant</span>
    </div>
    <div id="case-header"></div>

    <h3 style="margin-top:16px;">Rokovi</h3>
    <div id="case-deadlines"></div>

    <h3 style="margin-top:16px;">Događaji</h3>
    <div id="case-events"></div>

    <h3 style="margin-top:16px;">Dokumenta</h3>
    <div id="case-documents"></div>
  `;
  main.appendChild(section);
}

function renderCaseHeader(caseRow) {
  const el = document.getElementById('case-header');
  if (!el) return;
  if (!caseRow) {
    el.innerHTML = '<p>Nije pronađen predmet.</p>';
    return;
  }

  el.innerHTML = `
    <p><strong>Broj predmeta:</strong> ${caseRow.case_number}</p>
    <p><strong>Naziv:</strong> ${caseRow.title || '-'}</p>
    <p><strong>Sudska oznaka:</strong> ${caseRow.court_case_number || '-'}</p>
    <p><strong>Status:</strong> ${caseRow.status}</p>
    <p><strong>Vrednost potraživanja:</strong> ${formatCurrency(caseRow.claim_amount)}</p>
    <p><strong>Primljen:</strong> ${formatDate(caseRow.received_at)}</p>
  `;
}

function renderCaseDeadlines(deadlines) {
  const el = document.getElementById('case-deadlines');
  if (!el) return;
  if (!deadlines || deadlines.length === 0) {
    el.innerHTML = '<p>Nema rokova.</p>';
    return;
  }

  el.innerHTML = `
    <table class="mini">
      <thead>
        <tr>
          <th>Tip</th>
          <th>Naslov</th>
          <th>Rok</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${deadlines.map(d => `
          <tr>
            <td>${d.deadline_type}</td>
            <td>${d.title}</td>
            <td>${formatDate(d.due_date)}</td>
            <td>${d.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderCaseEvents(events) {
  const el = document.getElementById('case-events');
  if (!el) return;
  if (!events || events.length === 0) {
    el.innerHTML = '<p>Nema događaja.</p>';
    return;
  }

  el.innerHTML = `
    <ul>
      ${events.map(e => `
        <li>
          <strong>${formatDate(e.event_date)}</strong> – ${e.event_type}
          ${e.old_status || e.new_status ? ` (${e.old_status || ''} → ${e.new_status || ''})` : ''}
          ${e.description ? ` – ${e.description}` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function renderCaseDocuments(docs) {
  const el = document.getElementById('case-documents');
  if (!el) return;
  if (!docs || docs.length === 0) {
    el.innerHTML = '<p>Nema dokumenata.</p>';
    return;
  }

  el.innerHTML = `
    <ul>
      ${docs.map(d => `
        <li>
          <strong>${d.title || d.file_name}</strong>
          – ${d.document_type || '-'}
          – upload: ${formatDate(d.uploaded_at)}
        </li>
      `).join('')}
    </ul>
  `;
}

async function loadCaseDetail() {
  try {
    ensureCaseDetailSection();

    const { data: headerRows, error: headerError } = await db
      .from('v_case_detail_header')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('id', DEMO_CASE_ID)
      .limit(1);

    if (headerError) throw headerError;
    renderCaseHeader(headerRows && headerRows[0]);

    const { data: deadlines, error: deadlinesError } = await db
      .from('case_deadlines')
      .select('case_id, deadline_type, title, status, due_date')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('case_id', DEMO_CASE_ID)
      .order('due_date', { ascending: true });

    if (deadlinesError) throw deadlinesError;
    renderCaseDeadlines(deadlines || []);

    const { data: events, error: eventsError } = await db
      .from('v_case_events_timeline')
      .select('*')
      .eq('case_id', DEMO_CASE_ID)
      .order('event_date', { ascending: false });

    if (eventsError) throw eventsError;
    renderCaseEvents(events || []);

    const { data: docs, error: docsError } = await db
      .from('v_case_documents_list')
      .select('*')
      .eq('case_id', DEMO_CASE_ID)
      .order('uploaded_at', { ascending: false });

    if (docsError) throw docsError;
    renderCaseDocuments(docs || []);
  } catch (err) {
    console.error('CASE DETAIL GREŠKA:', err);
  }
}

// ------- INIT -------

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadCaseDetail();
});
