/* Competitive play: the timed Arena (daily seeded rounds, so everyone in a league gets the same questions)
   and the two-player Duel on one device. */
import { byId } from './skills/index.js';
import { checkOne } from './check.js';
import { answerText } from './answers.js';
import { shuffle } from './lib.js';
import { mentalQ, FAMILIES } from './mental.js';
import { levelFor } from './adapt.js';
import { sfx, speakQuestion, sparkle, tick, wiggle, t } from './fx.js';
import { on, later, loop, child } from './life.js';
import { keypadOnly } from './shell.js';

/* Question pools by League. The Pro League draws from the mental arithmetic families (js/mental.js) instead;
   proV1 is the Pro pool before that change, kept only for Pro daily rounds dated before MENTAL_FROM. */
const POOLS = {
  explorer: ['k-add10', 'k-sub10', 'k-bonds', 'k-count', '1-doubles', '1-maketen', 'k-teens'],
  challenger: ['3-mult', '3-div', 'v-sq5', 'v-by11', 'v-times5', 'v-ends10', '2-add100', '3-multtens', 'v-from9', 'v-by9s'],
  proV1: ['v-near-base', 'v-duplex', '6-percent', '7-twostep', '8-exprules', 'v-sqroot', '6-exp', '8-multistep', '11-logs', 'v-square-near']
};
export const ROUND_SECS = 60;
/* Untimed Arena Practice (openspec game-shell-and-calm): 20 questions, no clock, Finish at any time */
export const UNTIMED_QS = 20;
/* Pro daily rounds switch to mental arithmetic on Monday 2026-10-19, the first day of ISO week 2026-W43. Boards are
   named after the Player's local date and ISO week, and the switch uses the same date, so no day's or week's Pro
   Board mixes the old and new question sets. The Pro daily seed gains a version prefix at the same time. */
export const MENTAL_FROM = '2026-10-19';
/* The difficulty ramp of a Pro daily round, from its first item to its last (every Pro Player gets the same) */
export const PRO_RAMP = [6, 16];

/* Seeded random: same day + league = same questions for everyone */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const withSeed = (seedText, fn) => { const real = Math.random; if (seedText) Math.random = mulberry32(hash(seedText)); try { return fn(); } finally { Math.random = real; } };

/* An Arena item from a generated question: four choices (for tap play) around the answer */
const item = (p, league, extra) => {
  const near = [...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2, p.answer + 10, p.answer - 10].filter(v => league !== 'explorer' || v >= 0))];
  return { q: p.q, ...(p.say ? { say: p.say } : {}), viz: league === 'explorer' ? p.viz : '', answer: p.answer, choices: shuffle([p.answer, ...shuffle(near.slice(1)).slice(0, 3)]), ...extra };
};
/* One question from a skill pool at a generator level (1 to 3), or null when the skill gave an answer the keypad cannot take */
function poolItem(pool, league, level, d) {
  const s = byId[pool[Math.floor(Math.random() * pool.length)]]; if (!s) return null;
  const p = s.gen(level);
  if (p.kind !== 'num' || !Number.isInteger(p.answer) || Math.abs(p.answer) > 99999) return null;
  return item(p, league, d === undefined ? { skill: s.id } : { skill: s.id, d });
}
const mentalItem = (family, d) => { const p = mentalQ(family, d); return item(p, 'pro', { family: p.family, d: p.d, ...(p.sutra ? { sutra: p.sutra } : {}) }); };

/* n Arena items for a League (or the proV1 pool). seedText makes the set the same for everyone; null draws at random.
   Pro: the families take turns in a seeded order, and difficulty rises evenly from ramp[0] to ramp[1]. */
export function makeSet(league, seedText, n = 80, { ramp = PRO_RAMP } = {}) {
  return withSeed(seedText, () => {
    const out = [];
    if (league === 'pro') {
      const order = shuffle(FAMILIES);
      for (let i = 0; i < n; i++) out.push(mentalItem(order[i % order.length], Math.round(ramp[0] + ((ramp[1] - ramp[0]) * i) / Math.max(1, n - 1))));
      return out;
    }
    const pool = POOLS[league] || POOLS.challenger; let guard = 0;
    while (out.length < n && guard++ < n * 20) { const it = poolItem(pool, league, league === 'explorer' ? 1 : 2); if (it) out.push(it); }
    return out;
  });
}
/* The daily round for a League on a local date (YYYY-MM-DD): the same questions in the same order for everyone */
export function dailySet(league, day) {
  if (league !== 'pro') return makeSet(league, `daily-${day}-${league}`);
  if (day < MENTAL_FROM) return makeSet('proV1', `daily-${day}-pro`);
  return makeSet('pro', `v2:daily-${day}-pro`, 80, { ramp: PRO_RAMP });
}
/* One Arena Practice question at difficulty d (1 to 20): a mental family for Pro, else the League's pool at the
   generator level for d */
export function practiceItem(league, d) {
  if (league === 'pro') return mentalItem(FAMILIES[Math.floor(Math.random() * FAMILIES.length)], d);
  const pool = POOLS[league] || POOLS.challenger;
  for (let k = 0; k < 40; k++) { const it = poolItem(pool, league, levelFor(d), Math.round(d)); if (it) return it; }
  return makeSet(league, null, 1)[0];
}

