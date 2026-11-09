/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
(() => {
  const cart = new Map();                       // item id -> { name, qty, price, serial }
  let pay = 'Cash', ready = false, last = null;
  const needsSerial = i => /^(phones|kids tablets)$/i.test(i.category || '');
  const item = (id, l) => DB.get(id) || { name: l.name, qty: l.qty, category: '' };

  const calc = () => {
    let sub = 0; cart.forEach(l => { sub += l.qty * l.price; });
    sub = r2(sub);
    const discount = r2(Math.min(Math.max(+$('#disc').value || 0, 0), sub));
    return { sub, discount, total: r2(sub - discount) };
  };

  function bar() {
    let n = 0, sub = 0; cart.forEach(l => { n += l.qty; sub += l.qty * l.price; });
    $('#cartsum').innerHTML = n ? `<b>${n}</b> item${n > 1 ? 's' : ''} · <b>${money(r2(sub))}</b>` : 'Tap items to add them to the sale';
    $('#openCart').disabled = !n;
  }

  function renderPick() {
    if (!ready) return;
    const q = $('#q').value.trim().toLowerCase(), c = $('#cat').value, all = DB.all();
    const cats = [...new Set(all.map(i => i.category).filter(Boolean))].sort();
    $('#cat').innerHTML = '<option value="">All categories</option>' + cats.map(x => `<option${x === c ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const list = all.filter(i => (!c || i.category === c) && (!q || (i.name + ' ' + (i.category || '')).toLowerCase().includes(q)));
    $('#pick').innerHTML = list.map(i => {
      const n = cart.get(i.id)?.qty || 0;
      return `<div class="tile${i.qty <= 0 ? ' out' : ''}" data-id="${esc(i.id)}">
        <button type="button" class="tpick"${i.qty <= 0 ? ' disabled' : ''}>${picHTML(i)}
          <span class="tbody"><span class="name">${esc(i.name)}</span><span class="tmeta"><span class="price">${money(i.price)}</span>${pillHTML(i)}</span></span></button>
        ${n ? `<span class="tctl"><button type="button" class="tminus" aria-label="Take one off: ${esc(i.name)}">−</button><span class="badge">${n}</span></span>` : ''}</div>`;
    }).join('') || '<p class="empty">No items match.</p>';
    bar();
  }

  $('#pick').addEventListener('click', e => {
    const t = e.target.closest('.tile'); if (!t) return;
    const i = DB.get(t.dataset.id), cur = cart.get(t.dataset.id);
    if (!i) return;
    if (e.target.closest('.tminus')) {                    // take one off
      if (cur && cur.qty > 1) cart.set(i.id, { ...cur, qty: cur.qty - 1 }); else cart.delete(i.id);
      return renderPick();
    }
    if (t.classList.contains('out')) return;             // sold out
    if ((cur?.qty || 0) >= i.qty) return toast(`Only ${i.qty} of ${i.name} in stock`);
    cart.set(i.id, cur ? { ...cur, qty: cur.qty + 1 } : { name: i.name, qty: 1, price: i.price, serial: '' });
    renderPick();
  });

  /* ---------- checkout ---------- */
  function renderLines() {
    $('#lines').innerHTML = [...cart].map(([id, l]) => {
      const i = item(id, l);
      return `<div class="cl" data-id="${esc(id)}">
        <div class="clname"><b>${esc(l.name)}</b><button type="button" class="quiet x" data-a="rm" aria-label="Remove ${esc(l.name)}">✕</button></div>
        <div class="clrow">
          <label>Price (GH₵)${Lock.unlocked() ? '' : ' 🔒'}<input type="number" min="0" step="0.01" inputmode="decimal" value="${l.price}" data-a="price"${Lock.unlocked() ? '' : ' readonly'}></label>
          <span class="step"><button type="button" data-a="dec" aria-label="One less">−</button><output>${l.qty}</output><button type="button" data-a="inc" aria-label="One more">+</button></span>
          <span class="lt">${money(l.qty * l.price)}</span></div>
        ${needsSerial(i) ? `<label class="ser">IMEI / serial number <span class="hint">(optional${l.qty > 1 ? ', separate with commas' : ''})</span><input data-a="serial" value="${esc(l.serial)}"></label>` : ''}</div>`;
    }).join('');
  }

  function totals() {
    const t = calc(), paid = +$('#paid').value || 0;
    $('#totals').innerHTML = (t.discount ? `<div class="rl"><span>Subtotal</span><span>${money(t.sub)}</span></div><div class="rl"><span>Discount</span><span>− ${money(t.discount)}</span></div>` : '') +
      `<div class="rl grand"><span>Total</span><span>${money(t.total)}</span></div>`;
    $('#change').textContent = pay === 'Cash' && paid ? (paid >= t.total ? `Change to give: ${money(r2(paid - t.total))}` : `Still owing: ${money(r2(t.total - paid))}`) : '';
  }

  $('#openCart').onclick = () => { $('#disc').readOnly = !Lock.unlocked(); renderLines(); totals(); $('#checkout').showModal(); };
  $('#coClose').onclick = () => $('#checkout').close();
  $('#lines').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = b.closest('.cl').dataset.id, l = cart.get(id), stock = DB.get(id)?.qty ?? l.qty;
    if (b.dataset.a === 'rm') cart.delete(id);
    else if (b.dataset.a === 'inc') { if (l.qty >= stock) return toast(`Only ${stock} in stock`); l.qty++; }
    else if (b.dataset.a === 'dec') { if (l.qty > 1) l.qty--; else cart.delete(id); }
    if (!cart.size) $('#checkout').close();
    renderLines(); totals(); renderPick();
  });
  $('#lines').addEventListener('input', e => {
    const f = e.target.closest('input[data-a]'); if (!f) return;
    const row = f.closest('.cl'), l = cart.get(row.dataset.id);
    if (f.dataset.a === 'price') { l.price = Math.max(0, +f.value || 0); row.querySelector('.lt').textContent = money(l.qty * l.price); }
    if (f.dataset.a === 'serial') l.serial = f.value.trim();
    totals(); bar();
  });
  $('#disc').oninput = $('#paid').oninput = totals;
  // Changing a price or giving a discount needs the owner PIN (when one is set).
  $('#lines').addEventListener('click', async e => {
    if (e.target.closest('input[readonly][data-a="price"]') && await Lock.gate()) { $('#disc').readOnly = false; renderLines(); }
  });
  $('#disc').addEventListener('click', async () => { if ($('#disc').readOnly && await Lock.gate()) { $('#disc').readOnly = false; renderLines(); } });
  $('#pay').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    pay = b.dataset.p;
    document.querySelectorAll('#pay button').forEach(x => x.classList.toggle('on', x === b));
    $('#paidWrap').hidden = pay !== 'Cash'; totals();
  });

  function resetForm() {
    ['#disc', '#paid', '#cname', '#cphone', '#note'].forEach(s => { $(s).value = ''; });
    pay = 'Cash'; $('#paidWrap').hidden = false;
    document.querySelectorAll('#pay button').forEach(x => x.classList.toggle('on', x.dataset.p === 'Cash'));
  }

  $('#complete').onclick = async () => {
    if (!cart.size) return;
    const t = calc(), paid = +$('#paid').value || 0, btn = $('#complete');
    if (pay === 'Cash' && paid && paid < t.total) return alert(`The cash received (${money(paid)}) is less than the total (${money(t.total)}).`);
    btn.disabled = true;
    try {
      const sale = await DB.sell({
        lines: [...cart].map(([id, l]) => ({ id, name: l.name, qty: l.qty, price: l.price, serial: l.serial })),
        discount: t.discount, payment: pay, paid: pay === 'Cash' ? paid : 0,
        customer: $('#cname').value.trim(), phone: $('#cphone').value.trim(), note: $('#note').value.trim()
      });
      cart.clear(); resetForm(); $('#checkout').close();
      last = sale; $('#rbody').innerHTML = receiptHTML(sale); $('#rWa').href = waLink(sale); $('#rdlg').showModal();
      renderPick();
    } catch (err) { alert('The sale was not completed.\n' + err.message); renderPick(); }
    finally { btn.disabled = false; }
  };

  /* ---------- receipt pop-up ---------- */
  $('#rPrint').onclick = () => last && printReceipt(last);
  $('#rClose').onclick = () => { $('#rdlg').close(); $('#q').focus(); };
  [$('#checkout'), $('#rdlg')].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  $('#q').oninput = $('#cat').onchange = renderPick;
  start(() => { ready = true; renderPick(); });
})();
