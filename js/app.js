/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
(() => {
  let view = 'grid', status = '', ready = false;

  const pill = i => {
    const s = stockState(i);
    return s === 'out' ? '<span class="pill out">Out of stock</span>'
      : s === 'low' ? `<span class="pill low">Low · ${i.qty} left</span>`
      : `<span class="pill ok">${i.qty} in stock</span>`;
  };
  const card = i => {
    const src = imgSrc(i);
    return `<a class="card" href="item.html?id=${encodeURIComponent(i.id)}">
      <div class="pic" data-i="${esc(ini(i.name))}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <div class="body"><div class="cat">${esc(i.category || 'Uncategorised')}</div><div class="name">${esc(i.name)}</div>
      <div class="foot"><span class="price">${money(i.price)}</span>${pill(i)}</div></div></a>`;
  };
  const stat = (k, label, val, btn) => {
    const tag = btn ? 'button' : 'div';
    return `<${tag} class="stat${status === k ? ' on' : ''}"${btn ? ` type="button" data-s="${k}"` : ''}><b>${val}</b><span>${label}</span></${tag}>`;
  };

  function render() {
    if (!ready) return;
    const all = DB.all();
    const low = all.filter(i => stockState(i) === 'low').length, out = all.filter(i => stockState(i) === 'out').length;
    const value = all.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
    $('#stats').innerHTML = stat('', 'Items', all.length) + stat('', 'Stock value at cost', money(value)) + stat('low', 'Low stock', low, 1) + stat('out', 'Out of stock', out, 1);

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

  $('#stats').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    status = status === b.dataset.s ? '' : b.dataset.s; render();
  });
  $('#q').oninput = $('#cat').onchange = $('#sort').onchange = render;
  $('#view').onclick = () => { view = view === 'grid' ? 'list' : 'grid'; $('#view').textContent = view === 'grid' ? 'List view' : 'Grid view'; render(); };
  $('#export').onclick = () => { if (ready) DB.exportFile(); };
  $('#import').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file || !ready) return;
    try {
      const d = JSON.parse(await file.text()), list = Array.isArray(d) ? d : d.items;
      if (!Array.isArray(list)) throw new Error('This file has no items list.');
      if (!confirm(`Replace your ${DB.all().length} current items with the ${list.length} items in this file?`)) return;
      await DB.replace(list); render(); toast('Items imported');
    } catch (err) { alert('Import failed: ' + err.message); }
  };

  start(() => {
    ready = true;
    $('#source').textContent = DB.mode() === 'server' ? 'Saved to db/items.json by server.py' : 'Saved to your connected data file';
    render();
  });
})();
