let annotateState = {
  config: null, image: null, width: 0, height: 0, locations: [],
  selectedIndex: -1, drawing: false, drawStart: null, drawEl: null,
};

function downloadAnnotations() {
  if (annotateState.locations.length === 0) return;
  const data = {
    image: annotateState.config.image,
    width: annotateState.width,
    height: annotateState.height,
    locations: annotateState.locations,
  };
  const prefix = "mapquizData['" + annotateState.config.id + "']=";
  const blob = new Blob([prefix + JSON.stringify(data, null, 2) + ';\n'], { type: 'application/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = annotateState.config.id + '.js';
  a.click();
  URL.revokeObjectURL(a.href);
}

function saveAnnotations() {
  downloadAnnotations();
}

function clearAnnotations() {
  annotateState.locations = [];
  annotateState.selectedIndex = -1;
  document.getElementById('annotate-toolbar').classList.add('hidden');
  document.getElementById('annotate-prompt').classList.add('hidden');
  renderAnnotations();
}

function startAnnotate(index) {
  if (IS_HOSTED) return;
  const cfg = MAPS[index];
  if (!cfg) return;
  annotateState.config = cfg;
  annotateState.locations = [];
  annotateState.selectedIndex = -1;
  annotateState.drawing = false;

  document.getElementById('annotate-title').textContent = cfg.title;
  document.getElementById('annotate-count').textContent = '0 locations';
  document.getElementById('annotate-loading').classList.remove('hidden');
  document.getElementById('annotate-image').style.display = 'none';
  document.getElementById('annotate-overlay').innerHTML = '';
  document.getElementById('annotate-toolbar').classList.add('hidden');

  const hint = document.getElementById('annotate-hint');
  if (hint) { hint.style.animation = 'none'; void hint.offsetWidth; hint.style.animation = ''; }

  showView('annotate');

  const img = document.getElementById('annotate-image');
  img.onload = () => {
    img.style.display = 'block';
    document.getElementById('annotate-loading').classList.add('hidden');
    annotateState.width = img.naturalWidth;
    annotateState.height = img.naturalHeight;
    document.getElementById('annotate-prompt').classList.add('hidden');

    const saved = getAnnotations(cfg.id);
    if (saved) {
      annotateState.locations = saved.locations;
      annotateState.width = saved.width || annotateState.width;
      annotateState.height = saved.height || annotateState.height;
      renderAnnotations();
    } else {
      document.getElementById('annotate-prompt').classList.remove('hidden');
    }
  };
  img.onerror = () => {
    document.getElementById('annotate-loading').classList.add('hidden');
    alert('Failed to load image: ' + cfg.image);
  };
  img.src = cfg.image;
}

function renderAnnotations() {
  const overlay = document.getElementById('annotate-overlay');
  overlay.innerHTML = '';
  const w = annotateState.width;
  const h = annotateState.height;

  annotateState.locations.forEach((loc, i) => {
    const div = document.createElement('div');
    div.className = 'annotate-overlay';
    div.style.left = (loc.x / w * 100) + '%';
    div.style.top = (loc.y / h * 100) + '%';
    div.style.width = (loc.w / w * 100) + '%';
    div.style.height = (loc.h / h * 100) + '%';
    div.dataset.ai = i;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = loc.text;
    div.appendChild(label);
    div.addEventListener('click', e => { e.stopPropagation(); selectAnnotation(i); });
    overlay.appendChild(div);
  });

  const count = annotateState.locations.length;
  document.getElementById('annotate-count').textContent = count + ' location' + (count !== 1 ? 's' : '');

  if (annotateState.selectedIndex >= 0 && annotateState.selectedIndex < annotateState.locations.length) {
    const sel = overlay.querySelector('[data-ai="' + annotateState.selectedIndex + '"]');
    if (sel) {
      sel.classList.add('selected');
      document.getElementById('annotate-toolbar').classList.remove('hidden');
      document.getElementById('annotate-selected-name').textContent = annotateState.locations[annotateState.selectedIndex].text;
    }
  }
}

function selectAnnotation(index) {
  document.querySelectorAll('.annotate-overlay').forEach(el => el.classList.remove('selected'));
  annotateState.selectedIndex = index;
  document.getElementById('annotate-toolbar').classList.remove('hidden');
  const el = document.querySelector('.annotate-overlay[data-ai="' + index + '"]');
  if (el) el.classList.add('selected');
  document.getElementById('annotate-selected-name').textContent = annotateState.locations[index].text;
}

function coordsFromEvent(e) {
  const wrapper = document.getElementById('annotate-map-wrapper');
  const rect = wrapper.getBoundingClientRect();
  const imgEl = document.getElementById('annotate-image');
  const sx = annotateState.width / imgEl.getBoundingClientRect().width;
  const sy = annotateState.height / imgEl.getBoundingClientRect().height;
  return {
    x: Math.max(0, Math.min(annotateState.width, (e.clientX - rect.left) * sx)),
    y: Math.max(0, Math.min(annotateState.height, (e.clientY - rect.top) * sy)),
  };
}

document.getElementById('annotate-overlay').addEventListener('mousedown', e => {
  e.preventDefault();
  document.getElementById('annotate-prompt').classList.add('hidden');
  if (e.target.closest('.annotate-overlay')) return;
  const p = coordsFromEvent(e);
  annotateState.drawing = true;
  annotateState.drawStart = p;
  const el = document.createElement('div');
  el.className = 'annotate-overlay drawing';
  el.style.left = (p.x / annotateState.width * 100) + '%';
  el.style.top = (p.y / annotateState.height * 100) + '%';
  el.style.width = '0';
  el.style.height = '0';
  document.getElementById('annotate-overlay').appendChild(el);
  annotateState.drawEl = el;
  document.getElementById('annotate-toolbar').classList.add('hidden');
  document.querySelectorAll('.annotate-overlay').forEach(el => el.classList.remove('selected'));
  annotateState.selectedIndex = -1;
});

document.addEventListener('mousemove', e => {
  if (!annotateState.drawing || !annotateState.drawEl) return;
  const p = coordsFromEvent(e);
  const left = Math.min(annotateState.drawStart.x, p.x);
  const top = Math.min(annotateState.drawStart.y, p.y);
  const w = Math.abs(p.x - annotateState.drawStart.x);
  const h = Math.abs(p.y - annotateState.drawStart.y);
  annotateState.drawEl.style.left = (left / annotateState.width * 100) + '%';
  annotateState.drawEl.style.top = (top / annotateState.height * 100) + '%';
  annotateState.drawEl.style.width = (w / annotateState.width * 100) + '%';
  annotateState.drawEl.style.height = (h / annotateState.height * 100) + '%';
});

document.addEventListener('mouseup', e => {
  if (!annotateState.drawing) return;
  annotateState.drawing = false;
  if (annotateState.drawEl) { annotateState.drawEl.remove(); annotateState.drawEl = null; }
  const p = coordsFromEvent(e);
  const left = Math.min(annotateState.drawStart.x, p.x);
  const top = Math.min(annotateState.drawStart.y, p.y);
  const w = Math.abs(p.x - annotateState.drawStart.x);
  const h = Math.abs(p.y - annotateState.drawStart.y);
  if (w < 10 || h < 5) return;
  showAnnotationNameInput({ x: left, y: top, w, h });
});

function showAnnotationNameInput(loc) {
  const modal = document.getElementById('annotate-name-modal');
  const input = document.getElementById('annotate-name-input');
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
  const ok = () => {
    const name = input.value.trim();
    if (!name) return;
    if (name.length > 30) { alert('Name too long (max 30 characters)'); return; }
    loc.text = name;
    annotateState.locations.push(loc);
    renderAnnotations();
    modal.classList.add('hidden');
  };
  const cancel = () => { modal.classList.add('hidden'); };
  document.getElementById('annotate-name-ok').onclick = ok;
  document.getElementById('annotate-name-cancel').onclick = cancel;
  input.onkeydown = e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); };
}

