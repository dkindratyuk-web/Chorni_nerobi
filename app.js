'use strict';
const K = 'pwvault1';
const S = { items: [], theme: 'light', vib: true };
const TYPES = { wifi: 'Wi-Fi мережі', admin: 'Адмінки' };
const IC = {
  wifi: '<svg viewBox="0 0 24 24"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/></svg>',
  admin: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};
let view = null, q = '';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const vib = n => { if (S.vib && navigator.vibrate) try { navigator.vibrate(n); } catch (e) { } };

function load() { try { Object.assign(S, JSON.parse(localStorage.getItem(K) || '{}')); } catch (e) { } }
function save() { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { toast('Не вдалося зберегти'); } }
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = S.theme === 'dark' ? '#0e131f' : '#f4f6fb';
}
let tt; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 1800); }
async function copy(t, label) {
  if (!t) return toast('Порожньо');
  try { await navigator.clipboard.writeText(t); } catch (e) {
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (_) { } a.remove();
  }
  vib(25); toast((label || 'Скопійовано') + ' ✓');
}

/* ---------- імпорт ---------- */
const HEAD = {
  type: ['тип', 'type', 'категорія'], name: ['назва', 'name', 'ssid', 'мережа', 'пристрій'],
  login: ['логін', 'login', 'user', 'username', 'користувач'], pass: ['пароль', 'password', 'pass'], note: ['примітка', 'note', 'notes', 'коментар']
};
function parseRows(rows) {
  const out = []; let skipped = 0;
  rows.forEach(r => {
    const g = {}, low = {}; Object.keys(r).forEach(k => low[String(k).trim().toLowerCase()] = r[k]);
    for (const f in HEAD) { const k = HEAD[f].find(h => h in low); g[f] = k ? String(low[k] == null ? '' : low[k]).trim() : ''; }
    if (!g.name || !(g.pass || g.login)) { skipped++; return; }
    const t = g.type.toLowerCase();
    g.type = /wi|вай|мереж|wifi|ssid/.test(t) ? 'wifi' : /адм|admin|router|роутер/.test(t) ? 'admin' : (t ? 'admin' : 'wifi');
    out.push(g);
  });
  return { items: out, skipped };
}
function mergeItems(list) {
  let add = 0, dup = 0;
  list.forEach(n => {
    if (S.items.some(i => i.type === n.type && i.name === n.name && i.login === n.login && i.pass === n.pass)) { dup++; return; }
    S.items.push({ id: uid(), type: n.type, name: n.name, login: n.login, pass: n.pass, note: n.note || '' }); add++;
  });
  return { add, dup };
}
function loadXLSX() {
  return new Promise((res, rej) => {
    if (window.XLSX) return res();
    const s = document.createElement('script'); s.src = 'xlsx.mini.min.js'; s.onload = res; s.onerror = () => rej(new Error('xlsx')); document.head.appendChild(s);
  });
}
async function doImport(file) {
  try {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
    const p = parseRows(rows), m = mergeItems(p.items);
    save(); render(); vib([20, 40, 20]);
    toast(`Додано: ${m.add}, дублікатів: ${m.dup}, пропущено: ${p.skipped}`);
  } catch (e) { toast('Не вдалося прочитати файл'); }
}
async function template() {
  await loadXLSX();
  const ws = XLSX.utils.aoa_to_sheet([['Тип', 'Назва', 'Логін', 'Пароль', 'Примітка'], ['wifi', 'Office-5G', '', 'MyWifiPass123', 'Офіс'], ['admin', 'MikroTik hAP', 'admin', 'RouterPass!', '192.168.88.1']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Паролі'); XLSX.writeFile(wb, 'passwords-template.xlsx');
}
function exportJSON() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.items, null, 1)], { type: 'application/json' }));
  a.download = 'passwords-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- екрани ---------- */
