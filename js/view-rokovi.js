// js/view-rokovi.js
// Rokovi view — IZVPRO MVP

const DEADLINE_STATUS_CONFIG = {
  overdue:   { label: 'Prekoračen',  cls: 'status-overdue',   priority: 1 },
  today:     { label: 'Danas',       cls: 'status-today',     priority: 2 },
  tomorrow:  { label: 'Sutra',       cls: 'status-tomorrow',  priority: 3 },
  this_week: { label: 'Ova nedelja', cls: 'status-week',      priority: 4 },
  upcoming:  { label: 'Nadolazeći',  cls: 'status-upcoming',  priority: 5 },
  completed: { label: 'Završen',     cls: 'status-completed', priority: 6 },
};

let _allDeadlines = [];
let _activeFilter = 'open';

export async function initRokoviView(supabase, profile) {
  const container = document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = renderRokoviShell();
  bindRokoviEvents(supabase, profile);
  await loadDeadlines(supabase, profile);
}

function renderRokoviShell() {
  return `
    <div class="view-rokovi">
      <div class="view-header">
        <div class="view-header-left">
          <h1 class="view-title">Rokovi</h1>
          <span class="view-subtitle" id="rokovi-count">Učitavam...</span>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-novi-rok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novi rok
        </button>
      </div>

      <div class="rokovi-kpis" id="rokovi-kpis">
        <div class="kpi-card kpi-overdue skeleton-box"></div>
        <div class="kpi-card kpi-today skeleton-box"></div>
        <div class="kpi-card kpi-week skeleton-box"></div>
        <div class="kpi-card kpi-open skeleton-box"></div>
      </div>

      <div class="rokovi-filters">
        <button class="filter-btn active" data-filter="open">Otvoreni</button>
        <button class="filter-btn" data-filter="overdue">Prekoračeni</button>
        <button class="filter-btn" data-filter="today">Danas</button>
        <button class="filter-btn" data-filter="tomorrow">Sutra</button>
        <button class="filter-btn" data-filter="this_week">Ova nedelja</button>
        <button class="filter-btn" data-filter="completed">Završeni</button>
        <button class="filter-btn" data-filter="all">Svi</button>
      </div>

      <div class="rokovi-table-wrap">
        <table class="rokovi-table" id="rokovi-table">
          <thead>
            <tr>
              <th class="col-status">Status</th>
              <th class="col-datum">Rok</th>
              <th class="col-predmet">Predmet</th>
              <th class="col-title">Opis roka</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody id="rokovi-tbody">
            <tr><td colspan="5" class="table-loading">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </td></tr>
          </tbody>
        </table>

        <div class="empty-state" id="rokovi-empty" style="display:none">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>Nema rokova za izabrani filter</p>
        </div>
      </div>
    </div>

    <!-- Modal: Novi rok -->
    <div class="modal-overlay" id="modal-novi-rok" style="display:none" role="dialog" aria-modal="true" aria-labelledby="modal-novi-rok-title">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-novi-rok-title">Novi rok</h2>
          <button class="modal-close" id="btn-close-novi-rok" aria-label="Zatvori">&times;</button>
        </div>
        <form id="form-novi-rok" class="modal-body" novalidate>
          <div class="form-group">
            <label for="nr-case-number">Predmet *</label>
            <input type="text" id="nr-case-number" class="form-control" 
              placeholder="Broj predmeta (npr. IIIr-123/2025)" required autocomplete="off">
            <div class="field-error" id="nr-case-error"></div>
          </div>
          <div class="form-group">
            <label for="nr-deadline-type">Tip roka *</label>
            <select id="nr-deadline-type" class="form-control" required>
              <option value="">— Izaberi tip —</option>
              <option value="odluka_po_predlogu">Odluka po predlogu</option>
              <option value="unos_u_evidenciju">Unos u evidenciju</option>
              <option value="dostava_zakljucka_o_predujmu">Dostava zaključka o predujmu</option>
              <option value="prigovor">Prigovor</option>
              <option value="dostava">Dostava</option>
              <option value="predujam">Predujam</option>
              <option value="zakljucak">Zaključak</option>
              <option value="namirenje">Namirenje</option>
              <option value="arhiviranje">Arhiviranje</option>
              <option value="interni_rok">Interni rok</option>
            </select>
          </div>
          <div class="form-group">
            <label for="nr-title">Opis *</label>
            <input type="text" id="nr-title" class="form-control" 
              placeholder="Kratki opis roka" required maxlength="200">
          </div>
          <div class="form-group">
            <label for="nr-due-date">Datum roka *</label>
            <input type="date" id="nr-due-date" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="nr-notes">Napomena</label>
            <textarea id="nr-notes" class="form-control" rows="2" 
              placeholder="Opciono..." maxlength="500"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="btn-cancel-novi-rok">Otkaži</button>
            <button type="submit" class="btn btn-primary" id="btn-save-novi-rok">Sačuvaj rok</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function loadDeadlines(supabase, profile) {
  try {
    const { data, error } = await supabase
      .from('v_deadlines_dashboard')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    _allDeadlines = data || [];
    renderKpis(_allDeadlines);
    applyFilter(_activeFilter);

  } catch (err) {
    console.error('[Rokovi] Greška pri učitavanju:', err);
    const tbody = document.getElementById('rokovi-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-error">
        Greška pri učitavanju rokova: ${err.message}
      </td></tr>`;
    }
  }
}

