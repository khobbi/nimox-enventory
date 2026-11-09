/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
/* Receipts: on-screen / printed layout and the WhatsApp text version. */
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const rno = n => '#' + String(n).padStart(5, '0');

function receiptHTML(s) {
  const row = (a, b, cls = '') => `<div class="rl ${cls}"><span>${a}</span><span>${b}</span></div>`;
  return `<div class="rcpt">
    <div class="rc"><b class="rshop">${esc(SHOP.name)}</b>${SHOP.tagline ? `<div>${esc(SHOP.tagline)}</div>` : ''}${SHOP.address ? `<div>${esc(SHOP.address)}</div>` : ''}${SHOP.phone ? `<div>Tel: ${esc(SHOP.phone)}</div>` : ''}</div>
    <hr>${row('Receipt', rno(s.no))}${row('Date', fmtTime(s.date))}${s.customer ? row('Customer', esc(s.customer)) : ''}<hr>
    ${s.lines.map(l => `<div class="ritem">${esc(l.name)}</div>${l.serial ? `<div class="rsub">IMEI/Serial: ${esc(l.serial)}</div>` : ''}${row(`${l.qty} × ${money(l.price)}`, money(l.qty * l.price))}`).join('')}
    <hr>${s.discount ? row('Subtotal', money(s.subtotal)) + row('Discount', '− ' + money(s.discount)) : ''}
    ${row('TOTAL', money(s.total), 'rtotal')}${row('Paid by', esc(s.payment))}
    ${s.payment === 'Cash' && s.paid > s.total ? row('Cash received', money(s.paid)) + row('Change', money(s.paid - s.total)) : ''}
    ${s.status === 'voided' ? `<div class="rc"><b>CANCELLED</b>${s.voidReason ? `<div>${esc(s.voidReason)}</div>` : ''}</div>` : ''}
    <hr><div class="rc">Thank you for shopping with us!</div></div>`;
}

function receiptText(s) {
  const L = [`*${SHOP.name}*`];
  if (SHOP.tagline) L.push(SHOP.tagline);
  if (s.status === 'voided') L.push('*CANCELLED*');
  L.push(`Receipt ${rno(s.no)} · ${fmtTime(s.date)}`, '');
  s.lines.forEach(l => L.push(`${l.name}${l.serial ? ' (IMEI/SN ' + l.serial + ')' : ''}`, `  ${l.qty} × ${money(l.price)} = ${money(l.qty * l.price)}`));
  if (s.discount) L.push('', `Subtotal: ${money(s.subtotal)}`, `Discount: -${money(s.discount)}`);
  L.push('', `*TOTAL: ${money(s.total)}*`, `Paid by: ${s.payment}`, '', 'Thank you for shopping with us!');
  return L.join('\n');
}

// Opens WhatsApp with the receipt ready to send (to the customer's number if one was entered).
function waLink(s) {
  let p = String(s.phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '233' + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(receiptText(s))}`;
}

function printReceipt(s) {
  let box = $('#printArea');
  if (!box) { box = document.createElement('div'); box.id = 'printArea'; document.body.appendChild(box); }
  box.innerHTML = receiptHTML(s);
  setTimeout(() => window.print(), 60);
}
