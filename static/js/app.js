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
let _dt, _cdt, _vdt;
function debounceSearch()       { clearTimeout(_dt);  _dt  = setTimeout(loadReservations, 300); }
function debounceClientSearch() { clearTimeout(_cdt); _cdt = setTimeout(filterClients, 300); }
function debounceVenueSearch()  { clearTimeout(_vdt); _vdt = setTimeout(filterVenues, 300); }

const PAGE_SIZE = 20;

function normalizeName(value) {
  return (value || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function displayText(value, fallback = '-') {
  const text = value ?? '';
  return String(text).trim() ? escapeHtml(text) : fallback;
}

function numberValue(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function intValue(id) {
  return parseInt(document.getElementById(id).value, 10) || 0;
}

function setFormError(errorId, inputId, message) {
  const errorEl = document.getElementById(errorId);
  const inputEl = document.getElementById(inputId);
  if (!errorEl || !inputEl) return;
  errorEl.textContent = message || '';
  errorEl.classList.toggle('show', Boolean(message));
  inputEl.classList.toggle('input-error', Boolean(message));
  if (message) inputEl.focus();
}

function appDialog({ title = '알림', message = '', type = 'info', okText = '확인', cancelText = '취소', showCancel = false } = {}) {
  const overlay = document.getElementById('app-dialog');
  const titleEl = document.getElementById('app-dialog-title');
  const messageEl = document.getElementById('app-dialog-message');
  const iconEl = document.getElementById('app-dialog-icon');
  const okBtn = document.getElementById('app-dialog-ok');
  const cancelBtn = document.getElementById('app-dialog-cancel');

  titleEl.textContent = title;
  messageEl.textContent = message;
  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;
  cancelBtn.style.display = showCancel ? '' : 'none';
  iconEl.className = `dialog-icon ${type}`;
  iconEl.textContent = type === 'danger' ? '!' : type === 'warning' ? '?' : 'i';
  overlay.classList.add('open');

  return new Promise(resolve => {
    const close = result => {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onOverlay = e => { if (e.target === overlay) close(false); };
    const onKeydown = e => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKeydown);
    okBtn.focus();
  });
}

const appAlert = (message, title = '알림', type = 'info') =>
  appDialog({ title, message, type, okText: '확인' });

const appConfirm = (message, { title = '확인', type = 'warning', okText = '확인', cancelText = '취소' } = {}) =>
  appDialog({ title, message, type, okText, cancelText, showCancel: true });

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || '요청 처리 중 오류가 발생했습니다.');
  return data;
}

function renderPager(containerId, current, total, gotoFn) {
  const el = document.getElementById(containerId);
  if (total <= 1) { el.innerHTML = ''; return; }
  const show = new Set(
    [1, total, current, current-1, current+1, current-2, current+2].filter(p => p >= 1 && p <= total)
  );
  const sorted = [...show].sort((a, b) => a - b);
  let html = `<div class="pager">`;
  html += `<button class="pager-btn" ${current===1?'disabled':''} onclick="${gotoFn}(${current-1})">‹</button>`;
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) html += `<span class="pager-ellipsis">…</span>`;
    html += `<button class="pager-btn${p===current?' active':''}" onclick="${gotoFn}(${p})">${p}</button>`;
    prev = p;
  }
  html += `<button class="pager-btn" ${current===total?'disabled':''} onclick="${gotoFn}(${current+1})">›</button>`;
  html += `</div>`;
  el.innerHTML = html;
}

async function loadYearOptions() {
  const years = await fetch('/api/reservations/years').then(parseJsonResponse);
  const cur = new Date().getFullYear();
  ['filter-year', 'stats-year'].forEach(id => {
    const sel = document.getElementById(id);
    const allYears = [...new Set([...years, cur])].sort((a, b) => b - a);
    allYears.forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y + '년';
      if (y === cur) o.selected = true;
      sel.appendChild(o);
    });
  });
}

// ========================
// Shared caches
// ========================
let clientsCache = [];
let venuesCache = [];