function render() {
  const app = $('#app');
  if (!view) {
    const n = t => S.items.filter(i => i.type === t).length;
    app.innerHTML = `<header><h1>Паролі</h1><button class="ib" id="gear" aria-label="Налаштування">${IC.gear}</button></header>
    <div class="cards">${['wifi', 'admin'].map(t => `<button class="card" data-t="${t}"><div class="big">${IC[t]}</div><b>${TYPES[t]}</b><span>${n(t)} записів</span></button>`).join('')}</div>`;
    $('#gear').onclick = openSettings;
    app.querySelectorAll('.card').forEach(c => c.onclick = () => { vib(15); go(c.dataset.t); });
    return;
  }
  app.innerHTML = `<header><button class="ib" id="bk" aria-label="Назад">${IC.back}</button><h1>${TYPES[view]}</h1><button class="ib" id="gear">${IC.gear}</button></header>
  <input class="search" id="q" type="search" placeholder="Пошук…" value="${esc(q)}"><div id="list"></div>
  <button class="fab" id="add" aria-label="Додати">${IC.plus}</button>`;
  $('#bk').onclick = () => history.back(); $('#gear').onclick = openSettings; $('#add').onclick = () => { vib(15); openItem(null); };
  $('#q').oninput = e => { q = e.target.value; list(); };
  list();
}
function list() {
  const L = $('#list'), s = q.trim().toLowerCase();
  const items = S.items.filter(i => i.type === view && (!s || (i.name + ' ' + i.login + ' ' + i.note).toLowerCase().includes(s)))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  if (!items.length) { L.innerHTML = `<div class="empty">${S.items.some(i => i.type === view) ? 'Нічого не знайдено' : 'Поки порожньо.<br>Натисніть «+» або імпортуйте Excel у налаштуваннях.'}</div>`; return; }
  L.innerHTML = items.map((i, n) => `<div class="row" data-id="${i.id}" style="animation-delay:${Math.min(n, 10) * 30}ms"><div class="av">${esc((i.name[0] || '?').toUpperCase())}</div><div class="mid"><b>${esc(i.name)}</b><small>${esc(i.login || i.note || 'лише пароль')}</small></div><button class="qc" aria-label="Копіювати пароль">${IC.key}</button></div>`).join('');
  L.querySelectorAll('.row').forEach(r => {
    const it = S.items.find(x => x.id === r.dataset.id); let timer, fired = false, x0 = 0, y0 = 0;
    r.oncontextmenu = e => e.preventDefault();
    r.onpointerdown = e => { fired = false; x0 = e.clientX; y0 = e.clientY; timer = setTimeout(() => { fired = true; copy(it.pass, 'Пароль скопійовано'); }, 550); };
    r.onpointermove = e => { if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) clearTimeout(timer); };
    ['onpointerup', 'onpointerleave', 'onpointercancel'].forEach(h => r[h] = () => clearTimeout(timer));
    r.onclick = e => { if (fired) { fired = false; return; } if (e.target.closest('.qc')) { copy(it.pass, 'Пароль скопійовано'); return; } vib(10); openItem(it.id); };
  });
}

