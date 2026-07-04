# THE FINALS Map Callouts Quiz

A gamified study tool for learning map callouts in **THE FINALS**. Load annotated map images and quiz yourself in three modes. Annotation data is stored in `.js` files in the `maps/` folder — everything works **offline** from the `file://` protocol.

---

## Features

- **Three quiz modes**
  - **Locate** — Shown a location name; click the correct region on the map. Wrong click marks the correct target red. Press **Pass** to skip and try again later. You can replay from only your wrong answers at the end.
  - **Multiple Choice** — An overlay is highlighted; pick the correct name from four unique options. Wrong answers offer "Try Again" (no answer revealed) or "Reveal".
  - **Type-in** — An overlay is highlighted; type the exact name. Comparison is case-insensitive and ignores punctuation.

- **View Callouts** — See the full map image at full size for study.

- **Annotation mode** — Draw bounding boxes by dragging on the image, name each location, edit/delete existing boxes. Save triggers a `.js` file download.

- **Persistent progress** — Correct/total counts saved per map in localStorage.

- **File upload (local only)** — Load `.js` annotation files for ad-hoc quizzing, or upload a new image to annotate from scratch.

---

## How to use

1. **Open `index.html`** in a modern browser. Works on `file://` — no HTTP server needed.

2. **Home screen** — Grid of map cards. Click a card to start a quiz (if `.js` data exists), or use the **View** button. On the local version, **Edit Annotation** is also available.

3. **Choose quiz mode** — Toggle at the top of the home screen: `Locate` / `Multiple Choice` / `Type-in`.

4. **Take a quiz** — Answer each question. Results screen shows per-answer breakdown. Retry all questions or only wrong ones.

5. **View Callouts** — See the full-size map image for study.

6. **Edit Annotation (local only)** — Draw rectangles around callout labels, type names. Use the toolbar to edit/delete. **Save** downloads a `.js` file.

7. **Add a new map (local only)** — Click **"+ Annotate New Image"**, pick an image, annotate it, then download the `.js` file. Place it in `maps/` and add a MAPS entry.

---

## How annotations work

Each map has a companion `.js` file (e.g., `maps/Monaco-callouts.js`) that sets a global:

```js
mapquizData['Monaco-callouts'] = {
  "image": "maps/Monaco-callouts.webp",
  "width": 1240,
  "height": 778,
  "locations": [
    { "text": "Back Shed", "x": 453, "y": 41, "w": 706, "h": 55 }
  ]
};
```

On page load, `preloadAnnotations()` creates a `<script>` tag for each map — the only reliable way to seed data over `file://`. There is no localStorage caching; the `.js` files in `maps/` are the canonical storage. Edit → Save to download an updated `.js` file.

## File structure

```
finals-map-callouts/
├── index.html           # HTML skeleton
├── style.css            # All styles
├── utils.js             # normalize, shuffle, sanitize, imageCoords
├── storage.js           # MAPS config, persistence, preloadAnnotations
├── app.js               # State, views, home, navigation, init
├── quiz.js              # Quiz logic: 3 modes, locate, results
├── annotate.js          # Annotation mode: draw, edit, save, download
├── maps/
│   ├── Monaco-callouts.webp
│   ├── Monaco-callouts.js
│   ├── Bernal-callouts.webp
│   ├── Bernal-callouts.js
│   └── ... (other maps)
```

---

## Configuration

Add new maps in the `MAPS` array in `storage.js`:

```js
{ id: 'Bernal-callouts', title: 'Bernal Callouts',
  image: 'maps/Bernal-callouts.webp', data: 'maps/Bernal-callouts.js' }
```

---

## Maps included

All 8 maps currently in rotation for THE FINALS:

| Map               | Callouts |
|-------------------|----------|
| Bernal Callouts   | 50       |
| Fortune Stadium   | 36       |
| Kyoto Callouts    | 28       |
| Las Vegas Callouts| 48       |
| Monaco Callouts   | 52       |
| Seoul Callouts    | 49       |
| Skyway Stadium    | 44       |
| Sys Horizon       | 80       |

---

## Browser compatibility

Tested in Chrome. Requires ES6+, CSS Grid/Flexbox. No polyfills or build tools needed.
