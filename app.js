'use strict';
const VER = '4.2', VK = 'pwenc1', SK = 'pwset1', OLD = 'pwvault1', ITER = 310000;
const S = { items: [], theme: 'light', vib: true, lock: 5, hue: 250 };
let KEY = null, META = null, legacy = [], saveQ = Promise.resolve(), tries = 0, until = 0, lt, hid = 0;
const TYPES = { wifi: 'Wi-Fi мережі', admin: 'Адмінки' };
const IC = {
  wifi: '<svg viewBox="0 0 24 24"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/></svg>',
  admin: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};
let view = null, q = '';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const vib = n => { if (S.vib && navigator.vibrate) try { navigator.vibrate(n); } catch (e) { } };

function load() {
  try { const o = JSON.parse(localStorage.getItem(OLD) || '{}'); if (o.theme) S.theme = o.theme; if (o.vib === false) S.vib = false; legacy = Array.isArray(o.items) ? o.items : []; } catch (e) { }
  try { Object.assign(S, JSON.parse(localStorage.getItem(SK) || '{}')); } catch (e) { }
}
function save() {
  try { localStorage.setItem(SK, JSON.stringify({ theme: S.theme, vib: S.vib, lock: S.lock, hue: S.hue })); } catch (e) { }
  if (!KEY) return saveQ;
  const data = JSON.stringify(S.items), k = KEY, m = META;
  saveQ = saveQ.then(async () => { localStorage.setItem(VK, JSON.stringify({ v: 1, iter: m.iter, salt: m.salt, ...await enc(k, data) })); }).catch(() => toast('Не вдалося зберегти'));
  return saveQ;
}
/* ---------- шифрування: PBKDF2 -> AES-256-GCM ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function derive(pw, salt, iter) {
  const m = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function enc(k, txt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64(iv), ct: b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(txt)))) };
}
async function dec(k, o) { return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct))); }
async function setup(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  META = { salt: b64(salt), iter: ITER }; KEY = await derive(pw, salt, ITER);
  S.items = legacy; legacy = []; await save();
  if (localStorage.getItem(VK)) localStorage.removeItem(OLD);
}
async function unlock(pw) {
  const o = JSON.parse(localStorage.getItem(VK)), k = await derive(pw, unb64(o.salt), o.iter);
  const items = JSON.parse(await dec(k, o)); KEY = k; META = { salt: o.salt, iter: o.iter }; S.items = items;
}
function touch() { clearTimeout(lt); if (KEY) lt = setTimeout(lock, (S.lock || 5) * 60000); }
function lock() { KEY = null; META = null; S.items = []; view = null; q = ''; clearTimeout(lt); closeSheet(true); render(); }
function renderLock() {
  const app = $('#app'), first = !localStorage.getItem(VK);
  if (!(window.crypto && crypto.subtle)) { app.innerHTML = '<div class="lock"><h1>Потрібен HTTPS</h1><p>Шифрування працює лише на захищеному з\'єднанні.</p></div>'; return; }
  const inp = (id, ph, ac) => `<div class="f"><div class="fw"><div class="tf"><input id="${id}" type="password" placeholder=" " autocomplete="${ac}"><label>${ph}</label></div></div></div>`;
  app.innerHTML = `<div class="lock"><div class="av" style="margin:0 auto;width:64px;height:64px">${IC.admin}</div><h1>${first ? 'Створіть майстер-пароль' : 'Записничок'}</h1>
  ${first ? `<div class="hint">Мінімум 8 символів. Якщо його забути, дані відновити неможливо.${legacy.length ? ' Наявні записи (' + legacy.length + ') буде зашифровано.' : ''}</div>` : ''}
  ${inp('mp', 'Майстер-пароль', first ? 'new-password' : 'current-password')}${first ? inp('mp2', 'Повторіть пароль', 'new-password') : ''}
  <button class="rp btn" id="go">${first ? 'Створити' : 'Розблокувати'}</button>${first ? '' : '<button class="rp btn del" id="wipe">Забули пароль? Стерти дані</button>'}</div>`;
  const go = async () => {
    const b = $('#go'), pw = $('#mp').value;
    if (Date.now() < until) return toast('Зачекайте ' + Math.ceil((until - Date.now()) / 1000) + ' с');
    if (first) { if (pw.length < 8) return toast('Мінімум 8 символів'); if (pw !== $('#mp2').value) return toast('Паролі не збігаються'); } else if (!pw) return;
    b.disabled = true; b.textContent = 'Зачекайте…';
    try { await (first ? setup(pw) : unlock(pw)); tries = 0; vib(20); touch(); render(); }
    catch (e) {
      b.disabled = false; b.textContent = first ? 'Створити' : 'Розблокувати';
      if (first) { KEY = null; toast('Помилка шифрування'); } else { tries++; until = Date.now() + Math.min(30000, 1000 * 2 ** (tries - 1)); vib([30, 40, 30]); toast('Невірний пароль'); $('#mp').value = ''; }
    }
  };
  $('#go').onclick = go; app.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') go(); });
  if ($('#wipe')) $('#wipe').onclick = () => { if (confirm('Стерти всі збережені дані? Це неможливо скасувати.')) { localStorage.removeItem(VK); localStorage.removeItem(OLD); legacy = []; render(); } };
}
let dip = null;
const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instBlock = () => standalone() ? '' : `<div class="hint">${dip ? 'Додаток можна встановити на пристрій.' : isIOS ? 'Safari: «Поділитися» → «На початковий екран».' : 'Chrome поки не дозволив встановлення. Спробуйте меню ⋮ → «Встановити додаток».'}</div>${dip ? '<button class="rp btn" id="inst">Встановити додаток</button>' : ''}`;
function applyTheme() {
  const h = S.hue, d = S.theme === 'dark', r = document.documentElement, h2 = (h + 60) % 360, v = d ? {
    '--tx': '#fff', '--tv': 'rgba(235,235,245,.62)', '--glass': 'rgba(60,60,72,.4)', '--glassb': 'rgba(255,255,255,.16)', '--glassd': 'rgba(34,34,44,.7)',
    '--card': 'rgba(60,60,72,.5)', '--fill': 'rgba(120,120,128,.28)', '--sep': 'rgba(255,255,255,.14)', '--segon': 'rgba(130,130,140,.6)', '--shadow': 'rgba(0,0,0,.45)',
    '--hi1': 'rgba(255,255,255,.28)', '--hi2': 'rgba(255,255,255,.06)', '--p': `hsl(${h} 100% 70%)`, '--err': '#ff453a', '--ok': '#30d158',
    '--b1': `hsl(${h} 30% 8%)`, '--b2': `hsl(${h} 70% 26%)`, '--b3': `hsl(${h2} 60% 22%)`, '--solid': '#1c1c1e'
  } : {
    '--tx': '#111', '--tv': 'rgba(60,60,67,.66)', '--glass': 'rgba(255,255,255,.5)', '--glassb': 'rgba(255,255,255,.7)', '--glassd': 'rgba(250,250,255,.74)',
    '--card': 'rgba(255,255,255,.68)', '--fill': 'rgba(118,118,128,.12)', '--sep': 'rgba(60,60,67,.14)', '--segon': '#fff', '--shadow': 'rgba(30,40,90,.16)',
    '--hi1': 'rgba(255,255,255,.95)', '--hi2': 'rgba(255,255,255,.35)', '--p': `hsl(${h} 90% 48%)`, '--err': '#ff3b30', '--ok': '#34c759',
    '--b1': `hsl(${h} 80% 96%)`, '--b2': `hsl(${h} 90% 85%)`, '--b3': `hsl(${h2} 90% 88%)`, '--solid': '#f2f2f7'
  };
  for (const k in v) r.style.setProperty(k, v[k]);
  r.dataset.theme = S.theme; r.style.colorScheme = S.theme;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = v['--b1'];
}
let tt; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 1800); }
async function copy(t, msg, btn) {
  if (!t) return toast('Нічого копіювати: поле порожнє');
  let ok = true;
  try { await navigator.clipboard.writeText(t); } catch (e) {
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0;font-size:16px'; document.body.appendChild(a); a.focus(); a.select(); a.setSelectionRange(0, a.value.length);
    ok = false; try { ok = document.execCommand('copy'); } catch (_) { } a.remove();
  }
  if (!ok) { vib([30, 40, 30]); return toast('Не вдалося скопіювати. Виділіть текст і скопіюйте вручну'); }
  vib(25); toast('✓ ' + (msg || 'Скопійовано'));
  if (btn) {
    if (!btn._o) btn._o = btn.innerHTML; clearTimeout(btn._t); btn.innerHTML = IC.check; btn.classList.add('done');
    btn._t = setTimeout(() => { btn.innerHTML = btn._o; btn._o = null; btn.classList.remove('done'); }, 1600);
  }
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
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Паролі'); saveFile('zapysnychok-template.xlsx', new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' }));
}
async function saveFile(name, blob) {
  try { const f = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } }
  catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function exportEnc() { await saveQ; saveFile('zapysnychok-backup-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([localStorage.getItem(VK)], { type: 'application/json' })); }

/* ---------- екрани ---------- */
function render() {
  if (!KEY) return renderLock();
  const app = $('#app');
  if (!view) {
    const n = t => S.items.filter(i => i.type === t).length;
    app.innerHTML = `<header><span></span><h1>Записничок</h1><button class="ib rp" id="gear" aria-label="Налаштування">${IC.gear}</button></header>
    <div class="cards">${['wifi', 'admin'].map(t => `<button class="card rp" data-t="${t}"><div class="big">${IC[t]}</div><b>${TYPES[t]}</b><span>${n(t)} записів</span></button>`).join('')}</div>`;
    $('#gear').onclick = openSettings;
    app.querySelectorAll('.card').forEach(c => c.onclick = () => { vib(15); go(c.dataset.t); });
    return;
  }
  app.innerHTML = `<header><button class="ib rp" id="bk" aria-label="Назад">${IC.back}</button><h1>${TYPES[view]}</h1><button class="ib rp" id="gear">${IC.gear}</button></header>
  <div class="search">${IC.search}<input id="q" type="search" placeholder="Пошук" value="${esc(q)}" enterkeyhint="search" autocomplete="off"></div><div id="list"></div>
  <button class="fab rp" id="add" aria-label="Додати">${IC.plus}<span>Додати</span></button>`;
  $('#bk').onclick = () => history.back(); $('#gear').onclick = openSettings; $('#add').onclick = () => { vib(15); openItem(null); };
  $('#q').oninput = e => { q = e.target.value; list(); };
  list();
}
const passMsg = i => `Пароль «${i.name}» скопійовано · ${i.pass.length} симв.`;
function list() {
  const L = $('#list'), s = q.trim().toLowerCase();
  const items = S.items.filter(i => i.type === view && (!s || (i.name + ' ' + i.login + ' ' + i.note).toLowerCase().includes(s)))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  if (!items.length) { L.innerHTML = `<div class="empty">${S.items.some(i => i.type === view) ? 'Нічого не знайдено' : 'Поки порожньо.<br>Натисніть «+» або імпортуйте Excel у налаштуваннях.'}</div>`; return; }
  L.innerHTML = items.map((i, n) => `<div class="row rp" data-id="${i.id}" style="animation-delay:${Math.min(n, 10) * 30}ms"><div class="av">${esc((i.name[0] || '?').toUpperCase())}</div><div class="mid"><b>${esc(i.name)}</b><small>${esc(i.login || i.note || 'лише пароль')}</small></div><button class="qc rp" aria-label="Копіювати пароль">${IC.key}</button></div>`).join('');
  L.querySelectorAll('.row').forEach(r => {
    const it = S.items.find(x => x.id === r.dataset.id); let timer, armed = false, fired = false, x0 = 0, y0 = 0;
    const off = () => { clearTimeout(timer); armed = false; r.classList.remove('armed'); };
    r.oncontextmenu = e => e.preventDefault();
    r.onpointerdown = e => { fired = false; armed = false; x0 = e.clientX; y0 = e.clientY; timer = setTimeout(() => { armed = true; r.classList.add('armed'); vib(15); }, 500); };
    r.onpointermove = e => { if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) off(); };
    r.onpointerup = () => { clearTimeout(timer); if (armed) { fired = true; copy(it.pass, passMsg(it), r.querySelector('.qc')); } off(); };
    r.onpointerleave = r.onpointercancel = off;
    r.onclick = e => { if (fired) { fired = false; return; } if (e.target.closest('.qc')) { copy(it.pass, passMsg(it), r.querySelector('.qc')); return; } vib(10); openItem(it.id); };
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
  const fld = (k, lab, type, copyable) => `<div class="f"><div class="fw"><div class="tf"><input id="f_${k}" type="${type || 'text'}" value="${esc(it[k])}" placeholder=" " autocomplete="off" autocapitalize="off" spellcheck="false"><label>${lab}</label></div>${k === 'pass' ? `<button class="ib rp" id="eye" aria-label="Показати">${IC.eye}</button>` : ''}${copyable ? `<button class="ib rp" id="c_${k}" aria-label="Копіювати">${IC.copy}</button>` : ''}</div></div>`;
  sheet(`<h2>${id ? 'Запис' : 'Новий запис'}</h2>${fld('name', it.type === 'wifi' ? 'Назва мережі (SSID)' : 'Назва пристрою / адмінки')}${fld('login', 'Логін', 'text', !!id)}${fld('pass', 'Пароль', 'password', !!id)}${fld('note', 'Примітка')}
  <button class="rp btn" id="sv">${id ? 'Зберегти зміни' : 'Додати'}</button>${id ? '<button class="rp btn del" id="rm">Видалити</button>' : ''}`);
  const v = k => $('#f_' + k).value;
  $('#eye').onclick = () => { const p = $('#f_pass'); p.type = p.type === 'password' ? 'text' : 'password'; vib(10); };
  if (id) {
    $('#c_login').onclick = () => { copy(v('login'), `Логін «${v('login')}» скопійовано. Тепер скопіюйте пароль`, $('#c_login')); $('#c_login').classList.remove('next'); $('#c_pass').classList.add('next'); };
    $('#c_pass').onclick = () => { copy(v('pass'), `Пароль скопійовано · ${v('pass').length} симв.`, $('#c_pass')); $('#c_pass').classList.remove('next'); };
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
  <div class="f"><label>Тема</label><div class="seg"><button data-th="light">Світла</button><button data-th="dark">Темна</button></div></div>
  <div class="f"><label>Колір акценту</label><div class="dots">${[250, 150, 290, 25, 350, 185].map(h => `<button class="dot" data-h="${h}" style="background:hsl(${h} 60% 45%)" aria-label="Колір"></button>`).join('')}</div></div>
  <div class="set"><span>Вібровідгук</span><button class="sw ${S.vib ? 'on' : ''}" id="vb" aria-label="Вібро"></button></div>
  <div class="f"><label>Автоблокування, хв</label><div class="seg">${[1, 5, 15].map(m => `<button data-lk="${m}">${m}</button>`).join('')}</div></div>
  ${instBlock()}<h2 style="margin-top:14px">Імпорт з Excel</h2>
  <div class="hint">Перший рядок — заголовки. Колонки:<table><tr><th>Тип</th><th>Назва</th><th>Логін</th><th>Пароль</th><th>Примітка</th></tr><tr><td>wifi</td><td>Office-5G</td><td></td><td>MyWifiPass123</td><td>Офіс</td></tr><tr><td>admin</td><td>MikroTik hAP</td><td>admin</td><td>RouterPass!</td><td>192.168.88.1</td></tr></table>
  <b>Тип</b>: <code>wifi</code> або <code>admin</code> (порожній = wifi). <b>Назва</b> і <b>Пароль</b> обов'язкові; для Wi-Fi логін можна лишити порожнім. Формати: .xlsx, .xls, .csv. Беруться дані з першого аркуша, однакові записи пропускаються.</div>
  <input type="file" id="fi" accept=".xlsx,.xls,.csv" hidden>
  <button class="rp btn" id="imp">Вибрати файл для імпорту</button><button class="rp btn sec" id="tpl">Завантажити шаблон Excel</button><button class="rp btn sec" id="exp">Зашифрована резервна копія</button><button class="rp btn sec" id="rst">Відновити з копії</button><button class="rp btn sec" id="cpw">Змінити майстер-пароль</button><button class="rp btn" id="lk">Заблокувати зараз</button>
  <p style="color:var(--mut);font-size:13px;text-align:center">Дані зашифровано (AES-256) і зберігаються лише на цьому пристрої. Вібро не підтримується в iOS Safari. Версія ${VER}.</p>`);
  const th = () => document.querySelectorAll('[data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === S.theme)); th();
  document.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; applyTheme(); save(); th(); vib(10); });
  $('#vb').onclick = e => { S.vib = !S.vib; e.target.classList.toggle('on', S.vib); save(); vib(30); };
  $('#imp').onclick = () => $('#fi').click(); $('#fi').onchange = e => { if (e.target.files[0]) { closeSheet(); doImport(e.target.files[0]); } };
  if ($('#inst')) $('#inst').onclick = async () => { const e = dip; dip = null; e.prompt(); try { await e.userChoice; } catch (_) { } closeSheet(); };
  $('#tpl').onclick = template; $('#exp').onclick = exportEnc; $('#rst').onclick = () => { closeSheet(); setTimeout(openRestore, 50); }; $('#cpw').onclick = () => { closeSheet(); setTimeout(openChangePw, 50); }; $('#lk').onclick = () => { closeSheet(); setTimeout(lock, 50); };
  const dt = () => document.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('on', +b.dataset.h === S.hue)); dt();
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { S.hue = +b.dataset.h; applyTheme(); save(); dt(); vib(10); });
  const lk = () => document.querySelectorAll('[data-lk]').forEach(b => b.classList.toggle('on', +b.dataset.lk === S.lock)); lk();
  document.querySelectorAll('[data-lk]').forEach(b => b.onclick = () => { S.lock = +b.dataset.lk; save(); lk(); touch(); vib(10); });
}
const pf = (id, l) => `<div class="f"><div class="fw"><div class="tf"><input id="${id}" type="password" placeholder=" " autocomplete="off"><label>${l}</label></div></div></div>`;
function openRestore() {
  sheet(`<h2>Відновлення з копії</h2><div class="f"><label>Файл копії (.json)</label><div class="fw"><input id="rf" type="file" accept=".json,application/json"></div></div>${pf('rp', 'Майстер-пароль цієї копії')}<button class="rp btn" id="rg">Відновити</button>`);
  $('#rg').onclick = async () => {
    const f = $('#rf').files[0], pw = $('#rp').value; if (!f || !pw) return toast('Виберіть файл і введіть пароль');
    try {
      const o = JSON.parse(await f.text()), a = JSON.parse(await dec(await derive(pw, unb64(o.salt), o.iter), o));
      const list = a.filter(i => i && i.name && (i.type === 'wifi' || i.type === 'admin')).map(i => ({ type: i.type, name: String(i.name), login: String(i.login || ''), pass: String(i.pass || ''), note: String(i.note || '') }));
      const m = mergeItems(list); await save(); closeSheet(); render(); toast(`Відновлено: ${m.add}, дублікатів: ${m.dup}`);
    } catch (e) { toast('Невірний пароль або файл'); }
  };
}
function openChangePw() {
  sheet(`<h2>Зміна майстер-пароля</h2>${pf('po', 'Поточний пароль')}${pf('pn', 'Новий пароль (мін. 8)')}${pf('pn2', 'Повторіть новий')}<button class="rp btn" id="pg">Змінити</button>`);
  $('#pg').onclick = async () => {
    const pn = $('#pn').value; if (pn.length < 8) return toast('Мінімум 8 символів'); if (pn !== $('#pn2').value) return toast('Паролі не збігаються');
    try {
      await saveQ; const o = JSON.parse(localStorage.getItem(VK)); await dec(await derive($('#po').value, unb64(o.salt), o.iter), o);
    } catch (e) { return toast('Невірний поточний пароль'); }
    const salt = crypto.getRandomValues(new Uint8Array(16)); META = { salt: b64(salt), iter: ITER }; KEY = await derive(pn, salt, ITER);
    await save(); closeSheet(); vib(20); toast('Пароль змінено ✓');
  };
}
function go(t) { view = t; q = ''; history.pushState({ v: t }, ''); render(); }

if (typeof document !== 'undefined' && document.getElementById('app')) {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; });
  window.addEventListener('appinstalled', () => { dip = null; toast('Додаток встановлено ✓'); });
  load(); applyTheme(); history.replaceState({ v: null }, '');
  addEventListener('popstate', () => { closeSheet(true); view = (history.state && history.state.v) || null; render(); });
  ['pointerdown', 'keydown', 'scroll'].forEach(e => addEventListener(e, touch, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (KEY && Date.now() - hid > (S.lock || 5) * 60000) lock(); });
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
if (typeof module !== 'undefined') module.exports = { parseRows, mergeItems, S };
