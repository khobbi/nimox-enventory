/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
/* Shared data layer. Items AND sales live in db/items.json, never in the browser.
   Mode "server": server.py saves the file (safe when several phones or computers are used).
   Mode "file": Chrome/Edge writes to the file you connected (use one device only). */
const SHOP = { name: 'NIMOX ENTERPRISE', tagline: 'Phones & Accessories', phone: '', address: '' }; // add your phone and address here to print them on receipts
const $ = s => document.querySelector(s);
const money = n => 'GH₵ ' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const r2 = n => Math.round((+n || 0) * 100) / 100;
const stockState = i => i.qty <= 0 ? 'out' : i.qty <= (i.low ?? 5) ? 'low' : 'ok';
const imgSrc = i => !i.image ? '' : i.image.startsWith('data:') ? i.image : 'images/' + i.image;
const pillHTML = i => {
  const s = stockState(i);
  return s === 'out' ? '<span class="pill out">Out of stock</span>'
    : s === 'low' ? `<span class="pill low">Low · ${i.qty} left</span>`
    : `<span class="pill ok">${i.qty} in stock</span>`;
};
const picHTML = (i, extra = '') => {
  const src = imgSrc(i);
  return `<span class="pic${extra}" data-i="${esc(ini(i.name))}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
};

/* SHA-256 in plain JavaScript: phones that open the app over Wi-Fi are not allowed to use the browser's built-in one. */
const sha256 = (() => {
  const K = [], H = [];
  for (let n = 2, c = 0; c < 64; n++) {
    let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; }
    if (!p) continue;
    if (c < 8) H[c] = ((Math.sqrt(n) % 1) * 4294967296) | 0;
    K[c++] = ((Math.cbrt(n) % 1) * 4294967296) | 0;
  }
  return s => {
    const b = []; for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 255);
    const len = b.length; b.push(128); while (b.length % 64 !== 56) b.push(0);
    const hi = Math.floor(len * 8 / 4294967296), lo = (len * 8) >>> 0;
    b.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255, lo >>> 24 & 255, lo >>> 16 & 255, lo >>> 8 & 255, lo & 255);
    const h = H.slice(), w = new Array(64);
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = b[o + 4 * i] << 24 | b[o + 4 * i + 1] << 16 | b[o + 4 * i + 2] << 8 | b[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const x = w[i - 15], y = w[i - 2];
        w[i] = (w[i - 16] + ((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)) + w[i - 7] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10))) | 0;
      }
      let [a, bb, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      [a, bb, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
    }
    return h.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  };
})();
const newSalt = () => {
  const a = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else a.forEach((_, i) => { a[i] = Math.random() * 256; });
  return [...a].map(v => v.toString(16).padStart(2, '0')).join('');
};
const hashPin = (p, salt) => { let x = salt + ':' + p; for (let i = 0; i < 1500; i++) x = sha256(x + salt); return x; };

const DB = (() => {
  let items = [], sales = [], rev = 0, pin = null, mode = '', state = '', handle = null;
  const PICK = { types: [{ description: 'Inventory data', accept: { 'application/json': ['.json'] } }] };
  const RW = { mode: 'readwrite' };

  // Only the permission to the file is remembered by the browser, never the items or sales themselves.
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
    if (!t.trim()) return { items: [], sales: [], rev: 0, pin: null };
    const d = JSON.parse(t), list = Array.isArray(d) ? d : d.items;
    if (!Array.isArray(list)) throw new Error('This file has no items list.');
    return { items: list, sales: Array.isArray(d.sales) ? d.sales : [], rev: +d.rev || 0, pin: d.pin && d.pin.hash ? d.pin : null };
  };
  const take = d => { items = d.items; sales = d.sales; rev = d.rev; pin = d.pin; };
  const pull = async () => {
    const r = await fetch('api/items', { cache: 'no-store' });
    if (!r.ok) throw new Error('The server could not be reached.');
    take(parse(await r.text()));
  };
  const load = async () => { take(parse(await (await handle.getFile()).text())); mode = 'file'; state = 'ready'; };
  const body = () => JSON.stringify({ shop: SHOP.name, _developer: 'HAYFORD EDOONU, +233553246379, edoonu@gmail.com', rev, pin, items, sales }, null, 2);
  const persist = async () => {
    if (mode === 'server') {
      const r = await fetch('api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body() });
      if (r.status === 409) { const e = new Error('Another device changed the data at the same moment. Please try again.'); e.conflict = true; throw e; }
      if (!r.ok) throw new Error('The server could not save the file.');
      rev = (await r.json()).rev;
    } else if (handle) {
      const w = await handle.createWritable(); await w.write(body()); await w.close();
    } else throw new Error('No data file is connected.');
  };
  // Every change: fetch the latest data (server mode), apply the change, save. If another device saved first, try again.
  const mutate = async fn => {
    for (let n = 0; ; n++) {
      if (mode === 'server') await pull();
      const before = [items, sales, pin];
      try { const out = fn(); await persist(); if (typeof Menu !== 'undefined') Menu.refresh(); return out; }
      catch (e) { [items, sales, pin] = before; if (e.conflict && n < 3) continue; throw e; }
    }
  };

  return {
    all: () => items,
    get: id => items.find(i => i.id === id),
    sales: () => sales,
    mode: () => mode,
    add: d => mutate(() => { items = [{ id: 'i' + Date.now().toString(36), ...d }, ...items]; }),
    update: (id, d) => mutate(() => {
      if (!items.some(i => i.id === id)) throw new Error('That item no longer exists.');
      items = items.map(i => i.id === id ? { ...i, ...d } : i);
    }),
    remove: id => mutate(() => { items = items.filter(i => i.id !== id); }),
    replace: list => mutate(() => { items = list; }),
    // Records a sale and lowers the stock of every item sold, in one save.
    sell: cart => mutate(() => {
      if (!cart.lines.length) throw new Error('The cart is empty.');
      const lines = cart.lines.map(l => {
        const it = items.find(i => i.id === l.id);
        if (!it) throw new Error(`"${l.name}" is no longer in your item list.`);
        const qty = Math.floor(+l.qty);
        if (!(qty > 0)) throw new Error('Each quantity must be at least 1.');
        if (qty > it.qty) throw new Error(`Only ${it.qty} of ${it.name} left in stock.`);
        return { id: it.id, name: it.name, category: it.category || '', qty, price: r2(Math.max(0, +l.price)), list: it.price, cost: it.cost || 0, serial: l.serial || '' };
      });
      const subtotal = r2(lines.reduce((s, l) => s + l.qty * l.price, 0));
      const discount = r2(Math.min(Math.max(+cart.discount || 0, 0), subtotal));
      const total = r2(subtotal - discount);
      const sale = {
        id: 's' + Date.now().toString(36), no: sales.reduce((m, s) => Math.max(m, s.no || 0), 0) + 1, date: new Date().toISOString(),
        lines, subtotal, discount, total, payment: cart.payment, paid: cart.payment === 'Cash' ? r2(+cart.paid || total) : total,
        customer: cart.customer || '', phone: cart.phone || '', note: cart.note || '', status: 'completed'
      };
      items = items.map(i => { const l = lines.find(x => x.id === i.id); return l ? { ...i, qty: i.qty - l.qty } : i; });
      sales = [sale, ...sales];
      return sale;
    }),
    pin: () => pin,
    checkPin: p => !!pin && hashPin(String(p), pin.salt) === pin.hash,
    setPin: p => mutate(() => { if (p) { const salt = newSalt(); pin = { salt, hash: hashPin(String(p), salt) }; } else pin = null; }),
    // Cancels a sale and puts every item sold back into stock.
    voidSale: (id, reason) => mutate(() => {
      const s = sales.find(x => x.id === id);
      if (!s) throw new Error('That sale no longer exists.');
      if (s.status === 'voided') throw new Error('This sale was already cancelled.');
      items = items.map(i => { const l = s.lines.find(x => x.id === i.id); return l ? { ...i, qty: i.qty + l.qty } : i; });
      const done = { ...s, status: 'voided', voidedAt: new Date().toISOString(), voidReason: reason || '' };
      sales = sales.map(x => x.id === id ? done : x);
      return done;
    }),
    async init() {
      if (location.protocol.startsWith('http')) {
        try {
          const r = await fetch('api/items', { cache: 'no-store' });
          if (r.ok && (r.headers.get('content-type') || '').includes('json')) { take(parse(await r.text())); mode = 'server'; return state = 'ready'; }
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
      a.href = URL.createObjectURL(new Blob([body()], { type: 'application/json' }));
      a.download = 'items.json'; a.click(); URL.revokeObjectURL(a.href);
    }
  };
})();

/* Runs boot() once the data file is available; otherwise shows how to connect it. */
async function start(boot) {
  const st = await DB.init();
  if (st === 'ready') { Lock.mount(); if (typeof Menu !== 'undefined') Menu.refresh(); return boot(); }
  const T = {
    connect: ['Connect your data file', 'Choose db/items.json from the NIMOX folder. Every change will then be saved straight into that file.', 'Choose db/items.json'],
    reconnect: ['Allow access to your data file', 'Your browser needs permission again before it can save to db/items.json.', 'Allow access'],
    unsupported: ['This browser cannot save to a file', 'Open the app in Chrome or Edge on a computer, or run server.py (see README.txt), which works in any browser and on phones.', '']
  }[st];
  const b = $('#banner');
  b.hidden = false;
  b.innerHTML = `<div><b>${T[0]}</b><p>${T[1]}</p></div>${T[2] ? `<button type="button" class="primary" id="bbtn">${T[2]}</button>` : ''}`;
  if (T[2]) $('#bbtn').onclick = async () => {
    try { await DB.connect(); b.hidden = true; Lock.mount(); if (typeof Menu !== 'undefined') Menu.refresh(); boot(); }
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

/* Owner PIN. Its salted hash is saved in db/items.json; "unlocked" lasts 30 minutes in this browser tab.
   This keeps staff and customers out of profit figures and stock editing. It is not bank-grade security:
   anyone who can open the data file on the computer can still read it. */
const Lock = (() => {
  const KEY = 'nimox_unlock', TTL = 30 * 60 * 1000;
  let resolver = null, was = true;
  const fire = () => document.dispatchEvent(new CustomEvent('lockchange'));
  const until = () => { try { return +sessionStorage.getItem(KEY) || 0; } catch (e) { return 0; } };
  const unlocked = () => !DB.pin() || until() > Date.now();
  const touch = () => { try { sessionStorage.setItem(KEY, String(Date.now() + TTL)); } catch (e) {} };
  const relock = () => { try { sessionStorage.removeItem(KEY); } catch (e) {} };

  function paint() {
    was = unlocked();
    const b = $('#lockBtn'); if (!b) return;
    b.textContent = !DB.pin() ? 'Set PIN' : was ? '🔓 Owner' : '🔒 Locked';
    b.title = !DB.pin() ? 'Protect profit, prices and stock editing with a PIN' : was ? 'Owner mode is on' : 'Tap to enter the owner PIN';
  }
  function dlg() {
    let d = $('#pinDlg'); if (d) return d;
    d = document.createElement('dialog'); d.id = 'pinDlg';
    d.innerHTML = `<div class="sheet"><h2 id="pinT"></h2><p id="pinP" class="hint"></p>
      <input id="pinA" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="PIN" aria-label="PIN">
      <input id="pinB" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Repeat PIN" aria-label="Repeat PIN">
      <p id="pinE" class="perr" role="alert"></p><div id="pinMenu"></div>
      <div class="dfoot"><button type="button" id="pinX">Cancel</button><button type="button" id="pinOk" class="primary">OK</button></div></div>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { if (resolver) { const r = resolver; resolver = null; r(null); } });
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    return d;
  }
  function box(cfg) {
    return new Promise(res => {
      const d = dlg(), A = $('#pinA'), B = $('#pinB'), E = $('#pinE'), ok = $('#pinOk');
      const finish = v => { const r = resolver; resolver = null; d.close(); if (r) r(v); };
      $('#pinT').textContent = cfg.title; $('#pinP').textContent = cfg.text || '';
      A.hidden = !!cfg.menu; B.hidden = !cfg.repeat; A.value = B.value = ''; E.textContent = '';
      ok.hidden = !!cfg.menu; ok.textContent = cfg.ok || 'OK'; $('#pinX').textContent = cfg.menu ? 'Close' : 'Cancel';
      $('#pinMenu').innerHTML = (cfg.menu || []).map(([l, c, k]) => `<button type="button" class="${c}" data-k="${k}">${l}</button>`).join('');
      const submit = () => {
        const a = A.value.trim(), b = B.value.trim();
        if (!/^\d{4,6}$/.test(a)) { E.textContent = 'Use 4 to 6 digits.'; return; }
        if (cfg.repeat && a !== b) { E.textContent = 'The two PINs do not match.'; return; }
        const m = cfg.validate ? cfg.validate(a) : '';
        if (m) { E.textContent = m; A.value = ''; A.focus(); return; }
        finish(a);
      };
      ok.onclick = submit; A.onkeydown = B.onkeydown = e => { if (e.key === 'Enter') submit(); };
      $('#pinMenu').onclick = e => { const k = e.target.closest('[data-k]'); if (k) finish({ key: k.dataset.k }); };
      $('#pinX').onclick = () => finish(null);
      resolver = res; d.showModal(); if (!cfg.menu) A.focus();
    });
  }
  async function unlock() {
    const p = await box({ title: 'Owner PIN', text: 'Enter the PIN to continue.', ok: 'Unlock', validate: p => DB.checkPin(p) ? '' : 'Wrong PIN. Try again.' });
    if (p === null) return false;
    touch(); paint(); fire(); return true;
  }
  const gate = async () => { if (unlocked()) { touch(); return true; } return unlock(); };
  async function setup(change) {
    const p = await box({ title: change ? 'Change PIN' : 'Set an owner PIN', text: 'Staff can still sell. Only someone with this PIN can see profit, change prices, edit items or cancel sales.', repeat: true, ok: 'Save PIN' });
    if (p === null) return;
    try { await DB.setPin(p); touch(); paint(); fire(); toast('PIN saved'); } catch (e) { alert('Could not save the PIN: ' + e.message); }
  }
  async function onButton() {
    if (!DB.pin()) return setup(false);
    if (!unlocked()) return unlock();
    const r = await box({ title: 'Owner mode is on', text: 'It switches off by itself after 30 minutes.', menu: [['Lock now', 'primary', 'lock'], ['Change PIN', '', 'change'], ['Remove PIN', 'danger', 'remove']] });
    if (!r) return;
    if (r.key === 'lock') { relock(); paint(); fire(); }
    else if (r.key === 'change') setup(true);
    else if (r.key === 'remove' && confirm('Remove the PIN? Everyone will be able to see profit and edit items.')) {
      try { await DB.setPin(null); relock(); paint(); fire(); toast('PIN removed'); } catch (e) { alert('Could not remove the PIN: ' + e.message); }
    }
  }
  function mount() {
    const acts = document.querySelector('.acts'); if (!acts || $('#lockBtn')) return;
    const b = document.createElement('button'); b.id = 'lockBtn'; b.type = 'button'; b.className = 'ghost'; b.onclick = onButton;
    acts.prepend(b); paint();
    setInterval(() => { if (unlocked() !== was) { paint(); fire(); } }, 10000);
  }
  // Shows the page only after the PIN is entered (when a PIN is set).
  function need(boot, host) {
    if (unlocked()) return boot();
    host = host || $('#banner'); host.hidden = false;
    host.innerHTML = '<div><b>🔒 Owner PIN needed</b><p>This page shows profit or changes your stock, so it is locked. Staff can still use New sale.</p></div><button type="button" class="primary" id="lkBtn">Enter PIN</button>';
    $('#lkBtn').onclick = async () => { if (await unlock()) { host.hidden = true; boot(); } };
  }
  return { unlocked, gate, unlock, need, mount };
})();
