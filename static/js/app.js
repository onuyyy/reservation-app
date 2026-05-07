// ========================
// Navigation
// ========================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`page-${item.dataset.page}`).classList.add('active');
    const page = item.dataset.page;
    if (page === 'stats') loadStats();
    else if (page === 'venues') loadVenues();
    else if (page === 'clients') loadClients();
  });
});

// ========================
// Utilities
// ========================
const fmt = n => Number(n || 0).toLocaleString('ko-KR');
let _dt, _cdt;
function debounceSearch() { clearTimeout(_dt); _dt = setTimeout(loadReservations, 300); }
function debounceClientSearch() { clearTimeout(_cdt); _cdt = setTimeout(filterClients, 300); }

function fillYearOptions() {
  const cur = new Date().getFullYear();
  ['filter-year', 'stats-year'].forEach(id => {
    const sel = document.getElementById(id);
    for (let y = cur; y >= cur - 5; y--) {
      const o = document.createElement('option');
      o.value = y; o.textContent = y + '년';
      if (y === cur) o.selected = true;
      sel.appendChild(o);
    }
  });
}

// ========================
// Shared caches
// ========================
let clientsCache = [];
let venuesCache = [];

async function loadOptions() {
  [clientsCache, venuesCache] = await Promise.all([
    fetch('/api/clients/').then(r => r.json()),
    fetch('/api/venues/').then(r => r.json()),
  ]);
  document.getElementById('client-name-list').innerHTML =
    clientsCache.map(c => `<option value="${c.name}">`).join('');
  document.getElementById('venue-name-list').innerHTML =
    venuesCache.map(v => `<option value="${v.name}">`).join('');
}

async function loadVendors() {
  const vendors = await fetch('/api/reservations/vendors').then(r => r.json());
  const sel = document.getElementById('filter-vendor');
  sel.innerHTML = '<option value="">전체 업체</option>';
  const dl = document.getElementById('vendor-list');
  dl.innerHTML = '';
  vendors.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v; sel.appendChild(o);
    dl.innerHTML += `<option value="${v}">`;
  });
}

// ========================
// Reservations Page
// ========================
let allData = [];
let activeDate = null;

async function loadReservations() {
  const p = new URLSearchParams();
  const y = document.getElementById('filter-year').value;
  const m = document.getElementById('filter-month').value;
  const v = document.getElementById('filter-vendor').value;
  const k = document.getElementById('filter-keyword').value;
  if (y) p.append('year', y);
  if (m) p.append('month', m);
  if (v) p.append('vendor', v);
  if (k) p.append('keyword', k);
  allData = await fetch('/api/reservations/?' + p).then(r => r.json());
  activeDate = null;
  renderAll();
}

function renderAll() {
  renderDateTabs(allData);
  const data = activeDate ? allData.filter(r => r.event_date === activeDate) : allData;
  renderTable(data);
}

function renderDateTabs(data) {
  const container = document.getElementById('date-tabs');
  const dates = [...new Set(data.map(r => r.event_date))].sort();
  if (dates.length <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="date-tabs">
    <button class="date-tab${!activeDate ? ' active' : ''}" onclick="setDateTab(null)">전체 <span>${data.length}</span></button>
    ${dates.map(d => {
      const cnt = data.filter(r => r.event_date === d).length;
      const label = d.slice(5).replace('-', '/');
      return `<button class="date-tab${activeDate === d ? ' active' : ''}" onclick="setDateTab('${d}')">${label} <span>${cnt}</span></button>`;
    }).join('')}
  </div>`;
}

function setDateTab(date) {
  activeDate = date;
  renderAll();
}

function renderTable(data) {
  const tbody = document.getElementById('res-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">예약 내역이 없습니다.</td></tr>';
    renderSummary({});
    ['total-headcount', 'total-dc', 'total-deposit', 'total-actual'].forEach(id => document.getElementById(id).textContent = '');
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.event_date}</td>
      <td><strong>${r.group_name}</strong></td>
      <td>${r.event_name || '-'}</td>
      <td>${r.vendor || '-'}</td>
      <td class="num">${fmt(r.headcount)}명</td>
      <td class="num">${fmt(r.dc_amount)}</td>
      <td class="num">${fmt(r.deposit)}</td>
      <td class="num" style="color:#3b82f6;font-weight:600">${fmt(r.actual_sale)}</td>
      <td>${r.manager || '-'}</td>
      <td>
        <button class="btn-edit" onclick="openEditModal(${r.id})">수정</button>
        <button class="btn-delete" onclick="deleteReservation(${r.id})">삭제</button>
      </td>
    </tr>
  `).join('');
  const tH = data.reduce((s, r) => s + (r.headcount || 0), 0);
  const tD = data.reduce((s, r) => s + (r.dc_amount || 0), 0);
  const tDep = data.reduce((s, r) => s + (r.deposit || 0), 0);
  const tA = data.reduce((s, r) => s + (r.actual_sale || 0), 0);
  document.getElementById('total-headcount').textContent = fmt(tH) + '명';
  document.getElementById('total-dc').textContent = fmt(tD);
  document.getElementById('total-deposit').textContent = fmt(tDep);
  document.getElementById('total-actual').textContent = fmt(tA);
  renderSummary({ count: data.length, headcount: tH, deposit: tDep, actual_sale: tA });
}

