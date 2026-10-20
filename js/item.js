/* DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com */
start(() => {
  const id = new URLSearchParams(location.search).get('id');
  const item = id ? DB.get(id) : null;
  const panel = $('#panel');
  panel.hidden = false;
  if (id && !item) {
    panel.innerHTML = '<div class="empty"><p>That item no longer exists.</p><a class="btn primary" href="index.html">Back to items</a></div>';
    return;
  }
  const g = $('#f').elements;
  let photo = item?.image || '';

  $('#title').textContent = item ? 'Edit item' : 'Add item';
  document.title = (item ? 'Edit' : 'Add') + ' item – NIMOX ENTERPRISE';
  $('#cats').innerHTML = [...new Set(DB.all().map(i => i.category).filter(Boolean))].sort().map(c => `<option value="${esc(c)}">`).join('');
  $('#del').style.display = item ? '' : 'none';
  $('#again').style.display = item ? 'none' : '';

  if (item) {
    g.name.value = item.name; g.category.value = item.category || ''; g.price.value = item.price;
    g.cost.value = item.cost || ''; g.qty.value = item.qty; g.low.value = item.low ?? 5;
    g.image.value = photo.startsWith('data:') ? '' : photo;
  }

  function preview() {
    const p = $('#prev'), src = imgSrc({ image: photo });
    p.dataset.i = ini(g.name.value);
    p.innerHTML = src ? `<img src="${esc(src)}" alt="" onerror="this.remove()">` : '';
    $('#clear').style.display = photo ? '' : 'none';
  }
  function margin() {
    const p = +g.price.value, c = +g.cost.value;
    $('#margin').textContent = p && c ? `Profit per item ${money(p - c)} · ${Math.round((p - c) / p * 100)}% of the selling price` : '';
  }
  g.name.oninput = preview; g.price.oninput = g.cost.oninput = margin;
  g.image.oninput = () => { photo = g.image.value.trim(); preview(); };
  $('#clear').onclick = () => { photo = ''; g.image.value = ''; $('#file').value = ''; preview(); };
  $('#qm').onclick = () => { g.qty.value = Math.max(0, (parseInt(g.qty.value) || 0) - 1); };
  $('#qp').onclick = () => { g.qty.value = (parseInt(g.qty.value) || 0) + 1; };

  $('#file').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 500 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = im.width * s; cv.height = im.height * s;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        photo = cv.toDataURL('image/jpeg', .82); g.image.value = ''; preview();
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  };

  $('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const again = e.submitter?.value === 'again' && !item;
    const btns = [...document.querySelectorAll('#f button')]; btns.forEach(b => b.disabled = true);
    try {
      const d = {
        name: g.name.value.trim(), category: g.category.value.trim(), price: +g.price.value, cost: +g.cost.value || 0,
        qty: Math.max(0, parseInt(g.qty.value) || 0), low: Math.max(0, parseInt(g.low.value) || 0), image: await DB.uploadImage(photo)
      };
      await (item ? DB.update(item.id, d) : DB.add(d));
      flash(`${d.name} ${item ? 'updated' : 'added'}`);
      location.href = again ? 'item.html' : 'index.html';
    } catch (err) {
      btns.forEach(b => b.disabled = false);
      alert('Could not save: ' + err.message);
    }
  });
  $('#del').onclick = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try { await DB.remove(item.id); flash(`${item.name} deleted`); location.href = 'index.html'; }
    catch (err) { alert('Could not delete: ' + err.message); }
  };

  preview(); margin();
});
