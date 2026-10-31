/* Placement (openspec placement): the engine is shared/src/placement.ts (its tests are placement.test.ts next to it). Here:
   what only the Legacy modules can check, that the Mode starts match js/fx.js MODES and that js/adapt.js reads the shared
   tables, through js/placement.js (the URL the view and the e2e specs use). Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
globalThis.matchMedia ??= () => ({ matches: false });
const mem = {};
globalThis.localStorage ??= { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; } };
const P = await import('../js/placement.js');
const { MODES } = await import('../js/fx.js');
const A = await import('../js/adapt.js');

test('each Mode\'s climb starts at its first grade in js/fx.js MODES, and LEVEL_START there is the Mode\'s START', () => {
  for (const m of Object.keys(MODES)) {
    assert.equal(P.startStep(m), MODES[m].grades[0], m);
    assert.equal(P.LEVEL_START[String(MODES[m].grades[0])], A.START[m], m);
  }
  assert.equal(A.LEVEL_START, P.LEVEL_START, 'js/adapt.js reads the shared table');
  assert.equal(A.skillStart, P.skillStart);
});

test('js/placement.js is a shim of the shared module: the climb, the pool, the three choices and raise-only come through it', () => {
  for (const f of ['placementStart', 'placementAnswer', 'placementResult', 'threeChoices', 'asChoice', 'raiseOnly', 'beltFor', 'forwardBelt', 'suggestedGrades', 'rng', 'PLACEMENT_POOL', 'STEPS']) assert.ok(f in P, f);
  const st = P.placementStart({ mode: 'challenger', rand: P.rng(1) });
  assert.equal(String(P.STEPS[st.step]), '3');
});
