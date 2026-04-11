// SUPABASE CONFIG
// Ključevi se učitavaju iz window.__env (injektovano pre ovog fajla)
// ili kao fallback za lokalni razvoj — NIKAD ne commit-uj prave ključeve ovde
const SUPABASE_URL = (window.__env && window.__env.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.__env && window.__env.SUPABASE_ANON_KEY) || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[IZVPRO] Supabase config nije postavljen. Provjeri window.__env ili Vercel env varijable.');
}

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RPC = {
  createEvent: 'create_case_event',
  createDeadline: 'create_case_deadline',
  changeStatus: 'change_case_status'
};

const DEADLINE_TYPE_OPTIONS = [
  'opsti_rok',
  'prigovor',
  'dostava',
  'predujam',
  'zakljucak',
  'namirenje',
  'arhiviranje',
  'odluka_po_predlogu',
  'unos_u_evidenciju'
];

const DEADLINE_STATUS_OPTIONS = ['open', 'done', 'cancelled', 'expired'];

// PATCH: usklađeno sa DB check constraint cases_status_check
const CASE_STATUS_OPTIONS = [
  'prijem',
  'zakljucak_o_predujmu',
  'uplata_predujma',
  'resenje_o_izvrsenju',
  'dostavljanje',
  'identifikacija_imovine',
  'sredstvo_izvrsenja',
  'sprovodjenje',
  'namirenje',
  'zatvaranje'
];

const CASE_PRIORITY_OPTIONS = [
  'normal',
  'high',
  'urgent'
];

const DOCUMENT_BASIS_TYPE_OPTIONS = [
  'izvrsna_isprava',
  'verodostojna_isprava',
  'drugo'
];

let currentCases = [];
let currentSelectedCaseId = null;
let currentSelectedCaseHeader = null;

// Profil prijavljenog korisnika — učitava se jednom pri startu
let _currentProfile = null;

async function loadCurrentProfile() {
  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return null;

    // Pokušaj da nađeš profil po user_id u tabeli profiles (ili tenants/users)
    // Ako tabela ima drugačije ime, promeni 'profiles' → tačno ime tabele
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Fallback: ako nema profiles tabele, uzmi tenant_id iz user metadata
      logError('LOAD_PROFILE', error);
      _currentProfile = {
        id: user.id,
        tenant_id: user.user_metadata?.tenant_id || null,
        role: user.user_metadata?.role || null,
        email: user.email
      };
      return _currentProfile;
    }

    _currentProfile = data || {
      id: user.id,
      tenant_id: null,
      role: null,
      email: user.email
    };

    return _currentProfile;
  } catch (err) {
    logError('LOAD_PROFILE', err);
    return null;
  }
}

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
    s.includes('overdue') ||
    s === 'expired'
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

  if (msg.toLowerCase().includes('uq_case_deadlines_open_unique')) {
    return 'Za ovaj predmet već postoji otvoren rok istog tipa.';
  }

  if (msg.toLowerCase().includes('case_deadlines_deadline_type_check')) {
    return 'Izaberi dozvoljeni tip roka iz liste.';
  }

  if (msg.toLowerCase().includes('case_deadlines_status_check')) {
    return 'Izaberi dozvoljeni status iz liste.';
  }

  if (msg.toLowerCase().includes('cases_document_basis_type_check')) {
    return 'Izaberi dozvoljeni tip isprave iz liste.';
  }

  if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
    return 'Predmet sa ovim brojem već postoji.';
  }

  if (msg.toLowerCase().includes('tenant')) {
    return 'Greška pri određivanju tenanta. Kontaktirajte administratora.';
  }

  return msg;
}

function logError(context, err) {
  // Sanitizovano logovanje — ne otkriva interne detalje u produkciji
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.error(`[IZVPRO][${context}]`, err);
  }
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

// ─── NEW CASE BUTTON ───────────────────────────────────────────────────────────

function wireNewCaseButton() {
  // Traži dugme u celom dokumentu — može biti u header, topbar ili sidebar
  const btn = document.getElementById('btn-new-case') ||
    document.querySelector('[data-action="new-case"]') ||
    Array.from(document.querySelectorAll('button')).find(
      el => el.textContent.trim().toLowerCase().includes('novi predmet')
    );

  if (!btn) {
    logError('NEW_CASE_BTN', new Error('btn-new-case nije pronađen u DOM-u'));
    return;
  }

  // Ukloni stari listener ako postoji (sprečava dupliranje pri ponovnom pozivu)
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.addEventListener('click', () => openNewCaseModal());
}

