/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
(() => {
  let view = 'grid', status = '', ready = false, current = null;

  const pill = i => {
    const s = stockState(i);
    return s === 'out' ? '<span class="pill out">Out of stock</span>'
      : s === 'low' ? `<span class="pill low">Low · ${i.qty} left</span>`
      : `<span class="pill ok">${i.qty} in stock</span>`;
  };
  const pic = (i, extra = '') => {
    const src = imgSrc(i);
    return `<span class="pic${extra}" data-i="${esc(ini(i.name))}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  };

  // The card opens the details pop-up; the Edit chip goes straight to the edit page.
  const card = i => `<article class="card">
    <button type="button" class="open" data-id="${esc(i.id)}">${pic(i)}
      <span class="body"><span class="cat">${esc(i.category || 'Uncategorised')}</span><span class="name">${esc(i.name)}</span>
      <span class="foot"><span class="price">${money(i.price)}</span>${pill(i)}</span></span></button>
    <a class="edit" href="item.html?id=${encodeURIComponent(i.id)}" aria-label="Edit ${esc(i.name)}">✎ Edit</a></article>`;

  const stat = (k, label, val, btn) => {
    const tag = btn ? 'button' : 'div';
    return `<${tag} class="stat${status === k ? ' on' : ''}"${btn ? ` type="button" data-s="${k}"` : ''}><b>${val}</b><span>${label}</span></${tag}>`;
  };

  function render() {
    if (!ready) return;
    const all = DB.all();
    const low = all.filter(i => stockState(i) === 'low').length, out = all.filter(i => stockState(i) === 'out').length;
    const value = all.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
    $('#stats').innerHTML = stat('', 'Items', all.length) + (Lock.unlocked() ? stat('', 'Stock value at cost', money(value)) : '') + stat('low', 'Low stock', low, 1) + stat('out', 'Out of stock', out, 1);

    const q = $('#q').value.trim().toLowerCase(), c = $('#cat').value;
    const cats = [...new Set(all.map(i => i.category).filter(Boolean))].sort();
    $('#cat').innerHTML = '<option value="">All categories</option>' + cats.map(x => `<option${x === c ? ' selected' : ''}>${esc(x)}</option>`).join('');

    const sort = $('#sort').value;
    const list = all.filter(i => (!c || i.category === c) && (!status || stockState(i) === status) &&
      (!q || (i.name + ' ' + (i.category || '')).toLowerCase().includes(q)));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'price') list.sort((a, b) => b.price - a.price);
    if (sort === 'stock') list.sort((a, b) => a.qty - b.qty);

    $('#items').className = view;
    $('#items').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty"><p>${all.length ? 'No items match your filters.' : 'No items yet.'}</p><a class="btn primary" href="item.html">Add your first item</a></div>`;
    $('#count').textContent = all.length ? `Showing ${list.length} of ${all.length} items` : '';
  }

  /* ---------- details pop-up ---------- */
  function openDetail(id) {
    const i = DB.get(id); if (!i) return;
    current = i.id;
    const profit = (i.price || 0) - (i.cost || 0);
    const fact = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`, own = Lock.unlocked();
    $('#dBody').innerHTML = `${pic(i, ' big')}
      <div class="cat">${esc(i.category || 'Uncategorised')}</div>
      <h2>${esc(i.name)}</h2>
      <div class="dprice">${money(i.price)} ${pill(i)}</div>
      <dl class="facts">
        ${own ? fact('Cost price', i.cost ? money(i.cost) : '–') : ''}
        ${own ? fact('Profit per item', i.cost ? `${money(profit)} (${Math.round(profit / i.price * 100)}%)` : '–') : ''}
        ${fact('In stock', i.qty)}
        ${fact('Low-stock alert at', i.low ?? 5)}
        ${own ? fact('Stock value at cost', i.cost ? money(i.cost * i.qty) : '–') : ''}
        ${fact('Stock value at selling price', money(i.price * i.qty))}
      </dl>`;
    $('#dEdit').href = 'item.html?id=' + encodeURIComponent(i.id);
    $('#detail').showModal();
  }
  $('#items').addEventListener('click', e => { const b = e.target.closest('.open'); if (b) openDetail(b.dataset.id); });
  $('#dClose').onclick = () => $('#detail').close();
  $('#detail').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#dDel').onclick = async () => {
    if (!(await Lock.gate())) return;
    const i = DB.get(current);
    if (!i || !confirm(`Delete "${i.name}"? This cannot be undone.`)) return;
    try { await DB.remove(i.id); $('#detail').close(); render(); toast(`${i.name} deleted`); }
    catch (err) { alert('Could not delete: ' + err.message); }
  };

  /* ---------- scroll to top ---------- */
  const up = $('#top');
  addEventListener('scroll', () => up.classList.toggle('show', scrollY > 500), { passive: true });
  up.onclick = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

  /* ---------- toolbar, backup ---------- */
  $('#stats').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    status = status === b.dataset.s ? '' : b.dataset.s; render();
  });
  $('#q').oninput = $('#cat').onchange = $('#sort').onchange = render;
  $('#view').onclick = () => { view = view === 'grid' ? 'list' : 'grid'; $('#view').textContent = view === 'grid' ? 'List view' : 'Grid view'; render(); };
  $('#export').onclick = async () => { if (ready && await Lock.gate()) DB.exportFile(); };
  $('#importBtn').onclick = async () => { if (ready && await Lock.gate()) $('#import').click(); };
  $('#import').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file || !ready) return;
    try {
      const d = JSON.parse(await file.text()), list = Array.isArray(d) ? d : d.items;
      if (!Array.isArray(list)) throw new Error('This file has no items list.');
      if (!confirm(`Replace your ${DB.all().length} current items with the ${list.length} items in this file?`)) return;
      await DB.replace(list); render(); toast('Items imported');
    } catch (err) { alert('Import failed: ' + err.message); }
  };

  // Menu links filter the list: index.html#low, #out, #cat=Phones (anything else shows everything).
  function applyHash() {
    let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    status = h === 'low' || h === 'out' ? h : '';
    $('#cat').value = ''; render();
    if (h.startsWith('cat=')) { $('#cat').value = h.slice(4); render(); }
  }
  document.addEventListener('lockchange', render);
  start(() => {
    ready = true;
    $('#source').textContent = DB.mode() === 'server' ? 'Saved to db/items.json by server.py' : 'Saved to your connected data file';
    applyHash();
    addEventListener('hashchange', applyHash);
  });
})();
