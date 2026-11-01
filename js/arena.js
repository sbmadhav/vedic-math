/* Competitive play: the timed Arena (daily seeded rounds, so everyone in a league gets the same questions)
   and the two-player Duel on one device. */
import { byId } from './skills/index.js';
import { checkOne } from './check.js';
import { answerText } from './answers.js';
import { shuffle } from './lib.js';
import { sfx, speakQuestion, sparkle, tick, wiggle, t } from './fx.js';
import { on, later, loop, child } from './life.js';
import { keypadOnly } from './shell.js';
import { dailySet, practiceNext } from '../shared/src/questions.ts';
import { comboGain } from '../shared/src/scoring.ts';

export const ROUND_SECS = 60;
/* Untimed Arena Practice (openspec game-shell-and-calm): 20 questions, no clock, Finish at any time */
export const UNTIMED_QS = 20;
/* The question sets (League pools, seeded daily rounds, Practice questions) moved to shared/src/questions.ts
   (openspec change react-typescript, task 3.1), so a Duel's server can deal the same sets; re-exported here for the
   Legacy views and tests that import them from this module */
export { MENTAL_FROM, PRO_RAMP, makeSet, dailySet, practiceItem, practiceNext, storyItem, STORY_QS } from '../shared/src/questions.ts';

const PAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'del'];
/* The answer buttons shown for an item: its choices (4, around the answer), or n of them with the answer kept, in
   ascending order when fewer are shown (the Early band's 3, openspec change age-bands) */
function pickChoices(p, n) {
  const all = p.choices || [];
  if (n >= all.length) return all;
  const others = shuffle(all.filter(c => String(c) !== String(p.answer))).slice(0, n - 1);
  return [p.answer, ...others].sort((a, b) => a - b);
}
/* A physical keyboard on a touch screen, where the hidden input is read-only (js/shell.js keypadOnly): digits,
   the keys in allowed, Backspace and Enter type into it. One listener for the round, on its signal. */
function physicalKeys(root, allowed, max, rs, submit) {
  on(document, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const typ = root.querySelector('#arType'); if (!typ || !typ.readOnly) return;
    const tg = e.target; if (tg && tg !== typ && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (e.key === 'Backspace') typ.value = typ.value.slice(0, -1);
    else if (e.key === 'Enter') { if (tg && tg.closest && tg.closest('button, a')) return; e.preventDefault(); if (typ.value.trim()) submit(typ.value); return; }
    else if (/^[0-9]$/.test(e.key) || allowed.includes(e.key)) { if (typ.value.length < max) typ.value += e.key; }
    else return;
    e.preventDefault(); const out = root.querySelector('#arEntry'); if (out) out.textContent = typ.value;
  }, rs);
}

/* Arena round. opts: { league, day, dial, signal, onEnd({ score, right, wrong, bestCombo, answered }) }; answered: [{ item, ok }].
   day (YYYY-MM-DD): a daily round, dailySet(league, day), the same for everyone; dial (js/adapt.js Dial) only
   records the answers. No day: a Practice round, where dial picks each next question's difficulty and moves with
   every answer (openspec arena spec). The round runs under a child of signal, aborted when it ends or by destroy(),
   so its handlers never act on the next round drawn into the same root.
   untimed (Practice only): count questions (UNTIMED_QS by default) with no clock, a question counter and a Finish button.
   deal (Practice only): draws each next item instead of the Dial (the Word problems round, storyItem).
   Reading bands (openspec change age-bands; the caller reads the band, this round never does): tap makes a Practice
   round tap play with choices answer buttons (an Early reader's 3, in any League); the daily round keeps the League's
   input and its 4 choices for everyone (AB3). bar draws the clock as a bar alone, its seconds for screen readers only. */