function renderKpis(deadlines) {
  const counts = {
    overdue:   deadlines.filter(d => d.dashboard_status === 'overdue').length,
    today:     deadlines.filter(d => d.dashboard_status === 'today').length,
    this_week: deadlines.filter(d => d.dashboard_status === 'this_week').length,
    open:      deadlines.filter(d => d.dashboard_status !== 'completed').length,
  };

  const kpisEl = document.getElementById('rokovi-kpis');
  if (!kpisEl) return;

  kpisEl.innerHTML = `
    <button class="kpi-card kpi-overdue ${counts.overdue > 0 ? 'kpi-alert' : ''}" 
      data-filter="overdue" onclick="window.__rokoviFilter('overdue')">
      <span class="kpi-number">${counts.overdue}</span>
      <span class="kpi-label">Prekoračeni</span>
    </button>
    <button class="kpi-card kpi-today ${counts.today > 0 ? 'kpi-warn' : ''}"
      data-filter="today" onclick="window.__rokoviFilter('today')">
      <span class="kpi-number">${counts.today}</span>
      <span class="kpi-label">Danas</span>
    </button>
    <button class="kpi-card kpi-week"
      data-filter="this_week" onclick="window.__rokoviFilter('this_week')">
      <span class="kpi-number">${counts.this_week}</span>
      <span class="kpi-label">Ova nedelja</span>
    </button>
    <button class="kpi-card kpi-open"
      data-filter="open" onclick="window.__rokoviFilter('open')">
      <span class="kpi-number">${counts.open}</span>
      <span class="kpi-label">Ukupno otvoreni</span>
    </button>
  `;
}

function applyFilter(filter) {
  _activeFilter = filter;

  // Sync filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  let filtered;
  if (filter === 'all') {
    filtered = _allDeadlines;
  } else if (filter === 'open') {
    filtered = _allDeadlines.filter(d => d.dashboard_status !== 'completed');
  } else {
    filtered = _allDeadlines.filter(d => d.dashboard_status === filter);
  }

  const countEl = document.getElementById('rokovi-count');
  if (countEl) countEl.textContent = `${filtered.length} rokova`;

  renderTable(filtered);
}