async function loadOptions() {
  [clientsCache, venuesCache] = await Promise.all([
    fetch('/api/clients/').then(parseJsonResponse),
    fetch('/api/venues/').then(parseJsonResponse),
  ]);
  document.getElementById('client-name-list').innerHTML =
    clientsCache.map(c => `<option value="${escapeHtml(c.name)}">`).join('');
  document.getElementById('venue-name-list').innerHTML =
    venuesCache.map(v => `<option value="${escapeHtml(v.name)}">`).join('');
}

async function loadVendors() {
  const vendors = await fetch('/api/reservations/vendors').then(parseJsonResponse);
  const sel = document.getElementById('filter-vendor');
  sel.innerHTML = '<option value="">전체 업체</option>';
  const dl = document.getElementById('vendor-list');
  dl.innerHTML = '';
  vendors.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v; sel.appendChild(o);
    dl.innerHTML += `<option value="${escapeHtml(v)}">`;
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
  allData = await fetch('/api/reservations/?' + p).then(parseJsonResponse);
  activeDate = null;
  renderAll();
}

function renderAll() {
  renderDateTabs(allData);
  const data = activeDate ? allData.filter(r => r.event_date === activeDate) : allData;
  renderTable(sortReservations(data));
}

function sortReservations(data) {
  const sortBy = document.getElementById('sort-reservations')?.value || 'date-desc';
  const collator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });
  return [...data].sort((a, b) => {
    if (sortBy === 'group-name') {
      const byName = collator.compare(a.group_name || '', b.group_name || '');
      return byName || String(b.event_date || '').localeCompare(String(a.event_date || ''));
    }
    if (sortBy === 'event-name') {
      const byEvent = collator.compare(a.event_name || '', b.event_name || '');
      return byEvent || String(b.event_date || '').localeCompare(String(a.event_date || ''));
    }
    return String(b.event_date || '').localeCompare(String(a.event_date || '')) || ((b.id || 0) - (a.id || 0));
  });
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
      <td>${displayText(r.event_date)}</td>
      <td><strong>${displayText(r.group_name)}</strong></td>
      <td>${displayText(r.event_name)}</td>
      <td>${displayText(r.vendor)}</td>
      <td class="num">${fmt(r.headcount)}명</td>
      <td class="num">${fmt(r.dc_amount)}</td>
      <td class="num">${fmt(r.deposit)}</td>
      <td class="num" style="color:#3b82f6;font-weight:600">${fmt(r.actual_sale)}</td>
      <td>${displayText(r.manager)}</td>
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
let depositManual = false;
let actualSaleManual = false;
let lastAutoDeposit = '';
let lastAutoActualSale = '';

function calculateReservationAmounts() {
  const headcount = intValue('f-headcount');
  const dcAmount = numberValue('f-dc_amount');
  const dcSalePrice = numberValue('f-dc_sale_price');
  const deposit = headcount * dcAmount;
  const actualSale = headcount * dcSalePrice;
  const depositValue = deposit ? String(deposit) : '';
  const actualSaleValue = actualSale ? String(actualSale) : '';
  if (!depositManual) document.getElementById('f-deposit').value = depositValue;
  if (!actualSaleManual) document.getElementById('f-actual_sale').value = actualSaleValue;
  lastAutoDeposit = depositValue;
  lastAutoActualSale = actualSaleValue;
  return { headcount, dcAmount, dcSalePrice, deposit, actualSale };
}

function markAmountManual(field) {
  if (field === 'deposit') {
    const value = document.getElementById('f-deposit').value;
    depositManual = value !== '' && value !== lastAutoDeposit;
  }
  if (field === 'actual_sale') {
    const value = document.getElementById('f-actual_sale').value;
    actualSaleManual = value !== '' && value !== lastAutoActualSale;
  }
}

function resetAmountManualFlags() {
  depositManual = false;
  actualSaleManual = false;
  lastAutoDeposit = '';
  lastAutoActualSale = '';
}

