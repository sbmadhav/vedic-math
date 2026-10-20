/* The node:test API these tests were written against, on Vitest (openspec change react-typescript, task 1.6). Vitest
   replaces `node --test`; the test files keep their bodies and import `test` (and `mock`) from here instead of
   node:test, until their module moves to TypeScript and the test moves next to it as *.test.ts.

   What is covered, because these files use it:
   - test(name, fn) and test(name, { skip, todo }, fn). skip: the test is skipped with its reason. todo: the test runs;
     a failure is reported as skipped with the todo note instead of failing the run, as node:test does.
   - test.after(fn): once after the file's tests.
   - the test context t: t.mock.timers (enable, tick, setTime, reset), t.mock.method(object, name, impl) and
     t.after(fn); timers and methods are put back when the test ends, as node:test does.
   - mock.timers at the top of a file, for the whole file.
   node:assert keeps working as it is: a thrown AssertionError fails the Vitest test. */
import { test as vtest, afterAll, onTestFinished, vi } from 'vitest';

/* node:test's names for the timer APIs, as Vitest's fake timers name them */
const APIS = {
  setTimeout: ['setTimeout', 'clearTimeout'],
  setInterval: ['setInterval', 'clearInterval'],
  setImmediate: ['setImmediate', 'clearImmediate'],
  Date: ['Date'],
};

function timers() {
  return {
    enable({ apis = ['setInterval', 'setTimeout', 'setImmediate', 'Date'], now } = {}) {
      vi.useFakeTimers({ toFake: apis.flatMap(a => APIS[a] || [a]), ...(now === undefined ? {} : { now }) });
    },
    tick(ms = 1) { vi.advanceTimersByTime(ms); },
    setTime(ms) { vi.setSystemTime(ms); },
    runAll() { vi.runAllTimers(); },
    reset() { vi.useRealTimers(); },
  };
}

export const mock = {
  timers: timers(),
  method: (object, name, impl) => (impl ? vi.spyOn(object, name).mockImplementation(impl) : vi.spyOn(object, name)),
};

/* The `t` a test function receives: what it mocks is put back when that test ends */
function context() {
  const t = timers();
  let faked = false;
  return {
    mock: {
      timers: { ...t, enable(opts) { faked = true; t.enable(opts); onTestFinished(() => { if (faked) vi.useRealTimers(); faked = false; }); } },
      method(object, name, impl) { const spy = mock.method(object, name, impl); onTestFinished(() => spy.mockRestore()); return spy; },
    },
    after(fn) { onTestFinished(fn); },
  };
}

export function test(name, opts, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  const { skip, todo } = opts || {};
  if (skip) return vtest.skip(`${name} (skipped: ${typeof skip === 'string' ? skip : 'skip'})`, () => {});
  if (todo) {
    return vtest(name, async ctx => {
      try { await fn(context()); }
      catch (e) { ctx.skip(`todo: ${typeof todo === 'string' ? todo : 'todo'} (fails: ${String(e && e.message).split('\n')[0]})`); }
    });
  }
  return vtest(name, () => fn(context()));
}
test.after = fn => afterAll(fn);

export default test;