function renderTable(deadlines) {
  const tbody = document.getElementById('rokovi-tbody');
  const emptyEl = document.getElementById('rokovi-empty');
  if (!tbody) return;

  if (deadlines.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = deadlines.map(d => {
    const cfg = DEADLINE_STATUS_CONFIG[d.dashboard_status] || 
                DEADLINE_STATUS_CONFIG.upcoming;
    const dueDateFmt = formatDate(d.due_date);
    const daysLabel  = getDaysLabel(d.due_date, d.dashboard_status);

    return `
      <tr class="deadline-row ${cfg.cls}" data-id="${d.id}">
        <td class="col-status">
          <span class="deadline-badge ${cfg.cls}">${cfg.label}</span>
        </td>
        <td class="col-datum">
          <span class="due-date">${dueDateFmt}</span>
          <span class="days-label">${daysLabel}</span>
        </td>
        <td class="col-predmet">
          <a class="case-link" href="#" 
            onclick="window.__openCase('${d.case_id}'); return false;">
            ${escHtml(d.case_number || '—')}
          </a>
        </td>
        <td class="col-title">${escHtml(d.title || '—')}</td>
        <td class="col-actions">
          ${d.dashboard_status !== 'completed' ? `
            <button 
              class="btn-complete" 
              title="Označi kao završen"
              onclick="window.__completeDeadline('${d.id}', this)"
              aria-label="Završi rok">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          ` : `<span class="completed-check">✓</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

function bindRokoviEvents(supabase, profile) {
  // Filter dugmad
  document.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (btn && btn.dataset.filter) {
      applyFilter(btn.dataset.filter);
    }
  });

  // Novi rok modal
  document.getElementById('btn-novi-rok')?.addEventListener('click', () => {
    openNoviRokModal();
  });
  document.getElementById('btn-close-novi-rok')?.addEventListener('click', closeNoviRokModal);
  document.getElementById('btn-cancel-novi-rok')?.addEventListener('click', closeNoviRokModal);

  document.getElementById('modal-novi-rok')?.addEventListener('click', e => {
    if (e.target.id === 'modal-novi-rok') closeNoviRokModal();
  });

  // Form submit
  document.getElementById('form-novi-rok')?.addEventListener('submit', async e => {
    e.preventDefault();
    await saveNoviRok(supabase, profile);
  });

  // Globalni handler: završi rok
  window.__completeDeadline = async (deadlineId, btn) => {
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;

    try {
      const { error } = await supabase
        .from('case_deadlines')
        .update({ 
          status: 'done', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', deadlineId);

      if (error) throw error;

      // Ukloni red sa animacijom
      const row = btn.closest('tr');
      row.style.transition = 'opacity 0.3s, transform 0.3s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      setTimeout(() => {
        // Osvježi podatke
        loadDeadlines(supabase, profile);
      }, 320);

    } catch (err) {
      console.error('[Rokovi] Greška pri zatvaranju:', err);
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      alert('Greška: ' + err.message);
    }
  };

  // Globalni handler: filter iz KPI kartica
  window.__rokoviFilter = (filter) => applyFilter(filter);
}

function openNoviRokModal() {
  const modal = document.getElementById('modal-novi-rok');
  if (!modal) return;
  // Postavi default datum na danas
  const dateInput = document.getElementById('nr-due-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  modal.style.display = 'flex';
  document.getElementById('nr-case-number')?.focus();
}

function closeNoviRokModal() {
  const modal = document.getElementById('modal-novi-rok');
  if (modal) modal.style.display = 'none';
  document.getElementById('form-novi-rok')?.reset();
  document.getElementById('nr-case-error').textContent = '';
}

async function saveNoviRok(supabase, profile) {
  const caseNumberRaw = document.getElementById('nr-case-number')?.value.trim();
  const deadlineType  = document.getElementById('nr-deadline-type')?.value;
  const title         = document.getElementById('nr-title')?.value.trim();
  const dueDate       = document.getElementById('nr-due-date')?.value;
  const notes         = document.getElementById('nr-notes')?.value.trim();

  // Validacija
  if (!caseNumberRaw || !deadlineType || !title || !dueDate) {
    alert('Popunite sva obavezna polja.');
    return;
  }

  const saveBtn = document.getElementById('btn-save-novi-rok');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Čuvam...';

  try {
    // Pronađi case_id po broju predmeta
    const { data: cases, error: caseErr } = await supabase
      .from('cases')
      .select('id, tenant_id')
      .ilike('case_number', caseNumberRaw)
      .limit(1);

    if (caseErr) throw caseErr;

    if (!cases || cases.length === 0) {
      document.getElementById('nr-case-error').textContent = 
        'Predmet nije pronađen. Proverite broj predmeta.';
      return;
    }

    const caseRow = cases[0];

    const { error: insertErr } = await supabase
      .from('case_deadlines')
      .insert({
        case_id:       caseRow.id,
        tenant_id:     caseRow.tenant_id,
        deadline_type: deadlineType,
        title:         title,
        due_date:      dueDate,
        notes:         notes || null,
        status:        'open',
        created_by:    profile.id
      });

    if (insertErr) throw insertErr;

    closeNoviRokModal();
    await loadDeadlines(supabase, profile);

  } catch (err) {
    console.error('[Rokovi] Greška pri čuvanju:', err);
    alert('Greška: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Sačuvaj rok';
  }
}

// --- Helpers ---

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('sr-RS', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
}

function getDaysLabel(dateStr, status) {
  if (status === 'completed') return '';
  if (!dateStr) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0)  return `${Math.abs(diff)} dan${Math.abs(diff) === 1 ? '' : 'a'} kasni`;
  if (diff === 0) return 'danas';
  if (diff === 1) return 'sutra';
  return `za ${diff} dana`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
