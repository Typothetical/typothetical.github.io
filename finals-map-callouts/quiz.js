// ============================================================
// QUIZ SETUP
// ============================================================
function startQuiz(index) {
  const cfg = MAPS[index];
  if (!cfg) return;

  state.mapConfig = cfg;
  state.answered = new Map();
  state.wrongIndices = [];
  state.choicesPool = null;
  state.finished = false;
  state.currentIndex = -1;
  state.waitingForFeedback = false;
  state.locateOrder = [];
  state.locateIndex = 0;

  document.getElementById('quiz-title').textContent = cfg.title;
  document.getElementById('quiz-mode-badge').textContent = modeBadge();
  document.getElementById('quiz-score').textContent = '0 / ?';
  document.getElementById('quiz-loading').classList.remove('hidden');
  document.getElementById('quiz-error').classList.add('hidden');
  document.getElementById('map-image').style.display = 'none';
  document.getElementById('map-overlay').innerHTML = '';

  showView('quiz');

  const saved = getAnnotations(cfg.id);
  if (!saved) {
    document.getElementById('quiz-loading').classList.add('hidden');
    document.getElementById('quiz-error').classList.remove('hidden');
    return;
  }

  state.mapData = { image: cfg.image, width: saved.width, height: saved.height, locations: saved.locations };
  state.locations = state.mapData.locations || [];
  updateScore();
  renderMap();
}

function startQuizFromData(data, title) {
  state.mapConfig = { id: 'custom', title: title || 'Custom Map' };
  state.mapData = data;
  state.locations = data.locations || [];
  state.answered = new Map();
  state.wrongIndices = [];
  state.choicesPool = null;
  state.finished = false;
  state.currentIndex = -1;
  state.waitingForFeedback = false;
  state.locateOrder = [];
  state.locateIndex = 0;

  document.getElementById('quiz-title').textContent = title || 'Custom Map';
  document.getElementById('quiz-mode-badge').textContent = modeBadge();
  document.getElementById('quiz-loading').classList.add('hidden');
  document.getElementById('quiz-error').classList.add('hidden');
  document.getElementById('map-image').style.display = 'none';
  document.getElementById('map-overlay').innerHTML = '';

  showView('quiz');
  updateScore();
  renderMap();
}

// ============================================================
// MAP RENDERING
// ============================================================
function renderMap() {
  const data = state.mapData;
  if (!data || !data.image) {
    document.getElementById('quiz-loading').classList.add('hidden');
    document.getElementById('quiz-error').classList.remove('hidden');
    document.getElementById('quiz-error').querySelector('p').textContent = 'Image not found. The JSON needs an "image" field.';
    return;
  }

  const img = document.getElementById('map-image');
  const overlay = document.getElementById('map-overlay');
  const locateBar = document.getElementById('locate-bar');
  const isLocate = state.mode === 'locate';

  document.body.classList.toggle('mode-locate', isLocate);

  img.onload = () => {
    img.style.display = 'block';
    document.getElementById('quiz-loading').classList.add('hidden');
    overlay.innerHTML = '';

    data.locations.forEach((loc, i) => {
      const div = document.createElement('div');
      div.className = 'location-overlay';
      div.style.left = (loc.x / data.width * 100) + '%';
      div.style.top = (loc.y / data.height * 100) + '%';
      div.style.width = (loc.w / data.width * 100) + '%';
      div.style.height = (loc.h / data.height * 100) + '%';
      div.dataset.index = i;
      if (!isLocate) {
        div.addEventListener('click', () => onOverlayClick(i));
        const mark = document.createElement('span');
        mark.className = 'wrong-mark';
        mark.textContent = '?';
        div.appendChild(mark);
      }
      overlay.appendChild(div);
    });

    if (isLocate) {
      locateBar.classList.remove('hidden');
      document.getElementById('click-indicator').classList.add('hidden');
      state.locateOrder = shuffle([...Array(data.locations.length).keys()]);
      state.locateIndex = 0;
      showNextLocateQuestion();
    } else {
      locateBar.classList.add('hidden');
    }

    applyAnsweredState();
  };
  img.onerror = () => {
    document.getElementById('quiz-loading').classList.add('hidden');
    document.getElementById('quiz-error').classList.remove('hidden');
    document.getElementById('quiz-error').querySelector('p').textContent = 'Failed to load image: ' + data.image;
  };
  img.src = data.image;
}

