// ═══════════════════════════════════════════════════
// IZVPRO app.js — v1.3 (auth fix)
// ═══════════════════════════════════════════════════

const SUPABASE_URL = (window.__env && window.__env.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.__env && window.__env.SUPABASE_ANON_KEY) || '';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ─── KONSTANTE ────────────────────────────────────────────────────────────────
const CASE_STATUS_OPTIONS = [
  'prijem','zakljucak_o_predujmu','uplata_predujma',
  'resenje_o_izvrsenju','dostavljanje','identifikacija_imovine',
  'sredstvo_izvrsenja','sprovodjenje','namirenje','zatvaranje'
];
const CASE_PRIORITY_OPTIONS = ['low','normal','high','urgent'];
const DOCUMENT_BASIS_TYPE_OPTIONS = ['izvrsna_isprava','verodostojna_isprava','drugo'];
const DEADLINE_TYPE_OPTIONS = [
  'opsti_rok','prigovor','dostava','predujam',
  'zakljucak','namirenje','arhiviranje',
  'odluka_po_predlogu','unos_u_evidenciju'
];
const DEADLINE_STATUS_OPTIONS = ['open','done','cancelled','expired'];
const PROFILE_ROLE_OPTIONS = ['admin','izvrsitelj','referent','dostavljac','poverilac'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentCases = [];
let currentSelectedCaseId = null;
let _currentProfile = null;
let _initDone = false;

// ─── LOGGING ──────────────────────────────────────────────────────────────────
function logError(context, err) {
  console.error(`[IZVPRO][${context}]`, err);
}

// ─── FORMATTERI ───────────────────────────────────────────────────────────────
function formatNumber(value) {
  return new Intl.NumberFormat('sr-RS').format(Number(value || 0));
}
function formatCurrency(value) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency', currency: 'RSD', maximumFractionDigits: 2
  }).format(Number(value || 0));
}
function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('sr-RS', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}
function formatDateOnly(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('sr-RS', { dateStyle: 'short' }).format(d);
}
function safe(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}
function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('hitno')||s.includes('urgent')||s.includes('overdue')||s==='expired'||s.includes('kasni')) return 'danger';
  if (s.includes('prover')||s.includes('pending')||s.includes('open')||s.includes('ceka')) return 'warning';
  if (s.includes('zatvoren')||s.includes('done')||s.includes('completed')||s.includes('namirenje')) return 'success';
  return 'neutral';
}
function getDeadlineBadge(status) {
  return `<span class="status ${statusClass(status)}">${safe(status, 'Aktivan')}</span>`;
}
function getErrorMessage(err) {
  const msg = String(err?.message || 'Nepoznata greška');
  if (msg.toLowerCase().includes('row-level security')) return 'RLS blokira ovu akciju.';
  if (msg.toLowerCase().includes('does not exist')) return 'Tabela ili funkcija ne postoji u bazi.';
  if (msg.toLowerCase().includes('uq_case_deadlines_open_unique')) return 'Za ovaj predmet već postoji otvoren rok istog tipa.';
  if (msg.toLowerCase().includes('case_deadlines_deadline_type_check')) return 'Izaberi dozvoljen tip roka.';
  if (msg.toLowerCase().includes('cases_document_basis_type_check')) return 'Izaberi dozvoljen tip isprave.';
  if (msg.toLowerCase().includes('duplicate')||msg.toLowerCase().includes('unique')) return 'Predmet sa ovim brojem već postoji.';
  if (msg.toLowerCase().includes('tenant')) return 'Greška tenanta. Kontaktiraj administratora.';
  return msg;
}
function showNotice(el, type, text) {
  if (!el) return;
  el.className = `notice ${type}`;
  el.textContent = text;
  el.style.display = 'block';
}
function closeModal() {
  document.getElementById('global-modal')?.remove();
}

