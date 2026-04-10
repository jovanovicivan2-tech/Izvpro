const SUPABASE_URL = 'https://bwpyivqdinemhfrrjdhu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yCHAiRyqvEx9Jeof7EEP3w_r0pDFzew';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RPC = {
  createEvent: 'create_case_event',
  createDeadline: 'create_case_deadline',
  changeStatus: 'change_case_status'
};

let currentCases = [];
let currentSelectedCaseId = null;
let currentSelectedCaseHeader = null;

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
  return `<span class="status ${statusClass(status)}">${safe(status, 'Aktivan')}</span>`;
}

function getErrorMessage(err) {
  const msg = String(err?.message || 'Nepoznata greška');

  if (msg.toLowerCase().includes('row-level security')) {
    return 'Supabase RLS blokira ovu akciju. Reši policy ili koristi RPC funkciju sa odgovarajućim pravima.';
  }

  if (msg.toLowerCase().includes('function') && msg.toLowerCase().includes('does not exist')) {
    return 'Tražena Supabase funkcija još nije napravljena. Prvo unesi SQL funkciju u Supabase.';
  }

  return msg;
}

async function callRpc(functionName, params) {
  const { data, error } = await db.rpc(functionName, params);
  if (error) throw error;
  return data;
}

async function rpcCreateEvent({ caseId, eventType, eventDate, description }) {
  return callRpc(RPC.createEvent, {
    p_case_id: caseId,
    p_event_type: eventType,
    p_event_date: eventDate,
    p_description: description || null
  });
}

async function rpcCreateDeadline({ caseId, title, deadlineType, dueDate, status, note }) {
  return callRpc(RPC.createDeadline, {
    p_case_id: caseId,
    p_title: title,
    p_deadline_type: deadlineType,
    p_due_date: dueDate,
    p_status: status || null,
    p_note: note || null
  });
}

