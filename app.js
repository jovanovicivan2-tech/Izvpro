const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yCHAiRyqvEx9Jeof7EEP3w_r0pDFzew';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_TENANT_ID = '8add9c1b-d00b-42b7-9035-e0f7e1df2cd4';
const DEMO_CASE_ID = '35a1038f-dd21-4b2a-b32e-d819f31e4211';

let currentCases = [];
let currentSelectedCaseId = null;

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(d);
}

function safe(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

function statusClass(status) {
  const s = String(status || '').toLowerCase();

  if (
    s.includes('hitno') ||
    s.includes('urgent') ||
    s.includes('kasni') ||
    s.includes('overdue')
  ) return 'danger';

  if (
    s.includes('prover') ||
    s.includes('pending') ||
    s.includes('ček') ||
    s.includes('ceka')
  ) return 'warning';

  return 'success';
}

function getDeadlineBadge(status) {
  const cls = statusClass(status);
  const label = safe(status, 'Aktivan');
  return `<span class="status ${cls}">${label}</span>`;
}

function injectEnhancements() {
  if (document.getElementById('izvpro-enhancements')) return;

  const style = document.createElement('style');
  style.id = 'izvpro-enhancements';
  style.textContent = `
    .section-anchor {
      scroll-margin-top: 24px;
    }

    .cases-shell {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 16px;
    }

    .cases-panel {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
    }

    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .input, .select {
      border: 1px solid var(--border);
      background: white;
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      color: var(--text);
      min-height: 44px;
    }

    .input {
      flex: 1;
      min-width: 220px;
    }

    .select {
      min-width: 180px;
    }

    .cases-list {
      display: grid;
      gap: 10px;
      max-height: 720px;
      overflow: auto;
      padding-right: 4px;
    }

    .case-row {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
      background: white;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }

    .case-row:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow);
      border-color: #c9c3b8;
    }

    .case-row.active {
      border-color: var(--primary);
      background: #f8fcfb;
    }

    .case-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .case-row strong {
      display: block;
      font-size: 15px;
    }

    .case-row small {
      color: var(--muted);
      font-size: 13px;
    }

    .case-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      background: var(--surface-2);
      color: var(--muted);
      border: 1px solid var(--border);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }

    .detail-box {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 14px;
      padding: 14px;
    }

    .detail-box h4 {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
      letter-spacing: .04em;
    }

    .detail-box p {
      font-size: 14px;
    }

    .detail-section {
      margin-top: 16px;
    }

    .detail-section h4 {
      margin-bottom: 10px;
      font-size: 15px;
    }

    .timeline {
      display: grid;
      gap: 10px;
    }

    .timeline-item, .doc-item, .deadline-item {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px 14px;
      background: white;
    }

    .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .empty-note {
      border: 1px dashed var(--border);
      border-radius: 14px;
      padding: 16px;
      color: var(--muted);
      background: #fcfbf8;
    }

    .mini-table {
      width: 100%;
      border-collapse: collapse;
    }

    .mini-table th,
    .mini-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #ece7df;
      font-size: 14px;
      text-align: left;
    }

    .mini-table th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .clickable-row {
      cursor: pointer;
    }

    .clickable-row:hover td {
      background: #faf9f6;
    }

    @media (max-width: 980px) {
      .cases-shell,
      .detail-grid {
        grid-template-columns: 1fr;
      }

      .cases-list {
        max-height: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function markSections() {
  const cards = document.querySelectorAll('.content > section.card, .content > section.grid-2, .content > section.kpis');
  if (cards[0]) cards[0].id = 'section-kpis';
  if (cards[1]) cards[1].id = 'section-middle';
  if (cards[2]) cards[2].id = 'section-activity';
}

function wireSidebarNavigation() {
  const links = document.querySelectorAll('.nav a');
  const targets = {
    'Kontrolna tabla': 'section-kpis',
    'Predmeti': 'cases-workspace',
    'Dokumenta': 'section-activity',
    'Rokovi': 'section-middle',
    'Statusi': 'section-middle',
    'Korisnici': 'section-activity'
  };

  links.forEach((link) => {
    const label = link.textContent.trim();
    link.addEventListener('click', (e) => {
      e.preventDefault();

      document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');

      const targetId = targets[label];
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function ensureCasesWorkspace() {
  const main = document.querySelector('main.content');
  if (!main) return;

  let section = document.getElementById('cases-workspace');
  if (section) return;

  section = document.createElement('section');
  section.id = 'cases-workspace';
  section.className = 'card section-anchor';
  section.innerHTML = `
    <div class="section-head">
      <div>
        <h3>Predmeti</h3>
        <p class="muted">Radni ekran za listu i pregled detalja predmeta.</p>
      </div>
      <span class="pill" id="cases-count-pill">0 predmeta</span>
    </div>

    <div class="cases-shell">
      <div class="cases-panel">
        <div class="toolbar">
          <input id="cases-search" class="input" type="text" placeholder="Pretraga po broju ili nazivu predmeta" />
          <select id="cases-filter" class="select">
            <option value="all">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="closed">Zatvoreni</option>
            <option value="urgent">Hitni</option>
          </select>
        </div>
        <div id="cases-list" class="cases-list"></div>
      </div>

      <div class="cases-panel">
        <div class="section-head" style="margin-bottom:12px;">
          <h3>Detalj predmeta</h3>
          <span class="pill" id="selected-case-pill">Nije izabrano</span>
        </div>

        <div id="case-detail-content">
          <div class="empty-note">Izaberi predmet sa leve strane da otvoriš detalje.</div>
        </div>
      </div>
    </div>
  `;

  main.appendChild(section);
}

function renderCasesList(items) {
  const list = document.getElementById('cases-list');
  const pill = document.getElementById('cases-count-pill');
  if (!list) return;

  if (pill) {
    pill.textContent = `${formatNumber(items.length)} predmeta`;
  }

  if (!items.length) {
    list.innerHTML = `<div class="empty-note">Nema pronađenih predmeta za izabrani filter.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const id = item.id || item.case_id || '';
    const number = item.case_number || item.number || '-';
    const title = item.title || item.subject || item.case_title || 'Bez naziva';
    const status = item.status || item.case_status || 'Aktivan';
    const court = item.court_case_number || item.court_number || '';
    const amount = item.claim_amount || item.amount || item.outstanding_amount || null;
    const updated = item.last_status_changed_at || item.updated_at || item.created_at || null;
    const isActive = String(id) === String(currentSelectedCaseId);

    return `
      <div class="case-row ${isActive ? 'active' : ''}" data-case-id="${id}">
        <div class="case-row-top">
          <strong>${safe(number)}</strong>
          <span class="status ${statusClass(status)}">${safe(status)}</span>
        </div>
        <small>${safe(title)}</small>
        <div class="case-meta">
          ${court ? `<span class="chip">Sud: ${court}</span>` : ''}
          ${amount !== null ? `<span class="chip">Iznos: ${formatCurrency(amount)}</span>` : ''}
          ${updated ? `<span class="chip">Ažurirano: ${formatDate(updated)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.case-row').forEach((row) => {
    row.addEventListener('click', async () => {
      const caseId = row.getAttribute('data-case-id');
      currentSelectedCaseId = caseId;
      renderCasesList(items);
      await loadSelectedCaseDetail(caseId);
    });
  });
}