// ─── PROFIL ───────────────────────────────────────────────────────────────────
async function loadCurrentProfile() {
  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return null;

    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email, role, is_active, tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logError('LOAD_PROFILE', error);
      // Fallback iz auth metadatama
      _currentProfile = {
        id: user.id,
        tenant_id: user.user_metadata?.tenant_id || null,
        role: user.user_metadata?.role || 'admin',
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        is_active: true
      };
      return _currentProfile;
    }

    if (!data) {
      console.warn('[IZVPRO] Profil nije pronađen za user:', user.id);
      // Kritičan fallback: umesto signOut, kreiraj privremeni profil
      _currentProfile = {
        id: user.id,
        tenant_id: null,
        role: 'admin',
        email: user.email,
        full_name: user.email,
        is_active: true
      };
      return _currentProfile;
    }

    _currentProfile = data;
    console.log('[IZVPRO] Profil učitan:', data.email, '/', data.role);
    return _currentProfile;
  } catch (err) {
    logError('LOAD_PROFILE', err);
    return null;
  }
}

// ─── AUTH UI ──────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.remove('visible');
  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Prijavi se'; }
}

function showApp(profile) {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.add('visible');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = profile.full_name || profile.email || '—';
  if (roleEl) roleEl.textContent = profile.role || '—';
}

function wireLoginForm() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      if (errorEl) { errorEl.textContent = 'Unesite email i lozinku.'; errorEl.style.display = 'block'; }
      return;
    }

    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Prijavljivanje...'; }
    if (errorEl) errorEl.style.display = 'none';

    try {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange preuzima
    } catch (err) {
      console.error('[IZVPRO] Login error:', err);
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err);
        errorEl.style.display = 'block';
      }
      if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Prijavi se'; }
    }
  });
}

function wireLogout() {
  const btn = document.getElementById('btn-logout');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await db.auth.signOut();
  });
}

