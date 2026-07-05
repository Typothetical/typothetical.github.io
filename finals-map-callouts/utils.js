function normalize(s) {
  return s.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitize(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function imageCoords(imgEl, dataW, dataH) {
  const rect = imgEl.getBoundingClientRect();
  const sx = dataW / rect.width;
  const sy = dataH / rect.height;
  return { sx, sy, rect };
}
