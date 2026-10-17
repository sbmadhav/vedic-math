/* Say it (openspec sutra-pronunciation): the name clips on disk match the generated index, every Trick names a real
   Sutra card, and js/say.js plays, stops, counts, prefetches and falls back as the spec says. Playback, fetch, the
   count and the status are stubbed through say.js's deps; speechSynthesis is a fake. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

globalThis.requestIdleCallback = fn => setTimeout(fn, 0);
globalThis.cancelIdleCallback = h => clearTimeout(h);
const said = [];
let synthOn = true;
const synth = { cancel() {}, speak(u) { said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); } };
globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

const S = await import('../js/say.js');
const { CLIPS, VOICE, OM } = await import('../js/say-clips.js');
const { indexSource, hashOf, VOICE: TOOL_VOICE } = await import('../tools/sutra-voice/make-sutra-clips.mjs');
const { TRICKS } = await import('../js/vedic.js');
const { SUTRAS, SUBSUTRAS } = await import('../js/sutras.js');

const wait = ms => new Promise(r => setTimeout(r, ms));
const btn = id => {
  const attrs = { 'aria-pressed': 'false' };
  return { dataset: { say: id }, attrs, setAttribute: (k, v) => { attrs[k] = v; }, classList: { toggle() {} }, closest() { return this; } };
};
/* Fresh stubs for each test: play resolves when the test says the clip ended */
function stubs({ fail = false, saveData = false, manualStart = false } = {}) {
  S._reset(); said.length = 0; synthOn = true;
  const log = { played: [], stops: 0, counts: 0, status: [], fetched: [], end: null, starts: [] };
  Object.assign(S.deps, {
    play: (url, opts = {}) => {
      log.played.push(url); if (fail) return Promise.reject(new Error('decode'));
      log.starts.push(opts.onStart); if (!manualStart && opts.onStart) opts.onStart(); // the clip really started
      return new Promise(res => { log.end = () => res('ended'); });
    },
    stop: () => { log.stops++; },
    count: () => { log.counts++; },
    status: t => { log.status.push(t); },
    fetch: url => { log.fetched.push(url); const res = { ok: !(log.failIds || []).some(id => url.includes(`/${id}.m4a`)), arrayBuffer: async () => new ArrayBuffer(1) }; const hold = (log.hold || {})[url.match(/\/(\w+)\.m4a/)[1]]; return hold ? hold.then(ok => ({ ...res, ok })) : Promise.resolve(res); },
    saveData: () => saveData,
    synth: () => (synthOn ? synth : null),
  });
  return log;
}

/* ---------- The clips and their index ---------- */
test('29 clips, each under 30 KB and all under 500 KB; the index matches the files', () => {
  const ids = Object.keys(CLIPS);
  assert.equal(ids.length, 29);
  assert.equal(VOICE, 'kid_alpha_jalpha', 'the owner chose the Alpha kid blend');
  assert.equal(VOICE, TOOL_VOICE.id);
  let total = 0;
  for (const id of ids) {
    const f = new URL(`../sounds/sutras/${id}.m4a`, import.meta.url), buf = readFileSync(f);
    assert.ok(buf.length < 30 * 1024, `${id} is ${buf.length} bytes`);
    assert.equal(CLIPS[id].bytes, buf.length, `${id} bytes`);
    assert.equal(CLIPS[id].v, hashOf(buf), `${id} hash`);
    total += buf.length;
  }
  assert.ok(total < 500 * 1024, `all clips are ${total} bytes`);
  const rows = ids.map(id => ({ id, ...CLIPS[id] }));
  const om = readFileSync(new URL('../sounds/om.m4a', import.meta.url));
  assert.deepEqual(OM, { bytes: om.length, v: hashOf(om) }, 'the Om is indexed by its content hash');
  assert.equal(readFileSync(new URL('../js/say-clips.js', import.meta.url), 'utf8'), indexSource(rows, OM), 'js/say-clips.js is what the tool writes');
  assert.ok(om.length < 20 * 1024, 'the Om is small');
});

