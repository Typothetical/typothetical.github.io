const IS_HOSTED = location.protocol !== 'file:';
if (IS_HOSTED) document.body.classList.add('is-hosted');

let state = {
  mode: 'locate',
  mapData: null,
  mapConfig: null,
  locations: [],
  answered: new Map(),
  wrongIndices: [],
  finished: false,
  currentIndex: -1,
  waitingForFeedback: false,
  locateOrder: [],
  locateIndex: 0,
};

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}

function modeBadge() {
  return state.mode === 'locate' ? 'Loc' : state.mode === 'multiple' ? 'MC' : 'Type';
}

function renderHome() {
  document.body.classList.remove('mode-locate');
  const grid = document.getElementById('map-grid');
  const empty = document.getElementById('no-maps-msg');
  grid.innerHTML = '';

  if (MAPS.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  MAPS.forEach((cfg, idx) => {
    const prog = getMapProgress(cfg.id);
    const annot = hasAnnotations(cfg.id);
    const card = document.createElement('div');
    card.className = 'map-card';
    card.innerHTML =
      '<img class="map-card-thumb" src="' + sanitize(cfg.image) + '" alt="' + sanitize(cfg.title) + '" loading="lazy"' +
      '     onerror="this.style.display=\'none\'">' +
      '<div class="map-card-body">' +
      '  <div style="flex:1;min-width:0">' +
      '    <span class="map-card-title">' + sanitize(cfg.title) + '</span>' +
      '    <span class="map-card-progress">' +
      (annot ? (prog ? '<span class="done">' + prog.correct + '/' + prog.total + '</span>' : 'ready') : 'no data') +
      '    </span>' +
      '    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' +
    '      <button class="btn-view-callouts btn btn-secondary" style="font-size:12px;padding:4px 10px">View Callouts</button>' +
      (IS_HOSTED ? '' : '      <button class="btn-annotate-map btn btn-secondary" style="font-size:12px;padding:4px 10px">Edit Annotation</button>\n') +
    '    </div>' +
    '  </div>' +
    '</div>';
    card.querySelector('.btn-view-callouts').addEventListener('click', e => { e.stopPropagation(); viewCallouts(idx); });
    if (!IS_HOSTED) {
      card.querySelector('.btn-annotate-map').addEventListener('click', e => { e.stopPropagation(); startAnnotate(idx); });
    }
    card.addEventListener('click', () => {
      if (hasAnnotations(cfg.id)) startQuiz(idx);
    });
    grid.appendChild(card);
  });
}

// Navigation
document.getElementById('back-to-home').addEventListener('click', () => {
  document.getElementById('question-modal').classList.add('hidden');
  state.waitingForFeedback = false;
  renderHome();
  showView('home');
});

document.getElementById('results-back').addEventListener('click', () => {
  renderHome();
  showView('home');
});

document.getElementById('callouts-back').addEventListener('click', () => {
  renderHome();
  showView('home');
});

function viewCallouts(index) {
  const cfg = MAPS[index];
  if (!cfg) return;

  document.getElementById('callouts-title').textContent = cfg.title;
  document.getElementById('callouts-loading').classList.remove('hidden');
  document.getElementById('callouts-error').classList.add('hidden');
  document.getElementById('callouts-image').style.display = 'none';
  document.getElementById('callouts-overlay').innerHTML = '';

  showView('callouts');

  const saved = getAnnotations(cfg.id);
  if (!saved) {
    document.getElementById('callouts-loading').classList.add('hidden');
    document.getElementById('callouts-error').classList.remove('hidden');
    return;
  }

  const img = document.getElementById('callouts-image');
  const overlay = document.getElementById('callouts-overlay');
  img.onload = () => {
    img.style.display = 'block';
    document.getElementById('callouts-loading').classList.add('hidden');
  };
  img.onerror = () => {
    document.getElementById('callouts-loading').classList.add('hidden');
    alert('Failed to load image: ' + cfg.image);
  };
  img.src = cfg.image;
}

// Mode toggle
document.getElementById('mode-toggle').addEventListener('click', e => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.mode = btn.dataset.mode;
});

// Load file button
document.getElementById('load-file-btn').addEventListener('click', () => {
  if (IS_HOSTED) return;
  document.getElementById('file-input').click();
});

// Annotate new image button
document.getElementById('annotate-new-btn').addEventListener('click', () => {
  if (IS_HOSTED) return;
  document.getElementById('image-input').click();
});

document.getElementById('image-input').addEventListener('change', e => {
  if (IS_HOSTED) return;
  const file = e.target.files[0];
  if (!file) return;
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const id = 'img_' + Date.now();
  const url = URL.createObjectURL(file);
  MAPS.push({ id, title: name, image: url, width: 0, height: 0, locations: [] });
  renderHome();
  startAnnotate(MAPS.length - 1);
});

document.getElementById('file-input').addEventListener('change', e => {
  if (IS_HOSTED) return;
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
      const name = file.name.replace(/\.(json|js)$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      startQuizFromData(data, name);
    } catch { alert('Invalid data file'); }
  };
  reader.readAsText(file);
});

// Keyboard handler
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('question-modal');
    if (!modal.classList.contains('hidden') && !state.finished
        && document.getElementById('wrong-actions').classList.contains('hidden')) {
      closeModal();
    }
    const aModal = document.getElementById('annotate-name-modal');
    if (!aModal.classList.contains('hidden')) {
      aModal.classList.add('hidden');
    }
  }
  if (e.key === 'Enter') {
    const qModal = document.getElementById('question-modal');
    if (qModal.classList.contains('hidden')) return;
    const cont = document.getElementById('modal-continue');
    if (!cont.classList.contains('hidden')) cont.click();
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (document.getElementById('view-annotate').classList.contains('active')) {
      if (annotateState.selectedIndex >= 0 && document.getElementById('annotate-name-modal').classList.contains('hidden')) {
        if (confirm('Delete this location?')) {
          annotateState.locations.splice(annotateState.selectedIndex, 1);
          annotateState.selectedIndex = -1;
          document.getElementById('annotate-toolbar').classList.add('hidden');
          renderAnnotations();
        }
      }
    }
  }
});

// Modal close on overlay click
document.getElementById('question-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('question-modal') && !state.finished
      && document.getElementById('wrong-actions').classList.contains('hidden')) {
    closeModal();
  }
});

// Init
renderHome();
preloadAnnotations().then(() => renderHome()).catch(() => {});
