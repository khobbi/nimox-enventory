/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
/* Shared data layer. Items live in db/items.json, never in the browser.
   Mode "server": server.py saves the file. Mode "file": Chrome/Edge writes to the file you connected. */
const $ = s => document.querySelector(s);
const money = n => 'GH₵ ' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const stockState = i => i.qty <= 0 ? 'out' : i.qty <= (i.low ?? 5) ? 'low' : 'ok';
const imgSrc = i => !i.image ? '' : i.image.startsWith('data:') ? i.image : 'images/' + i.image;

const DB = (() => {
  let items = [], mode = '', state = '', handle = null;
  const PICK = { types: [{ description: 'Inventory data', accept: { 'application/json': ['.json'] } }] };
  const RW = { mode: 'readwrite' };

  // Only the permission to the file is remembered by the browser, never the items themselves.
  const idb = (op, ...a) => new Promise((res, rej) => {
    const o = indexedDB.open('nimox_file', 1);
    o.onupgradeneeded = () => o.result.createObjectStore('kv');
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const r = o.result.transaction('kv', op === 'get' ? 'readonly' : 'readwrite').objectStore('kv')[op](...a);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    };
  });
  const parse = t => {
    if (!t.trim()) return [];
    const d = JSON.parse(t), l = Array.isArray(d) ? d : d.items;
    if (!Array.isArray(l)) throw new Error('This file has no items list.');
    return l;
  };
  const load = async () => { items = parse(await (await handle.getFile()).text()); mode = 'file'; state = 'ready'; };
  const persist = async () => {
    const body = JSON.stringify({ shop: 'NIMOX ENTERPRISE', _developer: 'HAYFORD EDOONU, +233553246379, edoonu@gmail.com', items }, null, 2);
    if (mode === 'server') {
      const r = await fetch('api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!r.ok) throw new Error('The server could not save the file.');
    } else if (handle) {
      const w = await handle.createWritable(); await w.write(body); await w.close();
    } else throw new Error('No data file is connected.');
  };
  const commit = async next => { const prev = items; items = next; try { await persist(); } catch (e) { items = prev; throw e; } };

  return {
    all: () => items,
    get: id => items.find(i => i.id === id),
    mode: () => mode,
    add: d => commit([{ id: 'i' + Date.now().toString(36), ...d }, ...items]),
    update: (id, d) => commit(items.map(i => i.id === id ? { ...i, ...d } : i)),
    remove: id => commit(items.filter(i => i.id !== id)),
    replace: list => commit(list),
    async init() {
      if (location.protocol.startsWith('http')) {
        try {
          const r = await fetch('api/items', { cache: 'no-store' });
          if (r.ok && (r.headers.get('content-type') || '').includes('json')) { items = parse(await r.text()); mode = 'server'; return state = 'ready'; }
        } catch (e) {}
      }
      if (!window.showOpenFilePicker) return state = 'unsupported';
      try { handle = await idb('get', 'handle'); } catch (e) {}
      if (!handle) return state = 'connect';
      try { if (await handle.queryPermission(RW) === 'granted') { await load(); return state; } } catch (e) {}
      return state = 'reconnect';
    },
    async connect() {
      if (state !== 'reconnect') {
        const [h] = await showOpenFilePicker(PICK);
        if (await h.requestPermission(RW) !== 'granted') throw new Error('Permission to edit the file was not given.');
        handle = h; await idb('put', h, 'handle');
      } else if (await handle.requestPermission(RW) !== 'granted') throw new Error('Permission to edit the file was not given.');
      await load();
    },
    async uploadImage(data) {
      if (mode !== 'server' || !data.startsWith('data:')) return data;
      const name = 'p' + Date.now().toString(36) + '.jpg';
      const r = await fetch('api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, data }) });
      if (!r.ok) throw new Error('The photo could not be saved.');
      return (await r.json()).name;
    },
    exportFile() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ shop: 'NIMOX ENTERPRISE', _developer: 'HAYFORD EDOONU, +233553246379, edoonu@gmail.com', items }, null, 2)], { type: 'application/json' }));
      a.download = 'items.json'; a.click(); URL.revokeObjectURL(a.href);
    }
  };
})();

/* Runs boot() once the data file is available; otherwise shows how to connect it. */
async function start(boot) {
  const st = await DB.init();
  if (st === 'ready') return boot();
  const T = {
    connect: ['Connect your data file', 'Choose db/items.json from the NIMOX folder. Every change will then be saved straight into that file.', 'Choose db/items.json'],
    reconnect: ['Allow access to your data file', 'Your browser needs permission again before it can save to db/items.json.', 'Allow access'],
    unsupported: ['This browser cannot save to a file', 'Open the app in Chrome or Edge on a computer, or run server.py (see README.txt), which works in any browser and on phones.', '']
  }[st];
  const b = $('#banner');
  b.hidden = false;
  b.innerHTML = `<div><b>${T[0]}</b><p>${T[1]}</p></div>${T[2] ? `<button type="button" class="primary" id="bbtn">${T[2]}</button>` : ''}`;
  if (T[2]) $('#bbtn').onclick = async () => {
    try { await DB.connect(); b.hidden = true; boot(); }
    catch (e) { if (e.name !== 'AbortError') alert('Could not use that file.\n' + e.message); }
  };
}

function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function flash(msg) { try { sessionStorage.setItem('nimox_toast', msg); } catch (e) {} }
try { const m = sessionStorage.getItem('nimox_toast'); if (m) { sessionStorage.removeItem('nimox_toast'); toast(m); } } catch (e) {}

/* Dark / light theme: follows the phone or computer setting until the toggle is used. */
(() => {
  const root = document.documentElement, btn = $('#theme');
  if (!btn) return;
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const paint = () => { btn.textContent = dark() ? '☀' : '☾'; btn.title = dark() ? 'Switch to light theme' : 'Switch to dark theme'; };
  btn.onclick = () => {
    root.dataset.theme = dark() ? 'light' : 'dark';
    try { localStorage.setItem('nimox_theme', root.dataset.theme); } catch (e) {}
    paint();
  };
  paint();
})();