function openModal() {
  document.getElementById('modal-title').textContent = '예약 추가';
  document.getElementById('edit-id').value = '';
  RES_FIELDS.forEach(f => document.getElementById('f-' + f).value = '');
  resetAmountManualFlags();
  calculateReservationAmounts();
  document.getElementById('modal').classList.add('open');
}

function openEditModal(id) {
  const r = allData.find(x => x.id === id);
  if (!r) return;
  document.getElementById('modal-title').textContent = '예약 수정';
  document.getElementById('edit-id').value = id;
  RES_FIELDS.forEach(f => document.getElementById('f-' + f).value = r[f] ?? '');
  resetAmountManualFlags();
  document.getElementById('modal').classList.add('open');
}

function onClientSelect(name) {
  const clientFields = ['phone', 'bank', 'account_number', 'account_holder', 'manager'];
  const client = clientsCache.find(c => normalizeName(c.name) === normalizeName(name));
  clientFields.forEach(f => {
    document.getElementById('f-' + f).value = client ? (client[f] || '') : '';
  });
}

function onVenueSelect(name) {
  const vendorEl = document.getElementById('f-vendor');
  if (vendorEl && !vendorEl.value) vendorEl.value = name;
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOutside(e) { if (e.target.id === 'modal') closeModal(); }

async function upsertClient(name) {
  const existing = clientsCache.find(c => normalizeName(c.name) === normalizeName(name));
  if (existing) return existing.id;
  const res = await fetch('/api/clients/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const created = await parseJsonResponse(res);
  return created.id;
}

async function upsertVenue(name) {
  if (!name) return null;
  const existing = venuesCache.find(v => normalizeName(v.name) === normalizeName(name));
  if (existing) return existing.id;
  const res = await fetch('/api/venues/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const created = await parseJsonResponse(res);
  return created.id;
}

async function saveReservation() {
  const id = document.getElementById('edit-id').value;
  const groupName = document.getElementById('f-group_name').value.trim();
  const eventName = document.getElementById('f-event_name').value.trim();
  if (!document.getElementById('f-event_date').value || !groupName) {
    await appAlert('행사일과 단체명을 입력해 주세요.', '필수 항목 확인', 'warning');
    return;
  }

  const newItems = [];
  if (groupName && !clientsCache.find(c => c.name === groupName))
    newItems.push(`고객 "  ${groupName}"`);
  if (eventName && !venuesCache.find(v => v.name === eventName))
    newItems.push(`행사장 "${eventName}"`);

  if (newItems.length > 0) {
    const ok = await appConfirm(
      `등록되지 않은 항목입니다:\n${newItems.join('\n')}\n\n새로 등록하고 저장하시겠습니까?`,
      { title: '새 항목 등록', okText: '등록하고 저장' }
    );
    if (!ok) return;
  }

  let clientId, venueId;
  try {
    [clientId, venueId] = await Promise.all([
      upsertClient(groupName),
      upsertVenue(eventName),
    ]);
  } catch (err) {
    await appAlert(err.message, '저장 오류', 'danger');
    return;
  }

  const payload = {
    event_date:     document.getElementById('f-event_date').value,
    group_name:     groupName,
    event_name:     eventName,
    vendor:         document.getElementById('f-vendor').value || eventName,
    sale_price:     numberValue('f-sale_price'),
    dc_sale_price:  numberValue('f-dc_sale_price'),
    headcount:      intValue('f-headcount'),
    dc_amount:      numberValue('f-dc_amount'),
    deposit:        numberValue('f-deposit'),
    actual_sale:    numberValue('f-actual_sale'),
    phone:          document.getElementById('f-phone').value,
    bank:           document.getElementById('f-bank').value,
    account_number: document.getElementById('f-account_number').value,
    account_holder: document.getElementById('f-account_holder').value,
    manager:        document.getElementById('f-manager').value,
    memo:           document.getElementById('f-memo').value,
    client_id:      clientId,
    venue_id:       venueId,
  };

  const url = id ? `/api/reservations/${id}` : '/api/reservations/';
  const method = id ? 'PUT' : 'POST';
  try {
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parseJsonResponse);
  } catch (err) {
    await appAlert(err.message, '저장 오류', 'danger');
    return;
  }
  closeModal();
  await Promise.all([loadReservations(), loadVendors(), loadOptions()]);
}

async function deleteReservation(id) {
  const ok = await appConfirm('선택한 예약을 삭제하시겠습니까?', {
    title: '예약 삭제',
    type: 'danger',
    okText: '삭제',
  });
  if (!ok) return;
  try {
    await fetch(`/api/reservations/${id}`, { method: 'DELETE' }).then(parseJsonResponse);
  } catch (err) {
    await appAlert(err.message, '삭제 오류', 'danger');
    return;
  }
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
  renderMonthlyChart(mData, year);
  renderMonthlyTable(mData, year);
  const p = new URLSearchParams({ year });
  if (month) p.append('month', month);
  const vData = await fetch('/api/reservations/stats/vendor?' + p).then(r => r.json());
  renderVendorTable(vData);
}

function renderMonthlyChart(data, year) {
  const canvas = document.getElementById('monthly-chart');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 800;
  canvas.height = 220;
  const W = canvas.width, H = canvas.height;
  const PAD_T = 28, PAD_B = 24, PAD_H = 8;
  const chartH = H - PAD_T - PAD_B;
  const barSlot = (W - PAD_H * 2) / 12;

  const sales = Array.from({ length: 12 }, (_, i) => {
    const d = data.find(x => x.month === i + 1);
    return d ? d.actual_sale : 0;
  });
  const max = Math.max(...sales, 1);

  ctx.clearRect(0, 0, W, H);

  // 1단계: 막대 전부 그리기
  sales.forEach((v, i) => {
    const bx = PAD_H + i * barSlot + barSlot * 0.1;
    const bw = barSlot * 0.8;
    const bh = (v / max) * chartH;
    const by = PAD_T + chartH - bh;

    ctx.fillStyle = v > 0 ? '#3b82f6' : '#e2e8f0';
    ctx.fillRect(bx, by, bw, Math.max(bh, 2));

    // 월 레이블 (하단)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}월`, bx + bw / 2, H - 6);
  });

  // 2단계: 값 레이블 — 항상 막대 위쪽, 흰 배경 패드 위에 짙은 글씨
  ctx.font = 'bold 9px sans-serif';
  sales.forEach((v, i) => {
    if (!v) return;
    const bx = PAD_H + i * barSlot + barSlot * 0.1;
    const bw = barSlot * 0.8;
    const bh = (v / max) * chartH;
    const by = PAD_T + chartH - bh;
    const label = (v / 10000).toFixed(0) + '만';
    const cx = bx + bw / 2;
    const ty = by - 4;                          // 텍스트 베이스라인
    const tw = ctx.measureText(label).width;
    // 텍스트 뒤 흰 배경 (패딩 2px)
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(cx - tw / 2 - 2, ty - 9, tw + 4, 12);
    // 텍스트
    ctx.fillStyle = '#1e3a5f';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, ty);
  });

  // 3단계: 연도 — 맨 마지막, 우상단 (막대에 안 가려짐)
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${year}년`, W - 6, 18);
}

function renderMonthlyTable(data, year) {
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const tH = data.reduce((s, r) => s + r.headcount, 0), tS = data.reduce((s, r) => s + r.actual_sale, 0);
  document.getElementById('monthly-table').innerHTML = `
    <tr><th>${year}년</th>${months.map(m => `<th style="text-align:right">${m}</th>`).join('')}<th style="text-align:right">합계</th></tr>
    <tr><td>인원</td>${Array.from({ length: 12 }, (_, i) => { const d = data.find(x => x.month === i + 1); return `<td class="num">${d && d.headcount ? fmt(d.headcount) : '-'}</td>`; }).join('')}<td class="num"><strong>${fmt(tH)}</strong></td></tr>
    <tr><td>매출</td>${Array.from({ length: 12 }, (_, i) => { const d = data.find(x => x.month === i + 1); return `<td class="num">${d && d.actual_sale ? fmt(d.actual_sale) : '-'}</td>`; }).join('')}<td class="num"><strong>${fmt(tS)}</strong></td></tr>
  `;
}

function renderVendorTable(data) {
  if (!data.length) { document.getElementById('vendor-table').innerHTML = '<tr><td class="empty">데이터 없음</td></tr>'; return; }
  const total = data.reduce((s, r) => s + r.actual_sale, 0);
  document.getElementById('vendor-table').innerHTML = `
    <tr><th>업체</th><th style="text-align:right">건수</th><th style="text-align:right">인원</th><th style="text-align:right">매출</th><th style="text-align:right">비중</th></tr>
    ${data.map(r => `<tr><td>${displayText(r.vendor)}</td><td class="num">${r.count}건</td><td class="num">${fmt(r.headcount)}명</td><td class="num" style="color:#3b82f6;font-weight:600">${fmt(r.actual_sale)}원</td><td class="num">${total ? (r.actual_sale / total * 100).toFixed(1) + '%' : '-'}</td></tr>`).join('')}
    <tr style="background:#f8fafc;font-weight:700"><td>합계</td><td class="num">${data.reduce((s, r) => s + r.count, 0)}건</td><td class="num">${fmt(data.reduce((s, r) => s + r.headcount, 0))}명</td><td class="num" style="color:#10b981">${fmt(total)}원</td><td></td></tr>
  `;
}

// ========================
// Venues Page
// ========================
let venuesData = [];
let venuesFiltered = [];
let venuesPage = 1;

async function loadVenues() {
  venuesData = await fetch('/api/venues/').then(r => r.json());
  venuesPage = 1;
  filterVenues();
}

function filterVenues() {
  const kw = document.getElementById('venue-keyword').value.toLowerCase();
  venuesFiltered = venuesData.filter(v =>
    v.name.toLowerCase().includes(kw) || (v.memo || '').toLowerCase().includes(kw)
  );
  venuesPage = 1;
  document.getElementById('venue-count').textContent = `총 ${venuesFiltered.length}개`;
  renderVenuesTable();
}

function gotoVenuePage(page) {
  venuesPage = page;
  renderVenuesTable();
}

function renderVenuesTable() {
  const total = Math.ceil(venuesFiltered.length / PAGE_SIZE);
  const slice = venuesFiltered.slice((venuesPage-1)*PAGE_SIZE, venuesPage*PAGE_SIZE);
  document.getElementById('venues-tbody').innerHTML = slice.length
    ? slice.map(v => `
        <tr>
          <td><strong>${displayText(v.name)}</strong></td>
          <td>${displayText(v.memo)}</td>
          <td>
            <button class="btn-edit" onclick="openVenueModal(${v.id})">수정</button>
            <button class="btn-delete" onclick="deleteVenue(${v.id})">삭제</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="empty">등록된 행사장이 없습니다.</td></tr>';
  renderPager('venues-pager', venuesPage, total, 'gotoVenuePage');
}

function openVenueModal(id) {
  document.getElementById('venue-edit-id').value = id || '';
  setFormError('venue-error', 'vf-name', '');
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
  if (!payload.name) {
    setFormError('venue-error', 'vf-name', '행사장명을 입력해 주세요.');
    return;
  }
  const duplicate = venuesData.find(v => normalizeName(v.name) === normalizeName(payload.name) && String(v.id) !== String(id));
  if (duplicate) {
    setFormError('venue-error', 'vf-name', `이미 등록된 행사장입니다: ${payload.name}`);
    return;
  }
  const url = id ? `/api/venues/${id}` : '/api/venues/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setFormError('venue-error', 'vf-name', err.detail || `이미 등록된 행사장인지 확인해 주세요: ${payload.name}`);
    return;
  }
  closeVenueModal();
  await loadVenues();
  await loadOptions();
}

