/* Competitive play: the timed Arena (daily seeded rounds, so everyone in a league gets the same questions)
   and the two-player Duel on one device. */
import { byId } from './skills/index.js';
import { checkOne } from './check.js';
import { answerText } from './answers.js';
import { shuffle } from './lib.js';
import { sfx, speak, confetti } from './fx.js';
import { on, later, loop, child } from './life.js';

const POOLS = {
  explorer: ['k-add10', 'k-sub10', 'k-bonds', 'k-count', '1-doubles', '1-maketen', 'k-teens'],
  challenger: ['3-mult', '3-div', 'v-sq5', 'v-by11', 'v-times5', 'v-ends10', '2-add100', '3-multtens', 'v-from9', 'v-by9s'],
  pro: ['v-near-base', 'v-duplex', '6-percent', '7-twostep', '8-exprules', 'v-sqroot', '6-exp', '8-multistep', '11-logs', 'v-square-near']
};
export const ROUND_SECS = 60;

/* Seeded random: same day + league = same questions for everyone */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export function makeSet(league, seedText, n = 80) {
  const real = Math.random; if (seedText) Math.random = mulberry32(hash(seedText));
  const out = [];
  try {
    const pool = POOLS[league] || POOLS.challenger; let guard = 0;
    while (out.length < n && guard++ < n * 20) {
      const s = byId[pool[Math.floor(Math.random() * pool.length)]]; if (!s) continue;
      const p = s.gen(league === 'explorer' ? 1 : 2);
      if (p.kind !== 'num' || !Number.isInteger(p.answer) || Math.abs(p.answer) > 99999) continue;
      const near = [...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2, p.answer + 10, p.answer - 10].filter(v => league !== 'explorer' || v >= 0))];
      out.push({ q: p.q, viz: league === 'explorer' ? p.viz : '', answer: p.answer, choices: shuffle([p.answer, ...shuffle(near.slice(1)).slice(0, 3)]), skill: s.id });
    }
  } finally { Math.random = real; }
  return out;
}

const PAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'del'];

/* Arena round. opts: { league, seed, signal, onEnd({ score, right, wrong, bestCombo }) }.
   The round runs under a child of signal, aborted when it ends or by destroy(), so its handlers never act
   on the next round drawn into the same root. */
export function runArena(root, { league, seed, signal, onEnd }) {
  const set = makeSet(league, seed), tapMode = league === 'explorer';
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, bestCombo = 0, over = false;
  root.innerHTML = `<div class="ar">
    <div class="ar-top"><div class="ar-score"><small>Score</small><b id="arScore">0</b></div><div class="ar-combo" id="arCombo" aria-live="polite"></div><div class="ar-time"><small>Time</small><b id="arTime">${ROUND_SECS}</b></div></div>
    <div class="g-timer ar-bar"><span id="arBar"></span></div>
    <div class="ar-q" id="arQ" aria-live="polite"></div><div class="ar-viz" id="arViz"></div>
    <div id="arIn"></div><div class="ar-pop" id="arPop" aria-hidden="true"></div></div>`;
  const $ = s => root.querySelector(s);
  const show = () => {
    const p = set[i % set.length];
    $('#arQ').innerHTML = p.q; $('#arViz').innerHTML = p.viz || '';
    if (tapMode) { $('#arIn').innerHTML = `<div class="ar-choices">${p.choices.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join('')}</div>`; speak(p.q); }
    else { $('#arIn').innerHTML = `<form class="ar-form" id="arForm"><output class="ar-entry" id="arEntry" aria-label="Your answer"></output><input class="ar-hidden" id="arType" inputmode="numeric" autocomplete="off" aria-label="Type your answer"><button class="md-btn md-btn--primary">Go</button></form><div class="ar-pad">${PAD.map(k => `<button type="button" class="ar-key" data-k="${k}">${k === 'del' ? 'Del' : k === '-' ? '&minus;' : k}</button>`).join('')}</div>`;
      const typ = $('#arType'); if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
      on(typ, 'input', () => { typ.value = typ.value.replace(/[^0-9-]/g, '').slice(0, 7); $('#arEntry').textContent = typ.value; }, rs);
      $('#arForm').onsubmit = e => { e.preventDefault(); if (typ.value.trim()) answer(typ.value); };
    }
  };
  const pop = (txt, ok) => { const el = $('#arPop'); el.textContent = txt; el.className = 'ar-pop show ' + (ok ? 'ok' : 'no'); later(() => (el.className = 'ar-pop'), 600, rs); };
  const answer = v => {
    if (over) return;
    const p = set[i % set.length], ok = checkOne({ kind: 'num', answer: p.answer }, String(v)).ok;
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); const gain = 10 + Math.min(combo - 1, 10) * 2; score += gain; right++; sfx('ok'); pop('+' + gain, true); if (combo % 5 === 0) confetti(30); }
    else { combo = 0; wrong++; sfx('no'); pop(String(p.answer), false); }
    $('#arScore').textContent = score; $('#arCombo').innerHTML = combo >= 2 ? `<b>${combo}x</b> combo` : '';
    i++; show();
  };
  on(root, 'click', e => {
    const c = e.target.closest('.ar-choice'); if (c) return answer(c.dataset.v);
    const k = e.target.closest('.ar-key'); if (!k) return; sfx('tap');
    const typ = $('#arType'); if (!typ) return;
    if (k.dataset.k === 'del') typ.value = typ.value.slice(0, -1); else if (k.dataset.k === '-') typ.value = typ.value.startsWith('-') ? typ.value.slice(1) : '-' + typ.value; else if (typ.value.length < 7) typ.value += k.dataset.k;
    $('#arEntry').textContent = typ.value; if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
  }, rs);
  show();
  const t0 = performance.now(); let lastSec = ROUND_SECS;
  loop(() => {
    if (over) return false; const left = Math.max(0, ROUND_SECS - (performance.now() - t0) / 1000), sec = Math.ceil(left);
    $('#arBar').style.width = (left / ROUND_SECS) * 100 + '%'; if (sec !== lastSec) { lastSec = sec; $('#arTime').textContent = sec; if (sec <= 5) sfx('tick'); }
    if (left <= 0) { over = true; round.abort(); onEnd({ score, right, wrong, bestCombo }); return false; }
  }, rs);
  return { destroy: () => { over = true; round.abort(); } };
}