test('the ids are the 29 Sutra cards, and clip URLs carry the content hash', () => {
  const cards = [...SUTRAS.map(c => 's' + c.n), ...SUBSUTRAS.map(c => 'u' + c.n)];
  assert.deepEqual(Object.keys(CLIPS).sort(), cards.sort());
  assert.match(S.clipUrl('s1'), new RegExp(`/sounds/sutras/s1\\.m4a\\?v=${CLIPS.s1.v}$`));
});

test('every Trick names one of the 29 cards, and its sutra line is that card\'s name', () => {
  const norm = s => s.normalize('NFC').toLowerCase().replace(/[\s\-()]/g, '');
  for (const t of TRICKS) {
    assert.ok(S.NAMES[t.sutraId], `${t.id}: ${t.sutraId}`);
    const said = t.sutra.replace(/\s*\([^)]*\)\s*$/, '');
    assert.ok(norm(S.NAMES[t.sutraId].name).startsWith(norm(said)), `${t.id}: "${t.sutra}" is ${t.sutraId}`); // div9 says only the first word
  }
  assert.equal(TRICKS.find(t => t.id === 'div9').sutraId, 's2', 'Nikhilaṃ (division by 9) is Sutra 2');
  assert.deepEqual(['sq5', 'recip', 'by9s'].map(id => TRICKS.find(t => t.id === id).sutra), ['Ekādhikena Pūrveṇa', 'Ekādhikena Pūrveṇa', 'Ekanyūnena Pūrveṇa']);
  assert.ok(!TRICKS.some(t => /Pūrvena|Nikhilam|Navataścaramam|Śūnyam /.test(t.sutra)), 'spelling fixes: ṇ and ṃ');
});

/* ---------- The button and the Respelling ---------- */
test('the button: accessible name, toggle state, visible words in the name; the Respelling has its hidden prefix', () => {
  const b = S.sayButton('s3', { label: true });
  assert.match(b, /aria-label="Hear how to say Ūrdhva-Tiryagbhyām"/);
  assert.match(b, /aria-pressed="false"/);
  assert.match(b, /type="button"/);
  assert.match(b, /Hear how to say<\/span>/);
  assert.match(S.respellHTML('s1'), /<span class="say-vh">Say it like: <\/span>ay-kah-dhi-KAY-nuh poor-VAY-nuh/);
  assert.match(S.devaHTML('s1'), /lang="sa">एकाधिकेन पूर्वेण</);
  assert.equal(S.sayButton('nope'), '');
});

/* ---------- Playing, stopping, counting ---------- */
test('a tap plays that clip, presses the button until it ends, and is counted once', async () => {
  const log = stubs(), ctl = new AbortController(), b = btn('s1');
  S.tap(b, ctl.signal);
  assert.equal(log.played.length, 1);
  assert.match(log.played[0], /sounds\/sutras\/s1\.m4a\?v=/);
  assert.equal(b.attrs['aria-pressed'], 'true');
  assert.equal(log.counts, 1);
  log.end(); await wait(5);
  assert.equal(b.attrs['aria-pressed'], 'false');
  ctl.abort();
});

test('a second tap stops it and is not counted; a tap on another name stops the first', async () => {
  const log = stubs(), ctl = new AbortController(), a = btn('s1'), b = btn('s3');
  S.tap(a, ctl.signal); S.tap(a, ctl.signal);
  assert.equal(log.counts, 1);
  assert.equal(log.stops, 1);
  assert.equal(a.attrs['aria-pressed'], 'false');
  S.tap(a, ctl.signal); S.tap(b, ctl.signal);
  assert.equal(a.attrs['aria-pressed'], 'false');
  assert.equal(b.attrs['aria-pressed'], 'true');
  assert.equal(log.counts, 3);
  ctl.abort();
});

test('aborting the signal stops a playing clip and cancels the idle prefetch', async () => {
  const log = stubs(), ctl = new AbortController(), root = { contains: () => true, addEventListener() {} };
  S.wireSay(root, ctl.signal);
  const b = btn('s1'); S.tap(b, ctl.signal);
  ctl.abort();
  assert.equal(log.stops, 1);
  assert.equal(b.attrs['aria-pressed'], 'false');
  await wait(30);
  assert.ok(log.fetched.length <= 1, `prefetch stopped (${log.fetched.length})`);
});