async function deleteVenue(id) {
  const ok = await appConfirm('선택한 행사장을 삭제하시겠습니까?', {
    title: '행사장 삭제',
    type: 'danger',
    okText: '삭제',
  });
  if (!ok) return;
  try {
    await fetch(`/api/venues/${id}`, { method: 'DELETE' }).then(parseJsonResponse);
  } catch (err) {
    await appAlert(err.message, '삭제 오류', 'danger');
    return;
  }
  await loadVenues();
  await loadOptions();
}

// ========================
// Clients Page
// ========================
let clientsData = [];
let clientsFiltered = [];
let clientsPage = 1;

async function loadClients() {
  clientsData = await fetch('/api/clients/').then(r => r.json());
  clientsPage = 1;
  filterClients();
}

function filterClients() {
  const type = document.getElementById('client-type-filter').value;
  const kw = document.getElementById('client-keyword').value.toLowerCase();
  clientsFiltered = clientsData;
  if (type) clientsFiltered = clientsFiltered.filter(c => c.type === type);
  if (kw)  clientsFiltered = clientsFiltered.filter(c =>
    c.name.toLowerCase().includes(kw) || (c.manager || '').toLowerCase().includes(kw)
  );
  clientsPage = 1;
  document.getElementById('client-count').textContent = `총 ${clientsFiltered.length}명`;
  renderClientsTable();
}