/* Two players, one screen: first to 10 points wins. Wrong answers freeze that player for a moment.
   opts.signal: as in runArena, the Duel runs under a child of it, so a rematch in the same root starts clean. */
export function runDuel(root, { league, names = ['Player 1', 'Player 2'], signal, onEnd }) {
  const set = makeSet(league, null, 120); let k = 0, over = false;
  const duel = child(signal), ds = duel.signal;
  const pts = [0, 0], cur = [null, null], frozen = [false, false];
  root.innerHTML = `<div class="duel">${[0, 1].map(p => `<div class="duel-side duel-p${p + 1}" data-p="${p}"><div class="duel-name">${names[p]} <b id="dS${p}">0</b>/10</div><div class="duel-q" id="dQ${p}"></div><div class="duel-ch" id="dC${p}"></div></div>`).join('')}</div>`;
  const deal = p => { const q = set[k++ % set.length]; cur[p] = q; root.querySelector(`#dQ${p}`).innerHTML = q.q; root.querySelector(`#dC${p}`).innerHTML = q.choices.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join(''); };
  on(root, 'click', e => {
    const b = e.target.closest('.ar-choice'); if (!b || over) return; const side = b.closest('.duel-side'), p = +side.dataset.p; if (frozen[p]) return;
    if (+b.dataset.v === cur[p].answer) { pts[p]++; sfx('ok'); root.querySelector(`#dS${p}`).textContent = pts[p]; if (pts[p] >= 10) { over = true; duel.abort(); confetti(120); sfx('level'); onEnd(p); return; } deal(p); }
    else { sfx('no'); frozen[p] = true; side.classList.add('frozen'); later(() => { frozen[p] = false; side.classList.remove('frozen'); deal(p); }, 1200, ds); }
  }, ds);
  deal(0); deal(1);
  return { destroy: () => { over = true; duel.abort(); } };
}