function openNewCaseModal() {
  if (!_currentProfile) {
    alert('Profil korisnika nije učitan. Osveži stranicu.');
    return;
  }

  if (!_currentProfile.tenant_id) {
    alert('Tenant nije postavljen u profilu korisnika. Kontaktirajte administratora.');
    return;
  }

  closeModal();

  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <h3>Novi predmet</h3>
          <p class="muted">Unesi podatke o novom predmetu</p>
        </div>
        <button id="modal-close" class="btn btn-secondary">Zatvori</button>
      </div>

      <form id="new-case-form">
        <div class="modal-grid">

          <div class="field">
            <label for="nc-case-number">Broj predmeta *</label>
            <input
              id="nc-case-number"
              name="case_number"
              class="input"
              type="text"
              placeholder="npr. IV-123/2024"
              required
              autocomplete="off"
            />
          </div>

          <div class="field">
            <label for="nc-status">Status</label>
            <select id="nc-status" name="status" class="select">
              ${CASE_STATUS_OPTIONS.map(v => `<option value="${v}" ${v === 'prijem' ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>

          <div class="field full">
            <label for="nc-title">Naziv / predmet</label>
            <input
              id="nc-title"
              name="title"
              class="input"
              type="text"
              placeholder="Kratki naziv predmeta"
              autocomplete="off"
            />
          </div>

          <div class="field">
            <label for="nc-court-number">Sudska oznaka</label>
            <input
              id="nc-court-number"
              name="court_case_number"
              class="input"
              type="text"
              placeholder="npr. Iv 12/2024"
              autocomplete="off"
            />
          </div>

          <div class="field">
            <label for="nc-priority">Prioritet</label>
            <select id="nc-priority" name="priority_level" class="select">
              ${CASE_PRIORITY_OPTIONS.map(v => `<option value="${v}" ${v === 'normal' ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label for="nc-claim-amount">Iznos potraživanja (RSD)</label>
            <input
              id="nc-claim-amount"
              name="claim_amount"
              class="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div class="field">
            <label for="nc-basis-type">Tip isprave</label>
            <select id="nc-basis-type" name="document_basis_type" class="select">
              <option value="">— nije odabrano —</option>
              ${DOCUMENT_BASIS_TYPE_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label for="nc-received-at">Datum prijema</label>
            <input
              id="nc-received-at"
              name="received_at"
              class="input"
              type="date"
            />
          </div>

          <div class="field full">
            <label for="nc-note">Napomena</label>
            <textarea
              id="nc-note"
              name="note"
              class="textarea"
              placeholder="Opcionalna napomena"
            ></textarea>
          </div>

        </div>

        <div id="new-case-notice"></div>

        <div class="modal-actions">
          <button type="button" id="cancel-case-btn" class="btn btn-secondary">Otkaži</button>
          <button type="submit" id="save-case-btn" class="btn btn-primary">Kreiraj predmet</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Postavi danas kao default datum prijema
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('nc-received-at').value = today;

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cancel-case-btn')?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('new-case-form')?.addEventListener('submit', handleNewCaseSubmit);

  // Fokus na prvi input
  document.getElementById('nc-case-number')?.focus();
}

async function handleNewCaseSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const notice = document.getElementById('new-case-notice');
  const saveBtn = document.getElementById('save-case-btn');

  // Validacija
  const caseNumber = form.case_number.value.trim();
  if (!caseNumber) {
    showNotice(notice, 'error', 'Broj predmeta je obavezan.');
    document.getElementById('nc-case-number')?.focus();
    return;
  }

  // tenant_id dolazi ISKLJUČIVO iz profila — nikad sa frontenda
  const tenantId = _currentProfile?.tenant_id;
  if (!tenantId) {
    showNotice(notice, 'error', 'Tenant nije određen. Kontaktirajte administratora.');
    return;
  }

  const status = form.status.value || 'prijem';
  const title = form.title.value.trim() || null;
  const courtCaseNumber = form.court_case_number.value.trim() || null;
  const priorityLevel = form.priority_level.value || 'normal';
  const claimAmountRaw = form.claim_amount.value;
  const claimAmount = claimAmountRaw !== '' ? parseFloat(claimAmountRaw) : null;
  const documentBasisType = form.document_basis_type.value || null;
  const receivedAt = form.received_at.value || null;
  const note = form.note.value.trim() || null;

  const payload = {
    tenant_id: tenantId,
    case_number: caseNumber,
    status,
    priority_level: priorityLevel,
    // PATCH: dodato created_by iz _currentProfile
    created_by: _currentProfile.id,
    ...(title !== null && { title }),
    ...(courtCaseNumber !== null && { court_case_number: courtCaseNumber }),
    ...(claimAmount !== null && { claim_amount: claimAmount }),
    ...(documentBasisType !== null && { document_basis_type: documentBasisType }),
    ...(receivedAt !== null && { received_at: receivedAt }),
    ...(note !== null && { note })
  };

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Kreiranje...';

    const { data, error } = await db
      .from('cases')
      .insert([payload])
      .select('id, case_number')
      .single();

    if (error) throw error;

    showNotice(notice, 'success', `Predmet ${data.case_number} je uspešno kreiran.`);

    // Refresh liste i selektuj novi predmet
    const newCaseId = data.id;

    await loadCasesWorkspace();

    if (newCaseId) {
      currentSelectedCaseId = String(newCaseId);
      renderCasesList(getFilteredCases());
      await loadSelectedCaseDetail(newCaseId);

      document.getElementById('cases-workspace')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    await loadDashboard();

    setTimeout(() => closeModal(), 900);
  } catch (err) {
    logError('NEW_CASE', err);
    showNotice(notice, 'error', getErrorMessage(err));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Kreiraj predmet';
  }
}

// ─── END NEW CASE ──────────────────────────────────────────────────────────────

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
    logError('DASHBOARD', err);
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
    logError('CASES_WORKSPACE', err);
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
    logError('HEADER_VIEW', err);
  }

  return currentCases