function gotoClientPage(page) {
  clientsPage = page;
  renderClientsTable();
}

function renderClientsTable() {
  const total = Math.ceil(clientsFiltered.length / PAGE_SIZE);
  const data = clientsFiltered.slice((clientsPage-1)*PAGE_SIZE, clientsPage*PAGE_SIZE);
  document.getElementById('clients-tbody').innerHTML = data.length
    ? data.map(c => `
        <tr>
          <td><strong>${displayText(c.name)}</strong></td>
          <td>${c.type ? `<span class="type-badge">${displayText(c.type)}</span>` : '-'}</td>
          <td>${displayText(c.phone)}</td>
          <td>${displayText(c.manager)}</td>
          <td>${c.bank ? `${displayText(c.bank)} ${displayText(c.account_number, '')}` : '-'}</td>
          <td>
            <button class="btn-edit" onclick="openClientModal(${c.id})">수정</button>
            <button class="btn-delete" onclick="deleteClient(${c.id})">삭제</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="empty">등록된 고객이 없습니다.</td></tr>';
  renderPager('clients-pager', clientsPage, total, 'gotoClientPage');
}

const CLIENT_FIELDS = ['name','type','phone','bank','account_number','account_holder','manager','memo'];

function openClientModal(id) {
  document.getElementById('client-edit-id').value = id || '';
  setFormError('client-error', 'cf-name', '');
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
  payload.name = payload.name.trim();
  if (!payload.name) {
    setFormError('client-error', 'cf-name', '단체명을 입력해 주세요.');
    return;
  }
  const duplicate = clientsData.find(c => normalizeName(c.name) === normalizeName(payload.name) && String(c.id) !== String(id));
  if (duplicate) {
    setFormError('client-error', 'cf-name', `이미 등록된 고객입니다: ${payload.name}`);
    return;
  }
  const url = id ? `/api/clients/${id}` : '/api/clients/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setFormError('client-error', 'cf-name', err.detail || `이미 등록된 고객인지 확인해 주세요: ${payload.name}`);
    return;
  }
  closeClientModal();
  await loadClients();
  await loadOptions();
}

async function deleteClient(id) {
  const ok = await appConfirm('선택한 고객을 삭제하시겠습니까?', {
    title: '고객 삭제',
    type: 'danger',
    okText: '삭제',
  });
  if (!ok) return;
  try {
    await fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(parseJsonResponse);
  } catch (err) {
    await appAlert(err.message, '삭제 오류', 'danger');
    return;
  }
  await loadClients();
  await loadOptions();
}

// ========================
// Init
// ========================
loadYearOptions();
loadOptions();
loadVendors();
loadReservations();
