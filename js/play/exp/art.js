/* Mandala Studio (#/games/art): math art you make, animate, hear and hang on a wall.
   Routes: #/games/art (times-table mandala), #/games/art/meru, #/games/art/square, #/games/art/rope, #/games/art/gallery, and each piece
   with its parameters: #/games/art/<tab>/<code>. Math in art-core.js, drawing in art-draw.js, sound in art-sound.js.
   Canvas colors are read from design tokens and redrawn when the theme changes. */
import { head, level, t, store, say, confetti, toast, track, reducedMotion, isDark, token, esc, share, shareUrl, b64url, downloadCanvas, rng, seedOf, dayKey } from '../kit.js';
import { on, loop, onAbort, later } from '../life.js';
import * as A from './art-core.js';
import * as D from './art-draw.js';
import { ensemble, twoStrings } from './art-sound.js';

const KEY = 'art';
const TABS = [
  { id: 'times', name: 'Mandala', sub: 'times tables on a circle' },
  { id: 'meru', name: 'Meru', sub: 'the triangle of meters' },
  { id: 'square', name: 'Nine', sub: 'digital-root patterns' },
  { id: 'rope', name: 'Rope', sub: 'Śulba geometry' },
  { id: 'gallery', name: 'Gallery', sub: 'your pieces' }
];
const tabOf = k => (k === 'altar' ? 'rope' : k);
const WALL = { phone: [1170, 2532], desktop: [2560, 1440], square: [2048, 2048] };
const clockOf = ens => (ens.ctx ? () => ens.ctx.currentTime : () => globalThis.performance.now() / 1000);

/* Theme colors for canvas, read from tokens */
function readPal() {
  const c = n => A.parseColor(token(n));
  return { bg: c('--bg'), ink: c('--ink'), muted: c('--ink-muted'), line: c('--line'), coral: c('--coral'), sun: c('--sun'), teal: c('--teal'), dark: isDark() };
}
/* A palette for a wallpaper background: night or day, built from the two ends of the current theme */
function wallPal(pal, bg) {
  const [lo, hi] = A.luminance(pal.bg) < A.luminance(pal.ink) ? [pal.bg, pal.ink] : [pal.ink, pal.bg];
  return bg === 'night' ? { ...pal, bg: lo, ink: hi, muted: A.mix(hi, lo, 0.4), dark: true } : { ...pal, bg: hi, ink: lo, muted: A.mix(lo, hi, 0.4), dark: false };
}
const DRAW = { times: D.times, meru: D.meru, square: D.square, altar: D.altar };

/* A canvas that fits its box, knows the device pixel ratio, follows the theme and only redraws when asked
   (or while an animation runs). Pauses while the tab is hidden. */
function stageCanvas(cv, signal, paint) {
  const g = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1, dirty = true, anim = null, pal = readPal();
  const resize = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; w = r.width; h = r.height; dpr = Math.min(2, globalThis.devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); dirty = true; };
  const ro = new ResizeObserver(resize); ro.observe(cv); onAbort(signal, () => ro.disconnect());
  const theme = () => { pal = readPal(); dirty = true; };
  const mo = new MutationObserver(theme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); onAbort(signal, () => mo.disconnect());
  on(matchMedia('(prefers-color-scheme: dark)'), 'change', theme, signal);
  resize();
  loop(now => {
    if (document.hidden) return;
    if (anim && anim(now) === false) anim = null;
    if (anim) dirty = true;
    if (!dirty || !w) return;
    dirty = false;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); D.background(g, w, h, pal); paint(g, w, h, pal);
  }, signal);
  return { redraw() { dirty = true; }, animate(fn) { anim = fn; dirty = true; }, stopAnim() { anim = null; }, get animating() { return !!anim; }, get pal() { return pal; }, get size() { return [w, h]; }, toLocal(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; } };
}

