/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
/* Side menu: a fixed sidebar on wide screens, a slide-in drawer (☰ button) on phones.
   If this file is missing the old links in the top bar stay, so the app is still reachable. */
const Menu = (() => {
  const P = {
    items: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    sale: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6"/>',
    sales: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/>',
    reports: '<path d="M4 20V10M10 20V4M16 20v-8M2 20h20"/>',
    low: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    out: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    cats: '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    backup: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    burger: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const svg = k => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
  const link = (k, href, label) => `<a class="mi" data-k="${k}" href="${href}">${svg(k)}<span>${label}</span><span class="cnt" hidden></span></a>`;
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const hash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } };

  const side = document.createElement('aside');
  side.className = 'side'; side.id = 'side'; side.setAttribute('aria-label', 'Menu');
  side.innerHTML = `<a class="brand" href="index.html"><span class="mark">N</span><span>NIMOX ENTERPRISE<small>Inventory &amp; sales</small></span></a>
    <nav class="menu">
      <div class="mh">Shop</div>
      ${link('items', 'index.html', 'Items')}${link('sale', 'sale.html', 'New sale')}${link('sales', 'sales.html', 'Sales')}${link('reports', 'reports.html', 'Reports')}
      <div class="mh">Stock</div>
      ${link('low', 'index.html#low', 'Low stock')}${link('out', 'index.html#out', 'Out of stock')}
      <button type="button" class="mi" id="catBtn" aria-expanded="false" aria-controls="catList">${svg('cats')}<span>Categories</span><span class="chev">›</span></button>
      <div class="sub" id="catList" hidden></div>
      ${link('add', 'item.html', 'Add item')}${link('backup', 'index.html#backup', 'Backup')}
    </nav>`;
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const burger = document.createElement('button');
  burger.type = 'button'; burger.id = 'menuBtn'; burger.className = 'ghost menu-btn';
  burger.setAttribute('aria-label', 'Open menu'); burger.setAttribute('aria-controls', 'side'); burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = svg('burger');

  function toggle(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) side.querySelector('.mi')?.focus(); else if (document.activeElement && side.contains(document.activeElement)) burger.focus();
  }
  function current() {
    if (file === 'sale.html') return 'sale';
    if (file === 'sales.html') return 'sales';
    if (file === 'reports.html') return 'reports';
    if (file === 'item.html') return location.search.includes('id=') ? 'items' : 'add';
    const h = hash();
    return h === 'low' || h === 'out' || h === 'backup' ? h : 'items';
  }
  function paint() {
    const k = current(), h = hash(), cat = file === 'index.html' && h.startsWith('cat=') ? h.slice(4) : null;
    side.querySelectorAll('.mi[data-k]').forEach(a => { if (!cat && a.dataset.k === k) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    side.querySelectorAll('.mi[data-cat]').forEach(a => { if (a.dataset.cat === cat) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  // Counts, category list and 🔒 marks come from the data, so this runs once the data is loaded and after every change.
  function refresh() {
    try {
      if (typeof DB === 'undefined') return;
      const all = DB.all(), cats = {};
      const n = { low: all.filter(i => stockState(i) === 'low').length, out: all.filter(i => stockState(i) === 'out').length };
      ['low', 'out'].forEach(k => { const c = side.querySelector(`[data-k="${k}"] .cnt`); c.textContent = n[k]; c.hidden = !n[k]; });
      all.forEach(i => { if (i.category) cats[i.category] = (cats[i.category] || 0) + 1; });
      $('#catList').innerHTML = Object.keys(cats).sort().map(k => `<a class="mi sm" data-cat="${esc(k)}" href="index.html#cat=${encodeURIComponent(k)}"><span>${esc(k)}</span><span class="cnt">${cats[k]}</span></a>`).join('') || '<span class="hint pad">No categories yet</span>';
      const locked = !!DB.pin() && !Lock.unlocked();
      ['reports', 'add', 'backup'].forEach(k => side.querySelector(`[data-k="${k}"]`).classList.toggle('locked', locked));
      paint();
    } catch (e) { /* the menu must never break a page */ }
  }

  document.body.classList.add('has-menu');
  document.body.append(side, scrim);
  document.querySelector('.top .bar')?.prepend(burger);
  document.querySelector('.top .nav')?.remove();            // the old top-bar links are replaced by this menu
  burger.onclick = () => toggle(!document.body.classList.contains('menu-open'));
  scrim.onclick = () => toggle(false);
  side.addEventListener('click', e => { if (e.target.closest('a')) toggle(false); });
  $('#catBtn').onclick = () => { const open = $('#catList').hidden; $('#catList').hidden = !open; $('#catBtn').setAttribute('aria-expanded', String(open)); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggle(false); });
  addEventListener('hashchange', paint);
  document.addEventListener('lockchange', refresh);
  paint();
  return { refresh };
})();
