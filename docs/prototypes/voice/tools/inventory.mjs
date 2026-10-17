/* better-voice inventory: samples every text that reaches fx.speak / voice.speak, runs it through
   voice.normalize(), and measures how much of it prerecorded Kokoro clips could cover.
   Run from the repo root:  node docs/prototypes/voice/tools/inventory.mjs [samplesPerSkillLevel]
   Writes docs/prototypes/voice/tools/inventory.json (summary, frame list, top templates). */
import { writeFileSync } from 'node:fs';
import { normalize } from '../../../../js/voice.js';
import { SKILLS } from '../../../../js/skills/index.js';
import { TRICKS } from '../../../../js/vedic.js';
import { KATAS_PER_TRICK, kata, CHALLENGE_COUNT, challenge, challengeSet } from '../../../../js/levels.js';
import { makeSet, practiceItem } from '../../../../js/arena.js';
import { numClips, splitParts } from './stitch-plan.mjs';

const N = +(process.argv[2] || 300);

/* ---------- Fixed lines (app.js, games.js, voice.js) ---------- */
const FIXED = {
  praiseExplorer: ['Yay! You got it!', 'Super star!', 'Woohoo! Correct!', 'You are so smart!'],
  feedback: ['You got it!', 'Not quite. Try again!'],
  toggles: ['Hi! I will read the questions to you.', 'Read aloud is on.'],
  settings: ['Hi there! 7 &times; 8 = 56. Great job!', 'Hi! This is how I sound.', 'Hi! I am your new reading voice.'],
  games: ['Which has more?']
};

/* ---------- Generated texts, by source. Each entry: [source, text] ---------- */
const items = [];
const add = (src, t) => { if (t) items.push([src, t]); };
// Practice (Explorer hears it by default): question, plus hints[0] and hint on tap in Explorer
for (const s of SKILLS) for (const lv of [1, 2, 3]) for (let i = 0; i < N; i++) {
  let p; try { p = s.gen(lv); } catch (e) { continue; }
  const band = String(s.grade) === 'V' ? 'V' : ['K', '1', '2'].includes(String(s.grade)) ? 'K-2' : ['3', '4', '5'].includes(String(s.grade)) ? '3-5' : ['6', '7', '8'].includes(String(s.grade)) ? '6-8' : '9-12';
  add('practice.q.' + band, p.q);
  if (p.hints && p.hints[0]) add('practice.hint.' + band, p.hints[0]);
}
// Katas (all 1,050) and so Star rounds, which deal Kata problems
for (const t of TRICKS) for (let n = 1; n <= KATAS_PER_TRICK; n++) for (const p of kata(t.id, n).problems) add('kata.q', p.q);
// Arena tap rounds (Explorer League speaks every question); also Challenger and Pro for completeness
for (let d = 0; d < 60; d++) { for (const p of makeSet('explorer', 'inv-' + d)) add('arena.explorer', p.q); }
for (let d = 0; d < 20; d++) { for (const p of makeSet('challenger', 'inv-' + d)) add('arena.challenger', p.q); for (const p of makeSet('pro', 'inv-' + d)) add('arena.pro', p.q); }
// Tower challenges (speak on tap play)
for (let id = 1; id <= CHALLENGE_COUNT; id += 7) for (const p of challengeSet(challenge(id), 30)) add('tower.q', p.q);
// Balloon game: "Pop N balloons", then each count
for (let n = 1; n <= 20; n++) { add('games.balloon', `Pop ${n} balloon${n > 1 ? 's' : ''}`); add('games.count', String(n)); }
for (let n = 1; n <= 20; n++) for (const a of [1, 2, 3, 4]) { add('games.balloon', `Pop ${a} more than ${n} balloons`); add('games.balloon', `Pop ${a} less than ${n + a} balloons`); }
for (let n = 1; n <= 10; n++) add('games.balloon', `Pop double ${n} balloons`);
for (const [k, list] of Object.entries(FIXED)) for (const t of list) add('fixed.' + k, t);

/* ---------- Clip model (shared with make-clips.mjs) ---------- */
const split = text => splitParts(text).filter(p => !p.pause);
const template = text => text.replace(/-?\d+(\.\d+)?/g, '#');

