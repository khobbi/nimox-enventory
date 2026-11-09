/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
(() => {
  let ready = false, shown = null;

  function bounds(r) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const back = n => { const x = new Date(t); x.setDate(x.getDate() - n); return x; };
    if (r === 'today') return [t, null];
    if (r === 'yesterday') return [back(1), t];
    if (r === 'week') return [back(6), null];
    if (r === 'month') return [new Date(t.getFullYear(), t.getMonth(), 1), null];
    return [null, null];
  }

  const row = s => {
    const names = s.lines.map(l => l.name + (l.qty > 1 ? ' ×' + l.qty : ''));
    const more = names.length > 2 ? ` +${names.length - 2} more` : '', v = s.status === 'voided';
    return `<button type="button" class="srow${v ? ' void' : ''}" data-id="${esc(s.id)}">
      <span class="sleft"><span class="sno">${rno(s.no)}</span><span class="stime">${fmtTime(s.date)}</span></span>
      <span class="smid"><span class="sitems">${esc(names.slice(0, 2).join(', ') + more)}</span>${s.customer ? `<span class="stime">${esc(s.customer)}</span>` : ''}</span>
      <span class="sright"><span class="stotal">${money(s.total)}</span>${v ? '<span class="pill out">Cancelled</span>' : `<span class="pill pay">${esc(s.payment)}</span>`}</span></button>`;
  };

  function render() {
    if (!ready) return;
    const [from, to] = bounds($('#range').value), q = $('#q').value.trim().toLowerCase(), p = $('#pay').value;
    const list = DB.sales().filter(s => {
      const d = new Date(s.date), hay = [rno(s.no), s.customer, s.phone, ...s.lines.map(l => l.name + ' ' + l.serial)].join(' ').toLowerCase();
      return (!from || d >= from) && (!to || d < to) && (!p || s.payment === p) && (!q || hay.includes(q));
    });
    const ok = list.filter(s => s.status !== 'voided');
    const by = k => r2(ok.filter(s => s.payment === k).reduce((a, s) => a + s.total, 0));
    const units = ok.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty, 0), 0);
    $('#stats').innerHTML = [['Total sold', money(r2(ok.reduce((a, s) => a + s.total, 0)))], ['Sales', ok.length], ['Items sold', units]]
      .map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    const nv = list.length - ok.length;
    $('#count').textContent = ok.length ? `Cash ${money(by('Cash'))} · MoMo ${money(by('MoMo'))} · Card ${money(by('Card'))}${nv ? ` · ${nv} cancelled` : ''}${list.length > 200 ? ' · showing the latest 200' : ''}` : (nv ? `${nv} cancelled` : '');
    $('#list').innerHTML = list.slice(0, 200).map(row).join('') ||
      `<div class="empty"><p>${DB.sales().length ? 'No sales match these filters.' : 'No sales yet.'}</p><a class="btn primary" href="sale.html">Make a sale</a></div>`;
  }

  $('#list').addEventListener('click', e => {
    const b = e.target.closest('.srow'); if (!b) return;
    shown = DB.sales().find(s => s.id === b.dataset.id); if (!shown) return;
    $('#sbody').innerHTML = receiptHTML(shown); $('#sWa').href = waLink(shown); $('#sVoid').hidden = shown.status === 'voided'; $('#sdlg').showModal();
  });
  $('#sClose').onclick = () => $('#sdlg').close();
  $('#sPrint').onclick = () => shown && printReceipt(shown);
  $('#sVoid').onclick = async () => {
    if (!shown || !(await Lock.gate())) return;
    const reason = prompt(`Cancel receipt ${rno(shown.no)} (${money(shown.total)})?\nThe items go back into stock.\n\nReason (optional):`);
    if (reason === null) return;
    try { await DB.voidSale(shown.id, reason.trim()); $('#sdlg').close(); render(); toast(`Receipt ${rno(shown.no)} cancelled`); }
    catch (err) { alert('Could not cancel the sale.\n' + err.message); render(); }
  };
  $('#sdlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#range').onchange = $('#pay').onchange = $('#q').oninput = render;
  start(() => { ready = true; render(); });
})();
