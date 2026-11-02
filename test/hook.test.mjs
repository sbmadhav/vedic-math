/* The Hook (openspec hook, placement task 4.2): the dares and the honest calculator (js/hook.js), and who is new. Every dare
   is valid for its Trick, takes at least 6 calculator keys ending in '=', and the keys worked as a calculator give the
   round's answer; the other Tricks have none. Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; } };
const H = await import('../js/hook.js');
const store = await import('../js/store.js');
const { TRICKS, problemFor } = await import('../js/vedic.js');

test('eleven Tricks have a dare, each valid for its Trick, at least 6 keys ending in =, and the calculator gets the round\'s answer', () => {
  const ids = Object.keys(H.HOOK_DARES).sort();
  assert.deepEqual(ids, ['by11', 'by9s', 'crosswise', 'duplex', 'ends10', 'from9', 'near-base', 'sq5', 'square-near', 'sub-base', 'times5']);
  for (const id of ids) {
    const t = TRICKS.find(x => x.id === id), vals = H.HOOK_DARES[id];
    assert.ok(t, id);
    assert.equal(t.valid(vals), null, `${id} ${vals}: valid`);
    const keys = H.calcKeys(id, vals);
    assert.ok(keys.length >= 6, `${id}: ${keys.length} keys`);
    assert.equal(keys[keys.length - 1], '=');
    assert.ok(keys.slice(0, -1).every(k => /^\d$|^[×−]$/.test(k)), `${id}: ${keys.join(' ')}`);
    assert.equal(H.calcResult(keys), problemFor(t, vals).answer, `${id}: the calculator's result is the answer`);
    const d = H.dareFor(id);
    assert.equal(d.result, problemFor(t, vals).answer); assert.ok(d.seconds >= 2.7); assert.ok(d.pace <= 2500 && d.pace * t.steps(vals).length + 800 <= 20000, `${id}: the reveal fits in 20 seconds`);
  }
  for (const t of TRICKS) if (!ids.includes(t.id)) assert.equal(H.dareFor(t.id), null, `${t.id} has no dare`);
  assert.equal(TRICKS.length - ids.length, 10, 'the other ten Tricks');
});

test('calcKeys("sq5", [85]) is 8 5 × 8 5 =; from9 types the power of ten minus the number (9 keys for 357); 6 keys take 2.7 seconds', () => {
  assert.deepEqual(H.calcKeys('sq5', [85]), ['8', '5', '×', '8', '5', '=']);
  assert.deepEqual(H.calcKeys('from9', [357]), ['1', '0', '0', '0', '−', '3', '5', '7', '=']);
  assert.deepEqual(H.calcKeys('by11', [63]), ['6', '3', '×', '1', '1', '=']);
  assert.equal(H.calcResult(H.calcKeys('from9', [357])), 643);
  assert.equal(H.calcSeconds(H.calcKeys('sq5', [85])), 2.7);
  assert.equal(H.KEY_MS, 450);
  assert.equal(H.revealPace(3), 2500); assert.equal(H.revealPace(10), 1920); assert.ok(H.revealPace(12) * 12 + 800 <= 20000);
});

test('isNewPlayer: true for a blank Player, after a finished Placement and after a finished Try a trick; false after an answer, a lit or skipped Star, or hookSeen', () => {
  const fresh = () => { for (const k of Object.keys(mem)) delete mem[k]; store.reset(); };
  fresh(); assert.equal(H.isNewPlayer(), true);
  store.setPlacement({ grade: 5, steps: 3 }); store.setPlacementCard(); assert.equal(H.isNewPlayer(), true, 'a Placement records no answer');
  store.addSparks(30, 'try'); store.markSeen('try:challenger'); store.touchDay(); assert.equal(H.isNewPlayer(), true, 'a Try a trick earns Sparks and records no answer');
  fresh(); store.record('v-sq5', true, false); assert.equal(H.isNewPlayer(), false, 'one answer');
  fresh(); store.lightStar('from9', 1); assert.equal(H.isNewPlayer(), false, 'a lit Star');
  fresh(); store.skipStar('from9', 1); assert.equal(H.isNewPlayer(), false, 'a skipped Star');
  fresh(); store.setHookSeen(); assert.equal(H.isNewPlayer(), false, 'the Hook seen');
});

test('hookFor: a new Challenger gets the dare of a Trick that has one; Explorer never; a first Star on a Trick with no dare marks the Hook seen, so a later from9 Star plays none', () => {
  const fresh = () => { for (const k of Object.keys(mem)) delete mem[k]; store.reset(); };
  fresh();
  const h = H.hookFor('from9', 'challenger');
  assert.equal(h.dare.trick, 'from9'); assert.equal(h.keyMs, 450); assert.deepEqual(h.dare.vals, [357]);
  assert.equal(store.hookSeen(), false, 'seen only when the dare appears (the round sets it)');
  assert.equal(H.hookFor('from9', 'explorer'), null);
  fresh(); assert.equal(H.hookFor('zero-sum', 'pro'), null); assert.equal(store.hookSeen(), true); assert.equal(H.hookFor('from9', 'pro'), null);
  fresh(); store.record('3-mult', true, false); assert.equal(H.hookFor('sq5', 'challenger'), null);
});
