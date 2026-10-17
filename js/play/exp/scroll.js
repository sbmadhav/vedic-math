/* The Lost Śulba Scroll (#/sutras/lost-scroll): an illustrated math mystery in six chapters, one opening each week
   from launch. Routes: #/sutras/lost-scroll (the map), #/sutras/lost-scroll/<n> (a chapter), #/sutras/lost-scroll/preview[/<n>] (a dev
   bypass that opens every chapter; clearly labeled and not linked anywhere). Logic in scroll-core.js. */
import { level, store, LAUNCH, dayNumber, tone, sfx, PENTA, say, confetti, track, reducedMotion, esc, share, shareUrl, backLink } from '../kit.js';
import { on, later, every, child } from '../life.js';
import * as S from './scroll-core.js';
import { SCENES, SCENE_LABEL, scrollPieces, GLYPHS } from './scroll-art.js';

const KEY = 'scroll';
const SIDE = ['coral', 'teal', 'sun'];

export function mount({ root, signal, params }) {
  const lv = level();
  const P = store.get(KEY, null) || {};
  P.solved = P.solved || {}; P.pieces = P.pieces || [];
  const preview = params[0] === 'preview';
  /* Preview opens every chapter for testing, so nothing solved there is saved or counted (no Sparks) */
  const save = () => { if (!preview) store.set(KEY, P); };
  const count = (action, title) => { if (!preview) track(action, title); };
  const base = preview ? '#/sutras/lost-scroll/preview' : '#/sutras/lost-scroll';
  const day = dayNumber();
  const canOpen = n => preview || S.isOpen(n, day);
  const wrap = document.createElement('div'); wrap.className = 'md-wrap sc'; root.append(wrap);
  const banner = preview ? '<p class="sc-preview" role="note"><b>Preview mode.</b> Every chapter is open for testing, and nothing solved here is saved. Players see one new chapter each week.</p>' : '';
  if (preview) track('scroll/preview', 'Scroll preview');
  const want = +(preview ? params[1] : params[0]);
  if (want && S.chapter(want) && canOpen(want)) return play(S.chapter(want));
  return map(want && S.chapter(want) ? want : 0);

  /* ---------- The chapter map ---------- */
  function map(blocked) {
    const nextN = S.CHAPTERS.find(c => !canOpen(c.n))?.n;
    const all = P.pieces.length === 6;
    wrap.innerHTML = `
      <div class="px-head px-head--sun">
        ${backLink()}
        <p class="md-kicker">A math mystery in six chapters</p>
        <h1 class="md-heading px-title">The Lost Śulba Scroll</h1>
        <p class="md-lede px-intro">${esc(lv === 'explorer' ? 'An old scroll of rope magic was torn into six pieces and hidden. Solve the number puzzles to find every piece.' : 'An old scroll of rope geometry has been torn into six pieces and hidden across a riverside town. Each hiding place is locked with real Indian mathematics. Find them all.')}</p>
      </div>
      ${banner}
      <figure class="sc-map-scroll${all ? ' is-whole' : ''}">${scrollPieces(P.pieces, GLYPHS)}<figcaption>${all ? 'The scroll is whole again. You did it.' : `${P.pieces.length} of 6 pieces found`}</figcaption></figure>
      ${blocked ? `<p class="sc-blocked" role="status">Chapter ${blocked} is still sealed. It opens on ${fmtDate(S.openKey(blocked, LAUNCH))}.</p>` : ''}
      <ol class="sc-chapters">${S.CHAPTERS.map(c => {
        const open = canOpen(c.n), ps = S.puzzlesFor(c.n, lv), got = ps.filter(p => P.solved[`${lv}:${p.id}`]).length, done = P.pieces.includes(c.n);
        const inner = `<span class="sc-ch-n">Chapter ${c.n}</span>
          <span class="sc-ch-art" aria-hidden="true"><svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice">${SCENES[c.scene]}</svg></span>
          <b>${open ? esc(c.title) : 'Sealed'}</b>
          <span class="sc-ch-place">${open ? esc(c.place) : `Opens ${fmtDate(S.openKey(c.n, LAUNCH))}`}</span>
          ${open ? `<span class="sc-pips" aria-label="${got} of ${ps.length} puzzles solved">${ps.map(p => `<i class="${P.solved[`${lv}:${p.id}`] ? 'is-on' : ''}"></i>`).join('')}</span>` : `<span class="sc-seal" aria-hidden="true">${lockSvg()}</span>`}
          ${done ? '<span class="sc-ch-done">Piece found</span>' : ''}`;
        return `<li>${open ? `<a class="sc-ch sc-ch--${c.color}${done ? ' is-done' : ''}" href="${base}/${c.n}">${inner}</a>` : `<div class="sc-ch is-sealed" aria-label="Chapter ${c.n}, sealed until ${fmtDate(S.openKey(c.n, LAUNCH))}">${inner}</div>`}</li>`;
      }).join('')}</ol>
      ${nextN ? `<p class="sc-next" aria-live="off">Chapter ${nextN} opens in <b class="sc-count"></b>. A new chapter every week.</p>` : ''}
      <p class="px-note sc-honest">The story and its people are made up. The mathematics is real: Katapayadi and bhūta-saṅkhyā number words, the rope geometry of the Śulba Sūtras (appendices to the Kalpa Sūtras from the late Vedic period), Piṅgala's syllable lists and the Meru-prastāra described by Halāyudha. Each puzzle tells you its history once you solve it.</p>`;
    if (nextN) {
      const el = wrap.querySelector('.sc-count'), key = S.openKey(nextN, LAUNCH);
      const tick = () => { el.textContent = S.countdown(S.msUntil(key)); };
      tick(); every(tick, 30000, signal);
    }
    if (blocked) say(`Chapter ${blocked} is still sealed.`);
  }
  function lockSvg() { return '<svg viewBox="0 0 64 64"><path class="sc-seal-sh" d="M20 30V20a12 12 0 0 1 24 0v10"/><rect class="sc-seal-body" x="12" y="28" width="40" height="30" rx="8"/></svg>'; }
  function fmtDate(key) { return new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

  /* ---------- A chapter ---------- */
  function play(ch) {
    const ps = S.puzzlesFor(ch.n, lv);
    const solvedHere = () => ps.filter(p => P.solved[`${lv}:${p.id}`]).length;
    let at = Math.min(ps.findIndex(p => !P.solved[`${lv}:${p.id}`]), ps.length - 1);
    if (at < 0) at = ps.length - 1;
    const story = ch.story[lv] || ch.story.challenger;
    const next = S.chapter(ch.n + 1);
    wrap.innerHTML = `
      <div class="px-head px-head--${ch.color} sc-head">
        <a class="px-back" href="${base}">&larr; The scroll map</a>
        <p class="md-kicker">Chapter ${ch.n} · ${esc(ch.place)}</p>
        <h1 class="md-heading px-title">${esc(ch.title)}</h1>
      </div>
      ${banner}
      <figure class="sc-scene sc-scene--${ch.scene}"><svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(SCENE_LABEL[ch.scene])}">${SCENES[ch.scene]}</svg></figure>
      <div class="sc-story">${story.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <nav class="sc-steps" aria-label="Puzzles in this chapter"></nav>
      <section class="sc-puzzle px-stage" aria-live="off"></section>
      <section class="sc-end" hidden></section>`;
    const $ = s => wrap.querySelector(s);
    const box = $('.sc-puzzle');
    const steps = () => {
      $('.sc-steps').innerHTML = ps.map((p, i) => {
        const done = P.solved[`${lv}:${p.id}`], reach = i === 0 || P.solved[`${lv}:${ps[i - 1].id}`] || done;
        return `<button type="button" class="sc-step${i === at ? ' is-now' : ''}${done ? ' is-done' : ''}" data-step="${i}" ${reach ? '' : 'disabled'} ${i === at ? 'aria-current="step"' : ''} aria-label="Puzzle ${i + 1}: ${esc(p.title)}${done ? ', solved' : ''}"><i>${done ? '✓' : i + 1}</i><span>${esc(p.title)}</span></button>`;
      }).join('');
    };
    on($('.sc-steps'), 'click', e => { const b = e.target.closest('[data-step]'); if (b && !b.disabled) { at = +b.dataset.step; steps(); show(); } }, signal);

    let pctl = null;
    function show() {
      if (pctl) pctl.abort();
      pctl = child(signal);
      const sig = pctl.signal, p = ps[at], solved = !!P.solved[`${lv}:${p.id}`];
      let hint = 0, wrong = 0;
      box.className = `sc-puzzle px-stage sc-k-${p.kind}`;
      box.innerHTML = `
        <p class="sc-p-n">Puzzle ${at + 1} of ${ps.length}</p>
        <h2 class="sc-p-title">${esc(p.title)}</h2>
        <p class="sc-p-prompt">${esc(p.prompt)}</p>
        ${figure(p)}
        <div class="sc-widget"></div>
        <p class="sc-feedback" aria-live="polite"></p>
        <div class="sc-hintbar"><button type="button" class="md-btn md-btn--sm sc-hint-btn">Nudge me</button><p class="sc-hint" aria-live="polite"></p></div>
        <div class="sc-explain" hidden></div>`;
      const fb = box.querySelector('.sc-feedback'), hintEl = box.querySelector('.sc-hint'), hb = box.querySelector('.sc-hint-btn');
      const nudge = () => {
        if (hint >= p.hints.length) return;
        hintEl.textContent = p.hints[hint++]; tone(PENTA[5], { dur: 0.2, gain: 0.06 });
        hb.textContent = hint < p.hints.length ? 'Another nudge' : 'No more nudges'; hb.disabled = hint >= p.hints.length;
        say(hintEl.textContent);
      };
      on(hb, 'click', nudge, sig);
      const attempt = v => {
        if (S.check(p, v)) return win();
        wrong++; sfx('no');
        fb.className = 'sc-feedback is-no';
        fb.textContent = wrongWords(p, v, wrong);
        say(fb.textContent);
        box.querySelector('.sc-widget').classList.remove('is-shake'); void box.offsetWidth; box.querySelector('.sc-widget').classList.add('is-shake');
        if (wrong >= 2 && hint === 0) nudge();
      };
      const win = () => {
        const first = !P.solved[`${lv}:${p.id}`];
        P.solved[`${lv}:${p.id}`] = true; save();
        if (first) count('scroll/solve', `Chapter ${ch.n} ${p.id}`);
        sfx('win');
        fb.className = 'sc-feedback is-ok';
        fb.textContent = pickOne(['That is it!', 'The lock clicks open.', 'Kili squawks with delight.', 'Exactly right.']);
        box.querySelectorAll('.sc-widget button, .sc-widget input').forEach(b => { b.disabled = true; });
        box.classList.add('is-solved');
        explain(p);
        steps();
        say(`${fb.textContent} ${p.explain}`);
        if (solvedHere() === ps.length) later(finish, reducedMotion() ? 200 : 900, sig);
      };
      const explain = q => {
        const ex = box.querySelector('.sc-explain'); ex.hidden = false;
        const last = at === ps.length - 1;
        ex.innerHTML = `<p class="sc-ex-k">The real math</p><p>${esc(q.explain)}</p>${last && solvedHere() === ps.length ? '' : `<div class="px-row"><button type="button" class="md-btn md-btn--primary sc-next-p">${last ? 'Back to the first unsolved puzzle' : 'Next puzzle'}</button></div>`}`;
        on(ex, 'click', e => { if (e.target.closest('.sc-next-p')) { const k = ps.findIndex((pp, i) => i > at && !P.solved[`${lv}:${pp.id}`]); at = k >= 0 ? k : ps.findIndex(pp => !P.solved[`${lv}:${pp.id}`]); if (at < 0) at = ps.length - 1; steps(); show(); box.querySelector('.sc-p-title').focus?.(); box.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); } }, sig);
        ex.querySelector('.sc-next-p')?.focus({ preventScroll: true });
      };
      WIDGETS[p.kind](box.querySelector('.sc-widget'), p, attempt, sig);
      if (solved) { fb.className = 'sc-feedback is-ok'; fb.textContent = 'Solved already. Here is what you found.'; box.classList.add('is-solved'); box.querySelectorAll('.sc-widget button, .sc-widget input').forEach(b => { b.disabled = true; }); showAnswer(box.querySelector('.sc-widget'), p); explain(p); }
    }

    function finish() {
      const firstPiece = !P.pieces.includes(ch.n);
      if (firstPiece) { P.pieces.push(ch.n); P.pieces.sort(); save(); count('scroll/chapter', `Chapter ${ch.n} complete`); }
      const end = $('.sc-end'); end.hidden = false;
      const whole = P.pieces.length === 6;
      const finale = ch.n === 6;
      end.innerHTML = `<div class="sc-found">
        <figure class="sc-found-scroll">${scrollPieces(P.pieces, GLYPHS)}</figure>
        <p class="sc-found-k">${finale ? 'The Lost Śulba Scroll' : `Piece ${ch.n} of 6`}</p>
        <h2 class="sc-found-t">${finale ? (lv === 'explorer' ? 'You put the scroll back together!' : 'The scroll is whole again') : 'You found a piece of the scroll!'}</h2>
        ${finale ? `<p class="sc-found-mm">${lv === 'explorer' ? 'Ammini bows. "Rope corners, number words, mountains of stones. You used them all. You are a mathematician."' : 'Ammini rolls the scroll open: rope triangles, doubled squares, the Meru and the poet\'s lists, all in one hand. "Whoever tore it wanted it found by a mathematician," she says. "It was."'}</p><p class="sc-iam">I am a mathematician.</p>` : `<p>${esc(foundLine(ch.n))}</p>`}
        <div class="px-row">
          ${finale ? '<button type="button" class="md-btn md-btn--primary sc-share">Share my scroll</button>' : next && canOpen(next.n) ? `<a class="md-btn md-btn--primary" href="${base}/${next.n}">Chapter ${next.n}: ${esc(next.title)}</a>` : ''}
          <a class="md-btn" href="${base}">The scroll map</a>
        </div>
        ${!finale && next && !canOpen(next.n) ? `<p class="px-note">Chapter ${next.n} opens on ${fmtDate(S.openKey(next.n, LAUNCH))}. Kili will be waiting.</p>` : ''}
      </div>`;
      if (firstPiece || finale) confetti(finale ? 120 : 60);
      sfx('magic');
      say(finale ? 'The scroll is whole again. You are a mathematician.' : `You found piece ${ch.n} of the scroll.`);
      on(end, 'click', e => { if (e.target.closest('.sc-share')) share({ title: 'The Lost Śulba Scroll', text: 'I solved all six chapters of The Lost Śulba Scroll: Katapayadi, rope geometry, the Meru and more. I am a mathematician.', url: shareUrl('#/sutras/lost-scroll') }); }, signal);
      if (whole && ch.n !== 6) end.querySelector('.sc-found-k').textContent = 'All six pieces';
      end.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      end.querySelector('.md-btn')?.focus({ preventScroll: true });
    }
    steps(); show();
  }
}