// ─── NAVIGACIJA ───────────────────────────────────────────────────────────────
function wireSidebarNavigation() {
  const links = document.querySelectorAll('.nav a[data-view]');
  const views = document.querySelectorAll('.view');

  links.forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      links.forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      const viewId = link.getAttribute('data-view');
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${viewId}`)?.classList.add('active');
      if (viewId === 'dashboard') await loadDashboard();
      if (viewId === 'cases') await loadCasesView();
      if (viewId === 'deadlines') await loadDeadlinesView();
      if (viewId === 'documents') await loadDocumentsView();
    });
  });
}

// ─── CSS ENHANCEMENTS ────────────────────────────────────────────────────────
function injectEnhancements() {
  if (document.getElementById('izvpro-enhancements')) return;
  const style = document.createElement('style');
  style.id = 'izvpro-enhancements';
  style.textContent = `
    .cases-shell{display:grid;grid-template-columns:1.05fr 1fr;gap:16px;margin-top:16px}
    .cases-panel{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow)}
    .toolbar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
    .input,.select,.textarea{border:1px solid var(--border);background:white;border-radius:12px;padding:12px 14px;font:inherit;color:var(--text);min-height:44px;width:100%;outline:none;transition:border-color var(--transition)}
    .input:focus,.select:focus,.textarea:focus{border-color:var(--primary)}
    .textarea{min-height:120px;resize:vertical}
    .input{flex:1;min-width:220px}
    .select{min-width:180px}
    .cases-list{display:grid;gap:10px;max-height:720px;overflow:auto;padding-right:4px}
    .case-row{border:1px solid var(--border);border-radius:14px;padding:14px;background:white;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
    .case-row:hover{transform:translateY(-1px);box-shadow:var(--shadow);border-color:#c9c3b8}
    .case-row.active{border-color:var(--primary);background:#f8fcfb}
    .case-row-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
    .case-row strong{display:block;font-size:15px}
    .case-row small{color:var(--muted);font-size:13px}
    .case-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .chip{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:12px;background:var(--surface-2);color:var(--muted);border:1px solid var(--border)}
    .detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:14px}
    .detail-box{border:1px solid var(--border);background:#fff;border-radius:14px;padding:14px}
    .detail-box h4{font-size:12px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;letter-spacing:.04em}
    .detail-box p{font-size:14px}
    .detail-section{margin-top:16px}
    .detail-section h4{margin-bottom:10px;font-size:15px}
    .timeline{display:grid;gap:10px}
    .timeline-item,.doc-item{border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:white}
    .muted{color:var(--muted);font-size:13px}
    .empty-note{border:1px dashed var(--border);border-radius:14px;padding:16px;color:var(--muted);background:#fcfbf8}
    .mini-table{width:100%;border-collapse:collapse}
    .mini-table th,.mini-table td{padding:12px 10px;border-bottom:1px solid #ece7df;font-size:14px;text-align:left}
    .mini-table th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    .clickable-row{cursor:pointer}
    .clickable-row:hover td{background:#faf9f6}
    .detail-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    .modal-backdrop{position:fixed;inset:0;background:rgba(22,20,18,.38);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}
    .modal-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(720px,100%);box-shadow:0 20px 60px rgba(0,0,0,.18);max-height:90dvh;overflow-y:auto}
    .modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
    .modal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:12px}
    .field{display:grid;gap:6px}
    .field label{font-size:13px;color:var(--muted);font-weight:600}
    .full{grid-column:1/-1}
    .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;flex-wrap:wrap}
    .notice{margin-top:10px;padding:12px 14px;border-radius:12px;font-size:14px;display:none}
    .notice.success{background:var(--success-soft);color:var(--success)}
    .notice.error{background:var(--danger-soft);color:var(--danger)}
    @media(max-width:980px){.cases-shell,.detail-grid,.modal-grid{grid-template-columns:1fr}.cases-list{max-height:none}}
  `;
  document.head.appendChild(style);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), duration);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [kpiRes, casesRes, deadlinesRes, docsRes] = await Promise.all([
      db.from('v_dashboard_kpis').select('*').limit(1).maybeSingle(),
      db.from('v_cases_dashboard').select('*').order('created_at', { ascending: false }).range(0, 9),
      db.from('v_deadlines_dashboard').select('*').order('due_date', { ascending: true }).range(0, 4),
      db.from('v_documents_overview').select('*', { count: 'exact', head: true })
    ]);

    const kpis = kpiRes.data || {};
    const cases = casesRes.data || [];
    const deadlines = deadlinesRes.data || [];
    const docsCount = docsRes.count || 0;

    const setKpi = (id, val, meta) => {
      const m = document.getElementById(id);
      const n = document.getElementById(id + '-meta');
      if (m) m.textContent = formatNumber(val);
      if (n) n.textContent = meta;
    };

    setKpi('kpi-cases', kpis.total_cases, `${formatNumber(kpis.active_cases)} aktivnih / ${formatNumber(kpis.closed_cases)} zatvorenih`);
    const openDeadlines = cases.reduce((s, i) => s + Number(i.deadlines_open || 0), 0);
    const overdueDeadlines = cases.reduce((s, i) => s + Number(i.deadlines_overdue || 0), 0);
    setKpi('kpi-deadlines', openDeadlines, `${formatNumber(overdueDeadlines)} rokova kasni`);
    setKpi('kpi-docs', docsCount, 'Ukupan broj dokumenata');
    setKpi('kpi-stalled', kpis.urgent_cases, `Visok prioritet: ${formatNumber(kpis.high_priority_cases)}`);

    const sidebarCount = document.getElementById('sidebar-today-count');
    if (sidebarCount) sidebarCount.textContent = formatNumber(overdueDeadlines || kpis.urgent_cases || 0);

    const urgentList = document.getElementById('urgent-deadlines-list');
    if (urgentList) {
      urgentList.innerHTML = deadlines.length
        ? deadlines.map(item => `
            <div class="list-item">
              <div>
                <strong>${safe(item.case_number)}</strong>
                <small>${safe(item.title)} — ${formatDateOnly(item.due_date)}</small>
              </div>
              ${getDeadlineBadge(item.dashboard_status || item.status)}
            </div>`).join('')
        : `<div class="empty-note">Nema hitnih rokova. ✅</div>`;
    }

    const tbody = document.getElementById('activity-table-body');
    if (tbody) {
      tbody.innerHTML = cases.length
        ? cases.map(item => `
            <tr class="clickable-row" data-case-id="${item.id || ''}">
              <td>${safe(item.case_number)}</td>
              <td>${safe(item.last_status_note || item.title)}</td>
              <td>Sistem</td>
              <td>${formatDate(item.last_status_changed_at || item.created_at)}</td>
              <td><span class="status ${statusClass(item.status)}">${safe(item.status)}</span></td>
            </tr>`).join('')
        : `<tr><td colspan="5" style="color:var(--muted);padding:20px;text-align:center;">Nema predmeta.</td></tr>`;

      tbody.querySelectorAll('.clickable-row').forEach(row => {
        row.addEventListener('click', () => {
          const caseId = row.getAttribute('data-case-id');
          document.querySelector('.nav a[data-view="cases"]')?.click();
          currentSelectedCaseId = caseId;
        });
      });
    }

    const updated = document.getElementById('activity-updated');
    if (updated) updated.textContent = `Ažurirano: ${new Date().toLocaleTimeString('sr-RS')}`;
  } catch (err) {
    logError('DASHBOARD', err);
  }
}

// ─── PREDMETI VIEW ───────────────────────────────────────────────────────────
async function loadCasesView() {
  injectEnhancements();
  ensureCasesWorkspace();
  await loadCasesWorkspace();
  wireNewCaseButton();
}

function ensureCasesWorkspace() {
  const viewEl = document.getElementById('view-cases');
  if (!viewEl || document.getElementById('cases-workspace')) return;
  const section = document.createElement('div');
  section.id = 'cases-workspace';
  section.innerHTML = `
    <div class="cases-shell">
      <div class="cases-panel">
        <div class="toolbar">
          <input id="cases-search" class="input" type="text" placeholder="Pretraga po broju, dužniku…" />
          <select id="cases-filter" class="select">
            <option value="all">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="urgent">Hitni</option>
            <option value="closed">Zatvoreni</option>
          </select>
        </div>
        <div id="cases-list" class="cases-list">
          <div class="empty-note">Učitavanje predmeta…</div>
        </div>
      </div>
      <div class="cases-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:15px;font-weight:600;">Detalj predmeta</h3>
          <span class="pill" id="selected-case-pill">Nije izabrano</span>
        </div>
        <div id="case-detail-content">
          <div class="empty-note">Izaberi predmet sa leve strane.</div>
        </div>
      </div>
    </div>`;
  const topbar = viewEl.querySelector('.topbar');
  if (topbar) topbar.after(section);
  else viewEl.appendChild(section);
}

function getFilteredCases() {
  const query = (document.getElementById('cases-search')?.value || '').trim().toLowerCase();
  const filter = document.getElementById('cases-filter')?.value || 'all';
  return currentCases.filter(item => {
    const number = String(item.case_number || '').toLowerCase();
    const title = String(item.title || '').toLowerCase();
    const status = String(item.status || '').toLowerCase();
    const overdue = Number(item.deadlines_overdue || 0);
    const matchesQuery = !query || number.includes(query) || title.includes(query) || status.includes(query);
    let matchesFilter = true;
    if (filter === 'active') matchesFilter = !['zatvaranje','namirenje'].includes(status);
    if (filter === 'closed') matchesFilter = ['zatvaranje','namirenje'].includes(status);
    if (filter === 'urgent') matchesFilter = overdue > 0 || item.priority_level === 'urgent';
    return matchesQuery && matchesFilter;
  });
}

function renderCasesList(items) {
  const list = document.getElementById('cases-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = `<div class="empty-note">Nema pronađenih predmeta.</div>`;
    return;
  }
  list.innerHTML = items.map(item => {
    const id = item.id || '';
    const isActive = String(id) === String(currentSelectedCaseId);
    return `
      <div class="case-row ${isActive ? 'active' : ''}" data-case-id="${id}">
        <div class="case-row-top">
          <strong>${safe(item.case_number)}</strong>
          <span class="status ${statusClass(item.status)}">${safe(item.status)}</span>
        </div>
        <small>${safe(item.title || 'Bez naziva')}</small>
        <div class="case-meta">
          ${item.claim_amount != null ? `<span class="chip">${formatCurrency(item.claim_amount)}</span>` : ''}
          ${item.updated_at ? `<span class="chip">${formatDateOnly(item.updated_at)}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.case-row').forEach(row => {
    row.addEventListener('click', async () => {
      currentSelectedCaseId = row.getAttribute('data-case-id');
      renderCasesList(items);
      await loadSelectedCaseDetail(currentSelectedCaseId);
    });
  });
}

function wireCasesToolbar() {
  document.getElementById('cases-search')?.addEventListener('input', () => renderCasesList(getFilteredCases()));
  document.getElementById('cases-filter')?.addEventListener('change', () => renderCasesList(getFilteredCases()));
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
    const firstId = currentSelectedCaseId || currentCases[0]?.id || null;
    if (firstId) {
      currentSelectedCaseId = firstId;
      renderCasesList(getFilteredCases());
      await loadSelectedCaseDetail(firstId);
    }
  } catch (err) {
    logError('CASES_WORKSPACE', err);
  }
}

async function loadSelectedCaseDetail(caseId) {
  const detail = document.getElementById('case-detail-content');
  const pill = document.getElementById('selected-case-pill');
  if (!detail) return;
  detail.innerHTML = `<div class="empty-note">Učitavanje…</div>`;
  try {
    const [caseRes, partiesRes, deadlinesRes, eventsRes] = await Promise.all([
      db.from('cases').select('*').eq('id', caseId).maybeSingle(),
      db.from('case_parties').select('*').eq('case_id', caseId),
      db.from('case_deadlines').select('*').eq('case_id', caseId).order('due_date', { ascending: true }),
      db.from('case_events').select('*').eq('case_id', caseId).order('event_date', { ascending: false }).limit(10)
    ]);
    if (caseRes.error) throw caseRes.error;
    const c = caseRes.data;
    if (!c) { detail.innerHTML = `<div class="empty-note">Predmet nije pronađen.</div>`; return; }
    if (pill) pill.textContent = c.case_number;
    const parties = partiesRes.data || [];
    const deadlines = deadlinesRes.data || [];
    const events = eventsRes.data || [];
    const creditor = parties.find(p => p.role === 'creditor');
    const debtor = parties.find(p => p.role === 'debtor');
    detail.innerHTML = `
      <div class="detail-grid">
        <div class="detail-box"><h4>Broj predmeta</h4><p>${safe(c.case_number)}</p></div>
        <div class="detail-box"><h4>Status</h4><p><span class="status ${statusClass(c.status)}">${safe(c.status)}</span></p></div>
        <div class="detail-box"><h4>Poverilac</h4><p>${safe(creditor?.full_name)}</p></div>
        <div class="detail-box"><h4>Dužnik</h4><p>${safe(debtor?.full_name)}</p></div>
        <div class="detail-box"><h4>Iznos potraživanja</h4><p>${c.claim_amount != null ? formatCurrency(c.claim_amount) : '-'}</p></div>
        <div class="detail-box"><h4>Datum prijema</h4><p>${formatDateOnly(c.received_at)}</p></div>
      </div>
      ${c.notes ? `<div class="detail-box" style="margin-bottom:12px;"><h4>Napomena</h4><p>${safe(c.notes)}</p></div>` : ''}
      <div class="detail-section">
        <h4>Rokovi (${deadlines.length})</h4>
        ${deadlines.length ? `
          <table class="mini-table">
            <thead><tr><th>Tip</th><th>Naslov</th><th>Datum</th><th>Status</th></tr></thead>
            <tbody>${deadlines.map(d => `
              <tr>
                <td>${safe(d.deadline_type)}</td>
                <td>${safe(d.title)}</td>
                <td>${formatDateOnly(d.due_date)}</td>
                <td>${getDeadlineBadge(d.status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : `<div class="empty-note">Nema rokova za ovaj predmet.</div>`}
      </div>
      <div class="detail-section">
        <h4>Događaji (${events.length})</h4>
        ${events.length ? `
          <div class="timeline">
            ${events.map(ev => `
              <div class="timeline-item">
                <strong>${safe(ev.event_type)}</strong>
                <div class="muted">${safe(ev.description)}</div>
                <div class="muted" style="margin-top:4px;">${formatDate(ev.event_date)}</div>
              </div>`).join('')}
          </div>` : `<div class="empty-note">Nema eventa za ovaj predmet.</div>`}
      </div>
      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="openNewDeadlineModal('${caseId}')">+ Dodaj rok</button>
      </div>`;
  } catch (err) {
    logError('CASE_DETAIL', err);
    detail.innerHTML = `<div class="empty-note" style="color:var(--danger);">Greška: ${getErrorMessage(err)}</div>`;
  }
}

// ─── NOVI PREDMET ─────────────────────────────────────────────────────────────
function wireNewCaseButton() {
  document.querySelectorAll('[id^="btn-new-case"]').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', openNewCaseModal);
  });
}

function openNewCaseModal() {
  if (!_currentProfile?.tenant_id) {
    alert('Profil korisnika nema tenant_id. Osveži stranicu.');
    return;
  }
  closeModal();
  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div><h3>Novi predmet</h3><p class="muted">Unesi podatke o novom predmetu</p></div>
        <button id="modal-close" class="btn btn-secondary">Zatvori</button>
      </div>
      <form id="new-case-form">
        <div class="modal-grid">
          <div class="field">
            <label for="nc-number">Broj predmeta *</label>
            <input id="nc-number" name="case_number" class="input" type="text" placeholder="npr. IV-123/2025" required autocomplete="off" />
          </div>
          <div class="field">
            <label for="nc-status">Status</label>
            <select id="nc-status" name="status" class="select">
              ${CASE_STATUS_OPTIONS.map(v => `<option value="${v}" ${v==='prijem'?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field full">
            <label for="nc-title">Naziv / predmet</label>
            <input id="nc-title" name="title" class="input" type="text" placeholder="Kratki naziv" autocomplete="off" />
          </div>
          <div class="field">
            <label for="nc-court">Sudska oznaka</label>
            <input id="nc-court" name="court_case_number" class="input" type="text" placeholder="Iv 12/2025" autocomplete="off" />
          </div>
          <div class="field">
            <label for="nc-priority">Prioritet</label>
            <select id="nc-priority" name="priority_level" class="select">
              ${CASE_PRIORITY_OPTIONS.map(v => `<option value="${v}" ${v==='normal'?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="nc-amount">Iznos potraživanja (RSD)</label>
            <input id="nc-amount" name="claim_amount" class="input" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="field">
            <label for="nc-basis">Tip isprave</label>
            <select id="nc-basis" name="document_basis_type" class="select">
              <option value="">— nije odabrano —</option>
              ${DOCUMENT_BASIS_TYPE_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="nc-received">Datum prijema</label>
            <input id="nc-received" name="received_at" class="input" type="date" />
          </div>
          <div class="field full">
            <label for="nc-notes">Napomena</label>
            <textarea id="nc-notes" name="notes" class="textarea" placeholder="Opcionalna napomena"></textarea>
          </div>
        </div>
        <div id="new-case-notice"></div>
        <div class="modal-actions">
          <button type="button" id="cancel-case-btn" class="btn btn-secondary">Otkaži</button>
          <button type="submit" id="save-case-btn" class="btn btn-primary">Kreiraj predmet</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('nc-received').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cancel-case-btn')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.getElementById('new-case-form')?.addEventListener('submit', handleNewCaseSubmit);
  document.getElementById('nc-number')?.focus();
}

async function handleNewCaseSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const notice = document.getElementById('new-case-notice');
  const saveBtn = document.getElementById('save-case-btn');
  const caseNumber = form.case_number.value.trim();
  if (!caseNumber) { showNotice(notice, 'error', 'Broj predmeta je obavezan.'); return; }
  const tenantId = _currentProfile?.tenant_id;
  if (!tenantId) { showNotice(notice, 'error', 'Tenant nije određen.'); return; }
  const claimAmountRaw = form.claim_amount.value;
  const payload = {
    tenant_id: tenantId,
    case_number: caseNumber,
    status: form.status.value || 'prijem',
    priority_level: form.priority_level.value || 'normal',
    created_by: _currentProfile.id,
    title: form.title.value.trim() || null,
    court_case_number: form.court_case_number.value.trim() || null,
    claim_amount: claimAmountRaw !== '' ? parseFloat(claimAmountRaw) : null,
    document_basis_type: form.document_basis_type.value || null,
    received_at: form.received_at.value || null,
    notes: form.notes.value.trim() || null
  };
  Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });
  try {
    saveBtn.disabled = true; saveBtn.textContent = 'Kreiranje...';
    const { data, error } = await db.from('cases').insert([payload]).select('id, case_number').single();
    if (error) throw error;
    showNotice(notice, 'success', `Predmet ${data.case_number} je uspešno kreiran.`);
    showToast(`✅ Predmet ${data.case_number} kreiran`);
    currentSelectedCaseId = String(data.id);
    await loadCasesWorkspace();
    await loadDashboard();
    setTimeout(closeModal, 1000);
  } catch (err) {
    logError('NEW_CASE', err);
    showNotice(notice, 'error', getErrorMessage(err));
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Kreiraj predmet';
  }
}

// ─── NOVI ROK MODAL ──────────────────────────────────────────────────────────
function openNewDeadlineModal(caseId) {
  if (!_currentProfile?.tenant_id) return;
  closeModal();
  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:480px;">
      <div class="modal-head">
        <div><h3>Novi rok</h3><p class="muted">Dodaj rok za ovaj predmet</p></div>
        <button id="modal-close" class="btn btn-secondary">Zatvori</button>
      </div>
      <form id="new-deadline-form">
        <div class="modal-grid">
          <div class="field full">
            <label>Naslov roka *</label>
            <input name="title" class="input" type="text" placeholder="npr. Rok za prigovor" required />
          </div>
          <div class="field">
            <label>Tip roka</label>
            <select name="deadline_type" class="select">
              ${DEADLINE_TYPE_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Datum roka *</label>
            <input name="due_date" class="input" type="date" required />
          </div>
          <div class="field full">
            <label>Napomena</label>
            <textarea name="notes" class="textarea" style="min-height:70px;" placeholder="Opcionalno"></textarea>
          </div>
        </div>
        <div id="deadline-notice"></div>
        <div class="modal-actions">
          <button type="button" id="cancel-deadline-btn" class="btn btn-secondary">Otkaži</button>
          <button type="submit" id="save-deadline-btn" class="btn btn-primary">Sačuvaj rok</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cancel-deadline-btn')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.getElementById('new-deadline-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const notice = document.getElementById('deadline-notice');
    const saveBtn = document.getElementById('save-deadline-btn');
    const title = form.title.value.trim();
    const dueDate = form.due_date.value;
    if (!title || !dueDate) { showNotice(notice, 'error', 'Naslov i datum su obavezni.'); return; }
    const payload = {
      case_id: caseId,
      tenant_id: _currentProfile.tenant_id,
      created_by: _currentProfile.id,
      title, deadline_type: form.deadline_type.value,
      due_date: dueDate, status: 'open',
      notes: form.notes.value.trim() || null
    };
    try {
      saveBtn.disabled = true; saveBtn.textContent = 'Čuvanje...';
      const { error } = await db.from('case_deadlines').insert([payload]);
      if (error) throw error;
      showNotice(notice, 'success', 'Rok je sačuvan.');
      showToast('✅ Rok dodat');
      await loadSelectedCaseDetail(caseId);
      setTimeout(closeModal, 900);
    } catch (err) {
      logError('NEW_DEADLINE', err);
      showNotice(notice, 'error', getErrorMessage(err));
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Sačuvaj rok';
    }
  });
}

// ─── ROKOVI VIEW ─────────────────────────────────────────────────────────────
async function loadDeadlinesView() {
  const tbody = document.getElementById('deadlines-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="color:var(--muted);padding:20px;text-align:center;">Učitavanje…</td></tr>`;
  try {
    const { data, error } = await db
      .from('case_deadlines')
      .select('*, cases(case_number, title)')
      .eq('tenant_id', _currentProfile.tenant_id)
      .order('due_date', { ascending: true })
      .range(0, 99);
    if (error) throw error;
    const rows = data || [];
    const today = new Date().toISOString().slice(0, 10);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--muted);padding:20px;text-align:center;">Nema rokova.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(d => {
      const dueDate = d.due_date;
      const daysLeft = dueDate ? Math.ceil((new Date(dueDate) - new Date(today)) / 86400000) : null;
      let daysText = '-', rowStatus = d.status;
      if (daysLeft !== null) {
        if (daysLeft < 0) { daysText = `${Math.abs(daysLeft)} dana kasni`; rowStatus = 'overdue'; }
        else if (daysLeft === 0) { daysText = 'Danas'; rowStatus = 'due_today'; }
        else daysText = `${daysLeft} dana`;
      }
      return `
        <tr>
          <td>${safe(d.cases?.case_number || '-')}</td>
          <td>${safe(d.title)}</td>
          <td>${formatDateOnly(dueDate)}</td>
          <td><strong>${daysText}</strong></td>
          <td>${getDeadlineBadge(rowStatus)}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    logError('DEADLINES_VIEW', err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);padding:20px;text-align:center;">${getErrorMessage(err)}</td></tr>`;
  }
}

// ─── DOKUMENTA VIEW ──────────────────────────────────────────────────────────
async function loadDocumentsView() {
  const tbody = document.getElementById('documents-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="color:var(--muted);padding:20px;text-align:center;">Učitavanje…</td></tr>`;
  try {
    const { data, error } = await db
      .from('documents')
      .select('*, cases(case_number)')
      .eq('tenant_id', _currentProfile.tenant_id)
      .order('uploaded_at', { ascending: false })
      .range(0, 99);
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--muted);padding:20px;text-align:center;">Nema dokumenata.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(doc => `
      <tr>
        <td>${safe(doc.title || doc.file_name)}</td>
        <td>${safe(doc.cases?.case_number)}</td>
        <td>${safe(doc.document_type || doc.source)}</td>
        <td>${formatDate(doc.uploaded_at)}</td>
        <td><span class="status ${statusClass(doc.ocr_status)}">${safe(doc.ocr_status)}</span></td>
      </tr>`).join('');
  } catch (err) {
    logError('DOCUMENTS_VIEW', err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);padding:20px;text-align:center;">${getErrorMessage(err)}</td></tr>`;
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  injectEnhancements();
  wireLoginForm();
  wireLogout();

  // Proveri da li već postoji aktivna sesija pri učitavanju
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const profile = await loadCurrentProfile();
    if (profile) {
      showApp(profile);
      wireSidebarNavigation();
      wireNewCaseButton();
      await loadDashboard();
      _initDone = true;
    }
  }

  db.auth.onAuthStateChange(async (event, session) => {
    console.log('[IZVPRO] Auth event:', event);

    if (event === 'SIGNED_OUT' || !session) {
      _currentProfile = null;
      _initDone = false;
      showLogin();
      return;
    }

    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !_initDone) {
      const profile = await loadCurrentProfile();
      if (!profile) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) { errorEl.textContent = 'Profil nije pronađen. Kontaktiraj administratora.'; errorEl.style.display = 'block'; }
        await db.auth.signOut();
        return;
      }
      if (profile.is_active === false) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) { errorEl.textContent = 'Vaš nalog je deaktiviran.'; errorEl.style.display = 'block'; }
        await db.auth.signOut();
        return;
      }
      _initDone = true;
      showApp(profile);
      wireSidebarNavigation();
      wireNewCaseButton();
      await loadDashboard();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
