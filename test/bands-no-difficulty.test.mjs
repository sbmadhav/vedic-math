/* Bands never change math difficulty (openspec change age-bands, task 1.2; reading-bands spec "Bands never change math
   difficulty", design decision 5). The engine (the question generators and sets in shared/src, the Dial, the levels,
   answer checking) never reads the Grade answer or imports the band or copy modules, and behaviorally: whatever the
   active Player's band, the same seed gives the same Dial moves, the same starPool, the same daily set and the same
   Practice questions. (Placement's questions and start step join this test when the placement change ships.) */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: i => Object.keys(mem)[i] ?? null };
const store = await import('../js/store.js');
const AD = await import('../js/adapt.js');
const { starPool, kata, challengeSet, challenge } = await import('../js/levels.js');
const { dailySet, makeSet, practiceNext } = await import('../shared/src/questions.ts');
const { byId } = await import('../shared/src/skills/index.ts');
const { bandOf, BANDS } = await import('../shared/src/bands.ts');

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(js|ts)$/.test(p) && !/\.test\.ts$/.test(p) ? [p] : []; });
/* The engine: every file the lint rule covers (eslint.config.js, no-restricted-imports) */
const ENGINE = ['js/adapt.js', 'js/levels.js', 'js/check.js', 'js/arena.js', 'js/mental.js', 'js/vedic.js', 'js/stories.js', 'js/story-plan.js',
  ...walk(join(root, 'js/skills')).map(p => relative(root, p)),
  'shared/src/questions.ts', 'shared/src/scoring.ts', 'shared/src/question.ts', 'shared/src/vedic.ts', 'shared/src/mental.ts', 'shared/src/story-plan.ts', 'shared/src/viz.ts',
  ...walk(join(root, 'shared/src/skills')).map(p => relative(root, p))];

test('no engine file reads the Grade answer or the band, or imports the band or copy modules', () => {
  const bad = [];
  for (const f of ENGINE) {
    const src = readFileSync(join(root, f), 'utf8');
    if (/(\.|\[')reading\b|\breading\(\)/.test(src)) bad.push(`${f} reads "reading"`);
    if (/\bbandOf\(|\brulesFor\(|fx\.band\(|fx\.rules\(|band-early|band-growing/.test(src)) bad.push(`${f} reads the band`);
    if (/from '[^']*\/(bands|copy)\.(ts|js)'/.test(src)) bad.push(`${f} imports bands or copy`);
  }
  assert.deepEqual(bad, []);
  assert.ok(ENGINE.length >= 20, `the engine list (${ENGINE.length})`);
  /* The lint rule names these files too (the rule and this test guard the same door) */
  const lint = readFileSync(join(root, 'eslint.config.js'), 'utf8');
  for (const f of ['js/adapt.js', 'js/levels.js', 'js/check.js', 'js/placement.js', 'shared/src/questions.ts', 'shared/src/scoring.ts']) assert.ok(lint.includes(`'${f}'`), `eslint.config.js names ${f}`);
  assert.match(lint, /no-restricted-imports/);
});

/* The same seed, the same answers: one run of the engine for the active Player's band */
const rng = (a = 1) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function run() {
  const real = Math.random; Math.random = rng(7);
  try {
    const dial = new AD.Dial(AD.rating('skill:v-sq5', 'challenger'));
    const moves = [];
    for (const ok of [true, true, false, true, false, false, true, true, true, false]) { dial.hit(ok); moves.push(dial.lv); }
    const practice = []; const d2 = new AD.Dial(5);
    for (let i = 0; i < 8; i++) { const p = practiceNext('challenger', d2); practice.push(p.q + '=' + p.answer); d2.hit(i % 3 !== 0); }
    const gen = byId['3-mult'].gen(AD.levelFor(dial.lv));
    return {
      moves, settled: dial.settled(), points: dial.points,
      starPool: starPool('sq5', 2, 10).map(p => p.key),
      daily: dailySet('challenger', '2026-10-31').map(p => p.q + '=' + p.answer),
      explorerSet: makeSet('explorer', 'seed-x', 10).map(p => p.q + '=' + p.answer + '|' + p.choices.join()),
      practice, gen: gen.q + '=' + gen.answer,
      kata: kata('sq5', 12).problems.map(p => p.q),
      tower: challengeSet(challenge(5), 10).map(p => p.q),
    };
  } finally { Math.random = real; }
}

test('for each band and no band, the same seed gives the same Dial moves, starPool, daily set, Practice questions and tower set', () => {
  const runs = {};
  store.clearReading();
  runs.none = run();
  assert.equal(bandOf(store.reading()), null);
  for (const [band, reading] of [['early', { grade: 'k' }], ['growing', { age: 8 }], ['fluent', { grade: '11' }]]) {
    store.setReading(reading);
    assert.equal(bandOf(store.reading()), band);
    runs[band] = run();
  }
  for (const band of BANDS) assert.deepEqual(runs[band], runs.none, band);
  assert.ok(runs.none.moves.length === 10 && runs.none.daily.length === 80 && runs.none.starPool.length > 0 && runs.none.practice.length === 8);
});