export function runArena(root, { league, day = null, dial, signal, onEnd, untimed = false, deal = null, count = UNTIMED_QS, tap = false, choices = 4, bar = false }) {
  const set = day ? dailySet(league, day) : null, tapMode = league === 'explorer' || (!set && tap), nChoices = set ? 4 : choices;
  if (set) untimed = false; /* the daily round is a Ranked race: it always has its clock */
  const draw = deal || (() => practiceNext(league, dial));
  let cur = set ? null : draw();
  const at = () => (set ? set[i % set.length] : cur);
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, bestCombo = 0, over = false;
  const answered = []; /* every answered question and whether it was right: the round review (openspec change sutras-first) */
  const clock = untimed ? `<div class="ar-time"><small>Question</small><b id="arNum">1/${count}</b></div>` : `<div class="ar-time${bar ? ' md-sr-only' : ''}"><small>Time</small><b id="arTime">${ROUND_SECS}</b></div>`;
  root.innerHTML = `<div class="ar${untimed ? ' ar--untimed' : ''}${bar && !untimed ? ' ar--bar' : ''}">
    <div class="ar-top"><div class="ar-score"><small>Score</small><b id="arScore">0</b></div><div class="ar-combo" id="arCombo" aria-live="polite"></div>${clock}</div>
    ${untimed ? '<p class="ar-fin"><button type="button" class="md-btn md-btn--sm" id="arFinish">Finish</button></p>' : '<div class="g-timer ar-bar"><span id="arBar"></span></div>'}
    <span class="md-tag md-tag--teal ar-story" id="arStory" hidden></span><div class="ar-q" id="arQ" aria-live="polite"></div><div class="ar-viz" id="arViz"></div>
    <div id="arIn"></div><div class="ar-pop" id="arPop" aria-hidden="true"></div><p class="md-sr-only" id="arSay" role="status"></p></div>`;
  const $ = s => root.querySelector(s);
  const show = () => {
    const p = at(), qEl = $('#arQ'), tag = $('#arStory');
    qEl.innerHTML = p.q; $('#arViz').innerHTML = p.viz || '';
    qEl.classList.toggle('ar-q--story', !!p.story); tag.hidden = !p.story; tag.textContent = p.story ? p.label || '' : '';
    if (p.d) qEl.dataset.d = p.d; else delete qEl.dataset.d;
    if (tapMode) { const ch = pickChoices(p, nChoices); $('#arIn').innerHTML = `<div class="ar-choices">${ch.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join('')}</div>`; speakQuestion(p); }
    else { $('#arIn').innerHTML = `<form class="ar-form" id="arForm"><output class="ar-entry" id="arEntry" aria-label="Your answer"></output>${p.unit ? `<span class="ar-unit">${p.unit}</span>` : ''}<input class="ar-hidden" id="arType" inputmode="numeric" autocomplete="off" aria-label="Type your answer"><button class="md-btn md-btn--primary">Go</button></form><div class="ar-pad">${PAD.map(k => `<button type="button" class="ar-key" data-k="${k}">${k === 'del' ? 'Del' : k === '-' ? '&minus;' : k}</button>`).join('')}</div>`;
      const typ = $('#arType'); keypadOnly(typ); if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
      on(typ, 'input', () => { typ.value = typ.value.replace(/[^0-9-]/g, '').slice(0, 7); $('#arEntry').textContent = typ.value; }, rs);
      $('#arForm').onsubmit = e => { e.preventDefault(); if (typ.value.trim()) answer(typ.value); };
    }
  };
  const pop = (txt, ok) => { const el = $('#arPop'); el.textContent = txt; el.className = 'ar-pop show ' + (ok ? 'ok' : 'no'); later(() => (el.className = 'ar-pop'), 600, rs); };
  /* Everyday moments (openspec celebrations): the combo ticks, every fifth sparkles; a miss wiggles the answer it shows
     (#arPop stays up while the next question is drawn, so the wiggle stays on the miss) */
  const celebrate = ok => { if (!ok) { wiggle($('#arPop'), rs); return; } if (combo >= 2) tick($('#arCombo b'), rs); if (combo % 5 === 0) sparkle($('#arCombo'), { n: 10, signal: rs }); };
  const answer = v => {
    if (over) return;
    const p = at(), ok = checkOne({ kind: 'num', answer: p.answer }, String(v)).ok;
    if (dial) dial.hit(ok);
    answered.push({ item: p, ok });
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); const gain = comboGain(combo); score += gain; right++; sfx('ok'); pop('+' + gain, true); }
    else { combo = 0; wrong++; sfx('no'); pop(String(p.answer), false); }
    /* The pop is visual only; screen readers get one short status message per answer (WCAG 4.1.3) */
    $('#arSay').textContent = ok ? `Right, plus ${comboGain(combo)}. Score ${score}.` : `Not quite. It was ${p.answer}.`;
    $('#arScore').textContent = score; $('#arCombo').innerHTML = combo >= 2 ? `<b>${combo}x</b> combo` : '';
    celebrate(ok);
    i++;
    if (untimed && i >= count) return end();
    if (untimed) $('#arNum').textContent = `${i + 1}/${count}`;
    if (!set) cur = draw(); show();
  };
  const end = () => { if (over) return; over = true; round.abort(); onEnd({ score, right, wrong, bestCombo, untimed, answered: answered.slice() }); };
  on(root, 'click', e => {
    const c = e.target.closest('.ar-choice'); if (c) return answer(c.dataset.v);
    const k = e.target.closest('.ar-key'); if (!k) return; sfx('tap');
    const typ = $('#arType'); if (!typ) return;
    if (k.dataset.k === 'del') typ.value = typ.value.slice(0, -1); else if (k.dataset.k === '-') typ.value = typ.value.startsWith('-') ? typ.value.slice(1) : '-' + typ.value; else if (typ.value.length < 7) typ.value += k.dataset.k;
    $('#arEntry').textContent = typ.value; if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
  }, rs);
  if (!tapMode) physicalKeys(root, ['-'], 7, rs, v => answer(v));
  show();
  if (untimed) { on($('#arFinish'), 'click', end, rs); return { destroy: () => { over = true; round.abort(); } }; }
  const t0 = performance.now(); let lastSec = ROUND_SECS;
  loop(() => {
    if (over) return false; const left = Math.max(0, ROUND_SECS - (performance.now() - t0) / 1000), sec = Math.ceil(left);
    $('#arBar').style.width = (left / ROUND_SECS) * 100 + '%'; if (sec !== lastSec) { lastSec = sec; $('#arTime').textContent = sec; if (sec <= 5) sfx('tick'); }
    if (left <= 0) { end(); return false; }
  }, rs);
  return { destroy: () => { over = true; round.abort(); } };
}