const rows = items.map(([src, t]) => { const n = normalize(t); return { src, text: n, tpl: template(n), parts: split(n) }; });
const fixedTexts = new Set(rows.filter(r => !/\d/.test(r.text)).map(r => r.text));
const frameCount = new Map();
rows.filter(r => /\d/.test(r.text)).forEach(r => r.parts.forEach(p => { if (p.f) frameCount.set(p.f, (frameCount.get(p.f) || 0) + 1); }));
const frames = [...frameCount.entries()].sort((a, b) => b[1] - a[1]);
/* Budget: frames seen at least MINF times in the sample become clips; rarer frames fall back to the built-in voice */
const MINF = +(process.argv[3] || 20);
const kept = new Set(frames.filter(([, c]) => c >= MINF).map(([f]) => f));
const maxNumberClips = new Set();
const cls = r => {
  if (!/\d/.test(r.text)) return 'whole';
  if (r.parts.every(p => !p.f || kept.has(p.f))) { r.parts.forEach(p => p.n && numClips(p.n).forEach(c => maxNumberClips.add(c))); return 'stitch'; }
  return 'none';
};
rows.forEach(r => { r.cls = cls(r); });
const by = {};
for (const r of rows) { const k = r.src.replace(/\.(K-2|3-5|6-8|9-12|V)$/, m => m); by[k] ||= { total: 0, whole: 0, stitch: 0, none: 0, chars: 0 }; by[k].total++; by[k][r.cls]++; by[k].chars += r.text.length; }
const tot = rows.reduce((a, r) => (a[r.cls]++, a), { whole: 0, stitch: 0, none: 0 });
const wholeDistinct = new Set(rows.filter(r => r.cls === 'whole').map(r => r.text));
const wholeChars = [...wholeDistinct].reduce((a, t) => a + t.length, 0);
const keptChars = [...kept].reduce((a, f) => a + f.length, 0);
const distinctTexts = new Set(rows.map(r => r.text));
const summary = {
  sampledUtterances: rows.length, distinctUtterances: distinctTexts.size, distinctTemplates: new Set(rows.map(r => r.tpl)).size,
  classes: tot, share: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +(v / rows.length * 100).toFixed(1)])),
  wholeClips: wholeDistinct.size, wholeClipChars: wholeChars,
  frameMinCount: MINF, framesSeen: frames.length, framesKept: kept.size, framesKeptChars: keptChars,
  numberClipsUsed: [...maxNumberClips].sort(), bySource: by
};
/* Packs: what each group of surfaces needs that an earlier pack has not already got (frames and digit-free lines) */
const PACKS = [['core (Explorer: K-2, Explorer Arena, games, fixed lines)', r => /K-2|arena\.explorer|games\.|fixed\./.test(r.src)],
  ['grades 3 to 5', r => /3-5/.test(r.src)], ['tricks (Katas, Stars, Challenger and Pro Arena, towers)', r => /\.V$|kata|arena\.(challenger|pro)|tower/.test(r.src)],
  ['grades 6 to 8', r => /6-8/.test(r.src)], ['grades 9 to 12', r => /9-12/.test(r.src)]];
const have = new Set(); summary.packs = [];
for (const [name, test] of PACKS) {
  let chars = 0, clips = 0;
  rows.filter(test).forEach(r => { const units = /\d/.test(r.text) ? r.parts.filter(p => p.f).map(p => 'f:' + p.f) : ['w:' + r.text]; units.forEach(u => { if (!have.has(u)) { have.add(u); clips++; chars += u.length - 2; } }); });
  summary.packs.push({ name, clips, chars });
}
summary.framesWithDigits = frames.filter(([f]) => /\d/.test(f)).length;
writeFileSync(new URL('./inventory.json', import.meta.url), JSON.stringify({ summary, framesKept: frames.filter(([f]) => kept.has(f)), framesDropped: frames.filter(([f]) => !kept.has(f)).slice(0, 300), wholeLines: [...wholeDistinct].sort() }, null, 1));
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '0.0') + '%';
console.log(`utterances sampled ${rows.length}, distinct ${distinctTexts.size}, templates ${summary.distinctTemplates}`);
console.log(`whole ${pct(tot.whole, rows.length)}  stitch ${pct(tot.stitch, rows.length)}  none ${pct(tot.none, rows.length)}`);
console.log(`whole-clip lines ${wholeDistinct.size} (${wholeChars} chars); frames seen ${frames.length}, kept (>=${MINF}) ${kept.size} (${keptChars} chars); number clips ${maxNumberClips.size}`);
summary.packs.forEach(p => console.log('pack', p.name, p.clips, 'clips', p.chars, 'chars')); console.log('frames with digits', summary.framesWithDigits);
for (const [k, v] of Object.entries(by).sort()) console.log(k.padEnd(26), String(v.total).padStart(7), 'whole', pct(v.whole, v.total).padStart(6), 'stitch', pct(v.stitch, v.total).padStart(6), 'none', pct(v.none, v.total).padStart(6));