function renderSummary({ count = 0, headcount = 0, deposit = 0, actual_sale = 0 } = {}) {
  document.getElementById('summary-cards').innerHTML = `
    <div class="summary-card"><div class="label">총 건수</div><div class="value">${count}건</div></div>
    <div class="summary-card"><div class="label">총 인원</div><div class="value">${fmt(headcount)}명</div></div>
    <div class="summary-card"><div class="label">총 입금액</div><div class="value blue">${fmt(deposit)}원</div></div>
    <div class="summary-card"><div class="label">총 매출(수수료)</div><div class="value green">${fmt(actual_sale)}원</div></div>
  `;
}

// ========================
// Reservation Modal
// ========================
const RES_FIELDS = ['event_date','group_name','event_name','vendor','sale_price','dc_sale_price',
  'headcount','dc_amount','deposit','actual_sale','phone','bank','account_number','account_holder','manager','memo'];

function openModal() {
  document.getElementById('modal-title').textContent = '예약 추가';
  document.getElementById('edit-id').value = '';
  RES_FIELDS.forEach(f => document.getElementById('f-' + f).value = '');
  document.getElementById('modal').classList.add('open');
}

function openEditModal(id) {
  const r = allData.find(x => x.id === id);
  if (!r) return;
  document.getElementById('modal-title').textContent = '예약 수정';
  document.getElementById('edit-id').value = id;
  RES_FIELDS.forEach(f => document.getElementById('f-' + f).value = r[f] ?? '');
  document.getElementById('modal').classList.add('open');
}

function onClientSelect(name) {
  const client = clientsCache.find(c => c.name === name);
  if (!client) return;
  ['phone', 'bank', 'account_number', 'account_holder', 'manager'].forEach(f => {
    document.getElementById('f-' + f).value = client[f] || '';
  });
}