function applyAnsweredState() {
  const overlay = document.getElementById('map-overlay');
  for (const [idx, result] of state.answered) {
    const div = overlay.querySelector(`[data-index="${idx}"]`);
    if (!div) continue;
    div.classList.add('answered');
    if (!result.correct && !result.revealed) div.classList.add('wrong');
  }
  updateScore();
  checkFinished();
}

// ============================================================
// LOCATE MODE
// ============================================================
function showNextLocateQuestion() {
  while (state.locateIndex < state.locateOrder.length &&
         state.answered.has(state.locateOrder[state.locateIndex])) {
    state.locateIndex++;
  }
  const idx = state.locateOrder[state.locateIndex];
  if (idx === undefined) {
    checkFinished();
    if (state.finished) showResults();
    return;
  }
  const loc = state.locations[idx];
  document.getElementById('locate-name').textContent = loc.text;
  document.getElementById('click-indicator').classList.add('hidden');
  updateScore();
}

document.getElementById('quiz-map-wrapper').addEventListener('click', e => {
  if (state.mode !== 'locate') return;
  if (state.waitingForFeedback) return;
  const idx = state.locateOrder[state.locateIndex];
  if (idx === undefined || state.answered.has(idx)) return;

  const wrapper = document.getElementById('quiz-map-wrapper');
  const img = document.getElementById('map-image');
  const { sx, sy, rect } = imageCoords(img, state.mapData.width, state.mapData.height);
  const clickX = (e.clientX - rect.left) * sx;
  const clickY = (e.clientY - rect.top) * sy;

  const loc = state.locations[idx];

  let clickedIdx = -1;
  for (let i = 0; i < state.locations.length; i++) {
    if (state.answered.has(i)) continue;
    const sloc = state.locations[i];
    if (clickX >= sloc.x && clickX <= sloc.x + sloc.w &&
        clickY >= sloc.y && clickY <= sloc.y + sloc.h) {
      clickedIdx = i;
      break;
    }
  }

  if (clickedIdx === -1) return;

  const indicator = document.getElementById('click-indicator');
  const isCorrect = state.locations[clickedIdx].text === loc.text;

  if (isCorrect) {
    state.answered.set(clickedIdx, { correct: true, answer: loc.text });
    if (clickedIdx !== idx) {
      state.locateOrder.push(idx);
    }
    indicator.className = 'click-indicator correct';
  } else {
    state.answered.set(idx, { correct: false, answer: loc.text });
    indicator.className = 'click-indicator wrong';
  }

  const showLoc = state.locations[clickedIdx];
  const cx = (showLoc.x + showLoc.w / 2) / state.mapData.width * 100;
  const cy = (showLoc.y + showLoc.h / 2) / state.mapData.height * 100;
  indicator.style.left = cx + '%';
  indicator.style.top = cy + '%';
  indicator.classList.remove('hidden');

  applyAnsweredState();

  state.waitingForFeedback = true;
  setTimeout(() => {
    state.waitingForFeedback = false;
    state.locateIndex++;
    while (state.locateIndex < state.locateOrder.length &&
           state.answered.has(state.locateOrder[state.locateIndex])) {
      state.locateIndex++;
    }
    if (state.locateIndex >= state.locateOrder.length) {
      checkFinished();
      if (state.finished) showResults();
    } else {
      showNextLocateQuestion();
    }
  }, 600);
});

// Pass button in locate mode
document.getElementById('locate-pass').addEventListener('click', () => {
  if (state.mode !== 'locate') return;
  if (state.waitingForFeedback) return;
  const idx = state.locateOrder[state.locateIndex];
  if (idx === undefined || state.answered.has(idx)) return;
  state.locateOrder.push(idx);
  state.locateIndex++;
  showNextLocateQuestion();
});

// ============================================================
// QUIZ LOGIC
// ============================================================
function onOverlayClick(index) {
  if (state.waitingForFeedback) return;
  if (state.answered.has(index)) return;
  state.currentIndex = index;
  showQuestion(index);
}

