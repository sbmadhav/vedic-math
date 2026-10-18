/* Math Lens digit reader (openspec play-experiences, "The Math Lens reader comes from this site"): Tesseract.js is
   served from vendor/tesseract/, byte for byte from its npm packages, and one reader worker is kept per page load. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TESS, readerAllowed, readerSlot } from '../../js/play/exp/lens-cam.js';

const dir = new URL('../../vendor/tesseract/', import.meta.url);
/* sha256 of each file as published on npm: tesseract.js@5.1.1 dist/, tesseract.js-core@5.1.1, and
   @tesseract.js-data/eng@1.0.0 4.0.0_best_int/. A new version is a new list. */
const PINNED = {
  'tesseract.esm.min.js': '2537be686335e4b2637e933cdc85a52dd80267a592689c1bd63235c8591540ae',
  'worker.min.js': 'aca1229639fc9907d86f96e825955a2b7c5716d17f3bc3acd71f9c7ab66181fc',
  'worker.min.js.LICENSE.txt': '45f54171aeaa1d10c0c1a66f374b7bba1f02472b1487fbe892eec04f840002ac',
  'tesseract-core-simd-lstm.wasm.js': 'ce20eda9533cbed1e6c2b4276fbae1e0adc61b6754b5513084be601787b457cf',
  'tesseract-core-lstm.wasm.js': '8f04aa0cc81e7bde33f80e92fa01a7a665f0b4884d098acf5de9c7104a11dfaa',
  'eng.traineddata.gz': '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91',
  'LICENSE': 'c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08'
};

test('vendor/tesseract holds exactly the pinned reader files, unchanged', () => {
  assert.deepEqual(readdirSync(dir).sort(), Object.keys(PINNED).sort());
  for (const [f, sum] of Object.entries(PINNED)) assert.equal(createHash('sha256').update(readFileSync(new URL(f, dir))).digest('hex'), sum, f);
});

test('every reader path is on this site, under /vedic-math/vendor/tesseract/', () => {
  for (const [k, u] of Object.entries(TESS)) assert.ok(u.startsWith('/vedic-math/vendor/tesseract/'), `${k}: ${u}`);
  assert.ok(!JSON.stringify(TESS).includes('://'), 'no other origin');
  const src = readFileSync(new URL('../../js/play/exp/lens-cam.js', import.meta.url), 'utf8');
  assert.match(src, /workerBlobURL: false/, 'the worker starts from its URL (worker-src \'self\'), never blob:');
  assert.doesNotMatch(src, /jsdelivr/i);
});

test('readerAllowed: no policy, or a policy whose script-src has \'wasm-unsafe-eval\'', () => {
  const withMeta = content => { globalThis.document = { querySelector: () => (content == null ? null : { getAttribute: () => content }) }; try { return readerAllowed(); } finally { delete globalThis.document; } };
  assert.equal(withMeta(null), true);
  assert.equal(withMeta("default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-x'; worker-src 'self'"), true);
  assert.equal(withMeta("default-src 'self'; script-src 'self' 'sha256-x'; worker-src 'self'"), false);
  assert.equal(withMeta("script-src 'self'; style-src 'wasm-unsafe-eval'"), false, 'only script-src counts');
});

const fakeWorker = () => { const w = { ended: 0, terminate: async () => { w.ended++; } }; return w; };
const tick = () => new Promise(r => setImmediate(r));

test('readerSlot: two reads during one download share one worker', async () => {
  let made = 0, release;
  const slot = readerSlot(() => { made++; return new Promise(r => { release = () => r(fakeWorker()); }); });
  const a = slot.get(), b = slot.get();
  assert.equal(slot.started, true);
  await tick(); release();
  assert.equal(await a, await b);
  assert.equal(made, 1);
});

test('readerSlot: closing the view during the download terminates the worker when it arrives', async () => {
  let release; const w = fakeWorker();
  const slot = readerSlot(() => new Promise(r => { release = () => r(w); }));
  const p = slot.get();
  await tick();
  slot.drop();
  assert.equal(slot.started, false);
  release(); await p; await tick();
  assert.equal(w.ended, 1);
});

test('readerSlot: a failed start is forgotten, so the next read tries again', async () => {
  let n = 0;
  const slot = readerSlot(async () => { n++; if (n === 1) throw new Error('offline'); return fakeWorker(); });
  await assert.rejects(slot.get());
  await tick();
  assert.equal(slot.started, false);
  await slot.get();
  assert.equal(n, 2);
});