const foundLine = n => ({
  1: 'In the drawer Kili named, rolled in silk: the first piece. Its corner shows a rope triangle.',
  2: 'You dig at the true corner and touch cloth. The second piece is covered in squares, one tilted on another.',
  3: 'Behind the missing stone, the third piece: a triangle of numbers drawn in red ink.',
  4: 'The lid swings up. The fourth piece lists long and short marks in neat rows.',
  5: 'The star box opens with a click. The fifth piece is full of words for numbers.',
  6: ''
}[n]);
const pickOne = a => a[Math.floor(Math.random() * a.length)];
function wrongWords(p, v, n) {
  if (p.kind === 'number') { const x = Number(String(v).replace(/[\s,]/g, '')); if (!String(v).trim() || Number.isNaN(x)) return 'Type a number first.'; if (String(x).split('').reverse().join('') === String(p.answer)) return 'So close: those are the right digits in the wrong order. Which digit comes first?'; return n > 2 ? 'Not yet. Try a nudge.' : 'Not this time. Look again.'; }
  if (p.kind === 'kp') { if (!v.length) return 'Tap some syllables first.'; const got = S.kpDecode(v); return `Kili hears ${got}. ${v.length !== String(p.target).length ? `You need ${String(p.target).length} syllables.` : 'Remember: units digit first.'}`; }
  if (p.kind === 'bhuta') { if (!v.length) return 'Tap some words first.'; return `Those words say ${S.bhutaDecode(v)}. ${v.length !== String(p.target).length ? `You need ${String(p.target).length} words.` : 'Remember: units digit first.'}`; }
  if (p.kind === 'rope') { const s = S.ropeSides(v[0], v[1], p.knots); return S.isTriangle(s) ? `Sides ${s.join(', ')}: no corner is square yet.` : 'The rope is slack: that is no triangle. Try other knots.'; }
  if (p.kind === 'square') return `That square has area ${S.squareArea(v[0], v[1])}. You need ${p.target}.`;
  if (p.kind === 'meter') return `The lock rattles: that pattern is row ${S.rowOf(v)}.`;
  if (p.kind === 'order') return 'The pieces do not fit in that order. Start again with the smallest.';
  return 'Not quite. Have another look.';
}

