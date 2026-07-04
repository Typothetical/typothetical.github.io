const KEY = 'mapquiz_progress';
const MAPS = [
  { id: 'Bernal-callouts', title: 'Bernal Callouts', image: 'maps/Bernal-callouts.webp', data: 'maps/Bernal-callouts.js' },
  { id: 'Fortune_Stadium-Callouts', title: 'Fortune Stadium Callouts', image: 'maps/Fortune_Stadium-Callouts.webp', data: 'maps/Fortune_Stadium-Callouts.js' },
  { id: 'Kyoto-Callouts', title: 'Kyoto Callouts', image: 'maps/Kyoto-Callouts.webp', data: 'maps/Kyoto-Callouts.js' },
  { id: 'LasVegas-Callouts', title: 'Las Vegas Callouts', image: 'maps/LasVegas-Callouts.webp', data: 'maps/LasVegas-Callouts.js' },
  { id: 'Monaco-callouts', title: 'Monaco Callouts', image: 'maps/Monaco-callouts.webp', data: 'maps/Monaco-callouts.js' },
  { id: 'Seoul-Callouts', title: 'Seoul Callouts', image: 'maps/Seoul-Callouts.webp', data: 'maps/Seoul-Callouts.js' },
  { id: 'Skyway_Stadium-Callouts', title: 'Skyway Stadium Callouts', image: 'maps/Skyway_Stadium-Callouts.webp', data: 'maps/Skyway_Stadium-Callouts.js' },
  { id: 'Sys_Horizon-Callouts', title: 'Sys Horizon Callouts', image: 'maps/Sys_Horizon-Callouts.webp', data: 'maps/Sys_Horizon-Callouts.js' },
];

const mapquizData = {};

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function saveMapProgress(id, correct, total, answers) {
  const p = loadProgress();
  p[id] = { correct, total, answers };
  localStorage.setItem(KEY, JSON.stringify(p));
}

function getMapProgress(id) {
  return loadProgress()[id] || null;
}

function preloadAnnotations() {
  return new Promise(resolve => {
    const toLoad = MAPS.filter(c => c.data);
    if (!toLoad.length) { resolve(); return; }
    let remaining = toLoad.length;
    for (const cfg of toLoad) {
      const s = document.createElement('script');
      s.src = cfg.data;
      s.onload = () => { remaining--; if (!remaining) resolve(); };
      s.onerror = () => { remaining--; if (!remaining) resolve(); };
      document.head.appendChild(s);
    }
  });
}

function getAnnotations(id) {
  const cached = mapquizData[id];
  if (cached && cached.locations && Array.isArray(cached.locations) && cached.locations.length > 0) return cached;
  return null;
}

function persistAnnotations(id, data) {
  // No-op: .js files in maps/ are the canonical storage.
}

function hasAnnotations(id) {
  return getAnnotations(id) !== null;
}
