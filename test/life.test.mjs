/* js/life.js: listeners, timers, intervals and frame loops bound to an AbortSignal (view-lifecycle spec). */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { on, later, every, loop, child, onAbort } from '../js/life.js';

/* A frame is a 16 ms timeout, so mock timers drive the loop too */
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = id => clearTimeout(id);
const frames = (t, n) => { for (let i = 0; i < n; i++) t.mock.timers.tick(16); };

test('every helper throws without a signal', () => {
  const t = new EventTarget();
  assert.throws(() => on(t, 'x', () => {}), TypeError);
  assert.throws(() => later(() => {}, 10), TypeError);
  assert.throws(() => every(() => {}, 10, {}), TypeError);
  assert.throws(() => loop(() => {}), TypeError);
  assert.throws(() => child(null), TypeError);
});

test('onAbort: runs once on abort, or at once when already aborted', () => {
  assert.throws(() => onAbort(null, () => {}), TypeError);
  const ctl = new AbortController(); let n = 0;
  onAbort(ctl.signal, () => n++);
  assert.equal(n, 0);
  ctl.abort(); ctl.abort();
  assert.equal(n, 1);
  onAbort(ctl.signal, () => n++);
  assert.equal(n, 2);
});

test('on: the handler stops firing when the signal aborts', () => {
  const t = new EventTarget(), ctl = new AbortController(); let n = 0;
  on(t, 'tap', () => n++, ctl.signal);
  t.dispatchEvent(new Event('tap')); assert.equal(n, 1);
  ctl.abort();
  t.dispatchEvent(new Event('tap')); assert.equal(n, 1);
  on(t, 'tap', () => n++, ctl.signal); // already aborted: never attached
  t.dispatchEvent(new Event('tap')); assert.equal(n, 1);
});

test('later: runs once in time, never after an abort', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const a = new AbortController(), b = new AbortController(); let ran = [];
  later(() => ran.push('a'), 100, a.signal);
  later(() => ran.push('b'), 100, b.signal);
  t.mock.timers.tick(99); assert.deepEqual(ran, []);
  b.abort();
  t.mock.timers.tick(1); assert.deepEqual(ran, ['a']);
  t.mock.timers.tick(1000); assert.deepEqual(ran, ['a']);
  later(() => ran.push('c'), 0, b.signal);
  t.mock.timers.tick(10); assert.deepEqual(ran, ['a']);
});

test('every: repeats until the signal aborts', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const ctl = new AbortController(); let n = 0;
  every(() => n++, 50, ctl.signal);
  t.mock.timers.tick(160); assert.equal(n, 3);
  ctl.abort();
  t.mock.timers.tick(500); assert.equal(n, 3);
});

test('loop: one call per frame, stops on abort or when the callback returns false', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const a = new AbortController(); let n = 0;
  loop(() => { n++; }, a.signal);
  frames(t, 5); assert.equal(n, 5);
  a.abort();
  frames(t, 5); assert.equal(n, 5);
  const b = new AbortController(); let m = 0;
  loop(() => ++m < 3 ? undefined : false, b.signal);
  frames(t, 10); assert.equal(m, 3);
});

test('child: aborts with its parent, and alone without touching the parent', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const parent = new AbortController(), c1 = child(parent.signal), c2 = child(parent.signal); let ran = 0;
  later(() => ran++, 10, c2.signal);
  c1.abort();
  assert.equal(c1.signal.aborted, true);
  assert.equal(parent.signal.aborted, false);
  assert.equal(c2.signal.aborted, false);
  parent.abort();
  assert.equal(c2.signal.aborted, true);
  t.mock.timers.tick(20); assert.equal(ran, 0);
  const late = child(parent.signal); // parent already aborted
  assert.equal(late.signal.aborted, true);
  const grand = child(child(new AbortController().signal).signal); assert.equal(grand.signal.aborted, false);
});

test('child: many short children leave no listeners on the parent', () => {
  const parent = new AbortController(); let added = 0, removed = 0;
  const add = parent.signal.addEventListener.bind(parent.signal), rem = parent.signal.removeEventListener.bind(parent.signal);
  parent.signal.addEventListener = (...a) => { added++; return add(...a); };
  parent.signal.removeEventListener = (...a) => { removed++; return rem(...a); };
  for (let i = 0; i < 100; i++) child(parent.signal).abort();
  assert.equal(added, 100);
  assert.equal(removed, 100);
});