function injectEnhancements() {
  if (document.getElementById('izvpro-enhancements')) return;

  const style = document.createElement('style');
  style.id = 'izvpro-enhancements';
  style.textContent = `
    .section-anchor { scroll-margin-top: 24px; }

    .cases-shell {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }

    .cases-panel,
    .modal-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
    }

    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .input,
    .select,
    .textarea {
      border: 1px solid var(--border);
      background: white;
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      color: var(--text);
      min-height: 44px;
      width: 100%;
    }

    .textarea {
      min-height: 120px;
      resize: vertical;
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

    .detail-box p { font-size: 14px; }

    .detail-section { margin-top: 16px; }

    .detail-section h4 {
      margin-bottom: 10px;
      font-size: 15px;
    }

    .timeline {
      display: grid;
      gap: 10px;
    }

    .timeline-item,
    .doc-item {
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

    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(22, 20, 18, 0.38);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 9999;
    }

    .modal-card {
      width: min(720px, 100%);
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .modal-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
    }

    .field label {
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
    }

    .full { grid-column: 1 / -1; }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .notice {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 14px;
    }

    .notice.success {
      background: #dce8d7;
      color: var(--success);
    }

    .notice.error {
      background: #f3dde2;
      color: var(--danger);
    }

    @media (max-width: 980px) {
      .cases-shell,
      .detail-grid,
      .modal-grid {
        grid-template-columns: 1fr;
      }

      .cases-list {
        max-height: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function wireSidebarNavigation() {
  const links = document.querySelectorAll('.nav a');

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');

      const label = link.textContent.trim();

      if (label === 'Predmeti') {
        document.getElementById('cases-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.querySelector('.topbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function ensureCasesWorkspace() {
  const main = document.querySelector('main.content');
  if (!main) return;

  const existing = document.getElementById('cases-workspace');
  if (existing) return;

  const section = document.createElement('section');
  section.id = 'cases-workspace';
  section.className = 'card section-anchor';
  section.innerHTML = `
    <div class="section-head">
      <div>
        <h3>Predmeti</h3>
        <p class="muted">Lista predmeta i prikaz detalja izabranog predmeta.</p>
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

function getFilteredCases() {
  const query = (document.getElementById('cases-search')?.value || '').trim().toLowerCase();
  const filter = document.getElementById('cases-filter')?.value || 'all';

  return currentCases.filter((item) => {
    const number = String(item.case_number || item.number || '').toLowerCase();
    const title = String(item.title || item.subject || item.case_title || '').toLowerCase();
    const status = String(item.status || item.case_status || '').toLowerCase();
    const overdue = Number(item.deadlines_overdue || 0);

    const matchesQuery =
      !query ||
      number.includes(query) ||
      title.includes(query) ||
      status.includes(query);

    let matchesFilter = true;

    if (filter === 'active') {
      matchesFilter = !status.includes('zatvoren') && !status.includes('closed');
    }

    if (filter === 'closed') {
      matchesFilter = status.includes('zatvoren') || status.includes('closed') || status.includes('završen');
    }

    if (filter === 'urgent') {
      matchesFilter = overdue > 0 || status.includes('hit');
    }

    return matchesQuery && matchesFilter;
  });
}

function renderCasesList(items) {
  const list = document.getElementById('cases-list');
  const pill = document.getElementById('cases-count-pill');
  if (!list) return;

  if (pill) pill.textContent = `${formatNumber(items.length)} predmeta`;

  if (!items.length) {
    list.innerHTML = `<div class="empty-note">Nema pronađenih predmeta.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const id = item.id || item.case_id || '';
    const number = item.case_number || item.number || '-';
    const title = item.title || item.subject || item.case_title || 'Bez naziva';
    const status = item.status || item.case_status || 'Aktivan';
    const amount = item.claim_amount || item.amount || null;
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

    if (cards[0]) {
      cards[0].querySelector('.metric').textContent = formatNumber(kpis.total_cases);
      cards[0].querySelector('.meta').textContent = `${formatNumber(kpis.active_cases)} aktivnih / ${formatNumber(kpis.closed_cases)} zatvorenih`;
    }

    const openDeadlines = cases.reduce((sum, item) => sum + Number(item.deadlines_open || 0), 0);
    const overdueDeadlines = cases.reduce((sum, item) => sum + Number(item.deadlines_overdue || 0), 0);

    if (cards[1]) {
      cards[1].querySelector('.metric').textContent = formatNumber(openDeadlines);
      cards[1].querySelector('.meta').textContent = `${formatNumber(overdueDeadlines)} rokova kasni`;
    }

    if (cards[2]) {
      cards[2].querySelector('.metric').textContent = formatNumber(docsCount);
      cards[2].querySelector('.meta').textContent = 'Ukupan broj dokumenata u sistemu';
    }

    if (cards[3]) {
      cards[3].querySelector('.metric').textContent = formatNumber(kpis.urgent_cases);
      cards[3].querySelector('.meta').textContent = `Visok prioritet: ${formatNumber(kpis.high_priority_cases)}`;
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

      tbody.querySelectorAll('.clickable-row').forEach((row) => {
        row.addEventListener('click', async () => {
          const caseId = row.getAttribute('data-case-id');
          currentSelectedCaseId = caseId;
          document.getElementById('cases-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.warn('HEADER VIEW GREŠKA:', err);
  }

  return currentCases.find(x => String(x.id || x.case_id) === String(caseId)) || null;
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
    console.warn('DEADLINES GREŠKA:', err);
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
    console.warn('EVENTS GREŠKA:', err);
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
    console.warn('DOCS GREŠKA:', err);
    return [];
  }
}

function renderCaseDetail(header, deadlines, events, docs) {
  const content = document.getElementById('case-detail-content');
  const pill = document.getElementById('selected-case-pill');
  if (!content) return;

  currentSelectedCaseHeader = header || null;

  if (!header) {
    if (pill) pill.textContent = 'Nije pronađeno';
    content.innerHTML = `<div class="empty-note">Detalj predmeta nije pronađen.</div>`;
    return;
  }

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

    <div class="detail-actions">
      <button id="btn-new-event" class="btn btn-primary">Novi događaj</button>
      <button id="btn-new-deadline" class="btn btn-secondary">Novi rok</button>
    </div>
  `;

  document.getElementById('btn-new-event')?.addEventListener('click', openNewEventModal);
  document.getElementById('btn-new-deadline')?.addEventListener('click', openNewDeadlineModal);
}

function closeModal() {
  document.getElementById('global-modal')?.remove();
}

function showNotice(container, type, message) {
  if (!container) return;
  container.innerHTML = `<div class="notice ${type}">${message}</div>`;
}

function openNewEventModal() {
  if (!currentSelectedCaseId || !currentSelectedCaseHeader) {
    alert('Prvo izaberi predmet.');
    return;
  }

  closeModal();

  const caseNumber = currentSelectedCaseHeader.case_number || currentSelectedCaseHeader.number || '-';

  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <h3>Novi događaj</h3>
          <p class="muted">Predmet: ${caseNumber}</p>
        </div>
        <button id="modal-close" class="btn btn-secondary">Zatvori</button>
      </div>

      <form id="new-event-form">
        <div class="modal-grid">
          <div class="field">
            <label for="event-type">Tip događaja</label>
            <input id="event-type" name="event_type" class="input" type="text" placeholder="npr. Poziv, Podnesak, Odluka" required />
          </div>

          <div class="field">
            <label for="event-date">Datum događaja</label>
            <input id="event-date" name="event_date" class="input" type="datetime-local" required />
          </div>

          <div class="field full">
            <label for="event-description">Opis</label>
            <textarea id="event-description" name="description" class="textarea" placeholder="Kratak opis događaja"></textarea>
          </div>
        </div>

        <div id="new-event-notice"></div>

        <div class="modal-actions">
          <button type="button" id="cancel-event-btn" class="btn btn-secondary">Otkaži</button>
          <button type="submit" id="save-event-btn" class="btn btn-primary">Sačuvaj događaj</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  document.getElementById('event-date').value = localValue;

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cancel-event-btn')?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('new-event-form')?.addEventListener('submit', handleNewEventSubmit);
}

function openNewDeadlineModal() {
  if (!currentSelectedCaseId || !currentSelectedCaseHeader) {
    alert('Prvo izaberi predmet.');
    return;
  }

  closeModal();

  const caseNumber = currentSelectedCaseHeader.case_number || currentSelectedCaseHeader.number || '-';

  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <h3>Novi rok</h3>
          <p class="muted">Predmet: ${caseNumber}</p>
        </div>
        <button id="modal-close" class="btn btn-secondary">Zatvori</button>
      </div>

      <form id="new-deadline-form">
        <div class="modal-grid">
          <div class="field">
            <label for="deadline-title">Naslov</label>
            <input id="deadline-title" name="title" class="input" type="text" placeholder="npr. Rok za podnesak" required />
          </div>

          <div class="field">
            <label for="deadline-type">Tip roka</label>
            <input id="deadline-type" name="deadline_type" class="input" type="text" placeholder="npr. podnesak, žalba, dopuna" required />
          </div>

          <div class="field">
            <label for="deadline-date">Rok</label>
            <input id="deadline-date" name="due_date" class="input" type="datetime-local" required />
          </div>

          <div class="field">
            <label for="deadline-status">Status</label>
            <input id="deadline-status" name="status" class="input" type="text" placeholder="npr. otvoren" />
          </div>

          <div class="field full">
            <label for="deadline-note">Napomena</label>
            <textarea id="deadline-note" name="note" class="textarea" placeholder="Napomena uz rok"></textarea>
          </div>
        </div>

        <div id="new-deadline-notice"></div>

        <div class="modal-actions">
          <button type="button" id="cancel-deadline-btn" class="btn btn-secondary">Otkaži</button>
          <button type="submit" id="save-deadline-btn" class="btn btn-primary">Sačuvaj rok</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  document.getElementById('deadline-date').value = localValue;

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cancel-deadline-btn')?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('new-deadline-form')?.addEventListener('submit', handleNewDeadlineSubmit);
}

async function handleNewEventSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const notice = document.getElementById('new-event-notice');
  const saveBtn = document.getElementById('save-event-btn');

  const eventType = form.event_type.value.trim();
  const eventDate = form.event_date.value;
  const description = form.description.value.trim();

  if (!eventType || !eventDate) {
    showNotice(notice, 'error', 'Popuni obavezna polja.');
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Čuvanje...';

    await rpcCreateEvent({
      caseId: currentSelectedCaseId,
      eventType,
      eventDate: new Date(eventDate).toISOString(),
      description
    });

    showNotice(notice, 'success', 'Događaj je uspešno sačuvan.');

    await loadSelectedCaseDetail(currentSelectedCaseId);
    await loadDashboard();

    setTimeout(() => {
      closeModal();
    }, 700);
  } catch (err) {
    console.error('NEW EVENT GREŠKA:', err);
    showNotice(notice, 'error', getErrorMessage(err));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Sačuvaj događaj';
  }
}

async function handleNewDeadlineSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const notice = document.getElementById('new-deadline-notice');
  const saveBtn = document.getElementById('save-deadline-btn');

  const title = form.title.value.trim();
  const deadlineType = form.deadline_type.value.trim();
  const dueDate = form.due_date.value;
  const status = form.status.value.trim();
  const note = form.note.value.trim();

  if (!title || !deadlineType || !dueDate) {
    showNotice(notice, 'error', 'Popuni obavezna polja.');
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Čuvanje...';

    await rpcCreateDeadline({
      caseId: currentSelectedCaseId,
      title,
      deadlineType,
      dueDate: new Date(dueDate).toISOString(),
      status,
      note
    });

    showNotice(notice, 'success', 'Rok je uspešno sačuvan.');

    await loadSelectedCaseDetail(currentSelectedCaseId);
    await loadDashboard();

    setTimeout(() => {
      closeModal();
    }, 700);
  } catch (err) {
    console.error('NEW DEADLINE GREŠKA:', err);
    showNotice(notice, 'error', getErrorMessage(err));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Sačuvaj rok';
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

document.addEventListener('DOMContentLoaded', async () => {
  injectEnhancements();
  ensureCasesWorkspace();
  wireSidebarNavigation();

  await loadDashboard();
  await loadCasesWorkspace();
});
