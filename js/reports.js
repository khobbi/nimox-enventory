/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
document.addEventListener('lockchange', () => { if (!Lock.unlocked()) location.reload(); });
// Reports show cost and profit, so they need the owner PIN (when one is set).
start(() => Lock.need(() => {
  const DAY = 86400000, pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function bounds(r) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const back = n => { const x = new Date(t); x.setDate(x.getDate() - n); return x; };
    if (r === 'today') return [t, null];
    if (r === 'yesterday') return [back(1), t];
    if (r === 'week') return [back(6), null];
    if (r === 'month') return [new Date(t.getFullYear(), t.getMonth(), 1), null];
    if (r === 'lastmonth') return [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 1)];
    if (r === 'year') return [new Date(t.getFullYear(), 0, 1), null];
    if (r === 'custom') {
      const a = $('#from').value, b = $('#to').value;
      let end = null; if (b) { end = new Date(b + 'T00:00:00'); end.setDate(end.getDate() + 1); }
      return [a ? new Date(a + 'T00:00:00') : null, end];
    }
    return [null, null];
  }

  function data() {
    const [from, to] = bounds($('#range').value);
    const all = DB.sales().filter(s => { const d = new Date(s.date); return (!from || d >= from) && (!to || d < to); });
    const live = all.filter(s => s.status !== 'voided'), voided = all.filter(s => s.status === 'voided'), lines = [];
    live.forEach(s => s.lines.forEach(l => {
      const gross = l.qty * l.price, net = s.subtotal ? gross - (s.discount || 0) * gross / s.subtotal : gross;   // discount shared out by line value
      lines.push({ s, l, net, cost: l.qty * (l.cost || 0) });
    }));
    return { all, live, voided, lines };
  }

  const tbl = (heads, rows, empty = 'Nothing to show.') => rows.length
    ? `<table class="tbl"><thead><tr>${heads.map((h, i) => `<th${i ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<p class="hint">${empty}</p>`;
  const card = (title, inner) => `<section class="rcard"><h3>${title}</h3>${inner}</section>`;
  const agg = (lines, key, label) => {
    const m = new Map();
    lines.forEach(x => { const k = key(x), e = m.get(k) || { name: label(x), units: 0, rev: 0, profit: 0 }; e.units += x.l.qty; e.rev += x.net; e.profit += x.net - x.cost; m.set(k, e); });
    return [...m.values()];
  };

  function chart(live) {
    const ds = live.map(s => new Date(s.date).getTime()), min = new Date(Math.min(...ds)), max = new Date(Math.max(...ds));
    const monthly = chart.monthly = (max - min) / DAY > 62, keys = [], sums = {};
    const keyOf = d => monthly ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : ymd(d);
    const cur = monthly ? new Date(min.getFullYear(), min.getMonth(), 1) : new Date(min.getFullYear(), min.getMonth(), min.getDate());
    while (cur <= max) { const k = keyOf(cur); keys.push(k); sums[k] = 0; if (monthly) cur.setMonth(cur.getMonth() + 1); else cur.setDate(cur.getDate() + 1); }
    live.forEach(s => { sums[keyOf(new Date(s.date))] += s.total; });
    const top = Math.max(...keys.map(k => sums[k]), 1);
    return `<div class="chart">${keys.map(k => `<div class="col" title="${k}: ${money(r2(sums[k]))}"><span class="amt">${sums[k] ? Math.round(sums[k]) : ''}</span>
      <div class="bw"><div class="bar1" style="height:${sums[k] ? Math.max(sums[k] / top * 100, 3) : 0}%"></div></div>
      <span class="lbl2">${monthly ? k.slice(2) : k.slice(8) + '/' + k.slice(5, 7)}</span></div>`).join('')}</div>`;
  }

  function render() {
    $('#custom').hidden = $('#range').value !== 'custom';
    const { live, voided, lines } = data();
    const revenue = r2(live.reduce((a, s) => a + s.total, 0)), cogs = r2(lines.reduce((a, x) => a + x.cost, 0)), profit = r2(revenue - cogs);
    const units = lines.reduce((a, x) => a + x.l.qty, 0), disc = r2(live.reduce((a, s) => a + (s.discount || 0), 0));
    const kpi = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    $('#kpis').innerHTML = kpi(money(revenue), 'Revenue (sold)') + kpi(money(profit), 'Profit') + kpi((revenue ? Math.round(profit / revenue * 100) : 0) + '%', 'Profit margin') +
      kpi(live.length, 'Sales') + kpi(units, 'Items sold') + kpi(money(live.length ? r2(revenue / live.length) : 0), 'Average sale');
    $('#note').textContent = `Profit = amount sold minus what the items cost you. Discounts given ${money(disc)}` +
      (voided.length ? ` · ${voided.length} cancelled sale${voided.length > 1 ? 's' : ''} (${money(r2(voided.reduce((a, s) => a + s.total, 0)))}) not counted` : '');

    const best = agg(lines, x => x.l.id, x => esc(x.l.name)).sort((a, b) => b.units - a.units || b.rev - a.rev).slice(0, 10).map(e => [e.name, e.units, money(r2(e.rev)), money(r2(e.profit))]);
    const cats = agg(lines, x => x.l.category || 'Uncategorised', x => esc(x.l.category || 'Uncategorised')).sort((a, b) => b.rev - a.rev).map(e => [e.name, e.units, money(r2(e.rev)), money(r2(e.profit))]);
    const pays = ['Cash', 'MoMo', 'Card'].map(k => { const ss = live.filter(s => s.payment === k); return [k, ss.length, money(r2(ss.reduce((a, s) => a + s.total, 0)))]; });

    const stock = DB.all(), cost = r2(stock.reduce((a, i) => a + (i.cost || 0) * i.qty, 0)), retail = r2(stock.reduce((a, i) => a + i.price * i.qty, 0));
    const need = stock.filter(i => i.qty <= (i.low ?? 5)).sort((a, b) => a.qty - b.qty).map(i => [esc(i.name), esc(i.category || ''), i.qty, i.low ?? 5]);

    const ch = live.length ? chart(live) : '';
    $('#rep').innerHTML =
      (live.length
        ? card('Sales over time <small>(GH₵ per ' + (chart.monthly ? 'month' : 'day') + ')</small>', ch) +
          `<div class="cols">${card('Best sellers', tbl(['Item', 'Sold', 'Revenue', 'Profit'], best))}${card('By category', tbl(['Category', 'Sold', 'Revenue', 'Profit'], cats))}</div>` +
          card('By payment method', tbl(['Method', 'Sales', 'Amount'], pays))
        : '<div class="empty"><p>No sales in this period.</p></div>') +
      card('Stock on hand', tbl(['', ''], [['Different items', stock.length], ['Units in stock', stock.reduce((a, i) => a + i.qty, 0)], ['Value at cost', money(cost)], ['Value at selling price', money(retail)], ['Profit if all sold', money(r2(retail - cost))]])) +
      card('Needs restocking', tbl(['Item', 'Category', 'In stock', 'Alert at'], need, 'Everything is above its low-stock level.'));
  }

  $('#csv').onclick = () => {
    const { all } = data();
    const head = ['Receipt', 'Date', 'Time', 'Item', 'Category', 'IMEI/Serial', 'Qty', 'Unit price', 'Unit cost', 'Line total (before discount)', 'Payment', 'Customer', 'Phone', 'Status'];
    const rows = [];
    all.slice().reverse().forEach(s => { const d = new Date(s.date); s.lines.forEach(l => rows.push([rno(s.no), ymd(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`, l.name, l.category, l.serial, l.qty, l.price, l.cost || 0, r2(l.qty * l.price), s.payment, s.customer, s.phone, s.status === 'voided' ? 'Cancelled' : 'Completed'])); });
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const text = '\ufeff' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = `nimox-sales-${ymd(new Date())}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  $('#range').onchange = $('#from').onchange = $('#to').onchange = render;
  render();
}));