/* A Word problem (js/stories.js roundStory) as an Arena item: the Word problems round (openspec word-problems-more).
   label: the Mode's Word problem label, shown over the question; the unit sits beside the entry. */
export const storyItem = (p, league, label) => item(p, league, { story: p.story.id, label, ...(p.unit ? { unit: p.unit } : {}) });
/* The Word problems round's length: reading takes longer than a bare question */
export const STORY_QS = 10;

/* The next Practice question: dial picks the difficulty, and Dial.fresh() keeps it from repeating this round */
export const practiceNext = (league, dial) => dial.fresh(() => { const it = practiceItem(league, dial.lv); return [it.q, it]; });

const PAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'del'];
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
   deal (Practice only): draws each next item instead of the Dial (the Word problems round, storyItem). */
export function runArena(root, { league, day = null, dial, signal, onEnd, untimed = false, deal = null, count = UNTIMED_QS }) {
  const set = day ? dailySet(league, day) : null, tapMode = league === 'explorer';
  if (set) untimed = false; /* the daily round is a Ranked race: it always has its clock */
  const draw = deal || (() => practiceNext(league, dial));
  let cur = set ? null : draw();
  const at = () => (set ? set[i % set.length] : cur);
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, bestCombo = 0, over = false;
  const answered = []; /* every answered question and whether it was right: the round review (openspec change sutras-first) */
  const clock = untimed ? `<div class="ar-time"><small>Question</small><b id="arNum">1/${count}</b></div>` : `<div class="ar-time"><small>Time</small><b id="arTime">${ROUND_SECS}</b></div>`;
  root.innerHTML = `<div class="ar${untimed ? ' ar--untimed' : ''}">
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
    if (tapMode) { $('#arIn').innerHTML = `<div class="ar-choices">${p.choices.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join('')}</div>`; speakQuestion(p); }
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
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); const gain = 10 + Math.min(combo - 1, 10) * 2; score += gain; right++; sfx('ok'); pop('+' + gain, true); }
    else { combo = 0; wrong++; sfx('no'); pop(String(p.answer), false); }
    /* The pop is visual only; screen readers get one short status message per answer (WCAG 4.1.3) */
    $('#arSay').textContent = ok ? `Right, plus ${10 + Math.min(combo - 1, 10) * 2}. Score ${score}.` : `Not quite. It was ${p.answer}.`;
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
export function runChallenge(root, ch, set, { onEnd, tap = false, signal, untimed = false }) {
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, lives = ch.lives, over = false;
  const t0 = performance.now(), secs = () => (performance.now() - t0) / 1000;
  const sprintUntimed = untimed && !!ch.secs;
  if (sprintUntimed) ch = { ...ch, secs: 0, total: UNTIMED_QS };
  const total = ch.total || Infinity;
  root.innerHTML = `<div class="ar">
    <div class="ar-top"><div class="ar-score"><small>${ch.goal === 'points' ? 'Score' : 'Right'}</small><b id="arScore">0</b></div><div class="ar-combo" id="arCombo" aria-live="polite"></div>
      <div class="ar-time"><small>${ch.secs ? 'Time' : ch.lives ? 'Lives' : 'Question'}</small><b id="arTime">${ch.secs || (ch.lives ? '&#9679;'.repeat(lives) : `1/${total}`)}</b></div></div>
    ${ch.secs ? '<div class="g-timer ar-bar"><span id="arBar"></span></div>' : ''}${sprintUntimed ? '<p class="ar-fin"><button type="button" class="md-btn md-btn--sm" id="arFinish">Finish</button></p>' : ''}
    <div class="ar-q" id="arQ" aria-live="polite"></div><div class="ar-viz" id="arViz"></div>
    <div id="arIn"></div><p class="ar-fix" id="arFix" aria-live="polite"></p><div class="ar-pop" id="arPop" aria-hidden="true"></div><p class="md-sr-only" id="arSay" role="status"></p></div>`;
  const $ = s => root.querySelector(s);
  const finish = () => { if (over) return; over = true; round.abort(); onEnd({ score, right, wrong, secs: Math.round(secs()), finished: right + wrong >= total || ch.goal !== 'seconds' ? true : false, untimed }); };
  const show = () => {
    if (i >= set.length) return finish();
    const p = set[i];
    $('#arQ').innerHTML = p.q; $('#arViz').innerHTML = tap ? p.viz || '' : '';
    if (p.kind === 'choice' || tap) {
      const ch2 = p.kind === 'choice' ? p.choices : shuffle([...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2].map(v => Math.round(v * 1000) / 1000))]).slice(0, 4);
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
    if (ok) { combo++; right++; const gain = 10 + Math.min(combo - 1, 10) * 2; score += gain; sfx('ok'); pop('+' + gain, true); $('#arFix').textContent = ''; }
    else { combo = 0; wrong++; sfx('no'); pop('', false); $('#arFix').innerHTML = `Answer: <b>${p.kind === 'choice' ? p.answer : answerText(p, byId[p.skill])}</b>${p.steps && p.steps[0] ? ` · ${p.steps[0]}` : ''}`; if (ch.lives) lives--; }
    /* One short status message per answer (WCAG 4.1.3); a miss is read from the answer line (#arFix) instead */
    $('#arSay').textContent = ok ? `Right, plus ${10 + Math.min(combo - 1, 10) * 2}. Score ${score}.` : '';
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
