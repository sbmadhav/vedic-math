/* A Star round (openspec star-round): 4 shuffled questions on one Trick, a replay of the Trick on the Player's own
   numbers after a miss, a rematch of the same kind (a Comeback when it is right), and one optional Dare.
   The round itself is a pure state machine (starRound, starAnswer, starNext, starDare) with no DOM, so every rule is
   a node test; runStar() below draws it and is the only part that touches the page. */
import { starPool, starThird, sigOf, sigOfKey, dareFor } from './levels.js';
import { TRICKS } from './vedic.js';
import { byId } from './skills/index.js';
import { checkOne } from './check.js';
import { answerText } from './answers.js';
import { boltHTML, pose } from './bolt.js';
import { on, later, child, onAbort } from './life.js';
import { facade } from './watch.js';
import * as store from './store.js';
import * as fx from './fx.js';
import * as AD from './adapt.js';
import * as metrics from './metrics.js';
import { listenBtn, stopListen } from './listen.js';

export const ROUND = 4;
export const SPARK = { right: 10, comeback: 15, dare: 20 };
export const TARGET = 40;
const shuffle = (arr, rand = Math.random) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- The engine ---------- */
/* A new round. last: the keys the previous round on this Star dealt (they go to the back of the deck).
   pool: the problems to deal from (default: the Star's band at this Rating, js/levels.js starPool). */
export function starRound({ trick, star, rating = 1, last = [], pool = null, third = null, rand = Math.random } = {}) {
  const band = pool || starPool(trick, star, rating);
  const lastSigs = new Set(last.map(k => band.find(p => p.key === k)).filter(Boolean).map(sigOf));
  if (!pool) for (const k of last) { const s = sigOfKey(trick, k); if (s) lastSigs.add(s); }
  const mixed = shuffle(band, rand), fresh = mixed.filter(p => !lastSigs.has(sigOf(p))), old = mixed.filter(p => lastSigs.has(sigOf(p)));
  const deck = fresh.concat(old), qs = deck.slice(0, ROUND);
  return {
    trick, star, rand, band: deck, third, qs, k: 0, mode: 'main', current: qs[0], replayOf: null, sparks: 0, misses: 0,
    usedKinds: new Set(), used: new Set(qs.map(sigOf)), dareOffered: false, dareDone: false, offerShown: false,
    results: qs.map(() => null), lit: false
  };
}
/* The keys this round deals (saved as the Star's last round when it starts) */
export const roundKeys = st => st.qs.map(p => p.key);

/* A rematch for a missed question: the first unused problem of the same kind in the band, else of the same kind
   anywhere in the Star's third, else any unused problem in the band (design decision 3) */
export function pickRematch(st, missed) {
  const unused = p => !st.used.has(sigOf(p)), same = p => p.qkind === missed.qkind && unused(p);
  let p = st.band.find(same);
  if (!p) { st.third = st.third || starThird(st.trick, st.star); p = shuffle(st.third.filter(same), st.rand)[0]; }
  if (!p) p = st.band.find(unused) || st.band.find(x => sigOf(x) !== sigOf(missed)) || missed;
  st.used.add(sigOf(p));
  return p;
}

const copy = st => ({ ...st, usedKinds: new Set(st.usedKinds), used: new Set(st.used), results: st.results.slice() });
/* Move on to the next main question, or end the round after the last */
function advance(st, events) {
  st.k++;
  if (st.k >= st.qs.length) {
    st.mode = 'end'; st.current = null; st.lit = st.sparks >= TARGET;
    if (st.lit) events.push({ type: 'lit' });
    events.push({ type: 'end', total: st.sparks, lit: st.lit });
    return;
  }
  st.mode = 'main'; st.current = st.qs[st.k]; st.dareOffered = true;
}

/* One answer to the current question. Returns { state, events }: each event has a type, the Sparks it earns
   (sparks) and dial, the Dial hit it makes (true, false, or undefined for none). */
