/* Math Lens (#/games/lens): turn the world into the puzzle. Point the camera at a plate, a clock, a receipt or a
   page number (or type the digits, or let us surprise you) and play challenges made from those digits.
   Routes: #/games/lens and #/games/lens/d/<kind>/<digits> (digits someone sent you). Logic lives in lens-core.js;
   the camera and digit reader live in lens-cam.js. Camera frames never leave this device. */
import { head, level, setLevel, LEVELS, store, rng, say, sfx, tone, PENTA, confetti, toast, share, shareUrl, track, esc, dayKey, reducedMotion } from '../kit.js';
import { on, later, child } from '../life.js';
import * as C from './lens-core.js';
import { camera } from './lens-cam.js';

const KEY = 'lens';
const blank = () => ({ journal: [], solved: 0, clues: { 3: [], 9: [], 11: [] } });
const KIND_HINT = { plate: 'like 7KP 482', clock: 'like 10:47', receipt: 'prices, like 4.50 2.25 7.80', number: 'like 148' };
const ICON = {
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  type: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 10h1M11 10h1M15 10h1M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  surprise: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/><circle cx="15" cy="15" r="1.6" fill="currentColor"/><circle cx="15" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="15" r="1.6" fill="currentColor"/></svg>'
};

export async function mount({ root, signal, params }) {
  const S = Object.assign(blank(), store.get(KEY, {}));
  S.clues = Object.assign({ 3: [], 9: [], 11: [] }, S.clues);
  const save = () => store.set(KEY, S);
  let lv = level();
  root.innerHTML = `<div class="md-wrap ln">
    ${head({ title: 'Math Lens', kicker: 'The world is your puzzle', intro: 'Plates, clocks, receipts, jersey numbers, page numbers. Every number around you is a puzzle in disguise. Catch some digits and play.', color: 'teal' })}
    <div class="ln-lv" role="group" aria-label="Who is playing">${Object.entries(LEVELS).map(([id, n]) => `<button type="button" class="md-chip" data-lv="${id}" aria-pressed="${id === lv}">${n}</button>`).join('')}</div>
    <section class="ln-find px-stage" aria-labelledby="lnFindH">
      <h2 id="lnFindH" class="ln-h2">Catch some digits</h2>
      <div class="ln-ways" role="group" aria-label="How to get digits">
        <button type="button" class="ln-way" data-way="camera" aria-pressed="false">${ICON.camera}<b>Point the camera</b><small>Plate, clock, receipt, page</small></button>
        <button type="button" class="ln-way" data-way="type" aria-pressed="false">${ICON.type}<b>Type them</b><small>No camera needed</small></button>
        <button type="button" class="ln-way" data-way="surprise" aria-pressed="false">${ICON.surprise}<b>Surprise me</b><small>We make some up</small></button>
      </div>
      <div class="ln-panel"></div>
    </section>
    <section class="ln-play" aria-label="Your challenges" hidden></section>
    <section class="ln-journal" aria-labelledby="lnJH"></section>
  </div>`;
  const wrap = root.querySelector('.ln'), panel = wrap.querySelector('.ln-panel'), play = wrap.querySelector('.ln-play'), jour = wrap.querySelector('.ln-journal');
  let cam = null, src = null, list = [], active = 0, done = {}, entryId = null, onAbortCard = () => {};

  /* ---------- Finding digits ---------- */
  const setWay = way => wrap.querySelectorAll('[data-way]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.way === way)));
  const kindChips = (kind, name = 'kind') => `<div class="ln-kinds" role="radiogroup" aria-label="What is it?">${Object.entries(C.KINDS).map(([k, n]) => `<button type="button" role="radio" class="md-chip" data-${name}="${k}" aria-checked="${k === kind}">${n}</button>`).join('')}</div>`;
  const digitForm = (value = '', kind = 'plate', note = '') => `
    <form class="ln-form" novalidate>
      ${note ? `<p class="ln-note">${note}</p>` : ''}
      <p class="ln-q">What is it?</p>
      ${kindChips(kind)}
      <label class="ln-lab" for="lnDigits">The digits <span class="px-note">(${KIND_HINT[kind]})</span></label>
      <div class="ln-inrow"><input id="lnDigits" class="ln-in" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="40" value="${esc(value)}" placeholder="${esc(KIND_HINT[kind].replace(/^.*like /, ''))}">
      <button class="md-btn md-btn--primary" type="submit">Make challenges</button></div>
      <p class="ln-err" role="alert"></p>
    </form>`;
  const wireForm = () => {
    const f = panel.querySelector('.ln-form'); if (!f) return;
    const inp = f.querySelector('#lnDigits'); let kind = f.querySelector('[aria-checked="true"]').dataset.kind;
    const pickKind = k => { kind = k; f.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.kind === k))); f.querySelector('.ln-lab .px-note').textContent = `(${KIND_HINT[k]})`; inp.placeholder = KIND_HINT[k].replace(/^.*like /, ''); };
    on(f, 'click', e => { const b = e.target.closest('[data-kind]'); if (b) pickKind(b.dataset.kind); }, signal);
    on(f, 'keydown', e => {
      const b = e.target.closest('[data-kind]'); if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const ks = Object.keys(C.KINDS), i = (ks.indexOf(b.dataset.kind) + (e.key === 'ArrowRight' ? 1 : ks.length - 1)) % ks.length;
      pickKind(ks[i]); f.querySelector(`[data-kind="${ks[i]}"]`).focus(); e.preventDefault();
    }, signal);
    on(inp, 'input', () => { const g = C.guessKind(inp.value); if (g !== 'plate' && g !== kind) pickKind(g); }, signal);
    on(f, 'submit', e => {
      e.preventDefault();
      const s = C.sourceFrom(inp.value, kind);
      const err = f.querySelector('.ln-err');
      if (!s) { err.textContent = kind === 'clock' ? 'That is not a time I can read. Try 10:47.' : 'I need at least one digit.'; inp.focus(); return; }
      if (s.digits.replace(/\D/g, '').length < 2 && kind !== 'receipt') { err.textContent = 'Two or more digits make better puzzles.'; inp.focus(); return; }
      err.textContent = ''; begin(s, 'typed');
    }, signal);
  };
  const showType = () => { stopCam(); setWay('type'); panel.innerHTML = digitForm('', 'plate'); wireForm(); panel.querySelector('#lnDigits').focus(); };
  const surpriseMe = () => {
    stopCam(); setWay('surprise'); panel.innerHTML = '';
    const r = rng((Math.random() * 2 ** 32) >>> 0);
    begin(C.surprise(r, lv), 'surprise');
  };

  /* ---------- Camera ---------- */
  const stopCam = () => { if (cam) { cam.stop(); cam = null; } };
  const showCamera = () => {
    stopCam(); setWay('camera');
    cam = camera(panel, { signal, kindChips, onDigits: (text, kind) => {
      panel.innerHTML = digitForm(text, kind, text ? 'Here is what I read. Fix anything that looks wrong, then play.' : 'I could not find digits in that picture. Type them here instead, or try again with the digits filling the box.');
      wireForm(); const inp = panel.querySelector('#lnDigits'); inp.focus(); inp.select();
      panel.querySelector('.ln-form').insertAdjacentHTML('beforeend', '<button type="button" class="md-btn md-btn--sm ln-retake">Take another picture</button>');
      track('lens/read', text ? 'Read digits' : 'Read nothing');
    }, onType: showType });
  };
  on(wrap, 'click', e => {
    const w = e.target.closest('[data-way]');
    if (w) { ({ camera: showCamera, type: showType, surprise: surpriseMe })[w.dataset.way](); return; }
    if (e.target.closest('.ln-retake')) { showCamera(); return; }
    const l = e.target.closest('[data-lv]');
    if (l) { setLevel(l.dataset.lv); lv = l.dataset.lv; wrap.querySelectorAll('[data-lv]').forEach(b => b.setAttribute('aria-pressed', String(b === l))); if (src) begin(src, 'level', false); say(`Playing as ${LEVELS[lv]}.`); }
  }, signal);

  /* ---------- Playing ---------- */
  function begin(s, how, log = true) {
    src = s; list = C.build(s, lv); active = 0; done = {};
    if (log) {
      const e = { id: Date.now().toString(36), kind: s.kind, raw: s.raw, digits: s.digits, items: s.items ? s.items.map(x => [x.name, x.cents]) : undefined, time: s.time, label: s.label, day: dayKey(), lv, solved: [] };
      S.journal = [e, ...S.journal.filter(x => !(x.raw === e.raw && x.kind === e.kind))].slice(0, 30); entryId = e.id; save();
      track('lens/source', `${how} ${s.kind}`);
    }
    play.hidden = false;
    render();
    play.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    play.querySelector('.ln-obj').focus({ preventScroll: true });
    say(`${list.length} challenges from ${s.raw}. First: ${list[0]?.title}.`);
    tone(PENTA[4], { dur: 0.12 }); tone(PENTA[7], { dur: 0.18, when: 0.08 });
    drawJournal();
  }
  const render = () => {
    play.innerHTML = `
      <div class="ln-stagehead">
        <div class="ln-obj" tabindex="-1" aria-label="${esc(objLabel(src))}">${objHtml(src)}</div>
        <div class="ln-side">
          <p class="ln-kicker">${esc(C.KINDS[src.kind])}</p>
          <p class="ln-big">${esc(src.raw)}</p>
          <p class="px-note">${list.length} challenges at ${LEVELS[lv]} level. Every one has been checked: it can be solved.</p>
          <div class="px-row"><button type="button" class="md-btn md-btn--sm ln-send">Send these digits</button><button type="button" class="md-btn md-btn--sm ln-new">New digits</button></div>
        </div>
      </div>
      <ol class="ln-tabs" role="tablist" aria-label="Challenges">${list.map((c, i) => `<li role="presentation"><button type="button" role="tab" id="lnTab${i}" aria-controls="lnCard" aria-selected="${i === active}" tabindex="${i === active ? 0 : -1}" class="ln-tab${done[c.id] ? ' is-done' : ''}" data-tab="${i}"><span class="ln-tab-n" aria-hidden="true">${done[c.id] ? '✓' : i + 1}</span>${esc(c.title)}${done[c.id] ? '<span class="px-live"> (solved)</span>' : ''}</button></li>`).join('')}</ol>
      <div class="ln-card px-stage" id="lnCard" role="tabpanel" aria-labelledby="lnTab${active}"></div>`;
    card();
  };
  const objLabel = s => s.kind === 'clock' ? `A clock showing ${s.raw}` : s.kind === 'receipt' ? `A receipt, total ${C.money(s.total)}` : `${s.label || C.KINDS[s.kind]} ${s.raw}`;
  const objHtml = s => {
    if (s.kind === 'clock') {
      const { h, m } = s.time, ha = ((h % 12) * 30 + m * 0.5), ma = m * 6;
      const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="9" x2="50" y2="${i % 3 ? 14 : 17}" transform="rotate(${i * 30} 50 50)"/>`).join('');
      return `<svg class="ln-clock" viewBox="0 0 100 100" aria-hidden="true"><circle class="ln-clock-face" cx="50" cy="50" r="45"/><g class="ln-clock-ticks">${ticks}</g><path class="ln-clock-arc" d=""/><line class="ln-clock-h" x1="50" y1="50" x2="50" y2="27" transform="rotate(${ha} 50 50)"/><line class="ln-clock-m" x1="50" y1="50" x2="50" y2="15" transform="rotate(${ma} 50 50)"/><circle class="ln-clock-pin" cx="50" cy="50" r="3.5"/></svg>`;
    }
    if (s.kind === 'receipt') {
      const items = s.items && s.items.length ? s.items : [{ name: 'Total', cents: s.total }];
      return `<div class="ln-receipt"><p class="ln-r-shop">CORNER STORE</p><ul>${items.map(x => `<li><span>${esc(x.name || 'Item')}</span><b>${C.money(x.cents)}</b></li>`).join('')}</ul><p class="ln-r-total"><span>Total</span><b>${C.money(s.total)}</b></p><p class="ln-r-thanks">Thank you</p></div>`;
    }
    if (s.kind === 'plate') return `<div class="ln-plate"><span class="ln-plate-top">MATH LENS</span><b>${esc(s.raw)}</b></div>`;
    return `<div class="ln-sign"><span>${esc(s.label || 'Number')}</span><b>${esc(s.raw)}</b></div>`;
  };

  const card = () => {
    onAbortCard();
    const c = list[active], host = play.querySelector('.ln-card');
    if (!c) { host.innerHTML = '<p>No challenges here. Try other digits.</p>'; return; }
    const solved = !!done[c.id];
    host.setAttribute('aria-labelledby', `lnTab${active}`);
    host.innerHTML = `
      <h3 class="ln-ctitle">${esc(c.title)}</h3>
      <p class="ln-prompt">${esc(c.prompt)}</p>
      <div class="ln-input">${inputHtml(c)}</div>
      <p class="ln-fb" aria-live="off"></p>
      <div class="ln-extra"></div>
      <div class="px-row ln-tools">
        <button type="button" class="md-btn md-btn--sm ln-hint">Hint</button>
        <button type="button" class="md-btn md-btn--sm ln-sol">Show a solution</button>
        <span class="px-sp"></span>
        <button type="button" class="md-btn md-btn--sm md-btn--primary ln-next"${active === list.length - 1 && !Object.keys(done).length ? ' hidden' : ''}>${active < list.length - 1 ? 'Next challenge' : 'Back to the first'}</button>
      </div>`;
    if (solved) host.querySelector('.ln-fb').innerHTML = `<span class="ln-ok">Solved.</span> Try it again, or move on.`;
    if (c.type === 'div') clueBox(c, false);
    wireCard(c, host);
  };
  const inputHtml = c => {
    if (c.input === 'yesno') return `<div class="ln-yn" role="group" aria-label="Your guess"><button type="button" class="md-btn ln-ans" data-yn="yes">Yes, it is</button><button type="button" class="md-btn ln-ans" data-yn="no">No, it is not</button></div>`;
    if (c.input === 'expr') return `
      <div class="ln-tiles" role="group" aria-label="Digits: tap to add">${c.spec.digits.map((d, i) => `<button type="button" class="ln-tile" data-d="${d}" data-i="${i}" aria-label="digit ${d}">${d}</button>`).join('')}</div>
      <div class="ln-ops" role="group" aria-label="Signs">${[...c.spec.ops].map(o => `<button type="button" class="ln-op" data-op="${o}" aria-label="${{ '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' }[o]}">${C.OP_SHOW[o]}</button>`).join('')}${c.spec.ops.length > 2 ? '<button type="button" class="ln-op" data-op="(" aria-label="open bracket">(</button><button type="button" class="ln-op" data-op=")" aria-label="close bracket">)</button>' : ''}<button type="button" class="ln-op ln-op--back" data-op="back" aria-label="delete last">⌫</button><button type="button" class="ln-op ln-op--back" data-op="clear" aria-label="clear">C</button></div>
      <form class="ln-exprf" novalidate><label class="px-live" for="lnExpr">Your expression</label><input id="lnExpr" class="ln-in ln-expr" type="text" autocomplete="off" spellcheck="false" inputmode="text" placeholder="Tap or type, like (7 − 4) × 8"><span class="ln-val" aria-live="off"></span><button class="md-btn md-btn--primary" type="submit">Check</button></form>`;
    return `<form class="ln-numf" novalidate><label class="px-live" for="lnAns">Your answer</label>${c.input === 'money' ? '<span class="ln-cur" aria-hidden="true">$</span>' : ''}<input id="lnAns" class="ln-in ln-num" type="text" inputmode="decimal" autocomplete="off" placeholder="${c.input === 'money' ? '0.00' : '?'}">${c.id === 'angle' ? '<span class="ln-unit">°</span>' : ''}<button class="md-btn md-btn--primary" type="submit">Check</button></form>`;
  };
  const feedback = (host, c, res) => {
    const fb = host.querySelector('.ln-fb');
    fb.innerHTML = `<span class="${res.ok ? 'ln-ok' : 'ln-no'}">${res.ok ? 'Yes!' : 'Hmm.'}</span> ${esc(res.msg)}`;
    say(res.msg);
    fb.classList.remove('is-pop'); void fb.offsetWidth; fb.classList.add('is-pop');
    if (res.ok) solve(c, host); else { sfx('no'); host.classList.remove('is-shake'); void host.offsetWidth; host.classList.add('is-shake'); }
  };
  const solve = (c, host) => {
    const first = !done[c.id]; done[c.id] = true;
    sfx('ok');
    if (first) {
      S.solved++;
      const e = S.journal.find(x => x.id === entryId); if (e && !e.solved.includes(c.id)) e.solved.push(c.id);
      save(); track('lens/solve', c.title);
    }
    const tab = play.querySelector(`[data-tab="${active}"]`); tab.classList.add('is-done'); tab.querySelector('.ln-tab-n').textContent = '✓';
    if (c.id === 'angle') drawArc();
    host.querySelector('.ln-next').hidden = false;
    if (list.every(x => done[x.id]) && first) { confetti(70); sfx('win'); toast(`All ${list.length} solved. Find more digits out there!`); say(`All ${list.length} challenges solved.`); }
    drawJournal();
  };
  const drawArc = () => {
    const arc = play.querySelector('.ln-clock-arc'); if (!arc || !src.time) return;
    const { h, m } = src.time; let a1 = ((h % 12) * 30 + m * 0.5) % 360, a2 = (m * 6) % 360;
    let d = (a2 - a1 + 360) % 360; if (d > 180) { [a1, a2] = [a2, a1]; d = 360 - d; }
    const P = a => [50 + 24 * Math.sin((a * Math.PI) / 180), 50 - 24 * Math.cos((a * Math.PI) / 180)];
    const [x1, y1] = P(a1), [x2, y2] = P(a1 + d);
    arc.setAttribute('d', `M50 50 L${x1.toFixed(2)} ${y1.toFixed(2)} A24 24 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
  };
  const clueBox = (c, add) => {
    const box = play.querySelector('.ln-extra'), k = c.k;
    if (add) { const cl = c.clue(); S.clues[k] = [cl, ...S.clues[k].filter(x => x.n !== cl.n)].slice(0, 6); save(); }
    const clues = S.clues[k] || [];
    if (!clues.length) { box.innerHTML = ''; return; }
    const know = clues.length >= 3;
    box.innerHTML = `<div class="ln-clues"><p class="ln-clues-h">Your clue collection for ${k}</p><ul>${clues.map(x => `<li class="${x.yes ? 'is-yes' : 'is-no'}"><b>${esc(x.n)}</b><span>${esc(x.clue)}</span><em>${x.yes ? `in the ${k} table` : 'not'}</em></li>`).join('')}</ul>
      ${know ? `<p class="ln-rule"><b>The rule you discovered:</b> ${esc(C.RULES[k].rule)}</p>` : `<p class="px-note">Look at the ${k === 11 ? 'alternating sums' : 'digit sums'}. Do you see what the yes numbers share? ${3 - clues.length} more clue${3 - clues.length > 1 ? 's' : ''} and the rule appears.</p>`}</div>`;
  };
  const wireCard = (c, host) => {
    const ctl = child(signal), sig = ctl.signal;
    on(host, 'click', e => {
      if (e.target.closest('.ln-hint')) { host.querySelector('.ln-extra').insertAdjacentHTML('afterbegin', `<p class="ln-hinttext"><b>Hint:</b> ${esc(c.hint)}</p>`); e.target.closest('.ln-hint').disabled = true; say(c.hint); return; }
      if (e.target.closest('.ln-sol')) { host.querySelector('.ln-extra').insertAdjacentHTML('beforeend', `<ol class="ln-steps">${c.solution.map(s => `<li>${esc(C.pretty(s))}</li>`).join('')}</ol>`); e.target.closest('.ln-sol').disabled = true; say(c.solution.join(' ')); if (c.id === 'angle') drawArc(); track('lens/reveal', c.title); return; }
      if (e.target.closest('.ln-next')) { go((active + 1) % list.length, true); return; }
      const yn = e.target.closest('[data-yn]');
      if (yn) {
        const res = c.check(yn.dataset.yn);
        host.querySelectorAll('[data-yn]').forEach(b => { b.disabled = true; b.classList.toggle('is-picked', b === yn); });
        feedback(host, c, res); clueBox(c, true);
        if (!res.ok) host.querySelector('.ln-next').hidden = false;
        return;
      }
      const t = e.target.closest('.ln-tile, .ln-op');
      if (t) {
        const inp = host.querySelector('.ln-expr');
        if (t.dataset.op === 'back') inp.value = inp.value.replace(/\s*\S\s*$/, '');
        else if (t.dataset.op === 'clear') inp.value = '';
        else { const tok = t.dataset.d ?? C.OP_SHOW[t.dataset.op] ?? t.dataset.op; inp.value = (inp.value + (/[\d)]$/.test(inp.value.trim()) && /[\d(]/.test(tok) ? ' × ' : ' ') + tok).replace(/^\s+/, '').replace(/\(\s/g, '(').replace(/\s\)/g, ')'); if (t.dataset.d) tone(PENTA[+t.dataset.d % PENTA.length], { dur: 0.08, type: 'triangle', gain: 0.07 }); }
        live(c, host);
      }
    }, sig);
    const ef = host.querySelector('.ln-exprf');
    if (ef) {
      const inp = ef.querySelector('.ln-expr');
      on(inp, 'input', () => live(c, host), sig);
      on(ef, 'submit', e => { e.preventDefault(); feedback(host, c, c.check(inp.value)); }, sig);
    }
    const nf = host.querySelector('.ln-numf');
    if (nf) on(nf, 'submit', e => { e.preventDefault(); const v = nf.querySelector('.ln-num').value; if (!v.trim()) { nf.querySelector('.ln-num').focus(); return; } feedback(host, c, c.check(v)); }, sig);
    onAbortCard = () => ctl.abort();
  };
  /* Live value and digit tiles used, as you build the expression */
  const live = (c, host) => {
    const inp = host.querySelector('.ln-expr'), val = host.querySelector('.ln-val');
    const r = C.parseExpr(inp.value);
    val.textContent = r.ok ? `= ${C.fshow(r.value)}` : '';
    val.classList.toggle('is-hit', r.ok && r.value[0] === c.spec.target * r.value[1]);
    const used = r.ok ? r.nums : (inp.value.match(/\d+/g) || []).map(Number);
    const left = [...used];
    host.querySelectorAll('.ln-tile').forEach(b => { const k = left.indexOf(+b.dataset.d); b.classList.toggle('is-used', k >= 0); if (k >= 0) left.splice(k, 1); });
  };
  const go = (i, focus) => {
    active = i;
    play.querySelectorAll('[data-tab]').forEach(b => { const on_ = +b.dataset.tab === i; b.setAttribute('aria-selected', String(on_)); b.tabIndex = on_ ? 0 : -1; });
    card();
    if (focus) { const f = play.querySelector('.ln-card input, .ln-card .ln-ans'); (f || play.querySelector(`[data-tab="${i}"]`)).focus({ preventScroll: true }); play.querySelector('.ln-card').scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
    say(`${list[i].title}. ${list[i].prompt}`);
  };
  on(play, 'click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { go(+tb.dataset.tab, false); return; }
    if (e.target.closest('.ln-new')) { wrap.querySelector('.ln-find').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); wrap.querySelector('[data-way="camera"]').focus({ preventScroll: true }); return; }
    if (e.target.closest('.ln-send')) {
      const payload = src.kind === 'receipt' && src.items?.length ? src.items.map(x => (x.cents / 100).toFixed(2)).join(' ') : src.kind === 'receipt' ? (src.total / 100).toFixed(2) : src.raw;
      share({ title: 'Math Lens', text: `I found ${src.raw} out in the world. Can you play it?`, url: shareUrl(`#/games/lens/d/${src.kind}/${encodeURIComponent(payload)}`) });
    }
  }, signal);
  on(play, 'keydown', e => {
    const tb = e.target.closest('[data-tab]'); if (!tb || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const n = list.length, i = +tb.dataset.tab;
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
    go(j, false); play.querySelector(`[data-tab="${j}"]`).focus();
  }, signal);

  /* ---------- Journal: digit strings and solved challenges only, never pictures ---------- */
  function drawJournal() {
    const items = S.journal;
    jour.innerHTML = `<h2 id="lnJH" class="ln-h2">Lens journal</h2>
      <p class="px-note">${items.length ? `${S.solved} challenge${S.solved === 1 ? '' : 's'} solved from ${items.length} catch${items.length === 1 ? '' : 'es'}. Only the digits are kept, in this browser. Never the picture.` : 'Digits you catch show up here, so you can play them again. Only the digits are kept, in this browser. Never the picture.'}</p>
      ${items.length ? `<ul class="ln-jlist">${items.map(x => `<li><button type="button" class="ln-jitem" data-j="${x.id}" aria-label="Play ${esc(C.KINDS[x.kind])} ${esc(x.raw)} again"><span class="ln-jkind ln-jkind--${x.kind}">${esc(C.KINDS[x.kind])}</span><b>${esc(x.raw)}</b><small>${x.solved.length ? `${x.solved.length} solved` : 'not played yet'} · ${esc(x.day)}</small></button></li>`).join('')}</ul>
      <button type="button" class="md-btn md-btn--sm ln-jclear">Clear the journal</button>` : ''}`;
  }
  on(jour, 'click', e => {
    const b = e.target.closest('[data-j]');
    if (b) {
      const x = S.journal.find(j => j.id === b.dataset.j); if (!x) return;
      const s = { kind: x.kind, raw: x.raw, digits: x.digits, label: x.label, time: x.time };
      if (x.kind === 'receipt') { s.items = (x.items || []).map(([name, cents]) => ({ name, cents })); s.total = Number(x.digits); }
      entryId = x.id; begin(s, 'journal', false); return;
    }
    if (e.target.closest('.ln-jclear')) { if (globalThis.confirm && !globalThis.confirm('Clear every catch from the journal?')) return; S.journal = []; S.solved = 0; save(); drawJournal(); say('Journal cleared.'); }
  }, signal);
  drawJournal();

  /* Digits someone sent: #/games/lens/d/<kind>/<digits> */
  if (params[0] === 'd' && params[1] && params[2]) {
    const s = C.sourceFrom(params[2], C.KINDS[params[1]] ? params[1] : undefined);
    if (s) { if (s.kind === 'receipt' && s.items?.length) s.items = s.items.map((x, i) => ({ name: `Item ${i + 1}`, cents: x.cents })); later(() => begin(s, 'link'), 0, signal); }
  }
}