/* ---------- Loading ---------- */
test('after the first tap the other 28 clips are fetched one at a time, and never the tapped one again', async () => {
  const log = stubs(), ctl = new AbortController();
  S.tap(btn('s3'), ctl.signal);
  await wait(200);
  assert.equal(log.fetched.length, 28);
  assert.ok(!log.fetched.some(u => /\/s3\.m4a/.test(u)));
  assert.equal(new Set(log.fetched).size, 28);
  ctl.abort();
});

test('with Save-Data on, only the tapped clip is fetched', async () => {
  const log = stubs({ saveData: true }), ctl = new AbortController();
  S.tap(btn('s3'), ctl.signal);
  await wait(50);
  assert.equal(log.fetched.length, 0);
  assert.equal(log.played.length, 1);
  ctl.abort();
});

/* ---------- Fallback ---------- */
test('a clip that cannot play: the device voice reads the Respelling and the status says so', async () => {
  const log = stubs({ fail: true }), ctl = new AbortController(), b = btn('s1');
  S.tap(b, ctl.signal);
  await wait(80);
  assert.deepEqual(said, ['ay kah dhi kay nuh poor vay nuh']);
  assert.deepEqual(log.status, ["Played with this device's voice, which may not be exact."]);
  assert.equal(b.attrs['aria-pressed'], 'false');
  ctl.abort();
});

test('no sound at all: the status shows the Respelling to read, nothing throws', async () => {
  const log = stubs({ fail: true }), ctl = new AbortController(), b = btn('s1');
  synthOn = false;
  S.tap(b, ctl.signal);
  await wait(10);
  assert.deepEqual(log.status, ['Sound is not available here. Say it like this: ay-kah-dhi-KAY-nuh poor-VAY-nuh']);
  assert.equal(b.attrs['aria-pressed'], 'false');
  assert.equal(said.length, 0);
  ctl.abort();
});

test('voice.js playClip rejects without Web Audio, so Say it falls back', async () => {
  const { playClip } = await import('../js/voice.js');
  await assert.rejects(playClip('/x.m4a'));
});

test('the clip index hash is the first 10 hex of the SHA-256', () => {
  const buf = Buffer.from('x');
  assert.equal(hashOf(buf), createHash('sha256').update(buf).digest('hex').slice(0, 10));
});

/* ---------- Counting (review: count only clips that really start) ---------- */
test('a clip that fails, falls back or is superseded before it starts is not counted', async () => {
  let log = stubs({ fail: true }); let ctl = new AbortController();
  S.tap(btn('s1'), ctl.signal); await wait(80);
  assert.equal(log.counts, 0, 'fetch or decode failure: the fallback voice is not a clip start');
  ctl.abort();
  log = stubs({ manualStart: true }); ctl = new AbortController();
  const a = btn('s1'), b = btn('s3');
  S.tap(a, ctl.signal); S.tap(b, ctl.signal); // a is still loading when b is tapped
  log.starts[0](); // a's playback would start now, but it was superseded
  assert.equal(log.counts, 0);
  log.starts[1]();
  assert.equal(log.counts, 1, 'only b, once it starts');
  ctl.abort();
});

test('clip URLs come only from the generated index (no URL for an id that is not its own key)', () => {
  for (const id of ['constructor', '__proto__', 'toString', '../x', 'https://evil.example/a', '', undefined]) {
    assert.equal(S.clipUrl(id), null, String(id));
    assert.equal(S.sayButton(id), '', String(id));
  }
  const log = stubs(), ctl = new AbortController();
  S.tap(btn('constructor'), ctl.signal);
  assert.equal(log.played.length, 0);
  ctl.abort();
});