export function starAnswer(prev, ok) {
  const st = copy(prev), events = [], p = st.current;
  if (st.mode === 'main') {
    if (ok) { st.sparks += SPARK.right; st.results[st.k] = 'ok'; events.push({ type: 'right', sparks: SPARK.right, dial: true }); advance(st, events); }
    else { st.misses++; st.results[st.k] = 'miss'; st.mode = 'replay'; st.replayOf = 'main'; events.push({ type: 'miss', dial: false, problem: p }, { type: 'replay', problem: p }); }
  } else if (st.mode === 'rematch') {
    if (ok) {
      if (!st.usedKinds.has(p.qkind)) { st.usedKinds.add(p.qkind); st.sparks += SPARK.comeback; st.results[st.k] = 'cb'; events.push({ type: 'comeback', sparks: SPARK.comeback, dial: true }); }
      else { st.sparks += SPARK.right; st.results[st.k] = 'ok'; events.push({ type: 'right', sparks: SPARK.right, dial: true }); }
    } else { st.misses++; events.push({ type: 'miss', dial: false, problem: p }, { type: 'reveal', problem: p }); }
    advance(st, events);
  } else if (st.mode === 'dare') {
    if (ok) { st.sparks += SPARK.dare; events.push({ type: 'dare-won', sparks: SPARK.dare, dial: true }); st.mode = 'main'; st.current = st.qs[st.k]; }
    else { st.mode = 'replay'; st.replayOf = 'dare'; events.push({ type: 'dare-lost', problem: p }, { type: 'replay', problem: p }); }
  } else return { state: prev, events: [] };
  return { state: st, events };
}

/* After a replay (watched or skipped) or the video offer: the offer once after the second miss when a video is
   available, then the rematch; after a Dare's replay, back to the same main question */
export function starNext(prev, { videoAvailable = false } = {}) {
  const st = copy(prev), events = [];
  if (st.mode === 'replay' && st.replayOf === 'dare') { st.mode = 'main'; st.current = st.qs[st.k]; st.replayOf = null; return { state: st, events }; }
  if (st.mode === 'replay' && st.misses >= 2 && !st.offerShown && videoAvailable) { st.mode = 'offer'; st.offerShown = true; events.push({ type: 'offer' }); return { state: st, events }; }
  if (st.mode === 'replay' || st.mode === 'offer') {
    const missed = st.qs[st.k]; st.current = pickRematch(st, missed); st.mode = 'rematch'; st.replayOf = null;
    events.push({ type: 'rematch', problem: st.current });
    return { state: st, events };
  }
  return { state: prev, events };
}

/* Take the Dare: from question 2 on, once a round, between main questions */
export const canDare = st => st.mode === 'main' && st.dareOffered && !st.dareDone;
export function starDare(prev, problem = null) {
  if (!canDare(prev)) return { state: prev, events: [] };
  const st = copy(prev), p = problem || dareFor(st.trick, st.star, st.used, st.rand);
  st.used.add(sigOf(p)); st.dareDone = true; st.mode = 'dare'; st.current = p;
  return { state: st, events: [{ type: 'dare', problem: p }] };
}

