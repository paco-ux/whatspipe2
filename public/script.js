// public/script.js

// --- helpers ---
const $ = (id) => document.getElementById(id);
const q = (sel) => document.querySelector(sel);

const state = {
  clase: '',
  categoria: '',
  search: '',
  favoritesOnly: false,
  sortUsesDesc: false,
  templates: [],
  selectedTemplate: null,
};

// --- UI refs ---
const pipedriveId = $('pipedriveId');
const loadFromPipeBtn = $('loadFromPipe');

const contactName = $('contactName');
const contactPhone = $('contactPhone');

const searchByName = $('searchByName');
const filterClass = $('filterClass');
const filterCategory = $('filterCategory');
const btnFavorites = $('filterFavorites');
const btnMostUsed = $('filterMostUsed');

const tableBody = $('templatesTable');

const messageBox = $('messageBox');
const btnUpdateWithData = $('updateWithData');
const btnSendWhatsApp = $('sendWhatsApp');
const linkSendEmpty = $('sendEmptyMessage');

// --- init ---
async function init() {
  await loadFacets();
  wireEvents();
}
init();

// --- facets ---
async function loadFacets() {
  // Bloquear combos hasta cargar
  filterClass.disabled = true;
  filterCategory.disabled = true;

  try {
    const r = await fetch('/api/templates-facets');
    const json = await r.json();
    if (!json.ok) throw new Error(json.error || 'Error al cargar facets');

    const { clases = [], categorias = [] } = json.data || {};
    filterClass.innerHTML = `<option value="">— Selecciona —</option>` + clases.map(c => `<option>${c}</option>`).join('');
    filterCategory.innerHTML = `<option value="">— Selecciona —</option>` + categorias.map(c => `<option>${c}</option>`).join('');

    filterClass.disabled = false;
    filterCategory.disabled = false;
  } catch (e) {
    console.error(e);
    filterClass.innerHTML = `<option>— Error —</option>`;
    filterCategory.innerHTML = `<option>— Error —</option>`;
  }
}

// --- events ---
function wireEvents() {
  loadFromPipeBtn.addEventListener('click', onLoadFromPipe);

  filterClass.addEventListener('change', () => {
    state.clase = filterClass.value || '';
    fetchTemplates();
  });
  filterCategory.addEventListener('change', () => {
    state.categoria = filterCategory.value || '';
    fetchTemplates();
  });
  searchByName.addEventListener('input', () => {
    state.search = searchByName.value || '';
    fetchTemplates();
  });

  btnFavorites.addEventListener('click', () => {
    state.favoritesOnly = !state.favoritesOnly;
    btnFavorites.classList.toggle('active', state.favoritesOnly);
    fetchTemplates();
  });

  btnMostUsed.addEventListener('click', () => {
    state.sortUsesDesc = !state.sortUsesDesc;
    btnMostUsed.classList.toggle('active', state.sortUsesDesc);
    fetchTemplates();
  });

  btnUpdateWithData.addEventListener('click', fillPlaceholders);
  btnSendWhatsApp.addEventListener('click', sendWhatsApp);
  linkSendEmpty.addEventListener('click', (e) => {
    e.preventDefault();
    sendWhatsApp(true);
  });
}

// --- load from pipedrive ---
function onlyDigits(s = '') { return (s || '').replace(/[^\d]/g, ''); }

async function onLoadFromPipe() {
  const v = pipedriveId.value.trim();
  if (!v) return alert('Pega el ID o URL del deal de Pipedrive');

  try {
    const r = await fetch(`/api/pipedrive?deal=${encodeURIComponent(v)}`);
    const json = await r.json();
    if (!json.ok) throw new Error(json.error || 'Error leyendo Pipedrive');

    contactName.value = json.data?.name || '';
    contactPhone.value = json.data?.phone || '';
  } catch (e) {
    console.error(e);
    alert('No se pudo cargar desde Pipedrive');
  }
}

// --- fetch templates ---
async function fetchTemplates() {
  tableBody.innerHTML = '';

  // Reglas: no mostramos nada hasta que haya clase + categoría seleccionadas
  if (!state.clase || !state.categoria) {
    tableBody.innerHTML = `<tr><td colspan="4">Selecciona filtros para empezar…</td></tr>`;
    return;
  }

  const params = new URLSearchParams();
  params.set('clase', state.clase);
  params.set('categoria', state.categoria);
  if (state.search) params.set('search', state.search);
  if (state.favoritesOnly) params.set('favorites', '1');
  if (state.sortUsesDesc) params.set('sort', 'uses_desc');

  try {
    const r = await fetch(`/api/templates-list?${params.toString()}`);
    const json = await r.json();
    if (!json.ok) throw new Error(json.error || 'Error listando plantillas');

    state.templates = json.data || [];
    renderTemplates();
  } catch (e) {
    console.error(e);
    tableBody.innerHTML = `<tr><td colspan="4">Error cargando plantillas</td></tr>`;
  }
}

function renderTemplates() {
  if (!state.templates.length) {
    tableBody.innerHTML = `<tr><td colspan="4">No hay resultados con el filtro actual.</td></tr>`;
    return;
  }

  const rows = state.templates.map((t, idx) => {
    const tags = (t.etiquetas || []).map(et => `<span class="tag">#${et}</span>`).join(' ');
    return `
      <tr data-idx="${idx}" class="tpl-row">
        <td>${t.nombre || '(Sin nombre)'}</td>
        <td>${t.clase || ''} / ${t.categoria || ''}</td>
        <td>${tags}</td>
        <td>${t.usos || 0}</td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rows;

  // seleccionar
  tableBody.querySelectorAll('.tpl-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const i = Number(tr.dataset.idx);
      state.selectedTemplate = state.templates[i];
      messageBox.value = state.selectedTemplate?.mensaje || '';
      // scroll abajo al editor
      messageBox.focus();
    });
  });
}

// --- placeholders ---
function fillPlaceholders() {
  let txt = messageBox.value || '';
  if (!txt) return;

  const name = (contactName.value || '').trim();
  const phone = (contactPhone.value || '').trim();
  const dealTitle = state.selectedTemplate?.dealTitle || '';

  txt = txt
    .replace(/\{nombre\}/gi, name)
    .replace(/\{phone\}/gi, phone)
    .replace(/\{deal\.title\}/gi, dealTitle);

  messageBox.value = txt;
}

// --- WhatsApp ---
function sendWhatsApp(empty = false) {
  const raw = onlyDigits(contactPhone.value || '');
  if (!raw) return alert('Falta teléfono de destino');

  // Si quieres forzar +52 cuando falte (opcional):
  let phone = raw;
  if (phone.length === 10) phone = '52' + phone;

  const text = empty ? '' : (messageBox.value || '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
