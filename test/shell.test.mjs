/* Calm, motion and text size (openspec game-shell-and-calm, tasks 1.1 and 1.2).
   fx.js is loaded with stubbed localStorage, matchMedia and document: each source of "no motion" is set on its own,
   Calm is a device preference with one vmcalm event per change, and onMotionChange listeners stop with their signal.
   math.css: every prefers-reduced-motion block has an html.motion-paused twin and a body.calm twin. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
let reduce = false; const classes = new Set(), bodyClasses = new Set();
const mq = new EventTarget();
globalThis.matchMedia = q => Object.assign(mq, { matches: q === '(prefers-reduced-motion: reduce)' && reduce, media: q });
const doc = new EventTarget();
const classList = set => ({ contains: c => set.has(c), toggle: (c, on) => { if (on) set.add(c); else set.delete(c); return on; }, add: c => set.add(c), remove: c => set.delete(c) });
const live = { textContent: '' };
Object.assign(doc, { documentElement: { classList: classList(classes) }, body: { classList: classList(bodyClasses) }, getElementById: id => (id === 'vmLive' ? live : null), hidden: true });
globalThis.document = doc;
const fx = await import('../js/fx.js');
const reset = () => { reduce = false; classes.clear(); bodyClasses.clear(); delete mem['vm.calm']; delete mem['vm.text']; };
const wait = ms => new Promise(r => setTimeout(r, ms));

test('each of reduced motion, Pause motion and Calm makes noMotion() true', () => {
  reset(); assert.equal(fx.noMotion(), false);
  reduce = true; assert.equal(fx.noMotion(), true); reset();
  classes.add('motion-paused'); assert.equal(fx.noMotion(), true); reset();
  mem['vm.calm'] = '1'; assert.equal(fx.noMotion(), true);
});

test('Pause motion and reduced motion leave Calm off', () => {
  reset(); classes.add('motion-paused'); reduce = true;
  assert.equal(fx.calmOn(), false);
  assert.equal(mem['vm.calm'], undefined);
});

test('setCalm(true) persists, sets body.calm, fires one vmcalm and is announced', async () => {
  reset(); let n = 0, detail = null;
  const h = e => { n++; detail = e.detail; }; doc.addEventListener('vmcalm', h);
  fx.setCalm(true);
  doc.removeEventListener('vmcalm', h);
  assert.equal(mem['vm.calm'], '1');
  assert.equal(fx.calmOn(), true);
  assert.ok(bodyClasses.has('calm'));
  assert.equal(n, 1); assert.deepEqual(detail, { on: true });
  await wait(80);
  assert.equal(live.textContent, 'Calm on. No clocks in Practice, no motion.');
  fx.setCalm(false);
  assert.equal(mem['vm.calm'], '0'); assert.ok(!bodyClasses.has('calm'));
  await wait(80);
  assert.equal(live.textContent, 'Calm off.');
});

test('a sitemotion, vmcalm or media change calls onMotionChange listeners until the signal aborts', () => {
  reset(); const ctl = new AbortController(); let n = 0;
  fx.onMotionChange(() => n++, ctl.signal);
  doc.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } }));
  doc.dispatchEvent(new CustomEvent('vmcalm', { detail: { on: true } }));
  mq.dispatchEvent(new Event('change'));
  assert.equal(n, 3);
  ctl.abort();
  doc.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: false } }));
  mq.dispatchEvent(new Event('change'));
  assert.equal(n, 3);
});

test('text size is A by default; A+ persists and sets body.text-plus', () => {
  reset(); assert.equal(fx.textSize(), 'a');
  fx.setTextSize('a+');
  assert.equal(mem['vm.text'], 'a+'); assert.equal(fx.textSize(), 'a+'); assert.ok(bodyClasses.has('text-plus'));
  fx.setTextSize('a');
  assert.equal(fx.textSize(), 'a'); assert.ok(!bodyClasses.has('text-plus'));
});

test('Calm skips countdown ticks', () => {
  reset(); mem['vm.sound'] = '1'; doc.hidden = false;
  let made = 0; globalThis.AudioContext = class { constructor() { made++; } };
  try {
    fx.setCalm(true);
    fx.sfx('tick');
    assert.equal(made, 0, 'no audio for a tick in Calm');
  } finally { doc.hidden = true; delete mem['vm.sound']; delete globalThis.AudioContext; fx.setCalm(false); }
});

/* ---------- math.css ---------- */
const css = readFileSync(new URL('../math.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/* The selectors of each @media (prefers-reduced-motion: reduce) block */
function reducedBlocks() {
  const out = []; const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g; let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex; while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    const body = css.slice(re.lastIndex, i - 1);
    const sels = [...body.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(r => r[1].split(',').map(s => s.trim()).filter(Boolean));
    out.push({ at: css.slice(0, m.index).split('\n').length, sels });
  }
  return out;
}
const norm = s => s.replace(/\s+/g, ' ').trim();
const flat = norm(css);

test('math.css: every reduced-motion block has html.motion-paused and body.calm twins', () => {
  const blocks = reducedBlocks();
  assert.ok(blocks.length >= 8, `found ${blocks.length} blocks`);
  const missing = [];
  for (const b of blocks) for (const s of b.sels) for (const pre of ['html.motion-paused', 'body.calm']) {
    if (!flat.includes(`${pre} ${norm(s)}`)) missing.push(`line ${b.at}: ${pre} ${s}`);
  }
  assert.deepEqual(missing, []);
});

test('math.css: body.text-plus sets the play scale', () => {
  assert.ok(/body\.text-plus \{[^}]*--play-scale: 1\.25/.test(flat), 'body.text-plus { --play-scale: 1.25 }');
});