function onVenueSelect(name) {
  const vendorEl = document.getElementById('f-vendor');
  if (vendorEl && !vendorEl.value) vendorEl.value = name;
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOutside(e) { if (e.target.id === 'modal') closeModal(); }

async function saveReservation() {
  const id = document.getElementById('edit-id').value;
  const eventName = document.getElementById('f-event_name').value;
  const payload = {
    event_date: document.getElementById('f-event_date').value,
    group_name: document.getElementById('f-group_name').value,
    event_name: eventName,
    vendor: document.getElementById('f-vendor').value || eventName,
    sale_price: parseFloat(document.getElementById('f-sale_price').value) || 0,
    dc_sale_price: parseFloat(document.getElementById('f-dc_sale_price').value) || 0,
    headcount: parseInt(document.getElementById('f-headcount').value) || 0,
    dc_amount: parseFloat(document.getElementById('f-dc_amount').value) || 0,
    deposit: parseFloat(document.getElementById('f-deposit').value) || 0,
    actual_sale: parseFloat(document.getElementById('f-actual_sale').value) || 0,
    phone: document.getElementById('f-phone').value,
    bank: document.getElementById('f-bank').value,
    account_number: document.getElementById('f-account_number').value,
    account_holder: document.getElementById('f-account_holder').value,
    manager: document.getElementById('f-manager').value,
    memo: document.getElementById('f-memo').value,
  };
  if (!payload.event_date || !payload.group_name) { alert('행사일과 단체명은 필수입니다.'); return; }
  const url = id ? `/api/reservations/${id}` : '/api/reservations/';
  const method = id ? 'PUT' : 'POST';
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  closeModal();
  await loadReservations();
  await loadVendors();
}

async function deleteReservation(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
  loadReservations();
}

function exportExcel() {
  const p = new URLSearchParams();
  const y = document.getElementById('filter-year').value;
  const m = document.getElementById('filter-month').value;
  const v = document.getElementById('filter-vendor').value;
  if (y) p.append('year', y);
  if (m) p.append('month', m);
  if (v) p.append('vendor', v);
  window.location.href = '/api/reservations/export/excel?' + p;
}

// ========================
// Stats Page
// ========================
async function loadStats() {
  const year = document.getElementById('stats-year').value || new Date().getFullYear();
  const month = document.getElementById('stats-month').value;
  const mData = await fetch(`/api/reservations/stats/monthly?year=${year}`).then(r => r.json());
  renderMonthlyChart(mData);
  renderMonthlyTable(mData);
  const p = new URLSearchParams({ year });
  if (month) p.append('month', month);
  const vData = await fetch('/api/reservations/stats/vendor?' + p).then(r => r.json());
  renderVendorTable(vData);
}

function renderMonthlyChart(data) {
  const canvas = document.getElementById('monthly-chart');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 800;
  canvas.height = 200;
  const W = canvas.width, H = canvas.height;
  const sales = Array.from({ length: 12 }, (_, i) => { const d = data.find(x => x.month === i + 1); return d ? d.actual_sale : 0; });
  const max = Math.max(...sales, 1);
  const barW = (W - 60) / 12;
  ctx.clearRect(0, 0, W, H);
  sales.forEach((v, i) => {
    const x = 30 + i * barW + barW * 0.1, bw = barW * 0.8, bh = (v / max) * (H - 40), y = H - 30 - bh;
    ctx.fillStyle = v > 0 ? '#3b82f6' : '#e2e8f0';
    ctx.fillRect(x, y, bw, Math.max(bh, 2));
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}월`, x + bw / 2, H - 10);
    if (v > 0) { ctx.fillStyle = '#1e293b'; ctx.font = '9px sans-serif'; ctx.fillText((v / 10000).toFixed(0) + '만', x + bw / 2, y - 4); }
  });
}

function renderMonthlyTable(data) {
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const tH = data.reduce((s, r) => s + r.headcount, 0), tS = data.reduce((s, r) => s + r.actual_sale, 0);
  document.getElementById('monthly-table').innerHTML = `
    <tr><th>구분</th>${months.map(m => `<th style="text-align:right">${m}</th>`).join('')}<th style="text-align:right">합계</th></tr>
    <tr><td>인원</td>${Array.from({ length: 12 }, (_, i) => { const d = data.find(x => x.month === i + 1); return `<td class="num">${d && d.headcount ? fmt(d.headcount) : '-'}</td>`; }).join('')}<td class="num"><strong>${fmt(tH)}</strong></td></tr>
    <tr><td>매출</td>${Array.from({ length: 12 }, (_, i) => { const d = data.find(x => x.month === i + 1); return `<td class="num">${d && d.actual_sale ? fmt(d.actual_sale) : '-'}</td>`; }).join('')}<td class="num"><strong>${fmt(tS)}</strong></td></tr>
  `;
}

function renderVendorTable(data) {
  if (!data.length) { document.getElementById('vendor-table').innerHTML = '<tr><td class="empty">데이터 없음</td></tr>'; return; }
  const total = data.reduce((s, r) => s + r.actual_sale, 0);
  document.getElementById('vendor-table').innerHTML = `
    <tr><th>업체</th><th style="text-align:right">건수</th><th style="text-align:right">인원</th><th style="text-align:right">매출</th><th style="text-align:right">비중</th></tr>
    ${data.map(r => `<tr><td>${r.vendor}</td><td class="num">${r.count}건</td><td class="num">${fmt(r.headcount)}명</td><td class="num" style="color:#3b82f6;font-weight:600">${fmt(r.actual_sale)}원</td><td class="num">${total ? (r.actual_sale / total * 100).toFixed(1) + '%' : '-'}</td></tr>`).join('')}
    <tr style="background:#f8fafc;font-weight:700"><td>합계</td><td class="num">${data.reduce((s, r) => s + r.count, 0)}건</td><td class="num">${fmt(data.reduce((s, r) => s + r.headcount, 0))}명</td><td class="num" style="color:#10b981">${fmt(total)}원</td><td></td></tr>
  `;
}

// ========================
// Venues Page
// ========================
let venuesData = [];

async function loadVenues() {
  venuesData = await fetch('/api/venues/').then(r => r.json());
  renderVenuesTable(venuesData);
}

function renderVenuesTable(data) {
  document.getElementById('venues-tbody').innerHTML = data.length
    ? data.map(v => `
        <tr>
          <td><strong>${v.name}</strong></td>
          <td>${v.memo || '-'}</td>
          <td>
            <button class="btn-edit" onclick="openVenueModal(${v.id})">수정</button>
            <button class="btn-delete" onclick="deleteVenue(${v.id})">삭제</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="empty">등록된 행사장이 없습니다.</td></tr>';
}

function openVenueModal(id) {
  document.getElementById('venue-edit-id').value = id || '';
  if (id) {
    const v = venuesData.find(x => x.id === id);
    document.getElementById('vf-name').value = v?.name || '';
    document.getElementById('vf-memo').value = v?.memo || '';
    document.getElementById('venue-modal-title').textContent = '행사장 수정';
  } else {
    document.getElementById('vf-name').value = '';
    document.getElementById('vf-memo').value = '';
    document.getElementById('venue-modal-title').textContent = '행사장 추가';
  }
  document.getElementById('venue-modal').classList.add('open');
}

function closeVenueModal() { document.getElementById('venue-modal').classList.remove('open'); }
function closeVenueModalOutside(e) { if (e.target.id === 'venue-modal') closeVenueModal(); }

async function saveVenue() {
  const id = document.getElementById('venue-edit-id').value;
  const payload = {
    name: document.getElementById('vf-name').value.trim(),
    memo: document.getElementById('vf-memo').value.trim(),
  };
  if (!payload.name) { alert('행사장명은 필수입니다.'); return; }
  const url = id ? `/api/venues/${id}` : '/api/venues/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.detail || '저장 실패'); return; }
  closeVenueModal();
  await loadVenues();
  await loadOptions();
}

async function deleteVenue(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  await fetch(`/api/venues/${id}`, { method: 'DELETE' });
  await loadVenues();
  await loadOptions();
}

// ========================
// Clients Page
// ========================
let clientsData = [];

async function loadClients() {
  clientsData = await fetch('/api/clients/').then(r => r.json());
  filterClients();
}

function filterClients() {
  const type = document.getElementById('client-type-filter').value;
  const kw = document.getElementById('client-keyword').value.toLowerCase();
  let data = clientsData;
  if (type) data = data.filter(c => c.type === type);
  if (kw) data = data.filter(c =>
    c.name.toLowerCase().includes(kw) || (c.manager || '').toLowerCase().includes(kw)
  );
  document.getElementById('client-count').textContent = `총 ${data.length}명`;
  renderClientsTable(data);
}

function renderClientsTable(data) {
  document.getElementById('clients-tbody').innerHTML = data.length
    ? data.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.type ? `<span class="type-badge">${c.type}</span>` : '-'}</td>
          <td>${c.phone || '-'}</td>
          <td>${c.manager || '-'}</td>
          <td>${c.bank ? c.bank + ' ' + (c.account_number || '') : '-'}</td>
          <td>
            <button class="btn-edit" onclick="openClientModal(${c.id})">수정</button>
            <button class="btn-delete" onclick="deleteClient(${c.id})">삭제</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="empty">등록된 고객이 없습니다.</td></tr>';
}

const CLIENT_FIELDS = ['name','type','phone','bank','account_number','account_holder','manager','memo'];

function openClientModal(id) {
  document.getElementById('client-edit-id').value = id || '';
  if (id) {
    const c = clientsData.find(x => x.id === id);
    CLIENT_FIELDS.forEach(f => document.getElementById('cf-' + f).value = c?.[f] || '');
    document.getElementById('client-modal-title').textContent = '고객 수정';
  } else {
    CLIENT_FIELDS.forEach(f => document.getElementById('cf-' + f).value = '');
    document.getElementById('client-modal-title').textContent = '고객 추가';
  }
  document.getElementById('client-modal').classList.add('open');
}

function closeClientModal() { document.getElementById('client-modal').classList.remove('open'); }
function closeClientModalOutside(e) { if (e.target.id === 'client-modal') closeClientModal(); }

async function saveClient() {
  const id = document.getElementById('client-edit-id').value;
  const payload = Object.fromEntries(CLIENT_FIELDS.map(f => [f, document.getElementById('cf-' + f).value]));
  if (!payload.name.trim()) { alert('단체명은 필수입니다.'); return; }
  const url = id ? `/api/clients/${id}` : '/api/clients/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.detail || '저장 실패'); return; }
  closeClientModal();
  await loadClients();
  await loadOptions();
}

async function deleteClient(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  await loadClients();
  await loadOptions();
}

// ========================
// Init
// ========================
fillYearOptions();
loadOptions();
loadVendors();
loadReservations();