/* ---------- вікна ---------- */
function sheet(html) {
  const bd = $('#bd'); bd.innerHTML = `<div class="sheet"><div class="grip"></div>${html}</div>`; bd.classList.add('on');
  bd.onclick = e => { if (e.target === bd) closeSheet(); };
  history.pushState({ v: view, s: 1 }, '');
}
function closeSheet(fromPop) {
  const bd = $('#bd'); if (!bd.classList.contains('on')) return;
  bd.classList.remove('on'); bd.innerHTML = '';
  if (!fromPop && history.state && history.state.s) history.back();
}
function openItem(id) {
  const it = id ? S.items.find(x => x.id === id) : { type: view, name: '', login: '', pass: '', note: '' };
  const fld = (k, lab, type, copyable) => `<div class="f"><label>${lab}</label><div class="fw"><input id="f_${k}" type="${type || 'text'}" value="${esc(it[k])}" autocomplete="off" autocapitalize="off" spellcheck="false">${k === 'pass' ? `<button class="ib" id="eye" aria-label="Показати">${IC.eye}</button>` : ''}${copyable ? `<button class="ib" id="c_${k}" aria-label="Копіювати">${IC.copy}</button>` : ''}</div></div>`;
  sheet(`<h2>${id ? 'Запис' : 'Новий запис'}</h2>${fld('name', it.type === 'wifi' ? 'Назва мережі (SSID)' : 'Назва пристрою / адмінки')}${fld('login', 'Логін', 'text', !!id)}${fld('pass', 'Пароль', 'password', !!id)}${fld('note', 'Примітка')}
  <button class="btn" id="sv">${id ? 'Зберегти зміни' : 'Додати'}</button>${id ? '<button class="btn del" id="rm">Видалити</button>' : ''}`);
  const v = k => $('#f_' + k).value;
  $('#eye').onclick = () => { const p = $('#f_pass'); p.type = p.type === 'password' ? 'text' : 'password'; vib(10); };
  if (id) {
    $('#c_login').onclick = () => { copy(v('login'), 'Логін скопійовано'); $('#c_login').classList.remove('next'); $('#c_pass').classList.add('next'); };
    $('#c_pass').onclick = () => { copy(v('pass'), 'Пароль скопійовано'); $('#c_pass').classList.remove('next'); };
    if (!it.login) $('#c_pass').classList.add('next');
    else $('#c_login').classList.add('next');
    $('#rm').onclick = () => { if (confirm('Видалити запис «' + it.name + '»?')) { S.items = S.items.filter(x => x.id !== id); save(); closeSheet(); render(); vib(40); toast('Видалено'); } };
  }
  $('#sv').onclick = () => {
    if (!v('name').trim()) { toast('Вкажіть назву'); vib([30, 40, 30]); return; }
    if (!v('pass') && !v('login')) { toast('Вкажіть логін або пароль'); return; }
    const d = { name: v('name').trim(), login: v('login').trim(), pass: v('pass'), note: v('note').trim() };
    if (id) Object.assign(it, d); else S.items.push({ id: uid(), type: view, ...d });
    save(); closeSheet(); render(); vib(20); toast('Збережено ✓');
  };
}
function openSettings() {
  sheet(`<h2>Налаштування</h2>
  <div class="f"><label>Тема</label><div class="seg"><button data-th="light">☀️ Світла</button><button data-th="dark">🌙 Темна</button></div></div>
  <div class="set"><span>Вібровідгук</span><button class="sw ${S.vib ? 'on' : ''}" id="vb" aria-label="Вібро"></button></div>
  <h2 style="margin-top:14px">Імпорт з Excel</h2>
  <div class="hint">Перший рядок — заголовки. Колонки:<table><tr><th>Тип</th><th>Назва</th><th>Логін</th><th>Пароль</th><th>Примітка</th></tr><tr><td>wifi</td><td>Office-5G</td><td></td><td>MyWifiPass123</td><td>Офіс</td></tr><tr><td>admin</td><td>MikroTik hAP</td><td>admin</td><td>RouterPass!</td><td>192.168.88.1</td></tr></table>
  <b>Тип</b>: <code>wifi</code> або <code>admin</code> (порожній = wifi). <b>Назва</b> і <b>Пароль</b> обов'язкові; для Wi-Fi логін можна лишити порожнім. Формати: .xlsx, .xls, .csv. Беруться дані з першого аркуша, однакові записи пропускаються.</div>
  <input type="file" id="fi" accept=".xlsx,.xls,.csv" hidden>
  <button class="btn" id="imp">Вибрати файл для імпорту</button><button class="btn sec" id="tpl">Завантажити шаблон Excel</button><button class="btn sec" id="exp">Резервна копія (JSON)</button>
  <p style="color:var(--mut);font-size:13px;text-align:center">Дані зберігаються лише на цьому пристрої. Вібро не підтримується в iOS Safari.</p>`);
  const th = () => document.querySelectorAll('[data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === S.theme)); th();
  document.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; applyTheme(); save(); th(); vib(10); });
  $('#vb').onclick = e => { S.vib = !S.vib; e.target.classList.toggle('on', S.vib); save(); vib(30); };
  $('#imp').onclick = () => $('#fi').click(); $('#fi').onchange = e => { if (e.target.files[0]) { closeSheet(); doImport(e.target.files[0]); } };
  $('#tpl').onclick = template; $('#exp').onclick = exportJSON;
}
function go(t) { view = t; q = ''; history.pushState({ v: t }, ''); render(); }

if (typeof document !== 'undefined' && document.getElementById('app')) {
  load(); applyTheme(); history.replaceState({ v: null }, '');
  addEventListener('popstate', () => { closeSheet(true); view = (history.state && history.state.v) || null; render(); });
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
if (typeof module !== 'undefined') module.exports = { parseRows, mergeItems, S };
