const state = {
  user: null,
  settings: null,
  sections: [],
  blockTypes: {},
  uptime: null,
  buttons: [],
  socials: [],
  media: [],
  sources: [],
  kalender: [],
  guru: [],
  users: [],
  pickerTarget: null,
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const THEME_OPTIONS = ['blue', 'teal', 'violet', 'emerald', 'rose', 'amber', 'cyan', 'indigo', 'green', 'red', 'pink', 'slate'];
const ICON_OPTIONS = ['bi-link-45deg', 'bi-grid', 'bi-book', 'bi-people', 'bi-folder2-open', 'bi-mortarboard', 'bi-globe', 'bi-camera-video', 'bi-bar-chart', 'bi-pencil-square', 'bi-database', 'bi-star', 'bi-book-half', 'bi-stars', 'bi-controller', 'bi-journal-bookmark', 'bi-code-slash', 'bi-tree', 'bi-newspaper'];

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const THEME_COLORS = {
  blue: '#3b82f6', teal: '#14b8a6', violet: '#8b5cf6', emerald: '#10b981', rose: '#f43f5e',
  amber: '#f59e0b', cyan: '#06b6d4', indigo: '#6366f1', green: '#22c55e', red: '#ef4444',
  pink: '#ec4899', slate: '#64748b',
};

function initials(name) {
  const words = String(name || '').trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function buttonThumb(b) {
  if (b.image) return `<img class="thumb" src="${esc(b.image)}" alt="" />`;
  const icon = String(b.icon || '').trim();
  if (icon && icon !== 'bi-link-45deg') {
    return `<div class="thumb flex items-center justify-center"><i class="${esc(icon)} text-xl"></i></div>`;
  }
  const color = THEME_COLORS[b.warna] || THEME_COLORS.blue;
  return `<div class="thumb flex items-center justify-center font-black text-sm" style="color:${color}">${esc(initials(b.nama))}</div>`;
}

async function api(method, url, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body && !isForm) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  else if (body && isForm) { opts.body = body; }
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch (e) { /* noop */ }
  if (res.status === 401) { showLogin(); throw new Error(data.message || 'Sesi berakhir, silakan login ulang'); }
  if (!res.ok) throw new Error(data.message || 'HTTP ' + res.status);
  return data;
}

function toast(message, type = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.className = 'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-lg text-white font-semibold ' + (type === 'error' ? 'bg-red-500' : 'bg-emerald-500');
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

/* ===== Modal & helpers ===== */
function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-box').innerHTML = ''; }
function modalForm(title, fieldsHtml, submitLabel = 'Simpan') {
  return `<form id="modal-form" class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-black">${esc(title)}</h3>
      <button type="button" data-action="close-modal" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
    </div>
    <div class="space-y-4">${fieldsHtml}</div>
    <div class="flex justify-end gap-2 pt-2">
      <button type="button" data-action="close-modal" class="btn-mini">Batal</button>
      <button type="submit" class="btn-primary">${esc(submitLabel)}</button>
    </div></form>`;
}
function field(label, html) { return `<label class="block"><span class="lbl">${esc(label)}</span>${html}</label>`; }
function options(list, selected) {
  return list.map((v) => `<option value="${esc(v)}" ${selected === v ? 'selected' : ''}>${esc(v)}</option>`).join('');
}
function iconInput(name, value) {
  return `<input name="${name}" list="icon-list" class="inp" value="${esc(value || 'bi-link-45deg')}" />
    <datalist id="icon-list">${ICON_OPTIONS.map((i) => `<option value="${i}"></option>`).join('')}</datalist>`;
}
function collectForm(form) {
  const data = {};
  Array.from(form.elements).forEach((el) => {
    if (!el.name || el.name === '__upload') return;
    data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return data;
}
function linesToArray(v) { return String(v || '').split('\n').map((x) => x.trim()).filter(Boolean); }
function arrayToLines(a) { return (Array.isArray(a) ? a : []).join('\n'); }
function quickToText(qs) { return (Array.isArray(qs) ? qs : []).map((q) => `${q.label} | ${q.message}`).join('\n'); }
function textToQuick(t) {
  return String(t || '').split('\n').map((l) => {
    const p = l.split('|');
    return { label: (p[0] || '').trim(), message: p.slice(1).join('|').trim() };
  }).filter((q) => q.label && q.message);
}

/* ===== Auth ===== */
function showLogin() { $('#login-view').classList.remove('hidden'); $('#app-view').classList.add('hidden'); }
function showApp() { $('#login-view').classList.add('hidden'); $('#app-view').classList.remove('hidden'); }

async function init() {
  try {
    const res = await api('GET', '/api/auth/me');
    if (res.user) { state.user = res.user; startApp(); } else showLogin();
  } catch { showLogin(); }
}

function startApp() {
  showApp();
  $('#current-user').textContent = state.user.nama || state.user.username;
  const isAdmin = state.user.role === 'admin';
  $$('.tab-btn[data-role="admin"]').forEach((b) => b.classList.toggle('hidden', !isAdmin));
  activateTab('konten');
}

function activateTab(name) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
  const loaders = {
    konten: loadKonten,
    kalender: loadKalender,
    guru: loadGuru,
    media: loadMedia,
    sources: loadSources,
    ai: loadSettings,
    users: loadUsers,
    logs: loadAccessLogs,
  };
  if (loaders[name]) loaders[name]();
}

/* ===== Sections ===== */
async function loadKonten() {
  const [blocks, socials, types] = await Promise.all([
    api('GET', '/api/admin/sections'),
    api('GET', '/api/admin/socials'),
    api('GET', '/api/admin/sections/types'),
  ]);
  state.sections = blocks.data;
  state.blockTypes = types.data;
  state.socials = socials.data;
  state.buttons = state.sections.flatMap((s) => s.buttons || []);
  try {
    const st = await api('GET', '/api/status');
    state.uptime = { enabled: st.enabled !== false, byUrl: {} };
    (st.monitors || []).forEach((m) => { if (m.url) state.uptime.byUrl[normalizeUrl(m.url)] = m; });
  } catch (e) {
    state.uptime = { enabled: false, byUrl: {} };
  }
  renderBlocks();
  renderButtons();
  renderSocials();
}

function normalizeUrl(u) {
  return (u || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function uptimeBadge(b) {
  if (!state.uptime || !state.uptime.enabled) return '<span class="text-slate-300">&mdash;</span>';
  const mon = state.uptime.byUrl[normalizeUrl(b.uptime_url || b.url)];
  if (!mon) return '<span class="badge">Tak dipantau</span>';
  const label = mon.status === 1 ? 'Online' : (mon.status === 3 ? 'Pemeliharaan' : 'Offline');
  const cls = mon.status === 1 ? 'on' : (mon.status === 3 ? '' : 'off');
  return `<span class="badge ${cls}">${label}</span>`;
}

function isStructural(b) { return !!(state.blockTypes[b.tipe] || {}).structural; }
function blockTypeLabel(tipe) { return (state.blockTypes[tipe] || {}).label || tipe; }

function blockRow(b) {
  const structural = isStructural(b);
  const dragCell = structural ? '<td></td>' : '<td class="drag-handle" title="Geser untuk mengubah urutan">⠿</td>';
  const upDown = structural
    ? ''
    : `<button class="btn-mini" data-action="block-up" data-id="${b.id}">&uarr;</button>
       <button class="btn-mini" data-action="block-down" data-id="${b.id}">&darr;</button>`;
  const del = structural ? '' : `<button class="btn-danger" data-action="del-block" data-id="${b.id}">Hapus</button>`;
  return `<tr data-block-id="${b.id}" data-structural="${structural ? '1' : '0'}" ${structural ? '' : 'draggable="true"'}>
    ${dragCell}
    <td><span class="badge">${esc(blockTypeLabel(b.tipe))}</span></td>
    <td class="font-bold">${esc(b.judul)}</td>
    <td>${b.tipe === 'apps' ? esc(b.gaya) : '-'}</td>
    <td>${b.urutan}</td>
    <td><button class="badge badge-toggle ${b.aktif ? 'on' : 'off'}" data-action="toggle-block" data-id="${b.id}" title="Klik untuk ubah status">${b.aktif ? 'Aktif' : 'Off'}</button></td>
    <td class="whitespace-nowrap">
      ${upDown}
      <button class="btn-mini" data-action="edit-block" data-id="${b.id}">Edit</button>
      ${del}
    </td></tr>`;
}

function renderBlocks() {
  const content = state.sections.filter((b) => !isStructural(b));
  const structural = state.sections.filter(isStructural);
  const head = '<thead><tr><th></th><th>Tipe</th><th>Judul</th><th>Gaya</th><th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead>';
  const empty = '<tr><td colspan="7" class="text-center text-slate-400 py-6">Belum ada blok</td></tr>';
  $('#blocks-table').innerHTML = head + '<tbody>' + (content.map(blockRow).join('') || empty) + '</tbody>';
  $('#blocks-structural-table').innerHTML = head + '<tbody>' + (structural.map(blockRow).join('') || empty) + '</tbody>';
  bindBlockDrag();
}

function bindBlockDrag() {
  const tbody = $('#blocks-table tbody');
  if (!tbody) return;
  let dragId = null;
  tbody.querySelectorAll('tr[draggable="true"]').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      dragId = row.dataset.blockId;
      row.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.classList.remove('dragging');
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!dragId || dragId === row.dataset.blockId) return;
      const ids = Array.from(tbody.querySelectorAll('tr')).map((r) => Number(r.dataset.blockId));
      const from = ids.indexOf(Number(dragId));
      const to = ids.indexOf(Number(row.dataset.blockId));
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      try {
        await api('PUT', '/api/admin/sections/reorder', { order: ids });
        toast('Urutan disimpan');
        loadKonten();
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function moveBlock(id, dir) {
  const content = state.sections.filter((b) => !isStructural(b)).map((b) => b.id);
  const from = content.indexOf(id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= content.length) return;
  content.splice(to, 0, content.splice(from, 1)[0]);
  try {
    await api('PUT', '/api/admin/sections/reorder', { order: content });
    toast('Urutan disimpan');
    loadKonten();
  } catch (err) { toast(err.message, 'error'); }
}

const ARRAY_CFG = new Set(['logos', 'badges']);
const NUM_CFG = new Set(['limit']);

function blockConfigFields(tipe, cfg) {
  const c = cfg || {};
  const t = (name, label, value, ph) => field(label, `<input name="cfg_${name}" class="inp" placeholder="${esc(ph || '')}" value="${esc(value || '')}" />`);
  const ta = (name, label, value, rows) => field(label, `<textarea name="cfg_${name}" rows="${rows || 3}" class="inp">${esc(value || '')}</textarea>`);
  switch (tipe) {
    case 'nav':
      return t('brand_prefix', 'Teks Brand (awalan)', c.brand_prefix)
        + t('brand_suffix', 'Teks Brand (akhiran)', c.brand_suffix)
        + t('login_label', 'Label Tombol Login', c.login_label)
        + ta('logos', 'Logo Navbar (satu URL per baris)', arrayToLines(c.logos));
    case 'hero':
      return ta('badges', 'Logo Badge (satu URL per baris)', arrayToLines(c.badges), 2)
        + t('logo', 'Logo Utama', c.logo)
        + t('logo_url', 'Link Logo Utama', c.logo_url)
        + t('school', 'Nama Sekolah', c.school)
        + t('official_prefix', 'Teks Sebelum Link', c.official_prefix)
        + t('official_label', 'Label Situs Resmi', c.official_label)
        + t('official_url', 'URL Situs Resmi', c.official_url)
        + t('typing_title_1', 'Teks Animasi Baris 1', c.typing_title_1)
        + t('typing_title_2', 'Teks Animasi Baris 2', c.typing_title_2)
        + t('typing_subtitle', 'Subjudul Animasi', c.typing_subtitle);
    case 'search':
      return t('placeholder', 'Placeholder Pencarian', c.placeholder);
    case 'kalender':
      return field('Jumlah Ditampilkan', `<input name="cfg_limit" type="number" class="inp" value="${c.limit || 3}" />`);
    case 'berita':
      return field('Sumber Data (key)', `<input name="cfg_source" class="inp" value="${esc(c.source || 'berita')}" />`)
        + field('Jumlah Berita', `<input name="cfg_limit" type="number" class="inp" value="${c.limit || 12}" />`)
        + t('link_url', 'URL Lihat Semua', c.link_url)
        + t('link_label', 'Label Lihat Semua', c.link_label);
    case 'banner':
      return t('url', 'URL Banner', c.url) + t('logo', 'Logo Banner', c.logo)
        + t('label', 'Label Kecil', c.label) + t('pre', 'Kata Awal', c.pre)
        + t('hi1', 'Kata Gradien 1', c.hi1) + t('hi2', 'Kata Gradien 2', c.hi2);
    case 'location':
      return t('title', 'Nama Lokasi', c.title) + t('address', 'Alamat', c.address)
        + ta('map_embed', 'URL Embed Google Maps', c.map_embed, 2)
        + t('directions_url', 'URL Petunjuk Arah', c.directions_url);
    case 'footer':
      return ta('logos', 'Logo Footer (satu URL per baris)', arrayToLines(c.logos))
        + t('brand_title', 'Judul Brand', c.brand_title) + t('brand_sub', 'Sub Judul Brand', c.brand_sub)
        + t('copyright', 'Copyright', c.copyright) + t('status_text', 'Teks Status', c.status_text);
    case 'chat':
      return t('label', 'Label Melayang', c.label) + t('header', 'Judul Panel', c.header)
        + t('welcome', 'Sapaan', c.welcome) + t('placeholder', 'Placeholder Input', c.placeholder)
        + ta('quick_questions', 'Pertanyaan Cepat (Label | Pesan per baris)', quickToText(c.quick_questions), 5);
    case 'html':
      return ta('konten', 'Konten HTML', c.konten, 8);
    default:
      return '';
  }
}

function blockForm(b = {}) {
  const tipe = b.tipe || 'apps';
  const structural = !!(state.blockTypes[tipe] || {}).structural;
  const slugField = b.id ? '' : field('Slug', `<input name="slug" required class="inp font-mono" value="${esc(b.slug || '')}" />`);
  const appsFields = tipe === 'apps'
    ? `<div class="grid grid-cols-2 gap-4">
        ${field('Gaya', `<select name="gaya" class="inp">${options(['grid', 'list', 'pill', 'pillSmall'], b.gaya || 'grid')}</select>`)}
        ${field('Warna', `<select name="warna" class="inp">${options(THEME_OPTIONS, b.warna || 'blue')}</select>`)}
      </div>
      ${field('Ikon', iconInput('ikon', b.ikon))}`
    : '';
  const urutanField = structural ? '' : field('Urutan', `<input name="urutan" type="number" class="inp" value="${b.urutan || 0}" />`);
  return modalForm(b.id ? 'Edit Blok: ' + blockTypeLabel(tipe) : 'Tambah Blok: ' + blockTypeLabel(tipe), `
    <input type="hidden" name="tipe" value="${esc(tipe)}" />
    ${slugField}
    ${field('Judul', `<input name="judul" required class="inp" value="${esc(b.judul || '')}" />`)}
    ${appsFields}
    ${blockConfigFields(tipe, b.config)}
    ${urutanField}
    <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="tampil_judul" class="h-4 w-4" ${b.tampil_judul === 0 ? '' : 'checked'} /> Tampilkan judul</label>
    <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="aktif" class="h-4 w-4" ${b.aktif === 0 ? '' : 'checked'} /> Aktif`);
}

function collectBlockConfig() {
  const out = {};
  $$('#modal-form [name^="cfg_"]').forEach((el) => {
    const key = el.name.slice(4);
    if (key === 'quick_questions') out[key] = textToQuick(el.value);
    else if (ARRAY_CFG.has(key)) out[key] = linesToArray(el.value);
    else if (NUM_CFG.has(key)) out[key] = Number(el.value) || 0;
    else out[key] = el.value.trim();
  });
  return out;
}

function afterBlockForm(form, block) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectForm(form);
    data.tampil_judul = form.tampil_judul.checked;
    data.aktif = form.aktif.checked;
    data.config = collectBlockConfig();
    try {
      if (block.id) await api('PUT', '/api/admin/sections/' + block.id, data);
      else await api('POST', '/api/admin/sections', data);
      closeModal(); toast('Blok disimpan'); loadKonten();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function addBlockMenu() {
  const present = new Set(state.sections.map((b) => b.tipe));
  const items = Object.entries(state.blockTypes || {}).filter(([tipe, meta]) => !meta.singleton || !present.has(tipe));
  openModal(`<div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-black">Tambah Blok</h3>
      <button data-action="close-modal" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      ${items.map(([tipe, meta]) => `<button type="button" class="btn-ghost justify-center" data-action="new-block" data-tipe="${esc(tipe)}">${esc(meta.label)}</button>`).join('') || '<p class="text-slate-400">Semua tipe blok sudah ditambahkan.</p>'}
    </div></div>`);
}

function newBlock(tipe) {
  const meta = state.blockTypes[tipe] || {};
  const maxUrutan = state.sections.reduce((m, b) => !isStructural(b) && b.urutan < 800 ? Math.max(m, b.urutan) : m, 0);
  const block = {
    tipe,
    slug: meta.singleton ? tipe : tipe + '-' + Date.now().toString(36),
    judul: meta.label || tipe,
    gaya: 'grid',
    warna: 'blue',
    urutan: maxUrutan + 1,
    tampil_judul: 1,
    aktif: 1,
    config: {},
  };
  openModal(blockForm(block));
  afterBlockForm($('#modal-form'), block);
}

/* ===== Buttons ===== */
function buttonRow(b) {
  return `<tr class="button-row" data-id="${b.id}" data-section="${b.section_id}" draggable="true">
    <td class="drag-handle" title="Geser untuk mengubah urutan / pindah section">⠿</td>
    <td>${buttonThumb(b)}</td>
    <td class="font-bold">${esc(b.nama)}</td>
    <td class="max-w-[200px] truncate text-slate-500">${esc(b.deskripsi)}</td>
    <td><a href="${esc(b.url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">${esc(b.url)}</a></td>
    <td>${uptimeBadge(b)}</td>
    <td><button class="badge badge-toggle ${b.aktif ? 'on' : 'off'}" data-action="toggle-button" data-id="${b.id}" title="Klik untuk ubah status">${b.aktif ? 'Aktif' : 'Off'}</button></td>
    <td class="whitespace-nowrap">
      <button class="btn-mini" data-action="edit-button" data-id="${b.id}">Edit</button>
      <button class="btn-danger" data-action="del-button" data-id="${b.id}">Hapus</button>
    </td></tr>`;
}

function renderButtons() {
  const appsSections = state.sections.filter((s) => s.tipe === 'apps');
  const groups = appsSections.map((s) => {
    const items = state.buttons.filter((b) => b.section_id === s.id);
    const header = `<tr class="group-header" data-section="${s.id}"><td colspan="8">
      <i class="bi bi-folder2-open"></i> ${esc(s.judul)} <span class="badge">${esc(s.slug)}</span>
      <span class="text-slate-400 text-xs">${items.length} tombol</span></td></tr>`;
    const rows = items.map(buttonRow).join('');
    return header + (rows || '<tr><td colspan="8" class="text-center text-slate-400 py-4 text-xs">Belum ada tombol</td></tr>');
  }).join('');
  $('#buttons-table').innerHTML = `<thead><tr><th></th><th>Ikon</th><th>Nama</th><th>Deskripsi</th><th>URL</th><th>Uptime</th><th>Aktif</th><th>Aksi</th></tr></thead>
    <tbody>${groups || '<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada section aplikasi</td></tr>'}</tbody>`;
  bindButtonDrag();
}

function bindButtonDrag() {
  const tbody = $('#buttons-table tbody');
  if (!tbody) return;
  let dragId = null;
  tbody.querySelectorAll('tr.button-row').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      dragId = row.dataset.id;
      row.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.classList.remove('dragging');
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
    });
  });
  tbody.querySelectorAll('tr.button-row, tr.group-header').forEach((row) => {
    row.addEventListener('dragover', (e) => { if (dragId) { e.preventDefault(); row.classList.add('drag-over'); } });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const dragged = dragId ? tbody.querySelector('tr.button-row[data-id="' + dragId + '"]') : null;
      if (!dragged) return;
      if (row.classList.contains('group-header')) {
        if (dragged.dataset.section !== row.dataset.section) {
          dragged.dataset.section = row.dataset.section;
          tbody.insertBefore(dragged, row.nextElementSibling);
        }
      } else if (row !== dragged) {
        dragged.dataset.section = row.dataset.section;
        tbody.insertBefore(dragged, row);
      }
      saveButtonOrder();
    });
  });
}

async function saveButtonOrder() {
  const tbody = $('#buttons-table tbody');
  const items = Array.from(tbody.querySelectorAll('tr.button-row'))
    .map((r) => ({ id: Number(r.dataset.id), section_id: Number(r.dataset.section) }));
  try {
    await api('PUT', '/api/admin/buttons/reorder', { items });
    toast('Urutan tombol disimpan');
    loadKonten();
  } catch (err) { toast(err.message, 'error'); }
}

function buttonForm(b = {}) {
  const sectionOptions = state.sections
    .filter((s) => s.tipe === 'apps')
    .map((s) => `<option value="${s.id}" ${b.section_id === s.id ? 'selected' : ''}>${esc(s.judul)} (${esc(s.slug)})</option>`)
    .join('');
  return modalForm(b.id ? 'Edit Tombol' : 'Tambah Tombol', `
    ${field('Section', `<select name="section_id" required class="inp">${sectionOptions}</select>`)}
    ${field('Nama', `<input name="nama" required class="inp" value="${esc(b.nama || '')}" />`)}
    ${field('Deskripsi', `<input name="deskripsi" class="inp" value="${esc(b.deskripsi || '')}" />`)}
    ${field('URL', `<input name="url" required placeholder="https://" class="inp" value="${esc(b.url || '')}" />`)}
    <div class="grid grid-cols-2 gap-4">
      ${field('Ikon', iconInput('icon', b.icon))}
      ${field('Warna', `<select name="warna" class="inp">${options(THEME_OPTIONS, b.warna || 'blue')}</select>`)}
    </div>
    ${field('Logo / Gambar (opsional)', `
      <div class="flex gap-2">
        <input name="image" class="inp flex-1" placeholder="/uploads/... atau https://..." value="${esc(b.image || '')}" />
        <button type="button" class="btn-ghost" data-action="pick-image" data-target="#modal-form [name=image]">Pilih</button>
        <label class="btn-ghost cursor-pointer">Unggah<input name="__upload" type="file" accept="image/*" class="hidden" /></label>
      </div>
      <div class="mt-2">${b.image ? `<img src="${esc(b.image)}" class="h-12 rounded-lg border border-slate-200" />` : ''}</div>`)}
    ${field('URL Monitor Uptime Kuma (opsional)', `<input name="uptime_url" class="inp" placeholder="Kosongkan = cocokkan otomatis dari URL" value="${esc(b.uptime_url || '')}" />`)}
    <div class="grid grid-cols-2 gap-4">
      ${field('Urutan', `<input name="urutan" type="number" class="inp" value="${b.urutan || 0}" />`)}
      <label class="flex items-center gap-2 text-sm font-semibold mt-6"><input type="checkbox" name="aktif" class="h-4 w-4" ${b.aktif === 0 ? '' : 'checked'} /> Aktif</label>
    </div>`);
}

function afterButtonForm(form, item) {
  const upload = form.querySelector('input[name="__upload"]');
  if (upload) upload.addEventListener('change', async () => {
    if (!upload.files[0]) return;
    const fd = new FormData(); fd.append('file', upload.files[0]);
    try { const res = await api('POST', '/api/admin/media', fd, true); form.image.value = res.data.url; toast('Gambar diunggah'); }
    catch (err) { toast(err.message, 'error'); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectForm(form);
    data.section_id = Number(data.section_id);
    try {
      if (item.id) await api('PUT', '/api/admin/buttons/' + item.id, data);
      else await api('POST', '/api/admin/buttons', data);
      closeModal(); toast('Tombol disimpan'); loadKonten();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ===== Socials ===== */
function renderSocials() {
  const rows = state.socials.map((s) => `<tr>
    <td><i class="${esc(s.icon)} text-lg"></i></td>
    <td class="font-bold">${esc(s.nama)}</td>
    <td><a href="${esc(s.url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">${esc(s.url)}</a></td>
    <td>${esc(s.warna)}</td>
    <td>${s.urutan}</td>
    <td><button class="badge badge-toggle ${s.aktif ? 'on' : 'off'}" data-action="toggle-social" data-id="${s.id}" title="Klik untuk ubah status">${s.aktif ? 'Aktif' : 'Off'}</button></td>
    <td class="whitespace-nowrap">
      <button class="btn-mini" data-action="edit-social" data-id="${s.id}">Edit</button>
      <button class="btn-danger" data-action="del-social" data-id="${s.id}">Hapus</button>
    </td></tr>`).join('');
  $('#socials-table').innerHTML = `<thead><tr><th>Ikon</th><th>Nama</th><th>URL</th><th>Warna</th><th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="text-center text-slate-400 py-6">Belum ada sosial</td></tr>'}</tbody>`;
}

function socialForm(s = {}) {
  return modalForm(s.id ? 'Edit Sosial' : 'Tambah Sosial', `
    ${field('Nama', `<input name="nama" required class="inp" value="${esc(s.nama || '')}" />`)}
    ${field('URL', `<input name="url" required class="inp" value="${esc(s.url || '')}" />`)}
    <div class="grid grid-cols-3 gap-4">
      ${field('Ikon', iconInput('icon', s.icon))}
      ${field('Warna', `<select name="warna" class="inp">${options(THEME_OPTIONS, s.warna || 'slate')}</select>`)}
      ${field('Urutan', `<input name="urutan" type="number" class="inp" value="${s.urutan || 0}" />`)}
    </div>
    <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="aktif" class="h-4 w-4" ${s.aktif === 0 ? '' : 'checked'} /> Aktif</label>`);
}

/* ===== Kalender & Guru ===== */
async function loadKalender() {
  const res = await api('GET', '/api/admin/kalender');
  state.kalender = res.data;
  const rows = state.kalender.map((k) => `<tr>
    <td class="whitespace-nowrap font-semibold">${esc(k.tanggal)}${k.tanggal_selesai ? ' &ndash; ' + esc(k.tanggal_selesai) : ''}</td>
    <td>${esc(k.kegiatan)}</td>
    <td class="text-slate-500">${esc(k.keterangan)}</td>
    <td class="whitespace-nowrap"><button class="btn-mini" data-action="edit-kalender" data-id="${k.id}">Edit</button>
    <button class="btn-danger" data-action="del-kalender" data-id="${k.id}">Hapus</button></td></tr>`).join('');
  $('#kalender-table').innerHTML = `<thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Keterangan</th><th>Aksi</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="text-center text-slate-400 py-6">Belum ada data</td></tr>'}</tbody>`;
}
function kalenderForm(item = {}) {
  return modalForm(item.id ? 'Edit Agenda' : 'Tambah Agenda', `
    ${field('Tanggal Mulai', `<input type="date" name="tanggal" required class="inp" value="${esc(item.tanggal || '')}" />`)}
    ${field('Tanggal Selesai (opsional)', `<input type="date" name="tanggal_selesai" class="inp" value="${esc(item.tanggal_selesai || '')}" />`)}
    ${field('Kegiatan', `<input name="kegiatan" required class="inp" value="${esc(item.kegiatan || '')}" />`)}
    ${field('Keterangan', `<textarea name="keterangan" rows="2" class="inp">${esc(item.keterangan || '')}</textarea>`)}`);
}

async function loadGuru() {
  const res = await api('GET', '/api/admin/guru');
  state.guru = res.data;
  const rows = state.guru.map((g) => `<tr>
    <td class="font-semibold">${esc(g.nama)}</td><td>${esc(g.mapel) || '-'}</td><td>${esc(g.jabatan) || '-'}</td>
    <td class="whitespace-nowrap"><button class="btn-mini" data-action="edit-guru" data-id="${g.id}">Edit</button>
    <button class="btn-danger" data-action="del-guru" data-id="${g.id}">Hapus</button></td></tr>`).join('');
  $('#guru-table').innerHTML = `<thead><tr><th>Nama</th><th>Mapel</th><th>Jabatan</th><th>Aksi</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="text-center text-slate-400 py-6">Belum ada data</td></tr>'}</tbody>`;
}
function guruForm(item = {}) {
  return modalForm(item.id ? 'Edit Guru' : 'Tambah Guru', `
    ${field('Nama', `<input name="nama" required class="inp" value="${esc(item.nama || '')}" />`)}
    ${field('Mata Pelajaran', `<input name="mapel" class="inp" value="${esc(item.mapel || '')}" />`)}
    ${field('Jabatan', `<input name="jabatan" class="inp" value="${esc(item.jabatan || '')}" />`)}`);
}

/* ===== Media ===== */
async function loadMedia() {
  const res = await api('GET', '/api/admin/media');
  state.media = res.data;
  $('#media-grid').innerHTML = state.media.map((m) => `<div class="card p-3 space-y-2">
    <img src="${esc(m.url)}" class="w-full h-28 object-contain bg-slate-50 rounded-lg" />
    <input readonly value="${esc(m.url)}" class="inp text-xs" />
    <div class="flex gap-1"><button class="btn-mini flex-1" data-action="copy-url" data-url="${esc(m.url)}">Salin</button>
    <button class="btn-danger" data-action="del-media" data-id="${m.id}">Hapus</button></div></div>`).join('')
    || '<p class="text-slate-400">Belum ada gambar.</p>';
}

/* ===== Sources ===== */
const SOURCE_TYPES = [['list', 'Daftar (list)'], ['pairs', 'Pasangan (nama/nilai)'], ['tables', 'Tabel (profil)'], ['website', 'Profil Website']];
async function loadSources() {
  const res = await api('GET', '/api/admin/sources');
  state.sources = res.data;
  const rows = state.sources.map((s) => `<tr>
    <td class="font-mono text-xs">${esc(s.key)}</td><td class="font-semibold">${esc(s.nama)}</td>
    <td><span class="badge">${esc(s.tipe)}</span></td>
    <td class="max-w-[220px] truncate text-slate-500"><a href="${esc(s.url)}" target="_blank" class="hover:underline">${esc(s.url)}</a></td>
    <td>${s.cache_ttl}s</td><td><span class="badge ${s.aktif ? 'on' : 'off'}">${s.aktif ? 'Aktif' : 'Off'}</span></td>
    <td class="whitespace-nowrap"><button class="btn-mini" data-action="test-source" data-id="${s.id}">Test</button>
    <button class="btn-mini" data-action="edit-source" data-id="${s.id}">Edit</button>
    <button class="btn-danger" data-action="del-source" data-id="${s.id}">Hapus</button></td></tr>`).join('');
  $('#sources-table').innerHTML = `<thead><tr><th>Key</th><th>Nama</th><th>Tipe</th><th>URL</th><th>Cache</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="text-center text-slate-400 py-6">Belum ada sumber</td></tr>'}</tbody>`;
}
function configFields(tipe, cfg) {
  const c = cfg || {};
  const f = (name, label, value, ph) => field(label, `<input name="cfg_${name}" class="inp" placeholder="${esc(ph || '')}" value="${esc(value || '')}" />`);
  if (tipe === 'list') return f('item', 'Selector Item', c.item, '.list-berita') + f('title', 'Selector Judul', c.title, 'h3') + f('date', 'Selector Tanggal', c.date, '.date-upload') + f('excerpt', 'Selector Ringkasan', c.excerpt, 'p') + f('link', 'Selector Link', c.link, '> a') + f('img', 'Selector Gambar', c.img, '> a img') + f('limit', 'Batas', c.limit, '12');
  if (tipe === 'pairs') return f('item', 'Selector Item', c.item) + f('namePrefix', 'Awalan Nama', c.namePrefix, 'Nama :') + f('valuePrefix', 'Awalan Nilai', c.valuePrefix, 'Tugas :');
  if (tipe === 'tables') return f('row', 'Selector Baris', c.row, 'table tr') + f('keyIndex', 'Index Label', c.keyIndex, '1') + f('valueIndex', 'Index Nilai', c.valueIndex, '3') + f('tabContainer', 'Selector Tab', c.tabContainer, '.tabby-tab') + f('tabLabel', 'Selector Label Tab', c.tabLabel, 'label');
  return f('tagline', 'Selector Tagline', c.tagline, '.tagline') + f('contactBox', 'Selector Kontak', c.contactBox) + f('social', 'Selector Sosial', c.social) + f('tentangUrl', 'URL Tentang', c.tentangUrl) + f('tentang', 'Selector Tentang', c.tentang, '.img-ckeditor') + f('kepala', 'Selector Kepala Sekolah', c.kepala, '.pricing-text') + f('kepalaRegex', 'Regex Kepala Sekolah', c.kepalaRegex);
}
function collectConfig(cfg) {
  const out = {};
  Object.keys(cfg || {}).forEach((k) => (out[k] = cfg[k]));
  $$('#modal-form [name^="cfg_"]').forEach((el) => {
    const key = el.name.replace('cfg_', '');
    const val = el.value.trim();
    if (val === '') delete out[key];
    else if (['limit', 'keyIndex', 'valueIndex'].includes(key)) out[key] = Number(val);
    else out[key] = val;
  });
  return out;
}
function sourceForm(source = {}) {
  const tipe = source.tipe || 'list';
  return modalForm(source.id ? 'Edit Sumber Data' : 'Tambah Sumber Data', `
    ${field('Key', `<input name="key" required class="inp font-mono" value="${esc(source.key || '')}" />`)}
    ${field('Nama', `<input name="nama" required class="inp" value="${esc(source.nama || '')}" />`)}
    <div class="grid grid-cols-2 gap-4">
      ${field('Tipe', `<select name="tipe" class="inp">${SOURCE_TYPES.map((t) => `<option value="${t[0]}" ${tipe === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>`)}
      ${field('Cache TTL (detik)', `<input name="cache_ttl" type="number" class="inp" value="${source.cache_ttl || 21600}" />`)}
    </div>
    ${field('URL', `<input name="url" required class="inp" value="${esc(source.url || '')}" />`)}
    <div class="border-t border-slate-200 pt-4"><p class="text-sm font-black mb-3">Selector / Konfigurasi</p>
      <div id="config-fields" class="grid grid-cols-2 gap-4">${configFields(tipe, source.config)}</div></div>
    <label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="aktif" class="h-4 w-4" ${source.aktif === 0 ? '' : 'checked'} /> Aktif</label>`);
}
function afterSourceForm(form, source) {
  form.tipe.addEventListener('change', () => {
    const current = {};
    $$('#modal-form [name^="cfg_"]').forEach((el) => (current[el.name.replace('cfg_', '')] = el.value));
    $('#config-fields').innerHTML = configFields(form.tipe.value, current);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectForm(form);
    data.cache_ttl = Number(data.cache_ttl) || 21600;
    data.config = collectConfig(source.config);
    try {
      if (source.id) await api('PUT', '/api/admin/sources/' + source.id, data);
      else await api('POST', '/api/admin/sources', data);
      closeModal(); toast('Sumber data disimpan'); loadSources();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ===== Settings ===== */
function fillForm(form, map) {
  Object.entries(map).forEach(([k, v]) => { if (form[k] != null) form[k].value = v == null ? '' : v; });
}
async function loadSettings() {
  const res = await api('GET', '/api/admin/settings');
  const s = res.data;
  state.settings = s;

  const sf = $('#settings-form');
  if (sf) {
    sf.ai_enabled.checked = s.ai_enabled === '1';
    sf.uptime_enabled.checked = s.uptime_enabled === '1';
    fillForm(sf, {
      deepseek_model: s.deepseek_model, deepseek_base_url: s.deepseek_base_url,
      ai_system_prompt: s.ai_system_prompt, site_name: s.site_name, site_short_name: s.site_short_name,
      site_school: s.site_school, site_description: s.site_description,
      uptime_kuma_url: s.uptime_kuma_url, uptime_status_slug: s.uptime_status_slug,
    });
    sf.deepseek_api_key.value = '';
    sf.deepseek_api_key.placeholder = s.deepseek_api_key_set ? 'Sudah diatur (isi untuk ganti)' : 'sk-...';
    $('#key-hint').textContent = s.deepseek_api_key_set ? 'API key tersimpan.' : 'API key belum diatur.';
  }
}

/* ===== Users ===== */
async function loadUsers() {
  const res = await api('GET', '/api/admin/users');
  state.users = res.data;
  const rows = state.users.map((u) => `<tr>
    <td class="font-semibold">${esc(u.username)}</td><td>${esc(u.nama) || '-'}</td>
    <td><span class="badge">${esc(u.role)}</span></td>
    <td><span class="badge ${u.aktif ? 'on' : 'off'}">${u.aktif ? 'Aktif' : 'Off'}</span></td>
    <td class="whitespace-nowrap"><button class="btn-mini" data-action="edit-user" data-id="${u.id}">Edit</button>
    <button class="btn-danger" data-action="del-user" data-id="${u.id}">Hapus</button></td></tr>`).join('');
  $('#users-table').innerHTML = `<thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="text-center text-slate-400 py-6">Belum ada data</td></tr>'}</tbody>`;
}
function userForm(user = {}) {
  return modalForm(user.id ? 'Edit Pengguna' : 'Tambah Pengguna', `
    ${field('Username', `<input name="username" required ${user.id ? 'readonly' : ''} class="inp" value="${esc(user.username || '')}" />`)}
    ${field('Nama', `<input name="nama" class="inp" value="${esc(user.nama || '')}" />`)}
    ${field('Password', `<input name="password" type="password" ${user.id ? '' : 'required'} placeholder="${user.id ? 'Kosongkan bila tidak diubah' : 'Min. 6 karakter'}" class="inp" />`)}
    <div class="grid grid-cols-2 gap-4">
      ${field('Role', `<select name="role" class="inp"><option value="editor" ${user.role === 'editor' ? 'selected' : ''}>editor</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option></select>`)}
      <label class="flex items-center gap-2 text-sm font-semibold mt-6"><input type="checkbox" name="aktif" class="h-4 w-4" ${user.aktif === 0 ? '' : 'checked'} /> Aktif</label>
    </div>`);
}
function afterUserForm(user) {
  const form = $('#modal-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { username: form.username.value.trim(), nama: form.nama.value.trim(), role: form.role.value, aktif: form.aktif.checked };
    if (form.password.value) data.password = form.password.value;
    try {
      if (user.id) await api('PUT', '/api/admin/users/' + user.id, data);
      else await api('POST', '/api/admin/users', data);
      closeModal(); toast('Pengguna disimpan'); loadUsers();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ===== Access logs ===== */
async function loadAccessLogs() {
  const filterEl = document.getElementById('logs-filter');
  const tipe = filterEl ? filterEl.value : '';
  const res = await api('GET', '/api/admin/access-logs' + (tipe ? '?tipe=' + encodeURIComponent(tipe) : ''));
  const totalEl = document.getElementById('logs-total');
  if (totalEl) totalEl.textContent = res.total;
  const rows = (res.data || []).map((l) => {
    const cls = l.tipe === 'login_fail' ? 'off' : (l.tipe === 'login_ok' ? 'on' : '');
    return `<tr>
      <td class="whitespace-nowrap text-xs text-slate-500">${esc(l.created_at)}</td>
      <td class="font-mono text-xs">${esc(l.ip) || '-'}</td>
      <td class="font-mono text-xs">${esc(l.mac) || '-'}</td>
      <td><span class="badge ${cls}">${esc(l.tipe)}</span></td>
      <td>${esc(l.username || l.nama) || '-'}</td>
      <td class="max-w-[240px] truncate" title="${esc(l.user_agent)}">${esc(l.user_agent) || '-'}</td>
      <td class="max-w-[160px] truncate" title="${esc(l.referer)}">${esc(l.referer) || '-'}</td>
      <td><button class="btn-danger" data-action="del-log" data-id="${l.id}">Hapus</button></td>
    </tr>`;
  }).join('');
  document.getElementById('logs-table').innerHTML =
    `<thead><tr><th>Waktu (UTC)</th><th>IP</th><th>MAC</th><th>Tipe</th><th>Admin</th><th>User-Agent</th><th>Referer</th><th></th></tr></thead>
     <tbody>${rows || '<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada log</td></tr>'}</tbody>`;
}

/* ===== Media picker ===== */
async function openMediaPicker(target) {
  state.pickerTarget = target || null;
  if (!state.media.length) { try { state.media = (await api('GET', '/api/admin/media')).data; } catch (e) { /* noop */ } }
  $('#picker-box').innerHTML = `<div class="p-6 space-y-4">
    <div class="flex items-center justify-between"><h3 class="text-xl font-black">Pilih Gambar</h3>
      <button type="button" data-action="close-picker" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button></div>
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
      ${state.media.map((m) => `<button type="button" class="border border-slate-200 rounded-lg p-2 hover:border-blue-500" data-action="pick-media" data-url="${esc(m.url)}"><img src="${esc(m.url)}" class="w-full h-20 object-contain" /></button>`).join('') || '<p class="text-slate-400 col-span-full">Belum ada gambar. Unggah lewat tab Gambar.</p>'}
    </div></div>`;
  $('#picker').classList.remove('hidden');
}
function closePicker() { $('#picker').classList.add('hidden'); $('#picker-box').innerHTML = ''; }

function bindForm(method, url, reload, okMsg) {
  const form = $('#modal-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api(method, url, collectForm(form)); closeModal(); toast(okMsg); reload(); }
    catch (err) { toast(err.message, 'error'); }
  });
}

function renderAiContext(data) {
  const stats = data.stats || {};
  const parts = data.parts || [];
  const partsHtml = parts.map((p) => {
    const status = p.error
      ? `<span class="badge off">gagal</span>`
      : `<span class="badge on">${p.items.length} baris</span>`;
    return `<details class="border border-slate-200 rounded-xl p-4" ${p.error ? '' : 'open'}>
      <summary class="font-bold cursor-pointer flex items-center gap-2">
        ${esc(p.label)} ${status}
        ${p.error ? `<span class="text-xs text-red-500 font-normal">${esc(p.error)}</span>` : ''}
      </summary>
      <pre class="mt-3 bg-slate-900 text-emerald-300 text-xs rounded-lg p-3 overflow-auto max-h-72 whitespace-pre-wrap">${esc(p.items.join('\n') || '(tidak ada data)')}</pre>
    </details>`;
  }).join('');

  openModal(`
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-black"><i class="bi bi-database-check"></i> Data Referensi AI</h3>
        <button data-action="close-modal" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div class="card p-3"><div class="text-2xl font-black">${stats.totalParts || 0}</div><div class="text-xs text-slate-500">Sumber</div></div>
        <div class="card p-3"><div class="text-2xl font-black">${stats.totalItems || 0}</div><div class="text-xs text-slate-500">Baris data</div></div>
        <div class="card p-3"><div class="text-2xl font-black">${stats.contextChars || 0}</div><div class="text-xs text-slate-500">Karakter</div></div>
        <div class="card p-3"><div class="text-2xl font-black">~${stats.approxTokens || 0}</div><div class="text-xs text-slate-500">Perkiraan token</div></div>
      </div>
      <details class="border border-slate-200 rounded-xl p-4">
        <summary class="font-bold cursor-pointer">System Prompt</summary>
        <pre class="mt-3 bg-slate-100 text-slate-700 text-xs rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">${esc(data.systemPrompt || '')}</pre>
      </details>
      <div class="space-y-3">${partsHtml}</div>
    </div>`);
}

function showPreview(data) {
  openModal(`<div class="p-6 space-y-3">
    <div class="flex items-center justify-between"><h3 class="text-xl font-black">Hasil Test</h3>
      <button data-action="close-modal" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button></div>
    <pre class="bg-slate-900 text-emerald-300 text-xs rounded-xl p-4 overflow-auto max-h-[60vh]">${esc(JSON.stringify(data, null, 2))}</pre></div>`);
}

function uptimeLabel(status) {
  if (status === 1) return ['Online', 'on'];
  if (status === 3) return ['Pemeliharaan', ''];
  if (status === 0) return ['Offline', 'off'];
  return ['-', ''];
}

function renderUptimeStatus(res, buttons) {
  const enabled = res.enabled !== false;
  const monitors = res.monitors || [];
  const byUrl = {};
  monitors.forEach((m) => { if (m.url) byUrl[normalizeUrl(m.url)] = m; });
  const monRows = monitors.map((m) => {
    const [label, cls] = uptimeLabel(m.status);
    return `<tr><td class="font-semibold">${esc(m.name)}</td><td class="text-xs text-slate-500">${esc(m.url || '-')}</td><td><span class="badge ${cls}">${label}</span></td></tr>`;
  }).join('');
  const btnRows = (buttons || []).map((b) => {
    const mon = byUrl[normalizeUrl(b.uptime_url || b.url)];
    return `<tr><td class="font-semibold">${esc(b.nama)}</td><td class="text-xs text-slate-500">${esc(b.uptime_url || b.url)}</td><td>${mon ? esc(mon.name) : '<span class="text-slate-400">tidak cocok</span>'}</td></tr>`;
  }).join('');
  openModal(`<div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-black"><i class="bi bi-activity"></i> Status Layanan (Uptime Kuma)</h3>
      <button data-action="close-modal" class="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
    </div>
    ${enabled ? '' : '<p class="text-sm text-amber-600">Pengecekan status sedang nonaktif.</p>'}
    <h4 class="font-black text-sm uppercase text-slate-500">Monitor (${monitors.length})</h4>
    <div class="card table-wrap"><table><thead><tr><th>Nama</th><th>URL</th><th>Status</th></tr></thead>
      <tbody>${monRows || '<tr><td colspan="3" class="text-center text-slate-400 py-4">Tidak ada monitor</td></tr>'}</tbody></table></div>
    <h4 class="font-black text-sm uppercase text-slate-500">Pemetaan Tombol Aplikasi</h4>
    <p class="text-xs text-slate-500">Isi kolom "URL Monitor Uptime Kuma" pada tombol bila pencocokan otomatis dari URL tidak tepat.</p>
    <div class="card table-wrap"><table><thead><tr><th>Tombol</th><th>URL Dipantau</th><th>Monitor</th></tr></thead>
      <tbody>${btnRows || '<tr><td colspan="3" class="text-center text-slate-400 py-4">Belum ada tombol</td></tr>'}</tbody></table></div>
  </div>`);
}

/* ===== Events ===== */
document.addEventListener('DOMContentLoaded', () => {
  init();

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    $('#login-error').classList.add('hidden');
    try {
      const res = await api('POST', '/api/auth/login', { username: form.username.value, password: form.password.value });
      state.user = res.user; form.reset(); startApp();
    } catch (err) {
      const box = $('#login-error'); box.textContent = err.message; box.classList.remove('hidden');
    }
  });

  $('#logout-btn').addEventListener('click', async () => {
    try { await api('POST', '/api/auth/logout'); } catch (e) { /* noop */ }
    state.user = null; showLogin();
  });

  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab-btn'); if (b) activateTab(b.dataset.tab); });

  const logsFilter = $('#logs-filter');
  if (logsFilter) logsFilter.addEventListener('change', loadAccessLogs);

  $('#media-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { await api('POST', '/api/admin/media', fd, true); toast('Gambar diunggah'); loadMedia(); }
    catch (err) { toast(err.message, 'error'); }
    e.target.value = '';
  });

  $('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      ai_enabled: form.ai_enabled.checked, uptime_enabled: form.uptime_enabled.checked,
      deepseek_model: form.deepseek_model.value, deepseek_base_url: form.deepseek_base_url.value,
      ai_system_prompt: form.ai_system_prompt.value, site_name: form.site_name.value,
      site_short_name: form.site_short_name.value, site_school: form.site_school.value,
      site_description: form.site_description.value, uptime_kuma_url: form.uptime_kuma_url.value,
      uptime_status_slug: form.uptime_status_slug.value,
    };
    if (form.deepseek_api_key.value.trim()) payload.deepseek_api_key = form.deepseek_api_key.value.trim();
    const alert = $('#settings-alert');
    try { await api('PUT', '/api/admin/settings', payload); alert.className = 'text-sm rounded-xl px-3 py-2 bg-emerald-50 text-emerald-700'; alert.textContent = 'Pengaturan disimpan.'; loadSettings(); }
    catch (err) { alert.className = 'text-sm rounded-xl px-3 py-2 bg-red-50 text-red-700'; alert.textContent = err.message; }
  });

  $('#ai-context-btn').addEventListener('click', async () => {
    const btn = $('#ai-context-btn');
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memuat...';
    try {
      const res = await api('GET', '/api/admin/ai-context');
      renderAiContext(res.data);
    } catch (err) {
      toast(err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = old;
  });

  $('#uptime-status-btn').addEventListener('click', async () => {
    const btn = $('#uptime-status-btn');
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memuat...';
    try {
      const [st, secs] = await Promise.all([
        api('GET', '/api/status'),
        api('GET', '/api/admin/sections'),
      ]);
      const buttons = secs.data.flatMap((s) => s.buttons || []);
      renderUptimeStatus(st, buttons);
    } catch (err) {
      toast(err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = old;
  });

  $('#test-ai-btn').addEventListener('click', async () => {
    const btn = $('#test-ai-btn'); btn.disabled = true; btn.textContent = 'Menguji...';
    try {
      const key = $('#settings-form').deepseek_api_key.value.trim();
      const res = await api('POST', '/api/admin/settings/test-ai', key ? { deepseek_api_key: key } : {});
      toast(res.message);
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Test Koneksi';
  });

  $('#password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target; const alert = $('#password-alert');
    try {
      await api('PUT', '/api/admin/profile/password', { current_password: form.current_password.value, new_password: form.new_password.value });
      alert.className = 'text-sm rounded-xl px-3 py-2 bg-emerald-50 text-emerald-700'; alert.textContent = 'Password berhasil diubah.'; form.reset();
    } catch (err) { alert.className = 'text-sm rounded-xl px-3 py-2 bg-red-50 text-red-700'; alert.textContent = err.message; }
  });

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-action="close-picker"]')) return closePicker();
    const pick = e.target.closest('[data-action="pick-media"]');
    if (pick) {
      const input = state.pickerTarget ? $(state.pickerTarget) : null;
      if (input) input.value = pick.dataset.url;
      return closePicker();
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id = Number(el.dataset.id || 0);
    try {
      if (action === 'close-modal') return closeModal();
      if (action === 'pick-image') return openMediaPicker(el.dataset.target);

      if (action === 'add-block') return addBlockMenu();
      else if (action === 'new-block') { closeModal(); return newBlock(el.dataset.tipe); }
      else if (action === 'edit-block') { const blk = state.sections.find((s) => s.id === id); openModal(blockForm(blk)); afterBlockForm($('#modal-form'), blk); }
      else if (action === 'toggle-block') { const blk = state.sections.find((s) => s.id === id); await api('PUT', '/api/admin/sections/' + id, { aktif: !blk.aktif }); toast('Status blok diubah'); loadKonten(); }
      else if (action === 'toggle-button') { const btn = state.buttons.find((b) => b.id === id); await api('PUT', '/api/admin/buttons/' + id, { aktif: !btn.aktif }); toast('Status tombol diubah'); loadKonten(); }
      else if (action === 'toggle-social') { const soc = state.socials.find((s) => s.id === id); await api('PUT', '/api/admin/socials/' + id, { aktif: !soc.aktif }); toast('Status sosial diubah'); loadKonten(); }
      else if (action === 'block-up') { await moveBlock(id, -1); }
      else if (action === 'block-down') { await moveBlock(id, 1); }
      else if (action === 'del-block') { if (confirm('Hapus blok ini? Semua tombol di dalamnya ikut terhapus.')) { await api('DELETE', '/api/admin/sections/' + id); toast('Blok dihapus'); loadKonten(); } }

      else if (action === 'add-button') { const firstApp = state.sections.find((s) => s.tipe === 'apps'); openModal(buttonForm({ section_id: firstApp && firstApp.id })); afterButtonForm($('#modal-form'), {}); }
      else if (action === 'edit-button') { openModal(buttonForm(state.buttons.find((b) => b.id === id))); afterButtonForm($('#modal-form'), state.buttons.find((b) => b.id === id)); }
      else if (action === 'del-button') { if (confirm('Hapus tombol ini?')) { await api('DELETE', '/api/admin/buttons/' + id); toast('Tombol dihapus'); loadKonten(); } }

      else if (action === 'add-social') { openModal(socialForm()); bindForm('POST', '/api/admin/socials', loadKonten, 'Sosial disimpan'); }
      else if (action === 'edit-social') { openModal(socialForm(state.socials.find((s) => s.id === id))); bindForm('PUT', '/api/admin/socials/' + id, loadKonten, 'Sosial disimpan'); }
      else if (action === 'del-social') { if (confirm('Hapus sosial ini?')) { await api('DELETE', '/api/admin/socials/' + id); toast('Sosial dihapus'); loadKonten(); } }

      else if (action === 'add-kalender') { openModal(kalenderForm()); bindForm('POST', '/api/admin/kalender', loadKalender, 'Agenda disimpan'); }
      else if (action === 'edit-kalender') { openModal(kalenderForm(state.kalender.find((k) => k.id === id))); bindForm('PUT', '/api/admin/kalender/' + id, loadKalender, 'Agenda disimpan'); }
      else if (action === 'del-kalender') { if (confirm('Hapus agenda ini?')) { await api('DELETE', '/api/admin/kalender/' + id); toast('Agenda dihapus'); loadKalender(); } }

      else if (action === 'add-guru') { openModal(guruForm()); bindForm('POST', '/api/admin/guru', loadGuru, 'Data guru disimpan'); }
      else if (action === 'edit-guru') { openModal(guruForm(state.guru.find((g) => g.id === id))); bindForm('PUT', '/api/admin/guru/' + id, loadGuru, 'Data guru disimpan'); }
      else if (action === 'del-guru') { if (confirm('Hapus data guru ini?')) { await api('DELETE', '/api/admin/guru/' + id); toast('Data guru dihapus'); loadGuru(); } }

      else if (action === 'del-media') { if (confirm('Hapus gambar ini?')) { await api('DELETE', '/api/admin/media/' + id); toast('Gambar dihapus'); loadMedia(); } }
      else if (action === 'copy-url') { await navigator.clipboard.writeText(location.origin + el.dataset.url); toast('URL disalin'); }

      else if (action === 'add-source') { openModal(sourceForm()); afterSourceForm($('#modal-form'), {}); }
      else if (action === 'edit-source') { const src = state.sources.find((s) => s.id === id); openModal(sourceForm(src)); afterSourceForm($('#modal-form'), src); }
      else if (action === 'test-source') { el.textContent = '...'; try { const res = await api('POST', '/api/admin/sources/' + id + '/test'); showPreview(res.data); } finally { el.textContent = 'Test'; } }
      else if (action === 'del-source') { if (confirm('Hapus sumber data ini?')) { await api('DELETE', '/api/admin/sources/' + id); toast('Sumber dihapus'); loadSources(); } }

      else if (action === 'add-user') { openModal(userForm()); afterUserForm({}); }
      else if (action === 'edit-user') { const u = state.users.find((x) => x.id === id); openModal(userForm(u)); afterUserForm(u); }
      else if (action === 'del-user') { if (confirm('Hapus pengguna ini?')) { await api('DELETE', '/api/admin/users/' + id); toast('Pengguna dihapus'); loadUsers(); } }

      else if (action === 'refresh-logs') { await loadAccessLogs(); toast('Log dimuat ulang'); }
      else if (action === 'clear-logs') { if (confirm('Bersihkan semua log akses?')) { await api('DELETE', '/api/admin/access-logs'); toast('Log dibersihkan'); loadAccessLogs(); } }
      else if (action === 'del-log') { await api('DELETE', '/api/admin/access-logs/' + id); toast('Log dihapus'); loadAccessLogs(); }
    } catch (err) { toast(err.message, 'error'); }
  });
});
