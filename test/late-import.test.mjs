/* lateImport (js/life.js): a late import cut off by leaving the page is ignored quietly; a failure while the page
   stays still is reported, as before. WebKit rejects an import a reload cuts off before pagehide, so the report waits
   GRACE ms (the old page's timers never run once it has gone). */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';

globalThis.window = new EventTarget();
const { lateImport, GRACE } = await import('../js/life.js');

const fail = () => Promise.reject(new TypeError('Importing a module script failed.'));
const setup = t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const logged = [];
  t.mock.method(console, 'error', (...a) => { logged.push(a[0]); });
  return logged;
};

test('a load that works resolves to its module and logs nothing', async t => {
  const logged = setup(t);
  const m = { ok: true };
  assert.equal(await lateImport(() => Promise.resolve(m), 'x.js'), m);
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, []);
});

test('a failure while the page stays still is reported once, after the grace time', async t => {
  const logged = setup(t);
  assert.equal(await lateImport(fail, 'install.js'), undefined);
  t.mock.timers.tick(GRACE - 1);
  assert.deepEqual(logged, []);
  t.mock.timers.tick(1);
  assert.deepEqual(logged, ['install.js did not load']);
  t.mock.timers.tick(GRACE * 5);
  assert.deepEqual(logged, ['install.js did not load']);
});

test('a load that throws at once is caught the same way', async t => {
  const logged = setup(t);
  await lateImport(() => { throw new Error('no'); }, 'x.js');
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, ['x.js did not load']);
});

test('a failure followed by pagehide within the grace time is quiet (WebKit rejects before pagehide)', async t => {
  const logged = setup(t);
  await lateImport(fail, 'stories.js');
  window.dispatchEvent(new Event('pagehide'));
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, []);
});

/* A load still in flight, failed by the test */
const inFlight = () => { let reject; const p = new Promise((_, r) => { reject = r; }); return { load: () => p, fail: () => reject(new TypeError('Importing a module script failed.')) }; };

test('a load that fails after pagehide is quiet', async t => {
  const logged = setup(t);
  const f = inFlight();
  const cut = lateImport(f.load, 'sutra-tag.js');
  window.dispatchEvent(new Event('pagehide'));
  f.fail();
  await cut;
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, []);
});

test('back from the page cache, a load the leaving cut off stays quiet and a new load reports again', async t => {
  const logged = setup(t);
  const f = inFlight();
  const cut = lateImport(f.load, 'old.js');
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('pageshow'));
  f.fail();
  await cut;
  await lateImport(fail, 'new.js');
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, ['new.js did not load']);
});

test('a failure whose signal aborted, before or during the grace time, is quiet', async t => {
  const logged = setup(t);
  const a = new AbortController(); a.abort();
  await lateImport(fail, 'a.js', a.signal);
  const b = new AbortController();
  await lateImport(fail, 'b.js', b.signal);
  b.abort();
  t.mock.timers.tick(GRACE);
  assert.deepEqual(logged, []);
});