test('a prefetch that gets an HTTP error is tried again by a later prefetch', async () => {
  const log = stubs(); log.failIds = ['u5'];
  let ctl = new AbortController();
  S.tap(btn('s3'), ctl.signal); await wait(200);
  assert.equal(log.fetched.filter(u => /\/u5\.m4a/.test(u)).length, 1);
  ctl.abort(); log.failIds = []; log.fetched.length = 0;
  ctl = new AbortController();
  S.tap(btn('s1'), ctl.signal); await wait(100);
  assert.deepEqual(log.fetched.map(u => u.match(/\/(\w+)\.m4a/)[1]), ['u5'], 'only the clip that failed, not the 27 saved ones');
  ctl.abort();
});

test('a prefetch left running by a closed view that then fails is retried by the next queue', async () => {
  const log = stubs(); let release;
  log.hold = { s2: new Promise(r => { release = r; }) }; // s2's request hangs until the test answers it
  let ctl = new AbortController();
  S.tap(btn('s1'), ctl.signal); await wait(30);
  assert.ok(log.fetched.some(u => /\/s2\.m4a/.test(u)), 's2 is in flight');
  ctl.abort(); // the Player leaves the view
  log.hold = {}; log.fetched.length = 0;
  ctl = new AbortController();
  S.tap(btn('s3'), ctl.signal); // back again: a new queue, while s2 is still in flight
  await wait(30);
  release(false); // the old s2 request fails with an HTTP error
  await wait(200);
  assert.ok(log.fetched.some(u => /\/s2\.m4a/.test(u)), 'the new queue fetched s2 again');
  ctl.abort();
});

test('on a slow first tap the prefetch waits for the tapped clip and never requests it a second time', async () => {
  const log = stubs({ manualStart: true }), ctl = new AbortController();
  S.tap(btn('s1'), ctl.signal); // still loading: playback has not started
  await wait(150);
  assert.ok(!log.fetched.some(u => /\/s1\.m4a/.test(u)), 'the tapped clip is not prefetched while it loads');
  log.starts[0](); // now it starts
  await wait(200);
  assert.equal(log.fetched.length, 28);
  assert.ok(!log.fetched.some(u => /\/s1\.m4a/.test(u)));
  ctl.abort();
});

test('a tapped clip whose fetch never settles does not block the prefetch once it is stopped, superseded or left', async () => {
  const log = stubs({ manualStart: true });
  let ctl = new AbortController();
  S.tap(btn('s1'), ctl.signal); // s1 hangs: playback never starts and never fails
  ctl.abort(); // the Player leaves
  ctl = new AbortController();
  S.tap(btn('s3'), ctl.signal); log.starts[1](); // back, taps another name, which starts
  await wait(250);
  assert.ok(log.fetched.some(u => /\/s1\.m4a/.test(u)), 'the stalled s1 is fetched by the new queue');
  assert.equal(log.fetched.length, 28, 'and every other name except the playing s3');
  ctl.abort();
});

test('a late request that settles after a newer one started never removes the newer one from inflight', async () => {
  const log = stubs(); S.deps.lockWait = 20; let releaseOld;
  try {
    log.hold = { s2: new Promise(r => { releaseOld = r; }) }; // the first s2 request hangs
    let ctl = new AbortController();
    S.tap(btn('s1'), ctl.signal); await wait(30); ctl.abort(); // s2 in flight, view left
    log.hold = { s2: new Promise(() => {}) }; // the next s2 request hangs too
    ctl = new AbortController();
    S.tap(btn('s3'), ctl.signal); await wait(80); // the new queue gives up waiting and starts its own s2 request
    assert.equal(log.fetched.filter(u => /\/s2\.m4a/.test(u)).length, 2);
    releaseOld(false); await wait(20); // the old request fails late
    ctl.abort(); ctl = new AbortController();
    S.deps.lockWait = 10000;
    S.tap(btn('s4'), ctl.signal); await wait(60); // a third queue while the second s2 request is still pending
    assert.equal(log.fetched.filter(u => /\/s2\.m4a/.test(u)).length, 2, 'it waits on the pending request instead of starting a third');
    ctl.abort();
  } finally { S.deps.lockWait = 8000; }
});