function getFilteredCases() {
  const q = (document.getElementById('cases-search')?.value || '').trim().toLowerCase();
  const filter = document.getElementById('cases-filter')?.value || 'all';

  return currentCases.filter((item) => {
    const number = String(item.case_number || item.number || '').toLowerCase();
    const title = String(item.title || item.subject || item.case_title || '').toLowerCase();
    const status = String(item.status || item.case_status || '').toLowerCase();
    const urgentScore = Number(item.priority_rank || item.priority || 0);
    const overdue = Number(item.deadlines_overdue || 0);

    const matchesQuery =
      !q ||
      number.includes(q) ||
      title.includes(q) ||
      status.includes(q);

    let matchesFilter = true;

    if (filter === 'active') {
      matchesFilter =
        !status.includes('zatvoren') &&
        !status.includes('closed') &&
        !status.includes('archived');
    }

    if (filter === 'closed') {
      matchesFilter =
        status.includes('zatvoren') ||
        status.includes('closed') ||
        status.includes('archived') ||
        status.includes('završen');
    }

    if (filter === 'urgent') {
      matchesFilter =
        overdue > 0 ||
        urgentScore >= 8 ||
        status.includes('hit');
    }

    return matchesQuery && matchesFilter;
  });
}

function wireCasesToolbar() {
  const search = document.getElementById('cases-search');
  const filter = document.getElementById('cases-filter');

  if (search) {
    search.addEventListener('input', () => {
      renderCasesList(getFilteredCases());
    });
  }

  if (filter) {
    filter.addEventListener('change', () => {
      renderCasesList(getFilteredCases());
    });
  }
}

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
      .range(0, 9);

    const { data: deadlinesData, error: deadlinesError } = await db
      .from('v_deadlines_dashboard')
      .select('*')
      .order('due_date', { ascending: true })
      .range(0, 2);

    const { count: documentsCount, error: documentsError } = await db
      .from('v_documents_overview')
      .select('*', { count: 'exact', head: true });

    if (kpiError) throw kpiError;
    if (casesError) throw casesError;
    if (deadlinesError) throw deadlinesError;
    if (documentsError) throw documentsError;

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
      totalCasesCard.querySelector('.metric').textContent = formatNumber(kpis.total_cases);
      totalCasesCard.querySelector('.meta').textContent =
        `${formatNumber(kpis.active_cases)} aktivnih / ${formatNumber(kpis.closed_cases)} zatvorenih`;
    }

    if (openDeadlinesCard) {
      openDeadlinesCard.querySelector('.metric').textContent = formatNumber(openDeadlines);
      openDeadlinesCard.querySelector('.meta').textContent =
        `${formatNumber(overdueDeadlines)} rokova kasni`;
    }

    if (documentsCard) {
      documentsCard.querySelector('.metric').textContent = formatNumber(docsCount);
      documentsCard.querySelector('.meta').textContent =
        'Ukupan broj dokumenata u sistemu';
    }

    if (urgentCasesCard) {
      urgentCasesCard.querySelector('.metric').textContent = formatNumber(kpis.urgent_cases);
      urgentCasesCard.querySelector('.meta').textContent =
        `Visok prioritet: ${formatNumber(kpis.high_priority_cases)}`;
    }

    const urgentList = document.querySelector('.grid-2 .card:nth-child(2) .list');
    if (urgentList) {
      urgentList.innerHTML = deadlines.map((item) => `
        <div class="list-item">
          <div>
            <strong>${safe(item.case_number)}</strong>
            <small>${safe(item.title)} — ${formatDate(item.due_date)}</small>
          </div>
          ${getDeadlineBadge(item.dashboard_status)}
        </div>
      `).join('');
    }

    const tbody = document.querySelector('table tbody');
    if (tbody) {
      tbody.innerHTML = cases.map((item) => `
        <tr class="clickable-row" data-case-id="${item.id || item.case_id || ''}">
          <td>${safe(item.case_number)}</td>
          <td>${safe(item.last_status_note || item.title)}</td>
          <td>Sistem</td>
          <td>${formatDate(item.last_status_changed_at || item.created_at)}</td>
          <td><span class="status ${statusClass(item.status)}">${safe(item.status)}</span></td>
        </tr>
      `).join('');

      tbody.querySelectorAll('tr.clickable-row').forEach((row) => {
        row.addEventListener('click', async () => {
          const caseId = row.getAttribute('data-case-id');
          if (!caseId) return;
          currentSelectedCaseId = caseId;
          const casesSection = document.getElementById('cases-workspace');
          if (casesSection) {
            casesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          renderCasesList(getFilteredCases());
          await loadSelectedCaseDetail(caseId);
        });
      });
    }

    const sidebarNumber = document.querySelector('.sidebar-card strong');
    const sidebarMeta = document.querySelector('.sidebar-card .meta');
    if (sidebarNumber) sidebarNumber.textContent = formatNumber(kpis.urgent_cases || 0);
    if (sidebarMeta) sidebarMeta.textContent = 'hitnih stavki za proveru';
  } catch (err) {
    console.error('DASHBOARD GREŠKA:', err);
  }
}