function showQuestion(index) {
  const loc = state.locations[index];
  if (!loc) return;

  const modal = document.getElementById('question-modal');
  const count = document.getElementById('modal-count');
  const hint = document.getElementById('modal-hint');

  count.textContent = (state.answered.size + 1) + ' / ' + state.locations.length;
  hint.textContent = state.mode === 'locate' ? 'Click the location on the map' :
    state.mode === 'multiple' ? 'Select the correct answer' : 'Type your answer';

  document.getElementById('choices-container').innerHTML = '';
  document.getElementById('type-container').classList.add('hidden');
  document.getElementById('feedback-container').classList.add('hidden');
  document.getElementById('feedback-container').className = 'feedback-container hidden';
  document.getElementById('wrong-actions').classList.add('hidden');
  document.getElementById('modal-continue').classList.add('hidden');

  if (state.mode === 'multiple') {
    const choices = generateChoices(index);
    const container = document.getElementById('choices-container');
    container.classList.remove('hidden');
    choices.forEach((choice, ci) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.dataset.correct = choice.correct;
      btn.addEventListener('click', () => handleChoiceClick(index, ci, choices));
      container.appendChild(btn);
    });
  } else {
    document.getElementById('choices-container').innerHTML = '';
    const tc = document.getElementById('type-container');
    tc.classList.remove('hidden');
    const input = document.getElementById('type-input');
    input.value = '';
    input.focus();
    input.onkeydown = e => { if (e.key === 'Enter') submitTypeAnswer(index); };
    document.getElementById('type-submit').onclick = () => submitTypeAnswer(index);
  }

  modal.classList.remove('hidden');
  state.waitingForFeedback = true;
}

function generateChoices(correctIndex) {
  const pool = state.choicesPool || state.locations;
  const correct = pool[correctIndex] || state.locations[correctIndex];
  const uniqueTexts = [...new Set(pool.map(l => l.text))].filter(t => t !== correct.text);
  const shuffled = shuffle(uniqueTexts).slice(0, 3);
  const choices = [
    { text: correct.text, correct: true },
    ...shuffled.map(t => ({ text: t, correct: false }))
  ];
  return shuffle(choices);
}

function handleChoiceClick(index, choiceIdx, choices) {
  const btns = document.querySelectorAll('.choice-btn');
  btns.forEach(b => b.disabled = true);

  const chosen = choices[choiceIdx];
  const correct = choices.find(c => c.correct);

  btns.forEach((b, i) => {
    if (i === choiceIdx) {
      b.classList.add(chosen.correct ? 'selected-correct' : 'selected-wrong');
    }
  });

  const isCorrect = chosen.correct;
  state.answered.set(index, { correct: isCorrect, answer: chosen.text });
  showFeedback(isCorrect, correct.text);
  applyAnsweredState();
}

function submitTypeAnswer(index) {
  const input = document.getElementById('type-input');
  const userAns = input.value.trim();
  if (!userAns) return;

  const correct = state.locations[index].text;
  const isCorrect = normalize(userAns) === normalize(correct);
  state.answered.set(index, { correct: isCorrect, answer: userAns });

  document.getElementById('type-container').classList.add('hidden');
  document.getElementById('type-input').disabled = true;
  document.getElementById('type-submit').disabled = true;

  showFeedback(isCorrect, correct);
  applyAnsweredState();
}

function showFeedback(correct, correctAnswer) {
  const fb = document.getElementById('feedback-container');
  const cont = document.getElementById('modal-continue');
  const wrongActions = document.getElementById('wrong-actions');
  fb.classList.remove('hidden', 'correct', 'wrong');
  if (correct) {
    fb.className = 'feedback-container correct';
    fb.innerHTML = '&#10003; Correct! It\'s &ldquo;' + sanitize(correctAnswer) + '&rdquo;';
    cont.classList.remove('hidden');
    wrongActions.classList.add('hidden');
  } else {
    fb.className = 'feedback-container wrong';
    fb.textContent = '\u2717 Wrong';
    cont.classList.add('hidden');
    wrongActions.classList.remove('hidden');
  }
}

// ============================================================
// SCORE & COMPLETION
// ============================================================
function updateScore() {
  const answered = state.answered.size;
  const total = state.locations.length;
  const correct = [...state.answered.values()].filter(r => r.correct).length;
  document.getElementById('quiz-score').textContent = correct + ' / ' + total;
  const countEl = document.getElementById('modal-count');
  if (countEl) countEl.textContent = answered + ' / ' + total;
}