/* Arena challenge runner for the 1,000-level tower: sprint, survival, sharpshooter, time attack and boss formats. */
const PAD2 = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.', '/', 'del'];
/* opts.signal: as in runArena */
export function runChallenge(root, ch, set, { onEnd, tap = false, signal }) {
  const round = child(signal), rs = round.signal;
  let i = 0, score = 0, right = 0, wrong = 0, combo = 0, lives = ch.lives, over = false;
  const t0 = performance.now(), secs = () => (performance.now() - t0) / 1000;
  const total = ch.total || Infinity;
  root.innerHTML = `<div class="ar">
    <div class="ar-top"><div class="ar-score"><small>${ch.goal === 'points' ? 'Score' : 'Right'}</small><b id="arScore">0</b></div><div class="ar-combo" id="arCombo" aria-live="polite"></div>
      <div class="ar-time"><small>${ch.secs ? 'Time' : ch.lives ? 'Lives' : 'Question'}</small><b id="arTime">${ch.secs || (ch.lives ? '&#9679;'.repeat(lives) : `1/${total}`)}</b></div></div>
    ${ch.secs ? '<div class="g-timer ar-bar"><span id="arBar"></span></div>' : ''}
    <div class="ar-q" id="arQ" aria-live="polite"></div><div class="ar-viz" id="arViz"></div>
    <div id="arIn"></div><p class="ar-fix" id="arFix" aria-live="polite"></p><div class="ar-pop" id="arPop" aria-hidden="true"></div></div>`;
  const $ = s => root.querySelector(s);
  const finish = () => { if (over) return; over = true; round.abort(); onEnd({ score, right, wrong, secs: Math.round(secs()), finished: right + wrong >= total || ch.goal !== 'seconds' ? true : false }); };
  const show = () => {
    if (i >= set.length) return finish();
    const p = set[i];
    $('#arQ').innerHTML = p.q; $('#arViz').innerHTML = tap ? p.viz || '' : '';
    if (p.kind === 'choice' || tap) {
      const ch2 = p.kind === 'choice' ? p.choices : shuffle([...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2].map(v => Math.round(v * 1000) / 1000))]).slice(0, 4);
      $('#arIn').innerHTML = `<div class="ar-choices">${ch2.map(c => `<button class="ar-choice" data-v="${c}">${c}</button>`).join('')}</div>`; if (tap) speak(p.q);
    } else {
      $('#arIn').innerHTML = `<form class="ar-form" id="arForm"><output class="ar-entry" id="arEntry" aria-label="Your answer"></output><input class="ar-hidden" id="arType" inputmode="decimal" autocomplete="off" aria-label="Type your answer"><button class="md-btn md-btn--primary">Go</button></form><div class="ar-pad ar-pad--wide">${PAD2.map(k => `<button type="button" class="ar-key" data-k="${k}">${k === 'del' ? 'Del' : k === '-' ? '&minus;' : k}</button>`).join('')}</div>`;
      const typ = $('#arType'); if (matchMedia('(pointer: fine)').matches) typ.focus({ preventScroll: true });
      on(typ, 'input', () => { typ.value = typ.value.replace(/[^0-9./-]/g, '').slice(0, 9); $('#arEntry').textContent = typ.value; }, rs);
      $('#arForm').onsubmit = e => { e.preventDefault(); if (typ.value.trim()) answer(typ.value); };
    }
  };
  const pop = (txt, ok) => { const el = $('#arPop'); el.textContent = txt; el.className = 'ar-pop show ' + (ok ? 'ok' : 'no'); later(() => (el.className = 'ar-pop'), 600, rs); };
  const answer = v => {
    if (over) return;
    const p = set[i], ok = p.kind === 'choice' ? String(v) === String(p.answer) : checkOne({ kind: 'num', answer: p.answer, tol: 1e-6 }, String(v)).ok;
    if (ok) { combo++; right++; const gain = 10 + Math.min(combo - 1, 10) * 2; score += gain; sfx('ok'); pop('+' + gain, true); $('#arFix').textContent = ''; if (combo % 5 === 0) confetti(30); }
    else { combo = 0; wrong++; sfx('no'); pop('', false); $('#arFix').innerHTML = `Answer: <b>${p.kind === 'choice' ? p.answer : answerText(p, byId[p.skill])}</b>${p.steps && p.steps[0] ? ` · ${p.steps[0]}` : ''}`; if (ch.lives) lives--; }
    $('#arScore').textContent = ch.goal === 'points' ? score : right; $('#arCombo').innerHTML = combo >= 2 ? `<b>${combo}x</b> combo` : '';
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
  show();
  if (ch.secs) { let lastSec = ch.secs; loop(() => { if (over) return false; const left = Math.max(0, ch.secs - secs()), sec = Math.ceil(left); $('#arBar').style.width = (left / ch.secs) * 100 + '%'; if (sec !== lastSec) { lastSec = sec; $('#arTime').textContent = sec; if (sec <= 5) sfx('tick'); } if (left <= 0) { finish(); return false; } }, rs); }
  return { destroy: () => { over = true; round.abort(); } };
}