/* ---------- The view ---------- */
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* Text for the live region: no tags, and entities as words a screen reader reads */
const said = h => String(h).replace(/<sup>2<\/sup>/g, ' squared').replace(/<sup>3<\/sup>/g, ' cubed').replace(/<[^>]+>/g, '').replace(/&minus;/g, '-').replace(/&times;/g, ' times ').replace(/&divide;/g, ' divided by ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const SPARK_SVG = '<svg class="star-spark" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><path d="M0-11C1.5-2 2-1.5 11 0C2 1.5 1.5 2 0 11C-1.5 2-2 1.5-11 0C-2-1.5-1.5-2 0-11Z"/></svg>';
const PRAISE = ['Yes!', 'Nailed it.', 'Smooth.', 'Boom.', 'Right!'];
const pickOne = a => a[Math.floor(Math.random() * a.length)];

/* Plays one Star round in root. trick: a Trick id; star: 1 to 3; signal: the view's (everything stops when it aborts).
   back: { href, label } for the end screen's way out; again(): Play again; findVideo(trickId, mode): a Promise of
   { title, src, open? } (src: an embeddable video URL; open(opener): plays it elsewhere and resolves when closed) or null.
   Returns { destroy }, which saves the Rating. */
export function runStar(root, { trick, star, signal, back = { href: '#/dojo', label: 'Back to the Dojo' }, again = null, findVideo = async () => null } = {}) {
  const t = TRICKS.find(x => x.id === trick), skill = byId['v-' + trick], mode = fx.mode() || 'challenger', boxes = mode !== 'pro';
  const round = child(signal), rs = round.signal;
  const rating = AD.skillRating('v-' + trick, mode), dial = new AD.Dial(rating);
  let st = starRound({ trick, star, rating, last: store.starLast(trick, star) });
  store.setStarLast(trick, star, roundKeys(st)); /* saved at the start, so leaving mid-round still counts as the last round */
  const wasLit = store.starState(trick, star) === 'lit';
  let video = null, phase = null, entry = '', fields = [], active = 0, input = false, dialSaved = false, dareP = null, replaySkip = null, shown = 0;
  Promise.resolve().then(() => findVideo(trick, mode)).then(v => { if (!rs.aborted) video = v || null; }).catch(() => {});
  const videoAvailable = () => !!(video && video.src) && navigator.onLine !== false;
  const saveDial = () => { if (dialSaved) return; dialSaved = true; AD.saveRating('skill:v-' + trick, dial); };

  root.innerHTML = `<div class="star-round${fx.noMotion() ? ' still' : ''}">
    <header class="star-top"><div><span class="md-tag md-tag--plum">Star ${star} of 3</span><h1 class="md-heading star-h">${esc(t.title)}</h1></div>
      <button type="button" class="md-btn md-btn--sm" id="stSkip">Skip this Star</button></header>
    <div class="star-hud"><span class="star-dots" id="stDots" role="img"></span>
      <span class="star-meter">${SPARK_SVG}<span class="star-bar" id="stMeter" role="progressbar" aria-label="Sparks to light this Star" aria-valuemin="0" aria-valuemax="${TARGET}" aria-valuenow="0" aria-valuetext="0 of ${TARGET} Sparks"><i></i></span><b class="star-meter-n" id="stMeterN" aria-hidden="true">0/${TARGET}</b></span></div>
    <div class="star-arena">
      <div class="star-stage md-card" id="stStage">
        <div class="star-talk"><span class="star-bolt">${boltHTML('idle')}</span><p class="star-say" id="stSay"></p></div>
        <div class="star-main" id="stMain"></div>
      </div>
      <div class="star-side" id="stSide">
        <button type="button" class="star-dare" id="stDare" hidden></button>
        <div class="star-pad" id="stPad" role="group" aria-label="Number pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => `<button type="button" class="star-key" data-k="${k}">${k}</button>`).join('')}<button type="button" class="star-key star-key--fn" data-k="-" aria-label="Minus">&minus;</button><button type="button" class="star-key" data-k="0">0</button><button type="button" class="star-key star-key--fn" data-k="del">Del</button><button type="button" class="star-key star-key--go" data-k="go">Check</button></div>
      </div>
    </div></div>`;
  const $ = s => root.querySelector(s), main = $('#stMain'), stage = $('#stStage'), boltEl = $('.star-bolt'), pad = $('#stPad'), dareBtn = $('#stDare');
  const say = (html, p = null) => { $('#stSay').innerHTML = html; if (p) pose(boltEl, p); };
  const hud = () => {
    const v = Math.min(TARGET, st.sparks), bar = $('#stMeter');
    bar.setAttribute('aria-valuenow', String(v)); bar.setAttribute('aria-valuetext', `${st.sparks} of ${TARGET} Sparks`);
    bar.querySelector('i').style.width = `${(v / TARGET) * 100}%`; bar.parentNode.classList.toggle('full', st.sparks >= TARGET);
    $('#stMeterN').textContent = `${st.sparks}/${TARGET}`;
    const d = $('#stDots'); d.innerHTML = st.qs.map((_, i) => `<i class="${st.results[i] || ''}${i === st.k && st.mode !== 'end' ? ' cur' : ''}"></i>`).join('');
    const right = st.results.filter(r => r === 'ok' || r === 'cb').length;
    d.setAttribute('aria-label', st.mode === 'end' ? `${right} of ${st.qs.length} right` : `Question ${st.k + 1} of ${st.qs.length}, ${right} right so far`);
  };
  const newPhase = () => { if (phase) phase.abort(); phase = child(rs); replaySkip = null; input = false; return phase.signal; };
  const ansOf = p => answerText(p, skill);

  /* ---------- Celebrations (openspec celebrations): a right answer twinkles; only a lit Star gets the big confetti ---------- */
  const small = (n = 8) => { const at = $('#stBoxes') || $('#stPop') || stage; fx.sparkle(at, { n, signal: rs }); fx.bounce(at, rs); fx.twinkle($('#stPop'), rs); };

  /* ---------- Answer entry ---------- */
  const maxLen = p => (boxes && p.kind === 'num' ? String(p.answer).length : 12);
  function entryHTML(p) {
    if (p.kind === 'choice') return `<div class="star-choices" role="group" aria-label="Choices">${p.choices.map(c => `<button type="button" class="md-btn star-choice" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
    if (p.kind === 'fields') return `<div class="star-fields">${p.fields.map((f, i) => `<button type="button" class="star-field" data-f="${i}" aria-pressed="${i === 0}"><small>${esc(f.label)}</small><output aria-live="off"></output></button>`).join('')}</div>`;
    if (boxes) return `<div class="star-boxes" id="stBoxes" aria-hidden="true">${'<span></span>'.repeat(maxLen(p))}</div><output class="vh" id="stOut" aria-live="off" aria-label="Your answer"></output>`;
    return `<output class="star-plain" id="stOut" aria-live="off" aria-label="Your answer"></output>`;
  }
  function showEntry() {
    const p = st.current;
    if (p.kind === 'fields') { root.querySelectorAll('.star-field').forEach((b, i) => { b.querySelector('output').textContent = fields[i] || ''; b.setAttribute('aria-pressed', String(i === active)); }); return; }
    const out = $('#stOut'); if (out) out.textContent = entry;
    const bx = $('#stBoxes'); if (bx) [...bx.children].forEach((b, i) => { b.textContent = entry[i] || ''; b.classList.toggle('f', i < entry.length); });
  }
  function type(k) {
    if (!input) return; const p = st.current; if (p.kind === 'choice') return;
    if (p.kind === 'fields') {
      let v = fields[active] || '';
      if (k === 'del') v = v.slice(0, -1); else if (k === '-') v = v ? v : '-'; else if (v.length < 12) v += k;
      fields[active] = v; showEntry(); return;
    }
    if (k === 'del') entry = entry.slice(0, -1); else if (k === '-') entry = entry ? entry : '-'; else if (entry.length < maxLen(p)) entry += k;
    showEntry(); fx.sfx('tap');
  }
  function go() {
    if (!input) return; const p = st.current;
    if (p.kind === 'choice') return;
    if (p.kind === 'fields') {
      const empty = p.fields.findIndex((_, i) => !fields[i] || fields[i] === '-');
      if (empty >= 0) { if ((fields[active] || '') && active !== empty) { active = empty; showEntry(); } else say('Fill in every box first.', 'think'); return; }
      return answer(p.fields.every((f, i) => checkOne({ kind: 'num', answer: f.answer }, fields[i]).ok));
    }
    if (!entry || entry === '-') { say('Type an answer first.', 'think'); return; }
    const r = checkOne(p, entry); if (r.notAnswer) { say('Type just the answer, like 56.', 'think'); return; }
    answer(r.ok);
  }
  on(pad, 'click', e => { const b = e.target.closest('[data-k]'); if (!b) return; if (b.dataset.k === 'go') go(); else type(b.dataset.k); }, rs);
  /* One keyboard listener for the round: digits, minus, Backspace, Enter, and Escape to skip a replay */
  on(document, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const tg = e.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (e.key === 'Escape' && replaySkip) { e.preventDefault(); replaySkip(); return; }
    if (!input) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); type(e.key); }
    else if (e.key === '-' || e.key === 'Subtract') { e.preventDefault(); type('-'); }
    else if (e.key === 'Backspace') { e.preventDefault(); type('del'); }
    else if (e.key === 'Enter' && !(tg && tg.closest && tg.closest('button, a'))) { e.preventDefault(); go(); }
  }, rs);
  on($('#stSkip'), 'click', () => skipStar(), rs);
  on(dareBtn, 'click', () => { if (!canDare(st) || !dareP) return; st = starDare(st, dareP).state; metrics.starEvent('dare_taken', trick); fx.sfx('pop'); ask(); }, rs);

  /* ---------- Phases ---------- */
  function ask() {
    const ps = newPhase(), p = st.current; entry = ''; fields = []; active = 0;
    const tag = st.mode === 'rematch' ? '<span class="star-tag star-tag--rematch">Rematch</span>' : st.mode === 'dare' ? '<span class="star-tag star-tag--dare">Dare</span>' : `<span class="star-tag">Question ${st.k + 1} of ${st.qs.length}</span>`;
    main.innerHTML = `<div class="star-ask">${tag}<h2 class="star-q${said(p.q).length > 16 ? ' star-q--long' : ''}" id="stQ" tabindex="-1">${p.q}</h2>${entryHTML(p)}<p class="star-pop" id="stPop" aria-hidden="true"></p></div>`;
    pad.hidden = p.kind === 'choice'; pad.querySelectorAll('button').forEach(b => (b.disabled = false));
    if (st.mode === 'main' && canDare(st)) {
      if (!dareP) dareP = dareFor(trick, star, st.used);
      dareBtn.innerHTML = `${SPARK_SVG}<span class="star-dare-t"><span class="star-dare-k">Dare</span><b>${dareP.q}</b><small>Double Sparks. A miss costs nothing.</small></span>`;
      dareBtn.setAttribute('aria-label', `Take the Dare: ${said(dareP.q)}. Double Sparks, a miss costs nothing.`);
      dareBtn.hidden = false;
    } else dareBtn.hidden = true;
    if (st.mode === 'rematch') say('Your turn. One just like it.', 'think');
    else if (st.mode === 'dare') say('Brave! A harder one. A miss costs nothing.', 'explain');
    else say(st.k === 0 ? `Star ${star}: four questions. Go!` : st.k === st.qs.length - 1 ? 'Last one!' : pickOne(['Next one.', 'Keep going.', 'You got this.']), 'idle');
    root.querySelectorAll('.star-choice').forEach(b => on(b, 'click', () => { if (input) answer(b.dataset.v === p.answer); }, ps));
    root.querySelectorAll('.star-field').forEach(b => on(b, 'click', () => { active = +b.dataset.f; showEntry(); }, ps));
    hud(); showEntry(); input = true; fx.speakQuestion(p);
    if (shown++) $('#stQ').focus({ preventScroll: true });
  }

  function answer(ok) {
    input = false; pad.querySelectorAll('button').forEach(b => (b.disabled = true));
    const p = st.current, was = st.mode;
    store.record('v-' + trick, ok, false, { sparks: false }); /* counts, mastery and quests; the Star pays its own Sparks */
    metrics.answered('star', ok);
    const r = starAnswer(st, ok); st = r.state;
    for (const e of r.events) {
      if (e.dial !== undefined) dial.hit(e.dial); if (e.sparks) store.addSparks(e.sparks, 'star');
      /* Star Quest counts (sky-home analytics spec): anonymous, the Trick id only */
      if (e.type === 'comeback') metrics.starEvent('comeback', trick); else if (e.type === 'dare-won') metrics.starEvent('dare_won', trick); else if (e.type === 'lit') metrics.starEvent('lit', trick);
    }
    hud(); fx.sfx(ok ? 'ok' : 'no');
    const ty = r.events.map(e => e.type), ans = ansOf(p), pop = $('#stPop'), bx = $('#stBoxes');
    if (bx) bx.classList.add(ok ? 'ok' : 'no');
    root.querySelectorAll('.star-choice').forEach(b => { b.disabled = true; if (b.dataset.v === String(p.answer)) b.classList.add('ok'); });
    const then = (ms, fn) => later(fn, fx.noMotion() ? Math.max(ms, 900) : ms, phase.signal);
    const after = () => (st.mode === 'end' ? end() : ask());
    if (ty.includes('comeback')) {
      say('Comeback! That is how you use a mistake. <span class="fx-sparks">+15 Sparks</span>', 'wink'); pop.textContent = '+15';
      fx.announce(`Right, ${said(ans)}. Comeback! 15 Sparks.`); small(12); then(1400, after);
    } else if (ty.includes('dare-won')) {
      say(`Dare crushed! <span class="fx-sparks">+20 Sparks</span>`, 'cheer'); pop.textContent = '+20';
      fx.announce(`Right, ${said(ans)}. Dare won. 20 Sparks.`); small(12); then(1300, after);
    } else if (ty.includes('right')) {
      say(`${pickOne(PRAISE)} <span class="fx-sparks">+10 Sparks</span>`, 'cheer'); pop.textContent = '+10';
      fx.announce(`Right, ${said(ans)}. 10 Sparks.`); small(); then(1100, after);
    } else if (ty.includes('reveal')) {
      say(`Close! It is <b>${ans}</b>. Onward.`, 'think');
      fx.announce(`Not quite. It is ${said(ans)}.`);
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'md-btn md-btn--primary star-next'; btn.id = 'stNext';
      btn.textContent = st.mode === 'end' ? 'See how you did' : 'Next question';
      main.querySelector('.star-ask').append(btn); on(btn, 'click', after, phase.signal); btn.focus({ preventScroll: true });
    } else if (ty.includes('dare-lost')) {
      say('So close! A Dare miss costs nothing. Watch how it works.', 'surprised');
      fx.announce('Not quite. A Dare miss costs nothing. Here is how it works.'); then(900, () => replay(p, 'dare'));
    } else if (ty.includes('miss')) {
      say('Not quite. Watch the trick on your numbers.', 'surprised');
      fx.announce('Not quite. Here is the trick on your numbers.'); then(900, () => replay(p, was));
    }
  }

  /* The Trick worked step by step on the missed question's own numbers, with Listen once every step is shown; Skip or
     Escape ends it at once */
  function replay(p, of) {
    const ps = newPhase(), steps = t.steps(p.vals); let i = 0;
    dareBtn.hidden = true; pad.querySelectorAll('button').forEach(b => (b.disabled = true));
    main.innerHTML = `<div class="star-replay"><span class="star-tag star-tag--trick">The Trick</span><h2 class="star-q star-q--sm" id="stQ" tabindex="-1">${p.q}</h2>
      <ol class="star-steps" id="stSteps"></ol><p class="star-acts"><button type="button" class="md-btn md-btn--sm" id="stRSkip">Skip</button></p></div>`;
    say(of === 'dare' ? 'Here is the Dare, step by step.' : 'Here is how the trick does it.', 'explain');
    const list = $('#stSteps'), done = () => {
      replaySkip = null; const b = $('#stRSkip');
      b.textContent = of === 'dare' ? 'Back to the question' : 'Try one like it'; b.className = 'md-btn md-btn--primary'; b.id = 'stRGo';
      replaySkip = next; b.insertAdjacentHTML('beforebegin', listenBtn('from:.star-step > p', 'the steps')); b.focus({ preventScroll: true });
    };
    const next = () => { if (ps.aborted) return; const r = starNext(st, { videoAvailable: videoAvailable() }); st = r.state; if (r.events.some(e => e.type === 'offer')) offer(); else ask(); };
    const add = () => {
      const s = steps[i++], li = document.createElement('li'); li.className = 'star-step';
      li.innerHTML = `<div class="anim-show">${s.show}</div><p>${s.say}</p>`; list.append(li); fx.announce(said(s.say));
      if (i < steps.length) later(add, 2500, ps); else done();
    };
    replaySkip = next; on($('#stRSkip'), 'click', () => replaySkip && replaySkip(), ps);
    onAbort(ps, stopListen); // the replay ending (Skip, Go, Escape) stops its Listen
    add();
  }

  /* After the second miss's replay, once a round: one short video for the Trick, if one is available */
  function offer() {
    const ps = newPhase();
    say('Want to see a short video about this trick? It is optional.', 'explain');
    main.innerHTML = `<div class="star-offer"><span class="star-tag">Video</span><h2 class="star-q star-q--sm" tabindex="-1">${esc(video.title || t.title)}</h2>
      <div class="star-video" id="stVideo"></div><p class="star-acts"><button type="button" class="md-btn md-btn--primary" id="stWatch">Watch</button><button type="button" class="md-btn" id="stNoVid">No thanks</button></p></div>`;
    const close = () => { st = starNext(st).state; ask(); };
    on($('#stWatch'), 'click', () => {
      if (video.open) { video.open($('#stWatch')).then(() => { if (!ps.aborted) close(); }); return; } /* the in-page player; closing it goes back to the round */
      /* No player of its own: the facade here, and the frame only once play is pressed (watch-shelf spec) */
      const frame = $('#stVideo'); frame.innerHTML = `<div class="vp-frame">${facade(video.thumb || null)}</div>`;
      on(frame.querySelector('.vp-play'), 'click', () => {
        frame.firstElementChild.innerHTML = `<iframe src="${esc(video.src)}" title="${esc(video.title || t.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      }, ps);
      $('#stWatch').remove(); $('#stNoVid').textContent = 'Back to the round';
      frame.querySelector('.vp-play').focus({ preventScroll: true });
    }, ps);
    on($('#stNoVid'), 'click', close, ps);
    $('#stWatch').focus({ preventScroll: true });
  }

  function skipStar() {
    if (st.mode === 'end') return;
    const marked = store.skipStar(trick, star); if (marked) metrics.starEvent('skipped', trick);
    st = { ...st, mode: 'end', current: null, lit: false };
    fx.announce(marked ? `Star ${star} skipped.` : `Star ${star} stays lit.`);
    end(true);
  }

  /* The end screen waits for a button: Play again or Back. Nothing here navigates on its own. */
  function end(skipped = false) {
    newPhase(); saveDial();
    const lit = !skipped && st.lit, nowLit = lit && store.lightStar(trick, star), litNow = store.starState(trick, star) === 'lit';
    dareBtn.hidden = true; pad.hidden = true; $('#stSkip').hidden = true; hud();
    const need = Math.max(0, TARGET - st.sparks);
    const head = skipped ? (litNow ? `Star ${star} stays lit` : `Star ${star} skipped`) : lit ? `Star ${star} is lit!` : 'Round done';
    const line = skipped ? (litNow ? 'A lit Star stays lit.' : 'Come back to it any time. Lighting it later clears the mark.')
      : lit ? (nowLit ? 'It shines in your sky now.' : 'Still shining. Every round still earns Sparks.')
      : litNow ? 'It stays lit. Every round still earns Sparks.' : `${need} more Sparks to light it.`;
    main.innerHTML = `<div class="star-end"><h2 class="star-end-h" id="stQ" tabindex="-1">${head}</h2><p class="star-end-sp"><span class="fx-sparks">+${st.sparks} Sparks</span></p><p>${line}</p>
      <p class="star-acts"><button type="button" class="md-btn md-btn--primary" id="stAgain">Play again</button><a class="md-btn" href="${esc(back.href)}" id="stBack">${esc(back.label)}</a></p></div>`;
    say(lit ? 'You did it!' : skipped ? 'Okay. On to the next one when you are ready.' : 'Good practice. Every miss teaches.', lit ? 'cheer' : 'idle');
    if (!skipped) fx.announce(`${head}. ${st.sparks} Sparks earned. ${line}`);
    fx.rollSparks(main, rs);
    if (lit) { fx.confetti(110); fx.sfx('level'); } /* a Star lit is a true win: the big confetti */
    on($('#stAgain'), 'click', () => { if (again) again(); }, rs);
    $('#stQ').focus({ preventScroll: true });
  }

  ask();
  return { destroy: () => { saveDial(); round.abort(); } };
}