function checkFinished() {
  if (state.mode === 'locate') {
    state.finished = state.locateIndex >= state.locateOrder.length;
  } else {
    state.finished = state.answered.size >= state.locations.length && state.locations.length > 0;
  }
  if (state.finished) {
    const correct = [...state.answered.values()].filter(r => r.correct).length;
    if (state.mapConfig && state.mapConfig.id && state.mapConfig.id !== 'custom') {
      saveMapProgress(state.mapConfig.id, correct, state.locations.length,
        Object.fromEntries([...state.answered.entries()].map(([k, v]) => [k, v.correct])));
    }
  }
}

function closeModal(suppressResults) {
  document.getElementById('question-modal').classList.add('hidden');
  document.getElementById('modal-continue').classList.add('hidden');
  state.waitingForFeedback = false;
  document.getElementById('type-input').disabled = false;
  document.getElementById('type-submit').disabled = false;

  if (!suppressResults && state.finished && state.answered.size >= state.locations.length) {
    showResults();
  }
}

document.getElementById('modal-continue').addEventListener('click', () => closeModal());

// Try Again
document.getElementById('wrong-try-again').addEventListener('click', () => {
  const idx = state.currentIndex;
  if (idx < 0) return;
  state.answered.delete(idx);
  const div = document.getElementById('map-overlay').querySelector('[data-index="' + idx + '"]');
  if (div) div.classList.remove('answered', 'wrong');
  updateScore();
  document.getElementById('feedback-container').classList.add('hidden');
  document.getElementById('wrong-actions').classList.add('hidden');
  document.getElementById('modal-continue').classList.add('hidden');
  document.querySelectorAll('.choice-btn').forEach(b => { b.disabled = false; b.className = 'choice-btn'; });
  document.getElementById('type-container').classList.add('hidden');
  document.getElementById('type-input').disabled = false;
  document.getElementById('type-submit').disabled = false;
  state.waitingForFeedback = false;
  showQuestion(idx);
});

// Reveal
document.getElementById('wrong-reveal').addEventListener('click', () => {
  const idx = state.currentIndex;
  if (idx < 0) return;
  const entry = state.answered.get(idx);
  if (entry) entry.revealed = true;
  // Show correct answer in choice buttons
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('reveal-correct');
  });
  document.getElementById('wrong-actions').classList.add('hidden');
  closeModal(true);
  const div = document.getElementById('map-overlay').querySelector('[data-index="' + idx + '"]');
  if (div) {
    div.classList.remove('wrong');
    div.classList.add('answered');
  }
  if (state.finished) {
    setTimeout(() => { showResults(); }, 1000);
  }
});

// Error fallback load button
document.getElementById('load-map-file-btn').addEventListener('click', () => {
  if (IS_HOSTED) return;
  document.getElementById('map-file-input').click();
});
document.getElementById('map-file-input').addEventListener('change', e => {
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

// ============================================================
// RESULTS
// ============================================================
function showResults() {
  const total = state.locations.length;
  const correct = [...state.answered.values()].filter(r => r.correct).length;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  document.getElementById('results-score').textContent = correct + ' / ' + total;
  document.getElementById('results-pct').textContent = pct + '%';

  const list = document.getElementById('results-list');
  list.innerHTML = '';
  state.locations.forEach((loc, i) => {
    const ans = state.answered.get(i);
    const item = document.createElement('div');
    item.className = 'results-item ' + (ans?.correct ? 'correct' : 'wrong');
    item.innerHTML = '<span class="icon">' + (ans?.correct ? '&#10003;' : '&#10007;') + '</span>' +
      '<span class="name">' + sanitize(loc.text) + '</span>';
    list.appendChild(item);
  });

  showView('results');
}

document.getElementById('results-retry-all').addEventListener('click', () => {
  const cfg = state.mapConfig;
  const idx = MAPS.findIndex(m => m.id === cfg.id);
  if (idx >= 0) startQuiz(idx);
});

document.getElementById('results-retry-wrong').addEventListener('click', () => {
  const wrong = state.locations.filter((_, i) => {
    const ans = state.answered.get(i);
    return !ans || !ans.correct;
  });
  if (wrong.length === 0) return;

  state.choicesPool = state.mapData.locations;
  const data = {
    ...state.mapData,
    locations: wrong,
  };
  startQuizFromData(data, state.mapConfig.title + ' (Wrong)');
});