/* ---------- Figures ---------- */
function figure(p) {
  const f = p.fig; if (!f) return '';
  switch (f.type) {
    case 'kp': return `<div class="sc-fig"><p class="sc-sylls" aria-label="Syllables: ${esc(f.syll.join(', '))}">${f.syll.map(s => `<span class="sc-syl">${esc(s)}</span>`).join('<i aria-hidden="true">·</i>')}</p>${f.word ? `<p class="px-note">The whole name: ${esc(f.word)}</p>` : ''}${kpKey(f.easy)}</div>`;
    case 'kpkey': return `<div class="sc-fig">${kpKey(f.easy)}</div>`;
    case 'rect': return `<div class="sc-fig">${rectSvg(f.w, f.h)}</div>`;
    case 'recipe': return `<div class="sc-fig sc-recipe" aria-label="${f.pro ? '1 plus one third plus one third of one fourth minus one thirty-fourth of that' : '1 plus one third plus one third of one fourth'}"><span>1</span><b>+</b><span class="sc-frac"><i>1</i><i>3</i></span><b>+</b><span class="sc-frac"><i>1</i><i>3 × 4</i></span>${f.pro ? '<b>−</b><span class="sc-frac"><i>1</i><i>3 × 4 × 34</i></span>' : ''}</div>`;
    case 'meru': return `<div class="sc-fig">${meruSvg(f)}</div>`;
    case 'syllables': { const ex = 'G'.repeat(f.k) + 'L'.repeat(f.n - f.k); return `<div class="sc-fig"><p class="px-note">One of them:</p>${meterRow(ex)}<p class="px-note">G is guru (long), L is laghu (short).</p></div>`; }
    case 'prastara': { const rows = S.prastara(f.n).slice(0, f.show); return `<div class="sc-fig sc-pr"><ol class="sc-pr-list">${rows.map((r, i) => `<li><span>${i + 1}</span>${meterRow(r, true)}</li>`).join('')}${f.show < 2 ** f.n ? '<li class="sc-pr-more"><span>…</span></li>' : ''}</ol><div class="sc-pr-ask"><span>The lock shows</span>${meterRow(f.ask)}<span>Row ?</span></div></div>`; }
    case 'beats': return `<div class="sc-fig"><ul class="sc-beats">${[1, 2, 3].map(b => `<li><b>${b} beat${b > 1 ? 's' : ''}</b>${S.beatPatterns(b).map(x => meterRow(x, true)).join('')}</li>`).join('')}</ul></div>`;
    case 'bhuta': return `<div class="sc-fig"><p class="sc-sylls">${f.words.map(w => `<span class="sc-syl sc-syl--w">${esc(w)}<small>${esc(S.bhutaEn(w))}</small></span>`).join('<i aria-hidden="true">·</i>')}</p>${bhutaKey(f.pool)}</div>`;
    case 'keys': return `<div class="sc-fig"><ul class="sc-keys">${f.K.map((k, i) => `<li><span class="sc-keys-g" aria-hidden="true"><svg viewBox="-24 -24 48 48">${GLYPHS[i]}</svg></span><span>${esc(f.names[i])}</span><b>${k}</b></li>`).join('')}</ul></div>`;
    default: return '';
  }
}
function kpKey(easy) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  const by = d => (easy ? S.KP_EASY[d] : S.KP_ROWS.flat().filter(s => S.kpDigit(s) === d));
  return `<details class="sc-key" open><summary>Kili's key${easy ? '' : ' (Katapayadi)'}</summary><ul class="sc-key-grid">${digits.map(d => `<li><b>${d}</b><span>${by(d).map(esc).join(' ')}</span></li>`).join('')}</ul>${easy ? '' : '<p class="px-note">A vowel alone (a, ā, i, u, e, o) is 0. In a cluster like dra or gya, only the last consonant counts.</p>'}</details>`;
}
function bhutaKey(pool) {
  const by = d => S.BHUTA.filter(e => e.d === d && pool.includes(e.w));
  return `<details class="sc-key" open><summary>Star-counter's words</summary><ul class="sc-key-grid sc-key-grid--w">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<li><b>${d}</b><span>${by(d).map(e => `${esc(e.w)} <small>${esc(e.en)}</small>`).join('<br>')}</span></li>`).join('')}</ul></details>`;
}
const meterRow = (pat, small) => `<span class="sc-meter${small ? ' is-small' : ''}" aria-label="${[...pat].map(c => (c === 'L' ? 'laghu' : 'guru')).join(', ')}">${[...pat].map(c => `<i class="sc-m-${c}">${c}</i>`).join('')}</span>`;
function rectSvg(w, h) {
  const s = Math.min(240 / w, 150 / h), W = w * s, H = h * s;
  const grid = (w <= 8 && h <= 15) ? Array.from({ length: w - 1 }, (_, i) => `<path class="sc-r-grid" d="M${(i + 1) * s} 0V${H}"/>`).join('') + Array.from({ length: h - 1 }, (_, i) => `<path class="sc-r-grid" d="M0 ${(i + 1) * s}H${W}"/>`).join('') : '';
  return `<svg class="sc-rect" viewBox="-30 -24 ${W + 60} ${H + 48}" role="img" aria-label="A rectangle ${w} by ${h} with a rope along its diagonal"><rect class="sc-r-box" width="${W}" height="${H}"/>${grid}<path class="sc-r-diag" d="M0 ${H}L${W} 0"/><text x="${W / 2}" y="${H + 18}">${w}</text><text x="${-14}" y="${H / 2 + 5}">${h}</text><text class="sc-r-q" x="${W / 2 + 10}" y="${H / 2 - 6}">?</text><circle class="sc-r-peg" cx="0" cy="${H}" r="5"/><circle class="sc-r-peg" cx="${W}" cy="0" r="5"/><circle class="sc-r-peg" cx="0" cy="0" r="5"/><circle class="sc-r-peg" cx="${W}" cy="${H}" r="5"/></svg>`;
}
function meruSvg(f) {
  const T = S.meru(f.rows), R = 17, dx = 38, dy = 34, w = f.rows * dx;
  let o = '';
  T.forEach((row, r) => row.forEach((v, k) => {
    const x = w / 2 + (k - r / 2) * dx, y = 22 + r * dy;
    const miss = f.hide && f.hide[0] === r && f.hide[1] === k;
    const stick = f.stick && k === f.stick.k && r >= f.stick.k && r < f.stick.k + f.stick.len;
    const sum = f.sumRow === r;
    o += `<g class="sc-st${miss ? ' is-miss' : ''}${stick ? ' is-stick' : ''}${sum ? ' is-sum' : ''}"><rect x="${x - R}" y="${y - 13}" width="${2 * R}" height="26" rx="7"/><text x="${x}" y="${y + 5}">${miss ? '?' : v}</text></g>`;
  }));
  const rows = T.map((row, r) => row.map((v, k) => (f.hide && f.hide[0] === r && f.hide[1] === k ? 'missing' : v)).join(' ')).join('; ');
  return `<svg class="sc-meru" viewBox="0 0 ${w} ${f.rows * dy + 12}" role="img" aria-label="Meru-prastāra, row by row: ${rows}">${o}</svg>`;
}

/* ---------- Answer widgets ---------- */
const WIDGETS = {
  number(el, p, attempt, sig) {
    el.innerHTML = `<form class="sc-num" novalidate><label for="scAns">Your answer</label><input id="scAns" inputmode="numeric" autocomplete="off" enterkeyhint="go" maxlength="9"><button class="md-btn md-btn--primary" type="submit">Try it</button></form>`;
    const f = el.querySelector('form'), inp = f.querySelector('input');
    on(f, 'submit', e => { e.preventDefault(); attempt(inp.value); inp.select(); }, sig);
    on(inp, 'input', () => { inp.value = inp.value.replace(/[^\d]/g, ''); }, sig);
  },
  choice(el, p, attempt, sig) {
    el.innerHTML = `<div class="sc-choices" role="group" aria-label="Choices">${p.options.map(o => `<button type="button" class="sc-choice" data-o="${esc(o)}">${esc(o)}<small>${esc(o.split(' · ').map(S.bhutaEn).join(', '))}</small></button>`).join('')}</div>`;
    on(el, 'click', e => { const b = e.target.closest('[data-o]'); if (b && !b.disabled) { b.classList.add('is-picked'); attempt(b.dataset.o); } }, sig);
  },
  kp(el, p, attempt, sig) { tiles(el, p, attempt, sig, p.pool, s => String(S.kpDigit(s)), 'syllable'); },
  bhuta(el, p, attempt, sig) { tiles(el, p, attempt, sig, p.pool, w => S.bhutaEn(w), 'word'); },
  order(el, p, attempt, sig) {
    let seq = [];
    const draw = () => {
      el.innerHTML = `<p class="sc-built" aria-label="Your order">${seq.length ? seq.map((id, i) => `<span class="sc-chip">${i + 1}. ${esc(p.items.find(x => x.id === id).label)}</span>`).join('') : '<span class="px-note">Tap the pieces in order.</span>'}</p>
        <div class="sc-pool" role="group" aria-label="Pieces">${p.items.map(it => `<button type="button" class="sc-tile" data-id="${it.id}" ${seq.includes(it.id) ? 'disabled' : ''}>${esc(it.label)}</button>`).join('')}</div>
        <div class="px-row"><button type="button" class="md-btn md-btn--sm sc-undo" ${seq.length ? '' : 'disabled'}>Undo</button></div>`;
    };
    draw();
    on(el, 'click', e => {
      const t = e.target.closest('[data-id]');
      if (t && !t.disabled) { seq.push(t.dataset.id); tone(PENTA[seq.length + 2], { dur: 0.1, type: 'triangle', gain: 0.07 }); draw(); if (seq.length === p.items.length) { attempt(seq); if (!el.closest('.is-solved')) { seq = []; later(draw, 1400, sig); } } else el.querySelector('.sc-tile:not(:disabled)')?.focus(); return; }
      if (e.target.closest('.sc-undo')) { seq.pop(); draw(); }
    }, sig);
  },
  rope(el, p, attempt, sig) { rope(el, p, attempt, sig); },
  square(el, p, attempt, sig) { square(el, p, attempt, sig); },
  meter(el, p, attempt, sig) {
    let pat = 'G'.repeat(p.n);
    const draw = () => {
      el.innerHTML = `<div class="sc-dials" role="group" aria-label="Syllable dials">${[...pat].map((c, i) => `<button type="button" class="sc-dial sc-m-${c}" data-i="${i}" aria-label="Dial ${i + 1}: ${c === 'L' ? 'laghu, short' : 'guru, long'}. Tap to switch."><span class="sc-dial-g sc-dial-g--${c}" aria-hidden="true"></span><small>${c}</small></button>`).join('')}</div>
        <div class="px-row"><button type="button" class="md-btn md-btn--primary sc-try">Try the lock</button></div>`;
    };
    draw();
    on(el, 'click', e => {
      const d = e.target.closest('[data-i]');
      if (d && !d.disabled) { const i = +d.dataset.i; pat = pat.slice(0, i) + (pat[i] === 'L' ? 'G' : 'L') + pat.slice(i + 1); tone(pat[i] === 'L' ? PENTA[7] : PENTA[2], { dur: pat[i] === 'L' ? 0.08 : 0.2, type: 'triangle', gain: 0.07 }); draw(); el.querySelector(`[data-i="${i}"]`).focus(); return; }
      if (e.target.closest('.sc-try')) attempt(pat);
    }, sig);
  }
};
/* Tap tiles to build a sequence of syllables or words */
function tiles(el, p, attempt, sig, pool, sub, noun) {
  let seq = [];
  const draw = () => {
    el.innerHTML = `<p class="sc-built" aria-label="Your ${noun}s: ${esc(seq.join(', ') || 'none yet')}">${seq.length ? seq.map((s, i) => `<button type="button" class="sc-chip" data-rm="${i}" aria-label="Remove ${esc(s)}">${esc(s)}</button>`).join('<i aria-hidden="true">·</i>') : `<span class="px-note">Tap a ${noun} for each digit.</span>`}</p>
      <div class="sc-pool" role="group" aria-label="${noun}s">${pool.map(s => `<button type="button" class="sc-tile" data-s="${esc(s)}">${esc(s)}<small>${esc(sub(s))}</small></button>`).join('')}</div>
      <div class="px-row"><button type="button" class="md-btn md-btn--sm sc-undo" ${seq.length ? '' : 'disabled'}>Undo</button><button type="button" class="md-btn md-btn--primary sc-try" ${seq.length ? '' : 'disabled'}>Say it</button></div>`;
  };
  draw();
  on(el, 'click', e => {
    const t = e.target.closest('[data-s]'), rm = e.target.closest('[data-rm]');
    if (t && !t.disabled && seq.length < 8) { seq.push(t.dataset.s); tone(PENTA[(seq.length + 1) % PENTA.length], { dur: 0.08, type: 'triangle', gain: 0.07 }); draw(); el.querySelector(`[data-s="${CSS.escape(t.dataset.s)}"]`)?.focus(); return; }
    if (rm && !rm.disabled) { seq.splice(+rm.dataset.rm, 1); draw(); return; }
    if (e.target.closest('.sc-undo')) { seq.pop(); draw(); return; }
    if (e.target.closest('.sc-try')) attempt(seq.slice());
  }, sig);
}
/* Show the stored answer in a widget for a puzzle solved earlier */
function showAnswer(el, p) {
  if (p.kind === 'number') { const i = el.querySelector('input'); if (i) i.value = p.answer; }
  else if (p.kind === 'kp' || p.kind === 'bhuta') el.querySelector('.sc-built').innerHTML = p.answer.map(s => `<span class="sc-chip">${esc(s)}</span>`).join('<i aria-hidden="true">·</i>');
  else if (p.kind === 'order') el.querySelector('.sc-built').innerHTML = p.answer.map((id, i) => `<span class="sc-chip">${i + 1}. ${esc(p.items.find(x => x.id === id).label)}</span>`).join('');
  else if (p.kind === 'choice') el.querySelector(`[data-o="${CSS.escape(p.answer)}"]`)?.classList.add('is-picked');
}

/* ----- Rope and pegs: a 12-knot loop. Drag pegs B and C along the rope; the triangle follows. ----- */
function rope(el, p, attempt, sig) {
  const K = p.knots; let b = 2, c = 6, drag = null;
  el.innerHTML = `<div class="sc-rope">
    <svg class="sc-rope-tri" viewBox="0 0 300 200" role="img" aria-live="off"><g class="sc-tri"></g></svg>
    <p class="sc-rope-read" aria-live="polite"></p>
    <svg class="sc-rope-strip" viewBox="0 0 320 64" aria-label="The rope, 12 knots. Drag pegs B and C, or focus a peg and use the arrow keys.">
      <path class="sc-strip-base" d="M14 30H306"/>
      <path class="sc-strip-seg sc-side--a"/><path class="sc-strip-seg sc-side--b"/><path class="sc-strip-seg sc-side--c"/>
      ${Array.from({ length: K + 1 }, (_, i) => `<circle class="sc-strip-knot" cx="${14 + (i * 292) / K}" cy="30" r="4"/><text class="sc-strip-n" x="${14 + (i * 292) / K}" y="58">${i}</text>`).join('')}
      <g class="sc-strip-peg is-fixed" transform="translate(14 30)"><circle r="11"/><text y="5">A</text></g>
      <g class="sc-strip-peg" data-peg="b" tabindex="0" role="slider" aria-label="Peg B" aria-valuemin="1" aria-valuemax="${K - 1}"><circle r="13"/><text y="5">B</text></g>
      <g class="sc-strip-peg" data-peg="c" tabindex="0" role="slider" aria-label="Peg C" aria-valuemin="1" aria-valuemax="${K - 1}"><circle r="13"/><text y="5">C</text></g>
    </svg>
    <div class="px-row"><button type="button" class="md-btn md-btn--primary sc-try">Stake the pegs</button></div></div>`;
  const strip = el.querySelector('.sc-rope-strip'), tri = el.querySelector('.sc-tri'), read = el.querySelector('.sc-rope-read');
  const X = i => 14 + (i * 292) / K;
  const draw = () => {
    const s = S.ropeSides(b, c, K);
    el.querySelector('[data-peg="b"]').setAttribute('transform', `translate(${X(b)} 30)`);
    el.querySelector('[data-peg="c"]').setAttribute('transform', `translate(${X(c)} 30)`);
    el.querySelector('[data-peg="b"]').setAttribute('aria-valuenow', b); el.querySelector('[data-peg="b"]').setAttribute('aria-valuetext', `knot ${b}`);
    el.querySelector('[data-peg="c"]').setAttribute('aria-valuenow', c); el.querySelector('[data-peg="c"]').setAttribute('aria-valuetext', `knot ${c}`);
    const [sa, sb, sc] = el.querySelectorAll('.sc-strip-seg');
    sa.setAttribute('d', `M${X(0)} 30H${X(b)}`); sb.setAttribute('d', `M${X(b)} 30H${X(c)}`); sc.setAttribute('d', `M${X(c)} 30H${X(K)}`);
    /* Triangle: A at origin, B along the ground, C from the two other sides */
    const [ab, bc, ca] = s, u = 200 / 6;
    const ok = S.isTriangle(s);
    let cx, cy;
    if (ok) { cx = (ab * ab + ca * ca - bc * bc) / (2 * ab); cy = Math.sqrt(Math.max(0, ca * ca - cx * cx)); } else { cx = Math.max(-ca, Math.min(ab, ca)); cy = 0; }
    const ox = 150 - (ab / 2) * u, oy = 180;
    const P = (x, y) => [ox + x * u, oy - y * u];
    const A = P(0, 0), B = P(ab, 0), C = P(cx, cy);
    const ang = ok ? S.angles(s) : null; /* opposite ab: at C; opposite bc: at A; opposite ca: at B */
    const atA = ang && ang[1], atB = ang && ang[2], atC = ang && ang[0];
    const corner = (V, U1, U2, deg) => { if (!ang) return ''; const r = Math.abs(deg - 90) < 1e-6; const d1 = norm(U1, V), d2 = norm(U2, V), k = 14; if (r) return `<path class="sc-right" d="M${V[0] + d1[0] * k} ${V[1] + d1[1] * k}L${V[0] + (d1[0] + d2[0]) * k} ${V[1] + (d1[1] + d2[1]) * k}L${V[0] + d2[0] * k} ${V[1] + d2[1] * k}"/>`; return `<text class="sc-ang" x="${V[0] + (d1[0] + d2[0]) * 24}" y="${V[1] + (d1[1] + d2[1]) * 24 + 4}">${Math.round(deg)}°</text>`; };
    tri.innerHTML = `
      ${ok ? '' : '<path class="sc-slack" d="M60 186q90 18 180 0"/>'}
      <path class="sc-side sc-side--a" d="M${A}L${B}"/><path class="sc-side sc-side--b" d="M${B}L${C}"/><path class="sc-side sc-side--c" d="M${C}L${A}"/>
      ${corner(A, B, C, atA)}${corner(B, A, C, atB)}${corner(C, A, B, atC)}
      ${[[A, 'A'], [B, 'B'], [C, 'C']].map(([v, n]) => `<g class="sc-peg" transform="translate(${v})"><circle r="9"/><text y="4">${n}</text></g>`).join('')}`;
    const right = ok && S.isRight(s);
    tri.parentNode.setAttribute('aria-label', ok ? `Triangle with sides ${ab}, ${bc} and ${ca} knots${right ? ', with a right angle' : ''}` : 'The rope is slack; no triangle');
    read.innerHTML = ok ? `Sides: <b class="sc-t-a">${ab}</b>, <b class="sc-t-b">${bc}</b>, <b class="sc-t-c">${ca}</b>${right ? ' <span class="sc-tick">square corner!</span>' : ''}` : `Sides ${ab}, ${bc}, ${ca}: the rope is slack.`;
  };
  const norm = (U, V) => { const dx = U[0] - V[0], dy = U[1] - V[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const set = (peg, k) => { if (peg === 'b') b = Math.max(1, Math.min(c - 1, k)); else c = Math.max(b + 1, Math.min(K - 1, k)); tone(PENTA[(peg === 'b' ? b : c) % PENTA.length], { dur: 0.06, type: 'triangle', gain: 0.05 }); draw(); };
  const toKnot = e => { const pt = strip.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(strip.getScreenCTM().inverse()); return Math.round(((q.x - 14) / 292) * K); };
  on(strip, 'pointerdown', e => { const g = e.target.closest('[data-peg]'); if (!g) return; drag = g.dataset.peg; strip.setPointerCapture(e.pointerId); g.focus(); e.preventDefault(); }, sig);
  on(strip, 'pointermove', e => { if (!drag) return; const k = toKnot(e); if (k !== (drag === 'b' ? b : c)) set(drag, k); }, sig);
  on(strip, 'pointerup', () => { drag = null; }, sig);
  on(strip, 'pointercancel', () => { drag = null; }, sig);
  on(strip, 'keydown', e => { const g = e.target.closest('[data-peg]'); if (!g) return; const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (d) { set(g.dataset.peg, (g.dataset.peg === 'b' ? b : c) + d); e.preventDefault(); } }, sig);
  on(el.querySelector('.sc-try'), 'click', () => attempt([b, c]), sig);
  draw();
}

/* ----- Doubling the square: drag peg P; a square is built on the rope from O to P ----- */
function square(el, p, attempt, sig) {
  const s0 = p.base, R = s0 + 2 + (s0 > 3 ? 1 : 0);
  let px = s0 + 1, py = 0, drag = false;
  const u = 20, vb = `${-(R + 0.6) * u} ${-(2 * R + 0.6) * u} ${(2 * R + 1.6) * u} ${(2 * R + 1.2) * u}`;
  el.innerHTML = `<div class="sc-sq">
    <svg class="sc-sq-svg" viewBox="${vb}" aria-label="Grid. Drag peg P, or focus it and use the arrow keys. The rope from O to P is one side of the new square.">
      ${(() => { let o = ''; for (let x = -R; x <= R; x++) for (let y = 0; y <= 2 * R; y++) o += `<circle class="sc-lat" cx="${x * u}" cy="${-y * u}" r="1.6"/>`; return o; })()}
      <rect class="sc-sq-old" x="0" y="${-s0 * u}" width="${s0 * u}" height="${s0 * u}"/>
      <path class="sc-sq-new"/>
      <path class="sc-sq-rope"/>
      <g class="sc-peg is-fixed"><circle r="9"/><text y="4">O</text></g>
      <g class="sc-peg sc-sq-p" tabindex="0" role="slider" aria-label="Peg P" aria-valuemin="0" aria-valuemax="${R}"><circle r="12"/><text y="4">P</text></g>
    </svg>
    <p class="sc-sq-read" aria-live="polite"></p>
    <div class="px-row"><button type="button" class="md-btn md-btn--primary sc-try">Stretch the cloth</button></div></div>`;
  const svg = el.querySelector('svg'), peg = el.querySelector('.sc-sq-p'), read = el.querySelector('.sc-sq-read');
  const draw = () => {
    const P1 = [px, py], P2 = [px - py, py + px], P3 = [-py, px];
    const pt = q => `${q[0] * u} ${-q[1] * u}`;
    el.querySelector('.sc-sq-new').setAttribute('d', `M0 0L${pt(P1)}L${pt(P2)}L${pt(P3)}Z`);
    el.querySelector('.sc-sq-rope').setAttribute('d', `M0 0L${pt(P1)}`);
    peg.setAttribute('transform', `translate(${px * u} ${-py * u})`);
    peg.setAttribute('aria-valuetext', `${px} across, ${py} up`);
    const A = S.squareArea(px, py);
    read.innerHTML = `Old square: <b class="sc-t-a">${s0 * s0}</b>. New square: <b class="sc-t-b">${A}</b>${A === p.target ? ' <span class="sc-tick">double!</span>' : ''}${level() === 'explorer' ? '' : ` <span class="px-note">(${px}² + ${py}²)</span>`}`;
  };
  const clamp = (x, y) => { px = Math.max(0, Math.min(R, x)); py = Math.max(0, Math.min(R, y)); if (px === 0 && py === 0) px = 1; };
  on(svg, 'pointerdown', e => { if (!e.target.closest('.sc-sq-p')) return; drag = true; svg.setPointerCapture(e.pointerId); peg.focus(); e.preventDefault(); }, sig);
  on(svg, 'pointermove', e => { if (!drag) return; const q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; const r = q.matrixTransform(svg.getScreenCTM().inverse()); const nx = Math.round(r.x / u), ny = Math.round(-r.y / u); if (nx !== px || ny !== py) { clamp(nx, ny); tone(PENTA[(px + py) % PENTA.length], { dur: 0.05, type: 'triangle', gain: 0.05 }); draw(); } }, sig);
  on(svg, 'pointerup', () => { drag = false; }, sig);
  on(svg, 'pointercancel', () => { drag = false; }, sig);
  on(peg, 'keydown', e => { const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (d) { clamp(px + d[0], py + d[1]); draw(); e.preventDefault(); } }, sig);
  on(el.querySelector('.sc-try'), 'click', () => attempt([px, py]), sig);
  draw();
}