async function loadCasesWorkspace() {
  try {
    ensureCasesWorkspace();

    const { data, error } = await db
      .from('v_cases_dashboard')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 99);

    if (error) throw error;

    currentCases = data || [];
    renderCasesList(getFilteredCases());
    wireCasesToolbar();

    const firstCaseId =
      currentSelectedCaseId ||
      currentCases?.[0]?.id ||
      currentCases?.[0]?.case_id ||
      null;

    if (firstCaseId) {
      currentSelectedCaseId = firstCaseId;
      renderCasesList(getFilteredCases());
      await loadSelectedCaseDetail(firstCaseId);
    }
  } catch (err) {
    console.error('CASES WORKSPACE GREŠKA:', err);
  }
}

async function getCaseHeader(caseId) {
  try {
    const { data, error } = await db
      .from('v_case_detail_header')
      .select('*')
      .eq('id', caseId)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('HEADER fallback:', err);

    const fallback = currentCases.find(
      x => String(x.id || x.case_id) === String(caseId)
    );

    return fallback || null;
  }
}

async function getCaseDeadlines(caseId) {
  try {
    const { data, error } = await db
      .from('case_deadlines')
      .select('*')
      .eq('case_id', caseId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('DEADLINES fallback:', err);
    return [];
  }
}

async function getCaseEvents(caseId) {
  try {
    const { data, error } = await db
      .from('v_case_events_timeline')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('EVENTS fallback:', err);
    return [];
  }
}

async function getCaseDocuments(caseId) {
  try {
    const { data, error } = await db
      .from('v_case_documents_list')
      .select('*')
      .eq('case_id', caseId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('DOCS fallback:', err);
    return [];
  }
}

function renderCaseDetail(header, deadlines, events, docs) {
  const content = document.getElementById('case-detail-content');
  const pill = document.getElementById('selected-case-pill');

  if (!content) return;

  if (!header) {
    if (pill) pill.textContent = 'Nije pronađeno';
    content.innerHTML = `<div class="empty-note">Detalj predmeta nije pronađen.</div>`;
    return;
  }

  const caseId = header.id || header.case_id || '';
  const caseNumber = header.case_number || header.number || '-';
  const title = header.title || header.subject || header.case_title || '-';
  const status = header.status || header.case_status || 'Aktivan';

  if (pill) pill.textContent = caseNumber;

  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-box">
        <h4>Broj predmeta</h4>
        <p><strong>${safe(caseNumber)}</strong></p>
      </div>
      <div class="detail-box">
        <h4>Status</h4>
        <p><span class="status ${statusClass(status)}">${safe(status)}</span></p>
      </div>
      <div class="detail-box">
        <h4>Naziv</h4>
        <p>${safe(title)}</p>
      </div>
      <div class="detail-box">
        <h4>Sudska oznaka</h4>
        <p>${safe(header.court_case_number || header.court_number)}</p>
      </div>
      <div class="detail-box">
        <h4>Primljen</h4>
        <p>${formatDate(header.received_at || header.created_at)}</p>
      </div>
      <div class="detail-box">
        <h4>Vrednost</h4>
        <p>${header.claim_amount != null ? formatCurrency(header.claim_amount) : '-'}</p>
      </div>
    </div>

    <div class="detail-section">
      <h4>Rokovi</h4>
      ${
        deadlines.length
          ? `
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Naslov</th>
                  <th>Rok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${deadlines.map((d) => `
                  <tr>
                    <td>${safe(d.deadline_type)}</td>
                    <td>${safe(d.title)}</td>
                    <td>${formatDate(d.due_date)}</td>
                    <td><span class="status ${statusClass(d.status)}">${safe(d.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `
          : `<div class="empty-note">Nema rokova.</div>`
      }
    </div>

    <div class="detail-section">
      <h4>Događaji</h4>
      ${
        events.length
          ? `
            <div class="timeline">
              ${events.map((e) => `
                <div class="timeline-item">
                  <strong>${safe(e.event_type, 'Događaj')}</strong>
                  <div class="muted">${formatDate(e.event_date)}</div>
                  <div style="margin-top:6px;">${safe(e.description, 'Bez opisa')}</div>
                </div>
              `).join('')}
            </div>
          `
          : `<div class="empty-note">Nema događaja.</div>`
      }
    </div>

    <div class="detail-section">
      <h4>Dokumenta</h4>
      ${
        docs.length
          ? `
            <div class="timeline">
              ${docs.map((d) => `
                <div class="doc-item">
                  <strong>${safe(d.title || d.file_name)}</strong>
                  <div class="muted">${safe(d.document_type, 'Dokument')}</div>
                  <div class="muted">Upload: ${formatDate(d.uploaded_at)}</div>
                </div>
              `).join('')}
            </div>
          `
          : `<div class="empty-note">Nema dokumenata.</div>`
      }
    </div>

    <div class="detail-section">
      <button id="btn-new-event" class="btn btn-secondary">Novi događaj</button>
      <button id="btn-new-deadline" class="btn btn-primary">Novi rok</button>
    </div>
  `;

  const btnNewEvent = document.getElementById('btn-new-event');
  const btnNewDeadline = document.getElementById('btn-new-deadline');

  if (btnNewEvent) {
    btnNewEvent.addEventListener('click', () => {
      alert(`Sledeći korak: forma za novi događaj za predmet ${caseNumber}`);
    });
  }

  if (btnNewDeadline) {
    btnNewDeadline.addEventListener('click', () => {
      alert(`Sledeći korak: forma za novi rok za predmet ${caseNumber}`);
    });
  }
}

async function loadSelectedCaseDetail(caseId) {
  try {
    const [header, deadlines, events, docs] = await Promise.all([
      getCaseHeader(caseId),
      getCaseDeadlines(caseId),
      getCaseEvents(caseId),
      getCaseDocuments(caseId)
    ]);

    renderCaseDetail(header, deadlines, events, docs);
  } catch (err) {
    console.error('DETAIL GREŠKA:', err);
  }
}

async function loadDemoCaseDetail() {
  try {
    const [header, deadlines, events, docs] = await Promise.all([
      db.from('v_case_detail_header').select('*').eq('tenant_id', DEMO_TENANT_ID).eq('id', DEMO_CASE_ID).limit(1).single(),
      db.from('case_deadlines').select('*').eq('tenant_id', DEMO_TENANT_ID).eq('case_id', DEMO_CASE_ID).order('due_date', { ascending: true }),
      db.from('v_case_events_timeline').select('*').eq('case_id', DEMO_CASE_ID).order('event_date', { ascending: false }),
      db.from('v_case_documents_list').select('*').eq('case_id', DEMO_CASE_ID).order('uploaded_at', { ascending: false })
    ]);

    if (!header.error && header.data && !currentSelectedCaseId) {
      currentSelectedCaseId = DEMO_CASE_ID;
    }

    console.log('DEMO DETAIL READY');
    console.log(header, deadlines, events, docs);
  } catch (err) {
    console.warn('DEMO DETAIL INFO:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  injectEnhancements();
  markSections();
  ensureCasesWorkspace();
  wireSidebarNavigation();

  await loadDashboard();
  await loadCasesWorkspace();
  await loadDemoCaseDetail();
});