/* Arena challenge runner for the 1,000-level tower: sprint, survival, sharpshooter, time attack and boss formats. */
const PAD2 = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.', '/', 'del'];
/* opts.signal: as in runArena. untimed (Calm, openspec game-shell-and-calm): a Sprint runs UNTIMED_QS questions with
   no clock and a Finish button; the other formats run as they are (their Medal rules live in js/app.js). */
export function runChallenge(root, ch, set, { onEnd, tap = false, signal, untimed = false, choices = 4, bar = false }) {
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, lives = ch.lives, over = false;
  const t0 = performance.now(), secs = () => (performance.now() - t0) / 1000;
  const sprintUntimed = untimed && !!ch.secs;
  if (sprintUntimed) ch = { ...ch, secs: 0, total: UNTIMED_QS };
  const total = ch.total || Infinity, asBar = bar && !!ch.secs; /* the clock as a bar alone (Early and Growing, openspec change age-bands) */
  root.innerHTML = `<div class="ar${asBar ? ' ar--bar' : ''}">
    <div class="ar-top"><div class="ar-score"><small>${ch.goal === 'points' ? 'Score' : 'Right'}</small><b id="arScore">0</b></div><div class="ar-combo" id="arCombo" aria-live="polite"></div>
      <div class="ar-time${asBar ? ' md-sr-only' : ''}"><small>${ch.secs ? 'Time' : ch.lives ? 'Lives' : 'Question'}</small><b id="arTime">${ch.secs || (ch.lives ? '&#9679;'.repeat(lives) : `1/${total}`)}</b></div></div>
    ${ch.secs ? '<div class="g-timer ar-bar"><span id="arBar"></span></div>' : ''}${sprintUntimed ? '<p class="ar-fin"><button type="button" class="md-btn md-btn--sm" id="arFinish">Finish</button></p>' : ''}
    <div class="ar-q" id="arQ" aria-live="polite"></div><div class="ar-viz" id="arViz"></div>
    <div id="arIn"></div><p class="ar-fix" id="arFix" aria-live="polite"></p><div class="ar-pop" id="arPop" aria-hidden="true"></div><p class="md-sr-only" id="arSay" role="status"></p></div>`;
  const $ = s => root.querySelector(s);
  const finish = () => { if (over) return; over = true; round.abort(); onEnd({ score, right, wrong, secs: Math.round(secs()), finished: right + wrong >= total || ch.goal !== 'seconds' ? true : false, untimed }); };
  const show = () => {
    if (i >= set.length) return finish();
    const p = set[i];
    $('#arQ').innerHTML = p.q; $('#arViz').innerHTML = p.viz || ''; /* a question about its picture needs the picture in every Mode (Muse review, item 5) */
    if (p.kind === 'choice' || tap) {
      const ch2 = p.kind === 'choice' ? p.choices : shuffle([...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2].map(v => Math.round(v * 1000) / 1000))]).slice(0, 4);
      if (choices < ch2.length && p.kind !== 'choice') { ch2.splice(0, ch2.length, ...pickChoices({ answer: p.answer, choices: ch2 }, choices)); }
      $('#arIn').innerHTML = `<div class="ar-choices">${ch2.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join('')}</div>`; if (tap) speakQuestion(p);
    } else {
      $('#arIn').innerHTML = `<form class="ar-form" id="arForm"><output class="ar-entry" id="arEntry" aria-label="Your answer"></output><input class="ar-hidden" id="arType" inputmode="decimal" autocomplete="off" aria-label="Type your answer"><button class="md-btn md-btn--primary">Go</button></form><div class="ar-pad ar-pad--wide">${PAD2.map(k => `<button type="button" class="ar-key" data-k="${k}">${k === 'del' ? 'Del' : k === '-' ? '&minus;' : k}</button>`).join('')}</div>`;
      const typ = $('#arType'); keypadOnly(typ); if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
      on(typ, 'input', () => { typ.value = typ.value.replace(/[^0-9./-]/g, '').slice(0, 9); $('#arEntry').textContent = typ.value; }, rs);
      $('#arForm').onsubmit = e => { e.preventDefault(); if (typ.value.trim()) answer(typ.value); };
    }
  };
  const pop = (txt, ok) => { const el = $('#arPop'); el.textContent = txt; el.className = 'ar-pop show ' + (ok ? 'ok' : 'no'); later(() => (el.className = 'ar-pop'), 600, rs); };
  /* Everyday moments (openspec celebrations): the combo ticks, every fifth sparkles; a miss wiggles its answer line
     (#arFix keeps the missed answer while the next question is drawn, so the wiggle stays on the miss) */
  const celebrate = ok => { if (!ok) { wiggle($('#arFix'), rs); return; } if (combo >= 2) tick($('#arCombo b'), rs); if (combo % 5 === 0) sparkle($('#arCombo'), { n: 10, signal: rs }); };
  const answer = v => {
    if (over) return;
    const p = set[i], ok = p.kind === 'choice' ? String(v) === String(p.answer) : checkOne({ kind: 'num', answer: p.answer, tol: 1e-6 }, String(v)).ok;
    if (ok) { combo++; right++; const gain = comboGain(combo); score += gain; sfx('ok'); pop('+' + gain, true); $('#arFix').textContent = ''; }
    else { combo = 0; wrong++; sfx('no'); pop('', false); $('#arFix').innerHTML = `Answer: <b>${p.kind === 'choice' ? p.answer : answerText(p, byId[p.skill])}</b>${p.steps && p.steps[0] ? ` · ${p.steps[0]}` : ''}`; if (ch.lives) lives--; }
    /* One short status message per answer (WCAG 4.1.3); a miss is read from the answer line (#arFix) instead */
    $('#arSay').textContent = ok ? `Right, plus ${comboGain(combo)}. Score ${score}.` : '';
    $('#arScore').textContent = ch.goal === 'points' ? score : right; $('#arCombo').innerHTML = combo >= 2 ? `<b>${combo}x</b> combo` : '';
    celebrate(ok);
    if (ch.lives) $('#arTime').innerHTML = lives > 0 ? '&#9679;'.repeat(lives) : '0';
    i++;
    if ((ch.lives && lives <= 0) || i >= total) return finish();
    if (!ch.secs && !ch.lives) $('#arTime').textContent = `${i + 1}/${total}`;
    show();
  };
  on(root, 'click', e => {
    const c = e.target.closest('.ar-choice'); if (c) return answer(c.dataset.v);
    const k = e.target.closest('.ar-key'); if (!k) return; sfx('tap');
    const typ = $('#arType'); if (!typ) return;
    if (k.dataset.k === 'del') typ.value = typ.value.slice(0, -1); else if (k.dataset.k === '-') typ.value = typ.value.startsWith('-') ? typ.value.slice(1) : '-' + typ.value; else if (typ.value.length < 9) typ.value += k.dataset.k;
    $('#arEntry').textContent = typ.value; if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
  }, rs);
  physicalKeys(root, ['-', '.', '/'], 9, rs, v => answer(v));
  if (sprintUntimed) on($('#arFinish'), 'click', finish, rs);
  show();
  if (ch.secs) { let lastSec = ch.secs; loop(() => { if (over) return false; const left = Math.max(0, ch.secs - secs()), sec = Math.ceil(left); $('#arBar').style.width = (left / ch.secs) * 100 + '%'; if (sec !== lastSec) { lastSec = sec; $('#arTime').textContent = sec; if (sec <= 5) sfx('tick'); } if (left <= 0) { finish(); return false; } }, rs); }
  return { destroy: () => { over = true; round.abort(); } };
}