export function mount({ root, signal, params }) {
  const lv = level();
  const S = { gallery: [], seen: [], ...store.get(KEY, {}) };
  const save = () => store.set(KEY, S);
  const tab = TABS.find(x => x.id === params[0]) ? params[0] : 'times';
  const shared = params[1] ? A.decodePiece(params[1], b64url) : null;
  if (shared) track('art/open-shared', A.describe(shared));
  root.innerHTML = `<div class="md-wrap ms">
    ${head({ title: 'Mandala Studio', kicker: 'Math you can hang on a wall', intro: t({ explorer: 'Move a slider and watch a pattern bloom. Then press Hear it.', challenger: 'Every picture here is made by a rule you control. Change a number, watch it change, hear it sing, save it as a wallpaper.', pro: 'Modular chords, binomial remainders, digital roots and Śulba rope geometry. Each piece is a parameter set you can animate, sonify, export and share.' }), color: 'coral' })}
    <div class="ms-top"><nav class="ms-tabs" aria-label="Studio rooms">${TABS.map(x => `<a href="#/games/art/${x.id}" ${x.id === tab ? 'aria-current="page"' : ''}><b>${x.name}</b><small>${x.sub}</small></a>`).join('')}</nav>
    <button type="button" class="md-btn ms-surprise">Surprise me</button></div>
    <div class="ms-room"></div>
  </div>`;
  const wrap = root.querySelector('.ms'), room = wrap.querySelector('.ms-room');
  on(wrap.querySelector('.ms-surprise'), 'click', () => {
    const p = A.surprise(rng(seedOf('art-surprise', Date.now())));
    track('art/surprise', A.describe(p));
    location.hash = `#/games/art/${tabOf(p.k)}/${A.encodePiece(p, b64url)}`;
  }, signal);
  ({ times, meru, square, rope, gallery })[tab]();
  track('art/' + tab, 'Studio ' + tab);

  /* ---------- Shared room frame ---------- */
  function frame({ controls, why, label }) {
    room.innerHTML = `
      <section class="ms-stage px-stage">
        <div class="ms-grid">
          <figure class="ms-fig"><canvas class="ms-cv" role="img" aria-label="${esc(label)}"></canvas><figcaption class="ms-cap" aria-live="off"></figcaption></figure>
          <div class="ms-side">${controls}
            <div class="ms-tools">
              <button type="button" class="md-btn md-btn--primary ms-hear" aria-pressed="false"><span class="ms-hear-ic" aria-hidden="true"></span><span class="ms-hear-l">Hear it</span></button>
              <button type="button" class="md-btn ms-save">Save</button>
              <button type="button" class="md-btn ms-share">Share</button>
              <details class="ms-wall"><summary class="md-btn">Wallpaper</summary>
                <div class="ms-wallbox">
                  <fieldset><legend>Size</legend>${Object.keys(WALL).map((k, i) => `<label><input type="radio" name="arSize" value="${k}" ${i === (matchMedia('(max-width: 700px)').matches ? 0 : 1) ? 'checked' : ''}> ${k[0].toUpperCase() + k.slice(1)} <small>${WALL[k].join(' × ')}</small></label>`).join('')}</fieldset>
                  <fieldset><legend>Background</legend><label><input type="radio" name="arBg" value="night" checked> Night</label><label><input type="radio" name="arBg" value="day"> Day</label></fieldset>
                  <button type="button" class="md-btn md-btn--primary ms-download">Download PNG</button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>
      ${why ? `<details class="ms-why"><summary>${why[0]}</summary>${why[1]}</details>` : ''}`;
    return { cv: room.querySelector('.ms-cv'), cap: room.querySelector('.ms-cap'), hearBtn: room.querySelector('.ms-hear') };
  }
  function setHear(btn, on) { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('.ms-hear-l').textContent = on ? 'Stop' : 'Hear it'; }
  /* A background tab keeps the audio clock running, so each room silences itself when the page is hidden */
  function onHide(fn) { on(document, 'visibilitychange', () => { if (document.hidden) fn(); }, signal); }
  /* Save, share and wallpaper for whatever piece getPiece() returns */
  function wireTools(getPiece) {
    on(room.querySelector('.ms-save'), 'click', () => {
      const p = getPiece(), c = A.encodePiece(p, b64url), fresh = !S.gallery.some(x => x.c === c);
      S.gallery = [{ c, at: dayKey() }, ...S.gallery.filter(x => x.c !== c)].slice(0, 40); save();
      if (!fresh) { toast('Already in your gallery'); say(`${A.describe(p)} is already in your gallery`); return; }
      /* only a piece new to the gallery is tracked (and so earns Sparks): saving the same one again pays nothing */
      toast('Saved to your gallery'); say(`Saved ${A.describe(p)} to your gallery`); track('art/save', A.describe(p));
    }, signal);
    on(room.querySelector('.ms-share'), 'click', () => { const p = getPiece(); share({ title: 'Mandala Studio', text: `${A.describe(p)}: a piece I made from math.`, url: shareUrl(`#/games/art/${tabOf(p.k)}/${A.encodePiece(p, b64url)}`) }); }, signal);
    on(room.querySelector('.ms-download'), 'click', () => {
      const p = getPiece(), size = room.querySelector('[name="arSize"]:checked').value, bg = room.querySelector('[name="arBg"]:checked').value;
      try { downloadCanvas(exportCanvas(p, WALL[size], wallPal(readPal(), bg)), `mandala-${p.k}-${size}.png`); }
      catch (e) { toast('The wallpaper could not be made here. Try a smaller size.'); return; }
      toast('Wallpaper saved'); track('art/wallpaper', `${p.k} ${size} ${bg}`);
      room.querySelector('.ms-wall').open = false;
    }, signal);
  }

  /* ======================= Times-table mandala ======================= */
  function times() {
    const nMax = lv === 'explorer' ? 150 : 400, mMax = lv === 'explorer' ? 10 : 99.99;
    let piece = shared?.k === 'times' ? shared : A.cleanPiece({ k: 'times', n: lv === 'explorer' ? 100 : 200, m: 2, p: 2 });
    piece.n = Math.min(piece.n, nMax); piece.m = Math.min(piece.m, mMax);
    let drift = 0, upto = Infinity, hot = -1, ens = null;
    const TRY = lv === 'explorer' ? [2, 3, 4, 5, 6, 10] : [2, 3, 4, 5, 10, 21, 34, 51, 99];
    const { cv, cap, hearBtn } = frame({
      label: 'A times-table mandala',
      controls: `
        <label class="ms-sl"><span>Points around the circle <b class="ms-nv">${piece.n}</b></span><input type="range" class="ms-n" min="10" max="${nMax}" step="1" value="${piece.n}" aria-label="Points"></label>
        <label class="ms-sl"><span>Multiply by <b class="ms-mv">${piece.m.toFixed(2)}</b></span><input type="range" class="ms-m" min="1" max="${mMax}" step="0.01" value="${piece.m}" aria-label="Multiplier"></label>
        <div class="ms-row"><button type="button" class="md-btn ms-drift" aria-pressed="false"><span class="ms-drift-ic" aria-hidden="true"></span> Drift</button>
          <button type="button" class="md-chip ms-nudge" data-d="-1" aria-label="Multiplier minus one">&minus;1</button><button type="button" class="md-chip ms-nudge" data-d="-0.01" aria-label="Multiplier minus a hundredth">&minus;.01</button><button type="button" class="md-chip ms-nudge" data-d="0.01" aria-label="Multiplier plus a hundredth">+.01</button><button type="button" class="md-chip ms-nudge" data-d="1" aria-label="Multiplier plus one">+1</button></div>
        <div class="ms-row ms-try" role="group" aria-label="Try a multiplier"><span class="px-note">Try</span>${TRY.map(m => `<button type="button" class="md-chip" data-m="${m}">× ${m}</button>`).join('')}</div>
        ${palChips(piece.p)}
        <div class="ms-read" aria-live="off"></div>`,
      why: ['How does a times table draw this?', `<p>Put ${piece.n} points around a circle and number them 0, 1, 2 and so on. For each point k, draw a line to point m × k. When m × k runs past the last point, keep counting around the circle: that is the remainder, m × k mod n.</p>
        <p>With m = 2 the lines wrap into a <b>cardioid</b> (heart-shaped). m = 3 gives a <b>nephroid</b> (kidney-shaped), and in general m gives a curve with m − 1 cusps, an epicycloid: the path of a point on a wheel rolling around another wheel. Between whole numbers the lines slide, which is why Drift looks alive.</p>
        <p>Hear it plays every chord as it is drawn. Long chords sound low and short ones high, like long and short strings.</p>`]
    });
    const view = stageCanvas(cv, signal, (g, w, h, pal) => D.times(g, w, h, pal, piece, { upto, hot }));
    const nIn = room.querySelector('.ms-n'), mIn = room.querySelector('.ms-m'), read = room.querySelector('.ms-read'), driftBtn = room.querySelector('.ms-drift');
    const update = (quiet) => {
      room.querySelector('.ms-nv').textContent = piece.n; room.querySelector('.ms-mv').textContent = piece.m.toFixed(2);
      nIn.value = piece.n; mIn.value = piece.m;
      const name = A.curveName(piece.m, piece.n), k = 7 % piece.n, tg = A.target(k, piece.m, piece.n);
      read.innerHTML = `${name ? `<p class="ms-name"><b>${name.name}</b> <span>${name.note}</span></p>` : ''}<p class="ms-rule">Point <b>${k}</b> joins point <b>${Math.round(tg * 100) / 100}</b> because ${piece.m} × ${k} = ${Math.round(piece.m * k * 100) / 100}${piece.m * k >= piece.n ? `, and around ${piece.n} points that wraps to ${Math.round(tg * 100) / 100}` : ''}.</p>`;
      if (name && !quiet) { const key = 't' + Math.round(piece.m); if (!S.seen.includes(key)) { S.seen.push(key); save(); say(`You found a ${name.name}.`); } }
      cv.setAttribute('aria-label', `Times-table mandala: ${piece.n} points, multiplied by ${piece.m}${name ? ', a ' + name.name : ''}`);
      cap.textContent = `${piece.n} points · × ${piece.m.toFixed(2)}`;
      view.redraw();
    };
    update(true);
    /* Hear it ends when anything else takes over the drawing */
    const stopHear = () => { if (!ens) return; ens.stop(); ens = null; upto = Infinity; hot = -1; setHear(hearBtn, false); view.redraw(); };
    on(nIn, 'input', () => { stopHear(); piece.n = +nIn.value; update(); }, signal);
    on(mIn, 'input', () => { stopHear(); piece.m = +mIn.value; stopDrift(); update(); }, signal);
    on(room, 'click', e => {
      const b = e.target.closest('[data-m]'), nd = e.target.closest('.ms-nudge');
      if (b) { stopDrift(); glide(+b.dataset.m); track('art/try', 'm ' + b.dataset.m); }
      if (nd) { stopHear(); stopDrift(); piece.m = Math.round(Math.min(mMax, Math.max(1, piece.m + +nd.dataset.d)) * 100) / 100; update(); }
    }, signal);
    palWire(p => { piece.p = p; view.redraw(); });
    /* glide smoothly to a new multiplier (instant in reduced motion) */
    const glide = to => {
      stopHear();
      if (reducedMotion()) { piece.m = to; update(); return; }
      const from = piece.m, t0 = globalThis.performance.now(), dur = Math.min(2600, 500 + Math.abs(to - from) * 60);
      view.animate(now => { const x = Math.min(1, (now - t0) / dur), e = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; piece.m = Math.round((from + (to - from) * e) * 100) / 100; update(x < 1); return x < 1; });
    };
    const stopDrift = () => { if (!drift) return; drift = 0; driftBtn.setAttribute('aria-pressed', 'false'); view.stopAnim(); };
    const startDrift = () => {
      stopHear(); drift = 1; driftBtn.setAttribute('aria-pressed', 'true'); let last = globalThis.performance.now();
      view.animate(now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; piece.m = piece.m + dt * 0.12 * drift; if (piece.m > mMax) piece.m = 1; update(true); return !!drift; });
    };
    on(driftBtn, 'click', () => (drift ? stopDrift() : startDrift()), signal);
    /* Hear it: draw chord by chord, each chord a bell */
    on(hearBtn, 'click', () => {
      if (ens) { stopHear(); view.stopAnim(); return; }
      stopDrift(); ens = ensemble(); setHear(hearBtn, true);
      const n = piece.n, dur = Math.min(14, Math.max(5, n * 0.05)), every = Math.max(1, Math.ceil(n / 110)), now = clockOf(ens), t0 = now() + 0.15;
      for (let k = 0; k < n; k += every) ens.bell(A.PENTA[A.chordNote(k, A.target(k, piece.m, n), n)], t0 + (k / n) * dur, 0.1, 1.4);
      ens.bell(A.PENTA[0], t0 + dur + 0.1, 0.12, 3); ens.bell(A.PENTA[4], t0 + dur + 0.16, 0.08, 3); ens.bell(A.PENTA[7], t0 + dur + 0.22, 0.07, 3);
      const mine = ens;
      view.animate(() => {
        if (ens !== mine) return false;
        const x = (now() - t0) / dur; upto = Math.max(0, x * n); hot = x < 1 ? Math.floor(upto) : -1;
        if (x >= 1.05) { upto = Infinity; hot = -1; ens = null; setHear(hearBtn, false); say('The mandala has sung every chord.'); return false; }
      });
      track('art/hear', 'times'); say(`Playing ${n} chords`);
    }, signal);
    onAbort(signal, () => ens && ens.stop());
    onHide(() => { if (ens) { stopHear(); view.stopAnim(); } });
    wireTools(() => ({ ...piece, m: Math.round(piece.m * 100) / 100 }));
    if (!shared && !reducedMotion() && !S.seen.includes('drifted')) { S.seen.push('drifted'); save(); later(startDrift, 900, signal); }
  }

  /* ======================= Meru-prastāra ======================= */
  function meru() {
    const rMax = lv === 'explorer' ? 16 : 64;
    let piece = shared?.k === 'meru' ? shared : A.cleanPiece({ k: 'meru', rows: lv === 'explorer' ? 8 : 32, mod: 2, p: 0 });
    piece.rows = Math.min(piece.rows, rMax);
    let row = -1, diag = -1, upto = Infinity, ens = null, geom = null, values = A.meruRows(64).map(r => r.map(String));
    const { cv, cap, hearBtn } = frame({
      label: 'Meru-prastāra triangle',
      controls: `
        <label class="ms-sl"><span>Rows <b class="ms-rv">${piece.rows}</b></span><input type="range" class="ms-rows" min="4" max="${rMax}" step="1" value="${piece.rows}" aria-label="Rows"></label>
        <div class="ms-row" role="group" aria-label="Color by remainder"><span class="px-note">Color by remainder after dividing by</span>${[2, 3, 4, 5, 6, 7, 8, 9].map(m => `<button type="button" class="md-chip" data-mod="${m}" aria-pressed="${m === piece.mod}">${m}</button>`).join('')}</div>
        ${palChips(piece.p)}
        <div class="ms-row"><span class="px-note">Tap a row to hear it, or</span><button type="button" class="md-chip ms-rowb" data-d="-1" aria-label="Previous row">&uarr;</button><button type="button" class="md-chip ms-rowb" data-d="1" aria-label="Next row">&darr;</button></div>
        <div class="ms-row"><button type="button" class="md-btn ms-diag" aria-pressed="false">Shallow diagonals</button></div>
        <div class="ms-read" aria-live="off"></div>`,
      why: ['Where does this triangle come from?', `<p>Each cell is the sum of the two above it. Piṅgala's <i>Chandaḥśāstra</i>, a work on Sanskrit poetic meter from around the 3rd or 2nd century BCE, gave rules for counting meters that these numbers answer; Halāyudha's 10th century commentary describes the triangle itself and calls it <i>meru-prastāra</i>, the staircase of Mount Meru. The same triangle was studied in Persia and China, and by Blaise Pascal in 17th century France, whose name it carries in many schools.</p>
        <p>Row r, cell k counts the ways to choose k long syllables in a line of r syllables. Color only the remainders after dividing by 2 and the Sierpinski triangle appears: copies of itself inside itself. Prime numbers give the cleanest fractals.</p>
        <p>Add the shallow diagonals and you get 1, 1, 2, 3, 5, 8, 13: the number of rhythms of a given length made of short (1 beat) and long (2 beats) syllables. Virahāṅka (around the 7th century), Gopāla and Hemachandra (12th century) counted them, before Fibonacci's book of 1202.</p>`]
    });
    const view = stageCanvas(cv, signal, (g, w, h, pal) => { geom = D.meru(g, w, h, pal, piece, { upto, row, diag, values }); });
    const read = room.querySelector('.ms-read'), rowsIn = room.querySelector('.ms-rows'), diagBtn = room.querySelector('.ms-diag');
    const update = () => {
      room.querySelector('.ms-rv').textContent = piece.rows;
      cap.textContent = `${piece.rows} rows · remainders mod ${piece.mod}`;
      cv.setAttribute('aria-label', `Meru-prastāra with ${piece.rows} rows, colored by remainder after dividing by ${piece.mod}`);
      view.redraw();
    };
    const showRow = r => {
      const vals = A.meruRows(r + 1)[r];
      read.innerHTML = `<p class="ms-rule">Row ${r}: <span class="ms-nums">${vals.length > 12 ? vals.slice(0, 6).join(', ') + ', …, ' + vals.slice(-3).join(', ') : vals.join(', ')}</span>. ${lv === 'explorer' ? '' : `They add up to 2<sup>${r}</sup> = ${2n ** BigInt(r)}.`}</p>`;
    };
    const showDiag = d => {
      const cells = A.diagonalCells(d), parts = cells.map(([r, i]) => String(A.binom(r, i)));
      const m = A.meters(d);
      read.innerHTML = `<p class="ms-rule">Diagonal ${d}: ${parts.join(' + ')} = <b>${A.diagonalSum(d)}</b></p>
        <p class="ms-meters">Rhythms ${d} beats long from short (S, 1 beat) and long (L, 2 beats) syllables: <b>${m.length}</b>${m.length <= 13 ? ` <span>${m.map(s => `<i>${s.split('').join(' ')}</i>`).join(' ')}</span>` : ''}</p>`;
    };
    const playRow = (r, at, e2, gain = 0.1) => {
      const vals = A.meruRows(r + 1)[r], max = Number(vals[Math.floor(r / 2)]), res = A.meruMod(r + 1, piece.mod)[r];
      vals.forEach((v, i) => e2.bell(A.PENTA[A.noteIndex(Math.log1p(Number(v)) / Math.log1p(max), 1, 13)], at + i * 0.09, res[i] === 0 ? gain * 0.35 : gain, 1.2));
      return vals.length * 0.09;
    };
    /* Hear it ends when a row tap, the diagonals or a new setting takes over */
    const hearing = () => hearBtn.getAttribute('aria-pressed') === 'true';
    const stopHear = () => { if (!hearing()) return; if (ens) ens.stop(); ens = null; upto = Infinity; setHear(hearBtn, false); view.redraw(); };
    const tapRow = r => {
      stopHear(); row = r; diag = -1; diagBtn.setAttribute('aria-pressed', 'false'); showRow(r); view.redraw();
      if (ens) ens.stop();
      ens = ensemble(); playRow(r, clockOf(ens)() + 0.05, ens, 0.12); say(`Row ${r}`);
    };
    update();
    on(rowsIn, 'input', () => { stopHear(); piece.rows = +rowsIn.value; if (row >= piece.rows) row = -1; update(); }, signal);
    on(room, 'click', e => {
      const b = e.target.closest('[data-mod]'), rb = e.target.closest('.ms-rowb');
      if (b) { stopHear(); piece.mod = +b.dataset.mod; room.querySelectorAll('[data-mod]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); update(); track('art/meru-mod', 'mod ' + piece.mod); }
      if (rb) tapRow(Math.max(0, Math.min(piece.rows - 1, (row < 0 ? -1 : row) + +rb.dataset.d)));
    }, signal);
    palWire(p => { piece.p = p; view.redraw(); });
    on(cv, 'pointerdown', e => { if (!geom) return; const [, y] = view.toLocal(e), r = Math.round((y - geom.top) / (geom.s * 0.866)); if (r >= 0 && r < piece.rows) tapRow(r); }, signal);
    on(diagBtn, 'click', () => {
      if (diag >= 0) { diag = -1; diagBtn.setAttribute('aria-pressed', 'false'); read.innerHTML = ''; view.redraw(); return; }
      stopHear(); diagBtn.setAttribute('aria-pressed', 'true'); row = -1; if (piece.rows > 16 && lv !== 'pro') { piece.rows = 12; rowsIn.value = 12; update(); }
      let d = 1; diag = d; showDiag(d); view.redraw();
      const e2 = ensemble(); if (ens) ens.stop(); ens = e2; const now = clockOf(e2);
      const t0 = now(); let last = 0; e2.bell(A.PENTA[3], t0 + 0.05, 0.1);
      view.animate(() => {
        if (ens !== e2 || diag < 0) return false;
        const k = Math.floor((now() - t0) / 1.4) + 1;
        if (k !== last && k <= Math.min(10, piece.rows - 1)) { last = k; diag = k; showDiag(k); const f = Number(A.diagonalSum(k)); e2.bell(A.PENTA[Math.min(14, 2 + k)], now() + 0.02, 0.1, 1.6); say(`Diagonal ${k} adds to ${f}`); }
        return k <= Math.min(10, piece.rows - 1);
      });
      track('art/meru-fib', 'diagonals');
    }, signal);
    on(hearBtn, 'click', () => {
      if (hearing()) { stopHear(); view.stopAnim(); return; }
      if (ens) ens.stop();
      ens = ensemble(); setHear(hearBtn, true); row = -1; diag = -1; diagBtn.setAttribute('aria-pressed', 'false');
      const now = clockOf(ens), t0 = now() + 0.1, R = Math.min(piece.rows, 24), starts = [];
      let at = t0; for (let r = 0; r < R; r++) { starts.push(at); at += playRow(r, at, ens, 0.08) * (r < 6 ? 1.6 : 0.9) + 0.05; }
      const end = at, mine = ens;
      view.animate(() => {
        if (ens !== mine) return false;
        const x = now(); let r = starts.findIndex(s => s > x); if (r < 0) r = R; upto = r < R ? r : Infinity;
        if (x > end + 0.4) { upto = Infinity; setHear(hearBtn, false); ens = null; return false; }
      });
      track('art/hear', 'meru'); say(`Playing ${R} rows, top to bottom`);
    }, signal);
    onAbort(signal, () => ens && ens.stop());
    onHide(() => { if (hearing()) { stopHear(); view.stopAnim(); } else if (ens) { ens.stop(); ens = null; } });
    wireTools(() => ({ ...piece }));
  }

  /* ======================= Digital-root square ======================= */
  function square() {
    let piece = shared?.k === 'square' ? shared : A.cleanPiece({ k: 'square', d: 2, view: 'spiral', a: 90, p: 2 });
    let upto = Infinity, ens = null;
    const { cv, cap, hearBtn } = frame({
      label: 'Digital-root pattern',
      controls: `
        <div class="ms-row ms-seg" role="group" aria-label="View">${[['grid', 'Square'], ['star', 'Star'], ['spiral', 'Spiral']].map(([v, n]) => `<button type="button" class="md-chip" data-view="${v}" aria-pressed="${v === piece.view}">${n}</button>`).join('')}</div>
        <div class="ms-row ms-digits" role="group" aria-label="Digit">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button type="button" class="ms-digit" data-d="${d}" aria-pressed="${d === piece.d}">${d}</button>`).join('')}</div>
        <div class="ms-row ms-angles" role="group" aria-label="Turn angle">${A.ANGLES.map(a => `<button type="button" class="md-chip" data-a="${a}" aria-pressed="${a === piece.a}">${a}°</button>`).join('')}</div>
        ${palChips(piece.p)}
        <div class="ms-read" aria-live="off"></div>`,
      why: ['What is this square?', `<p>Multiply two digits and keep adding the digits of the answer until one digit is left: 7 × 8 = 56, and 5 + 6 = 11, and 1 + 1 = 2. That last digit is the <b>digital root</b>, the remainder after dividing by 9 (with 9 in place of 0). The 9 by 9 table of them is often called the Vedic square; the name is modern, the arithmetic is simple and old.</p>
        <p>Each row repeats with a rhythm. Row 2 goes 2 4 6 8 1 3 5 7 9. Join those digits around a circle of nine points and you get a star. Walk them as steps, turning a fixed angle after each one, and the walk comes home in a closed spiral, the kind of pattern that echoes Islamic geometric art. Rows 3 and 6 only visit 3, 6 and 9, so their shapes are smaller.</p>`]
    });
    const view = stageCanvas(cv, signal, (g, w, h, pal) => D.square(g, w, h, pal, piece, { upto }));
    const read = room.querySelector('.ms-read');
    const update = () => {
      room.querySelector('.ms-angles').hidden = piece.view !== 'spiral';
      const row = A.rowOf(piece.d), tt = A.turtle(piece.d, piece.a);
      read.innerHTML = `<p class="ms-rule">Row ${piece.d}: <span class="ms-nums">${row.join(' ')}</span></p>${piece.view === 'spiral' ? `<p class="px-note">Walk ${row.join(', ')}, turning ${piece.a}° each time. Home after ${tt.reps} round${tt.reps > 1 ? 's' : ''} of the row (${tt.reps * 9} steps), because ${tt.reps} × 9 × ${piece.a}° = ${tt.reps * 9 * piece.a}°, a whole number of turns.</p>` : piece.view === 'star' ? `<p class="px-note">${new Set(row).size === 9 ? 'All nine points are visited.' : `Only ${[...new Set(row)].sort().join(', ')} are visited.`}</p>` : `<p class="px-note">${A.cellsOf(piece.d).length} cells hold a ${piece.d}.</p>`}`;
      cap.textContent = A.describe(piece);
      cv.setAttribute('aria-label', A.describe(piece));
      view.redraw();
    };
    update();
    on(room, 'click', e => {
      const v = e.target.closest('[data-view]'), d = e.target.closest('[data-d]'), a = e.target.closest('[data-a]');
      if (v) { piece.view = v.dataset.view; room.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === v))); }
      else if (d) { piece.d = +d.dataset.d; room.querySelectorAll('[data-d]').forEach(x => x.setAttribute('aria-pressed', String(x === d))); ensemble().bell(A.PENTA[piece.d + 1], 0, 0.1); }
      else if (a) { piece.a = +a.dataset.a; room.querySelectorAll('[data-a]').forEach(x => x.setAttribute('aria-pressed', String(x === a))); }
      else return;
      stopHear(); update(); if (!reducedMotion()) drawIn(false);
    }, signal);
    palWire(p => { piece.p = p; view.redraw(); });
    const steps = () => (piece.view === 'grid' ? A.cellsOf(piece.d).length : piece.view === 'star' ? 9 : A.turtle(piece.d, piece.a).pts.length - 1);
    const digitAt = s => (piece.view === 'grid' ? piece.d : A.rowOf(piece.d)[s % 9]);
    /* draw the path in, with or without sound */
    /* Hear it ends when a new view, digit or angle is picked */
    const stopHear = () => { if (ens) ens.stop(); ens = null; if (hearBtn.getAttribute('aria-pressed') === 'true') { upto = Infinity; setHear(hearBtn, false); view.redraw(); } };
    const drawIn = sound => {
      stopHear();
      ens = sound ? ensemble() : null;
      const n = steps(), per = piece.view === 'spiral' ? Math.max(0.07, Math.min(0.2, 6 / n)) : 0.22, clock = ens ? clockOf(ens) : () => globalThis.performance.now() / 1000, t0 = clock() + 0.08, mine = ens;
      if (ens) for (let s = 0; s < n; s++) ens.bell(A.PENTA[digitAt(s) + 1], t0 + s * per, 0.09, 1.1);
      if (sound) setHear(hearBtn, true);
      view.animate(() => {
        if (sound && ens !== mine) return false;
        const x = (clock() - t0) / per; upto = Math.max(0, x);
        if (x >= n) { upto = Infinity; if (sound) { setHear(hearBtn, false); ens = null; } return false; }
      });
    };
    on(hearBtn, 'click', () => { if (ens) { stopHear(); view.stopAnim(); return; } drawIn(true); track('art/hear', 'square'); say('Playing the path'); }, signal);
    onAbort(signal, () => ens && ens.stop());
    onHide(() => { if (ens) { stopHear(); view.stopAnim(); } });
    wireTools(() => ({ ...piece }));
  }

  /* ======================= Śulba rope and peg ======================= */
  function rope() {
    const SCENES = [
      { id: 'right', name: 'Right angle' }, { id: 'double', name: 'Double a square' },
      ...(lv === 'explorer' ? [] : [{ id: 'diag', name: 'Diagonal rule' }]),
      { id: 'root2', name: 'The √2 rope' }, { id: 'altar', name: 'Your altar' }
    ];
    let scene = shared?.k === 'altar' ? 'altar' : 'right';
    let altarPiece = shared?.k === 'altar' ? shared : A.cleanPiece({ k: 'altar', levels: 4, f: [], p: 2 });
    let brush = 1, mirror = true, hover = -1, ens = null, strings = null;
    const st = { knot: null, snapped: false, built: 0, end: null, doubled: 0, a: 3, b: 2, drag: null, step: 0, len: 1, grow: null };
    const { cv, cap, hearBtn } = frame({
      label: 'Śulba rope geometry',
      controls: `
        <div class="ms-row ms-scenes" role="tablist" aria-label="Constructions">${SCENES.map(s => `<button type="button" role="tab" class="md-chip" data-scene="${s.id}" aria-selected="${s.id === scene}">${s.name}</button>`).join('')}</div>
        <div class="ms-steps"></div>
        <div class="ms-read" aria-live="off"></div>`,
      why: ['What are the Śulba Sūtras?', `<p>The Śulba Sūtras are Indian manuals on building fire altars with a rope (śulba) and pegs, composed from around the 8th to the 5th century BCE; Baudhāyana's is the oldest. Altars had to have exact shapes and areas, so the builders needed right angles, squares of double area, and good values for square roots.</p>
        <p>Baudhāyana states the rule we now call the Pythagorean theorem: the diagonal rope of a rectangle makes as much area as the two sides make separately. He also gives the diagonal of a square as the side increased by its third, plus a fourth of that third, less a thirty-fourth part of that fourth: 1 + 1/3 + 1/12 − 1/408 = 577/408, which is √2 to five decimal places.</p>`]
    });
    const steps = room.querySelector('.ms-steps'), read = room.querySelector('.ms-read');
    let G = null; /* world-to-screen for the current frame */
    const fit = (w, h, minX, maxX, minY, maxY) => { const s = Math.min((w * 0.84) / (maxX - minX), (h * 0.84) / (maxY - minY)), ox = w / 2 - ((minX + maxX) / 2) * s, oy = h / 2 - ((minY + maxY) / 2) * s; return { s, to: ([x, y]) => [ox + x * s, oy + y * s], from: ([x, y]) => [(x - ox) / s, (y - oy) / s] }; };
    const C = pal => ({ ink: A.rgba(pal.ink), soft: A.rgba(pal.ink, 0.12), coral: A.rgba(pal.coral), sun: A.rgba(pal.sun), teal: A.rgba(pal.teal), fill: c => A.rgba(pal[c], pal.dark ? 0.32 : 0.28) });
    const poly = (g, pts, fill, stroke, lw = 2) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...G.to(p)) : g.moveTo(...G.to(p)))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    const text = (g, s, [x, y], pal, size = 15, align = 'center') => { g.fillStyle = A.rgba(pal.ink); g.font = `600 ${size}px Fredoka, "Nunito Sans", sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
    const view = stageCanvas(cv, signal, (g, w, h, pal) => {
      const c = C(pal);
      if (scene === 'altar') { G = D.altar(g, w, h, pal, altarPiece, { hover }); return; }
      if (scene === 'right') {
        G = fit(w, h, -1, 5, -4.6, 1);
        const A0 = [0, 0], B0 = [4, 0];
        g.strokeStyle = c.soft; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(...G.to([-1, 0])); g.lineTo(...G.to([5, 0])); g.stroke(); g.setLineDash([]);
        text(g, 'west', G.to([-0.7, 0.45]), pal, 12); text(g, 'east', G.to([4.7, 0.45]), pal, 12);
        if (st.built) {
          const K = st.knot, u = [(K[0] - B0[0]) / 3, (K[1] - B0[1]) / 3], Cc = [B0[0] + u[0] * 4, B0[1] + u[1] * 4], Dd = [A0[0] + u[0] * 4, A0[1] + u[1] * 4], f = Math.min(1, st.built);
          poly(g, [A0, B0, [B0[0] + (Cc[0] - B0[0]) * f, B0[1] + (Cc[1] - B0[1]) * f], [A0[0] + (Dd[0] - A0[0]) * f, A0[1] + (Dd[1] - A0[1]) * f]], c.fill('sun'), c.ink, 2.5);
          if (f >= 1) { D.peg(g, G.to(Cc), pal); D.peg(g, G.to(Dd), pal); text(g, 'a square on the line', G.to([2, -2]), pal, 16); }
        }
        D.rope(g, G.to(A0), G.to(B0), 4 * G.s, { color: c.teal, width: 4, taut: true });
        D.rope(g, G.to(B0), G.to(st.knot), 3 * G.s, { color: c.coral, width: 4, taut: st.snapped });
        D.rope(g, G.to(st.knot), G.to(A0), 5 * G.s, { color: c.sun, width: 4, taut: st.snapped });
        text(g, '4', G.to([2, 0.45]), pal); text(g, '3', G.to([(B0[0] + st.knot[0]) / 2 + 0.35, (B0[1] + st.knot[1]) / 2]), pal); text(g, '5', G.to([(A0[0] + st.knot[0]) / 2 - 0.3, (A0[1] + st.knot[1]) / 2 - 0.2]), pal);
        if (st.snapped) { const s = 0.4; poly(g, [B0, [B0[0] - s, 0], [B0[0] - s, -s], [B0[0], -s]], null, c.ink, 2); }
        D.peg(g, G.to(A0), pal, { label: 'A' }); D.peg(g, G.to(B0), pal, { label: 'B' }); D.peg(g, G.to(st.knot), pal, { r: 11, hot: !st.snapped });
      } else if (scene === 'double') {
        G = fit(w, h, -0.9, 1.9, -1.9, 0.9);
        /* corners A, B, C, D; the rope runs along the diagonal from D to B, and the square on it has its
           center at C, so it is made of four triangles that each match half the first square */
        const sq = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]], [Ac, Bc, Cc, Dc] = sq, f = Math.min(1, st.doubled);
        poly(g, sq, c.fill('sun'), c.ink, 3);
        if (f > 0) {
          const big = [Dc, Bc, [1.5, -0.5], [0.5, -1.5]].map(([x, y]) => [Cc[0] + (x - Cc[0]) * f, Cc[1] + (y - Cc[1]) * f]);
          for (let i = 0; i < 4; i++) poly(g, [big[i], big[(i + 1) % 4], Cc], c.fill(i % 2 ? 'teal' : 'coral'), c.ink, 1.5);
          poly(g, [Dc, Bc, Ac], null, c.ink, 1.5);
        }
        const end = st.end || [-0.3, 0.3];
        D.rope(g, G.to(Dc), G.to(end), Math.SQRT2 * G.s, { color: c.coral, width: 4, taut: st.doubled > 0 });
        sq.forEach((p, i) => D.peg(g, G.to(p), pal, { label: 'ABCD'[i] }));
        if (!st.doubled) D.peg(g, G.to(end), pal, { r: 11, hot: true });
        if (f >= 1) text(g, 'first square: 2 triangles · square on the diagonal: 4', G.to([0.5, 0.78]), pal, 14);
      } else if (scene === 'diag') {
        const a = st.a, b = st.b, O = [0, 0], X = [a, 0], Y = [0, -b], Z = [a, -b];
        G = st.frozen || fit(w, h, -b - 0.6, a + b + 0.6, -a - b - 0.6, a + 0.6);
        poly(g, [O, X, [a, a], [0, a]], c.fill('coral'), c.ink, 2); text(g, `${a}² = ${a * a}`, G.to([a / 2, a / 2]), pal, 14);
        poly(g, [O, Y, [-b, -b], [-b, 0]], c.fill('teal'), c.ink, 2); text(g, `${b}² = ${b * b}`, G.to([-b / 2, -b / 2]), pal, 14);
        /* the diagonal runs from Y to X, (a, b); (b, -a) points away from O, so the square on it is outward */
        poly(g, [Y, X, [a + b, -a], [b, -b - a]], c.fill('sun'), c.ink, 2.5);
        const cz = [(a + b) / 2, (-b - a) / 2]; text(g, `${a * a + b * b}`, G.to(cz), pal, 16);
        g.setLineDash([6, 5]); poly(g, [O, X, Z, Y], null, c.soft, 2); g.setLineDash([]);
        poly(g, [O, X, Y], c.soft, c.ink, 3);
        g.strokeStyle = c.coral; g.lineWidth = 4; g.beginPath(); g.moveTo(...G.to(Y)); g.lineTo(...G.to(X)); g.stroke();
        D.peg(g, G.to(O), pal); D.peg(g, G.to(X), pal); D.peg(g, G.to(Y), pal); D.peg(g, G.to(Z), pal, { r: 11, hot: true });
      } else {
        G = fit(w, h, -0.15, 1.6, -1.2, 0.2);
        const len = st.len, ang = -Math.PI / 4, tip = [Math.cos(ang) * len, Math.sin(ang) * len], Cc = [1, -1];
        poly(g, [[0, 0], [1, 0], [1, -1], [0, -1]], c.fill('sun'), c.ink, 3);
        g.strokeStyle = c.soft; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(...G.to([0, 0])); g.lineTo(...G.to(Cc)); g.stroke(); g.setLineDash([]);
        g.strokeStyle = c.coral; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(...G.to([0, 0])); g.lineTo(...G.to(tip)); g.stroke();
        /* knots where each part was added */
        A.SQRT2_STEPS.slice(1, st.step + 1).forEach(s => { const p = [Math.cos(ang) * s.value, Math.sin(ang) * s.value]; g.beginPath(); g.arc(...G.to(p), 5, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill(); });
        D.peg(g, G.to([0, 0]), pal, { label: 'A' }); D.peg(g, G.to(Cc), pal, { label: 'C' });
        /* the magnifier: zoom on the corner so the gap stays visible */
        const gap = Math.abs(len - Math.SQRT2), zoom = Math.min(200000, Math.max(1.5, 0.12 / Math.max(gap, 1e-7)));
        const [mx, my] = G.to([1.32, -0.12]), R = Math.min(w, h) * 0.17, [cx0, cy0] = G.to(Cc);
        g.save(); g.beginPath(); g.arc(mx, my, R, 0, Math.PI * 2); g.fillStyle = A.rgba(pal.bg); g.fill(); g.clip();
        const Z = (p) => [mx + (p[0] - Cc[0]) * G.s * zoom * 0.7, my + (p[1] - Cc[1]) * G.s * zoom * 0.7];
        g.strokeStyle = c.soft; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(...Z([0.9, -0.9])); g.lineTo(...Z([1.1, -1.1])); g.stroke(); g.setLineDash([]);
        g.strokeStyle = c.coral; g.lineWidth = 6; g.beginPath(); g.moveTo(...Z([tip[0] - 0.2, tip[1] + 0.2])); g.lineTo(...Z(tip)); g.stroke();
        g.beginPath(); g.arc(...Z(Cc), 7, 0, Math.PI * 2); g.fillStyle = c.sun; g.fill(); g.strokeStyle = c.ink; g.lineWidth = 2; g.stroke();
        g.restore();
        g.beginPath(); g.arc(mx, my, R, 0, Math.PI * 2); g.strokeStyle = c.ink; g.lineWidth = 2.5; g.stroke();
        g.strokeStyle = c.soft; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(mx - R * 0.7, my + R * 0.7); g.stroke();
        text(g, `zoom × ${zoom >= 1000 ? Math.round(zoom).toLocaleString() : Math.round(zoom)}`, [mx, my + R + 16], pal, 13);
      }
    });
    const hit = (e) => { const [x, y] = view.toLocal(e); return G ? G.from ? G.from([x, y]) : G.unmap(x, y) : [0, 0]; };
    const near = (p, q, r = 0.35) => Math.hypot(p[0] - q[0], p[1] - q[1]) < r;
    const pluckChord = lens => { const e2 = ensemble(), t0 = clockOf(e2)() + 0.02; lens.forEach((L, i) => e2.pluck(1320 / L, t0 + i * 0.12, 0.12, 1.8)); };

    const setScene = id => {
      scene = id; P_stopStrings();
      room.querySelectorAll('[data-scene]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.scene === id)));
      Object.assign(st, { frozen: null, knot: [2.6, -1.4], snapped: false, built: 0, end: null, doubled: 0, a: 3, b: 2, drag: null, step: 0, len: 1 });
      read.innerHTML = '';
      if (id === 'right') {
        steps.innerHTML = `<p class="ms-task">${t({ explorer: 'A rope with knots at 3, 4 and 5. Two pegs hold the 4 along the east-west line. Drag the last knot until both ropes are tight.', challenger: 'Pegs A and B hold 4 units of a 12-unit rope on the east-west line. Drag the knot until the 3 and the 5 are both taut.', pro: 'Stretch a 3 + 4 + 5 rope from two pegs. Drag the knot until both free sides are taut.' })}</p>
          <div class="ms-row"><button type="button" class="md-btn md-btn--sm ms-snap">Snap the knot</button><button type="button" class="md-btn md-btn--sm ms-build" disabled>Build the square</button></div>`;
        cap.textContent = 'Rope of 3 + 4 + 5';
      } else if (id === 'double') {
        steps.innerHTML = `<p class="ms-task">${t({ explorer: 'The rope is tied at corner D. Drag its end to the far corner B.', challenger: 'A rope is tied at corner D. Stretch it along the diagonal to B, then see the square built on that rope.', pro: 'Stretch the diagonal from D to B and build the square on it.' })}</p><div class="ms-row"><button type="button" class="md-btn md-btn--sm ms-snap">Stretch it for me</button></div>`;
        cap.textContent = 'A square and its diagonal';
      } else if (id === 'diag') {
        steps.innerHTML = `<p class="ms-task">Drag the corner of the rectangle. The squares on the two sides always add up to the square on the diagonal. Can you find rectangles whose diagonal is a whole number?</p><div class="ms-row"><button type="button" class="md-chip ms-ab" data-k="a" data-d="-1" aria-label="Shorter width">a &minus;</button><button type="button" class="md-chip ms-ab" data-k="a" data-d="1" aria-label="Longer width">a +</button><button type="button" class="md-chip ms-ab" data-k="b" data-d="-1" aria-label="Shorter height">b &minus;</button><button type="button" class="md-chip ms-ab" data-k="b" data-d="1" aria-label="Longer height">b +</button></div>`;
        diagRead();
      } else if (id === 'root2') {
        steps.innerHTML = `<p class="ms-task">${t({ explorer: 'The rope starts as long as the side. Make it reach the far corner C, one piece at a time.', challenger: 'Lay a rope as long as the side along the diagonal. Baudhāyana tells you how much to add. Press each step.', pro: 'Build Baudhāyana\'s diagonal: 1 + 1/3 + 1/(3·4) − 1/(3·4·34).' })}</p>
          <ol class="ms-root">${A.SQRT2_STEPS.slice(1).map((s, i) => `<li><button type="button" class="md-btn md-btn--sm ms-add" data-step="${i + 1}" ${i ? 'disabled' : ''}>${['Add a third', 'Add a fourth of that third', 'Take away a 34th of that fourth'][i]}</button></li>`).join('')}</ol>
          <div class="ms-row"><button type="button" class="md-btn md-btn--sm ms-beat" aria-pressed="false">Hear the gap</button><button type="button" class="md-btn md-btn--sm ms-reset">Start over</button></div>`;
        rootRead();
      } else {
        steps.innerHTML = `<p class="ms-task">Each square inside is half the one around it: the doubling, run backwards. Pick a color and tap the altar. With a keyboard, arrows pick a piece and Enter paints it.</p>
          <div class="ms-row ms-brushes" role="radiogroup" aria-label="Color">${[[1, 'coral'], [2, 'sun'], [3, 'teal'], [4, 'ink'], [0, 'clear']].map(([v, n]) => `<button type="button" role="radio" class="ms-brush ms-brush--${n}" data-b="${v}" aria-checked="${v === brush}" aria-label="${n}">${n === 'clear' ? 'clear' : ''}</button>`).join('')}</div>
          <div class="ms-row"><button type="button" class="md-chip ms-mirror" aria-pressed="${mirror}">Mirror all four</button><button type="button" class="md-chip ms-lv" data-d="-1" aria-label="Fewer squares">&minus; square</button><button type="button" class="md-chip ms-lv" data-d="1" aria-label="More squares">+ square</button><button type="button" class="md-chip ms-fill">Fill for me</button></div>`;
        cap.textContent = A.describe(altarPiece);
      }
      cv.setAttribute('aria-label', `Rope construction: ${SCENES.find(s => s.id === id).name}${id === 'altar' ? '. Arrow keys pick a piece, Enter paints it.' : ''}`); hover = -1;
      room.querySelectorAll('.ms-save, .ms-share, .ms-wall').forEach(x => { x.hidden = id !== 'altar'; });
      view.redraw();
    };
    const diagRead = () => { const c = A.isTriple(st.a, st.b), d = Math.hypot(st.a, st.b); read.innerHTML = `<p class="ms-rule">${st.a}² + ${st.b}² = ${st.a * st.a} + ${st.b * st.b} = <b>${st.a * st.a + st.b * st.b}</b> = (diagonal)²</p><p class="${c ? 'ms-yes' : 'px-note'}">${c ? `The diagonal is exactly <b>${c}</b>. A whole-number triple, like the ones in the Śulba texts: ${st.a}, ${st.b}, ${c}.` : `The diagonal is about ${d.toFixed(3)}.`}</p>`; cap.textContent = `${st.a} by ${st.b}`; };
    const rootRead = () => {
      const s = A.SQRT2_STEPS[st.step], err = Math.abs(s.value - Math.SQRT2);
      read.innerHTML = `<table class="ms-table"><tbody>${A.SQRT2_STEPS.slice(0, st.step + 1).map((x, i) => `<tr${i === st.step ? ' class="is-now"' : ''}><td>${i ? esc(x.add) : 'Start with the side'}</td><td class="ms-mono">${x.value.toFixed(7)}</td>${lv === 'pro' ? `<td class="ms-mono">${x.frac[0]}/${x.frac[1]}</td>` : ''}</tr>`).join('')}<tr class="ms-true"><td>The true diagonal √2</td><td class="ms-mono">${Math.SQRT2.toFixed(7)}</td>${lv === 'pro' ? '<td></td>' : ''}</tr></tbody></table>
        <p class="${st.step === 3 ? 'ms-yes' : 'px-note'}">${st.step === 3 ? `Off by ${err.toFixed(7)}: about 1 part in ${Math.round(Math.SQRT2 / err).toLocaleString()}. On a 10 metre altar that is about a fiftieth of a millimetre.${lv === 'pro' ? ' And 577² − 2 × 408² = 1, which is why this fraction is so close.' : ''}` : `The gap is ${err.toFixed(4)}.`}</p>`;
      cap.textContent = `Rope ${s.value.toFixed(5)}`;
      if (strings) strings.set(330, A.ropePitch(st.len));
      const b = room.querySelector('.ms-beat'); if (b && strings) b.textContent = `Gap: ${A.beatRate(st.len).toFixed(st.step === 3 ? 4 : 2)} beats a second`;
    };
    const P_stopStrings = () => {
      if (strings) { strings.stop(); strings = null; }
      const b = room.querySelector('.ms-beat'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = 'Hear the gap'; }
    };
    onAbort(signal, P_stopStrings);
    onHide(P_stopStrings);
    const snapRight = () => {
      const pts = A.taut([0, 0], 5, [4, 0], 3); st.knot = pts.sort((p, q) => p[1] - q[1])[0]; st.snapped = true;
      pluckChord([3, 4, 5]); room.querySelector('.ms-build').disabled = false;
      read.innerHTML = `<p class="ms-yes"><b>A right angle at B.</b> ${lv === 'explorer' ? 'The rope made a perfect corner.' : `3² + 4² = 9 + 16 = 25 = 5², so the angle at B is exactly ${Math.round(A.angleAt([4, 0], [0, 0], st.knot))}°.`} Hear the three sides: shorter ropes sing higher.</p>`;
      say('Taut. A right angle at B.'); track('art/rope-right', 'snap'); view.redraw();
    };
    const doubleIt = () => {
      st.end = [0.5, 0.5]; st.doubled = 0.001; pluckChord([Math.SQRT2 * 3]);
      const t0 = globalThis.performance.now();
      view.animate(now => { st.doubled = reducedMotion() ? 1 : Math.min(1, (now - t0) / 1400); if (st.doubled >= 1) { read.innerHTML = `<p class="ms-yes"><b>The square on the diagonal is double the first square.</b> The first square is 2 triangles; the new one is 4 of the same triangles.</p>`; say('The square on the diagonal is double.'); confetti(30); return false; } });
      track('art/rope-double', 'double');
    };
    /* dragging */
    on(cv, 'pointerdown', e => {
      const p = hit(e);
      if (scene === 'altar') { paintAt(p); return; }
      if (scene === 'right' && !st.snapped && near(p, st.knot, 0.7)) st.drag = 'knot';
      if (scene === 'double' && !st.doubled) st.drag = 'end';
      if (scene === 'diag') { st.drag = 'corner'; st.frozen = G; st.from = p; st.ab = [st.a, st.b]; }
      if (st.drag) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
    }, signal);
    on(cv, 'pointermove', e => {
      const p = hit(e);
      if (scene === 'altar') { const i = regionAt(p); if (i !== hover) { hover = i; view.redraw(); } return; }
      if (!st.drag) return;
      if (st.drag === 'knot') { st.knot = A.reach(p, [0, 0], 5, [4, 0], 3); if (A.isTaut(st.knot, [0, 0], 5, [4, 0], 3, 0.03) && st.knot[1] < 0) { st.drag = null; snapRight(); } }
      if (st.drag === 'end') { st.end = A.reach(p, [-0.5, -0.5], Math.SQRT2, [-0.5, -0.5], Math.SQRT2); if (near(st.end, [0.5, 0.5], 0.1)) { st.drag = null; doubleIt(); } }
      if (st.drag === 'corner') { const a = Math.max(1, Math.min(12, st.ab[0] + Math.round(p[0] - st.from[0]))), b = Math.max(1, Math.min(12, st.ab[1] + Math.round(st.from[1] - p[1]))); if (a !== st.a || b !== st.b) { st.a = a; st.b = b; diagRead(); const c = A.isTriple(a, b); if (c) { pluckChord([a, b, c].map(x => x / 2)); say(`${a}, ${b}, ${c}: a whole-number triple`); } } }
      view.redraw();
    }, signal);
    const up = () => { st.drag = null; if (st.frozen) { st.frozen = null; view.redraw(); } };
    on(cv, 'pointerup', up, signal); on(cv, 'pointercancel', up, signal);
    on(cv, 'pointerleave', () => { if (hover >= 0) { hover = -1; view.redraw(); } }, signal);
    on(cv, 'blur', () => { if (hover >= 0) { hover = -1; view.redraw(); } }, signal);
    /* keyboard: arrows move the knot or the corner when the canvas has focus */
    cv.tabIndex = 0;
    on(cv, 'keydown', e => {
      /* on the altar, arrows walk from region to region and Enter or Space paints the one outlined */
      if (scene === 'altar') {
        const n = A.altar(altarPiece.levels).length, step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) { e.preventDefault(); hover = hover < 0 ? (step > 0 ? 0 : n - 1) : (hover + step + n) % n; const r = A.altar(altarPiece.levels)[hover]; say(r.ring === altarPiece.levels ? 'The center square' : `Ring ${r.ring + 1}, triangle ${r.i + 1}`); view.redraw(); }
        else if ((e.key === 'Enter' || e.key === ' ') && hover >= 0) { e.preventDefault(); paintRegion(hover); }
        return;
      }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault();
      if (scene === 'right' && !st.snapped) { st.knot = A.reach([st.knot[0] + d[0] * 0.1, st.knot[1] + d[1] * 0.1], [0, 0], 5, [4, 0], 3); if (A.isTaut(st.knot, [0, 0], 5, [4, 0], 3, 0.03) && st.knot[1] < 0) snapRight(); view.redraw(); }
      if (scene === 'diag') { st.a = Math.max(1, Math.min(12, st.a + d[0])); st.b = Math.max(1, Math.min(12, st.b - d[1])); diagRead(); view.redraw(); }
    }, signal);
    /* buttons inside the steps panel */
    on(steps, 'click', e => {
      const b = e.target;
      if (b.closest('.ms-snap')) { if (scene === 'right' && !st.snapped) snapRight(); if (scene === 'double' && !st.doubled) doubleIt(); }
      if (b.closest('.ms-build')) {
        const t0 = globalThis.performance.now(); st.built = 0.001;
        view.animate(now => { st.built = reducedMotion() ? 1 : Math.min(1, (now - t0) / 1200); if (st.built >= 1) { pluckChord([4, 4, 4]); read.innerHTML += '<p class="px-note">Ropes of 4 from each end meet at the last corner: a square, built with nothing but rope and pegs.</p>'; return false; } });
      }
      const ab = b.closest('.ms-ab'); if (ab) { st[ab.dataset.k] = Math.max(1, Math.min(12, st[ab.dataset.k] + +ab.dataset.d)); diagRead(); const c = A.isTriple(st.a, st.b); if (c) pluckChord([st.a, st.b, c].map(x => x / 2)); view.redraw(); }
      const add = b.closest('.ms-add');
      if (add) {
        const k = +add.dataset.step, from = st.len, to = A.SQRT2_STEPS[k].value, t0 = globalThis.performance.now();
        add.disabled = true; st.step = k; const nx = steps.querySelector(`[data-step="${k + 1}"]`); if (nx) nx.disabled = false;
        view.animate(now => { const x = reducedMotion() ? 1 : Math.min(1, (now - t0) / 900); st.len = from + (to - from) * (1 - (1 - x) ** 3); if (strings) strings.set(330, A.ropePitch(st.len)); if (x >= 1) { rootRead(); return false; } });
        const e2 = ensemble(); e2.pluck(A.ropePitch(to) / 2, 0, 0.12, 1.4);
        say(`${A.SQRT2_STEPS[k].add}: ${to.toFixed(6)}`);
        if (k === 3) { confetti(40); track('art/rope-root2', 'done'); }
      }
      if (b.closest('.ms-reset')) setScene('root2');
      const beat = b.closest('.ms-beat');
      if (beat) {
        if (strings) { P_stopStrings(); return; }
        strings = twoStrings(); strings.set(330, A.ropePitch(st.len)); beat.setAttribute('aria-pressed', 'true'); rootRead();
        toast('One string is the true diagonal, one is the rope. The wobble is the gap.');
      }
      const br = b.closest('[data-b]'); if (br) { brush = +br.dataset.b; steps.querySelectorAll('[data-b]').forEach(x => x.setAttribute('aria-checked', String(x === br))); }
      if (b.closest('.ms-mirror')) { mirror = !mirror; b.closest('.ms-mirror').setAttribute('aria-pressed', String(mirror)); }
      const lvb = b.closest('.ms-lv'); if (lvb) { altarPiece = A.cleanPiece({ ...altarPiece, levels: altarPiece.levels + +lvb.dataset.d }); hover = -1; cap.textContent = A.describe(altarPiece); view.redraw(); }
      if (b.closest('.ms-fill')) { const r = rng(seedOf('altar', Date.now())); const cols = [1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3), 4, 0]; altarPiece.f = A.altar(altarPiece.levels).map(reg => cols[(reg.ring + (reg.ring === altarPiece.levels ? 1 : 0)) % cols.length]); view.redraw(); }
    }, signal);
    const regionAt = p => { const regs = A.altar(altarPiece.levels); for (let i = regs.length - 1; i >= 0; i--) if (A.inPoly(p[0], p[1], regs[i].pts)) return i; return -1; };
    const paintAt = p => paintRegion(regionAt(p));
    const paintRegion = i => {
      if (i < 0) return;
      const regs = A.altar(altarPiece.levels), ring = regs[i].ring;
      regs.forEach((r, j) => { if (j === i || (mirror && r.ring === ring)) altarPiece.f[j] = brush; });
      ensemble().bell(A.PENTA[Math.min(14, 2 + ring * 2)], 0, 0.1, 1.2);
      say(`Painted ${mirror ? 'ring ' + (ring + 1) : 'a triangle'}`); view.redraw();
    };
    on(room.querySelector('.ms-scenes'), 'click', e => { const b = e.target.closest('[data-scene]'); if (b) setScene(b.dataset.scene); }, signal);
    /* Hear it: the scene's rope as music */
    on(hearBtn, 'click', () => {
      if (scene === 'right') pluckChord([3, 4, 5]);
      else if (scene === 'double') pluckChord([1, Math.SQRT2].map(x => x * 2.5));
      else if (scene === 'diag') pluckChord([st.a, st.b, Math.hypot(st.a, st.b)].map(x => x / 2));
      else if (scene === 'root2') pluckChord([Math.SQRT2 * 3, st.len * 3]);
      else { const e2 = ensemble(), t0 = clockOf(e2)() + 0.05; for (let k = 0; k <= altarPiece.levels; k++) e2.bell(A.PENTA[Math.min(14, 2 + k * 2)], t0 + k * 0.3, 0.11, 2); }
      track('art/hear', 'rope ' + scene);
    }, signal);
    hearBtn.querySelector('.ms-hear-l').textContent = 'Hear it';
    wireTools(() => ({ ...altarPiece }));
    setScene(scene);
  }

  /* ======================= Gallery ======================= */
  function gallery() {
    room.innerHTML = `<section class="ms-gal">
      ${S.gallery.length ? `<p class="px-note">Saved on this device. Each piece is kept as its numbers and drawn fresh.</p><ul class="ms-gl">${S.gallery.map((x, i) => { const p = A.decodePiece(x.c, b64url); return p ? `<li><a class="ms-gi" href="#/games/art/${tabOf(p.k)}/${x.c}"><canvas width="240" height="240" data-i="${i}" aria-hidden="true"></canvas><span>${esc(A.describe(p))}</span></a><button type="button" class="ms-gdel" data-del="${i}" aria-label="Delete ${esc(A.describe(p))}">&times;</button></li>` : ''; }).join('')}</ul>`
        : `<div class="ms-empty px-stage"><p class="md-lede">Nothing saved yet.</p><p>Make a mandala, press Save, and it lands here. Or let the studio pick one for you.</p><div class="px-row"><a class="md-btn md-btn--primary" href="#/games/art">Make a mandala</a></div></div>`}
    </section>`;
    const paintAll = () => {
      const pal = readPal();
      room.querySelectorAll('canvas[data-i]').forEach(cv => {
        const p = A.decodePiece(S.gallery[+cv.dataset.i].c, b64url); if (!p) return;
        const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); D.background(g, 240, 240, pal); DRAW[p.k](g, 240, 240, pal, p, { scale: 0.6 });
      });
    };
    paintAll();
    const mo = new MutationObserver(paintAll); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); onAbort(signal, () => mo.disconnect());
    on(matchMedia('(prefers-color-scheme: dark)'), 'change', paintAll, signal);
    on(room, 'click', e => { const d = e.target.closest('[data-del]'); if (d) { S.gallery.splice(+d.dataset.del, 1); save(); gallery(); toast('Removed'); } }, signal);
  }

  /* ---------- Palette chips ---------- */
  function palChips(p) { return `<div class="ms-row ms-pals" role="radiogroup" aria-label="Colors">${A.PALETTES.map((x, i) => `<button type="button" role="radio" class="ms-pal ms-pal--${x.id}" data-pal="${i}" aria-checked="${i === p}"><i aria-hidden="true"></i>${x.name}</button>`).join('')}</div>`; }
  function palWire(set) { on(room.querySelector('.ms-pals'), 'click', e => { const b = e.target.closest('[data-pal]'); if (!b) return; room.querySelectorAll('[data-pal]').forEach(x => x.setAttribute('aria-checked', String(x === b))); set(+b.dataset.pal); }, signal); }
}

/* A wallpaper: the piece centered on a large canvas, with a quiet caption */
function exportCanvas(p, [W, H], pal) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), side = Math.min(W, H) * (W < H ? 0.9 : 0.8), scale = side / 560;
  D.background(g, W, H, pal);
  g.save(); g.translate((W - side) / 2, (H - side) / 2 - (W < H ? H * 0.04 : 0));
  DRAW[p.k](g, side, side, pal, p, { scale });
  g.restore();
  g.fillStyle = A.rgba(pal.muted, 0.9); g.font = `600 ${Math.round(Math.min(W, H) * 0.022)}px Fredoka, "Nunito Sans", sans-serif`; g.textAlign = 'center';
  g.fillText(`${A.describe(p)} · Vedic Math`, W / 2, H - Math.min(W, H) * (W < H ? 0.1 : 0.05));
  return cv;
}