document.getElementById('annotate-edit-name').addEventListener('click', () => {
  if (annotateState.selectedIndex < 0) return;
  const loc = annotateState.locations[annotateState.selectedIndex];
  const modal = document.getElementById('annotate-name-modal');
  const input = document.getElementById('annotate-name-input');
  input.value = loc.text;
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
  const ok = () => {
    const name = input.value.trim();
    if (!name) return;
    if (name.length > 30) { alert('Name too long (max 30 characters)'); return; }
    loc.text = name;
    renderAnnotations();
    modal.classList.add('hidden');
  };
  const cancel = () => { modal.classList.add('hidden'); };
  document.getElementById('annotate-name-ok').onclick = ok;
  document.getElementById('annotate-name-cancel').onclick = cancel;
  input.onkeydown = e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); };
});

document.getElementById('annotate-delete').addEventListener('click', () => {
  if (annotateState.selectedIndex < 0) return;
  if (!confirm('Delete this location?')) return;
  annotateState.locations.splice(annotateState.selectedIndex, 1);
  annotateState.selectedIndex = -1;
  document.getElementById('annotate-toolbar').classList.add('hidden');
  renderAnnotations();
});

document.getElementById('annotate-deselect').addEventListener('click', () => {
  document.querySelectorAll('.annotate-overlay').forEach(el => el.classList.remove('selected'));
  document.getElementById('annotate-toolbar').classList.add('hidden');
  annotateState.selectedIndex = -1;
});

document.getElementById('annotate-save').addEventListener('click', () => {
  if (annotateState.locations.length === 0) { alert('No locations to save.'); return; }
  saveAnnotations();
});

document.getElementById('annotate-clear').addEventListener('click', () => {
  if (annotateState.locations.length === 0) return;
  if (!confirm('Clear all annotations and start from scratch?')) return;
  clearAnnotations();
});

document.getElementById('annotate-quiz').addEventListener('click', () => {
  if (annotateState.locations.length === 0) { alert('Add at least one location first.'); return; }
  startQuizFromData({
    image: annotateState.config.image,
    width: annotateState.width,
    height: annotateState.height,
    locations: annotateState.locations,
  }, annotateState.config.title);
});

document.getElementById('annotate-back').addEventListener('click', () => {
  renderHome();
  showView('home');
});

document.getElementById('annotate-load-json-btn').addEventListener('click', () => {
  document.getElementById('annotate-json-input').click();
});

document.getElementById('annotate-start-fresh').addEventListener('click', () => {
  document.getElementById('annotate-prompt').classList.add('hidden');
});

document.getElementById('annotate-json-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const text = ev.target.result;
      const match = text.match(/mapquizData\['[^']+'\]=(.*);?\s*$/s);
      const jsonStr = match ? match[1] : text;
      const data = JSON.parse(jsonStr);
      if (!data.locations || !Array.isArray(data.locations)) { alert('File must contain a "locations" array'); return; }
      annotateState.locations = data.locations;
      if (data.width) annotateState.width = data.width;
      if (data.height) annotateState.height = data.height;
      document.getElementById('annotate-prompt').classList.add('hidden');
      renderAnnotations();
    } catch { alert('Invalid data file'); }
  };
  reader.readAsText(file);
});
