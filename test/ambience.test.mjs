/* Sutra ambience (openspec sutra-ambience): js/sutra-ambience.js with a fake AudioContext that records every node
   and gain ramp. The page's gesture, the Calm music, Pause motion and the clock are stubbed through its deps. */
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
let reduce = false;
globalThis.matchMedia = q => ({ matches: q === '(prefers-reduced-motion: reduce)' && reduce, addEventListener() {} });
const doc = new EventTarget();
doc.hidden = false;
doc.documentElement = { classList: { contains: () => false } };
doc.getElementById = () => null; doc.querySelector = () => null; doc.querySelectorAll = () => [];
globalThis.document = doc;
globalThis.window = globalThis;
const fetched = [];
globalThis.fetch = async url => { fetched.push(String(url)); return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };

/* ---------- Fake Web Audio ---------- */
let made = [];
const param = (v = 0) => { const p = { value: v, calls: [] }; for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) p[m] = (...a) => { p.calls.push([m, ...a]); return p; }; return p; };
const node = kind => { const n = { kind, connect: x => x, disconnect() {}, stopped: null, started: false, gain: param(1), frequency: param(), playbackRate: param(1), start() { n.started = true; }, stop(t) { n.stopped = t ?? 0; } }; made.push(n); return n; };
class FakeCtx {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = { kind: 'dest' }; }
  resume() { return Promise.resolve(); }
  createGain() { return node('gain'); } createOscillator() { return node('osc'); } createBiquadFilter() { return node('filter'); }
  createConvolver() { return node('verb'); } createBufferSource() { return node('source'); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  decodeAudioData(b, ok) { const buf = { duration: 1.3 }; ok && ok(buf); return Promise.resolve(buf); }
}
const ctx = new FakeCtx();

const A = await import('../js/sutra-ambience.js');
let music = false, musicSubs = new Set(), paused = false, gestured = false, now = 0;
Object.assign(A.deps, {
  ctx: () => ctx, musicOn: () => music, onMusic: fn => (musicSubs.add(fn), () => musicSubs.delete(fn)),
  paused: () => paused, gestured: () => gestured, now: () => now, omUrl: () => '/vedic-math/sounds/om.m4a',
});
const oscs = () => made.filter(n => n.kind === 'osc');
const sources = () => made.filter(n => n.kind === 'source');
const tick = () => new Promise(r => setTimeout(r, 5));
/* The ambience bus: the first gain node made, connected to the destination */
const bus = () => made.find(n => n.kind === 'gain');
const rampedTo0 = n => n.gain.calls.some(([m, v]) => m === 'linearRampToValueAtTime' && v === 0);
function fresh({ sound = true } = {}) {
  for (const k of Object.keys(mem)) delete mem[k];
  if (sound) mem['vm.sound'] = '1';
  made = []; fetched.length = 0; music = false; musicSubs.clear(); paused = false; gestured = true; now = 100000; reduce = false; doc.hidden = false;
}
const start = () => { const ctl = new AbortController(); const amb = A.sutraAmbience({ signal: ctl.signal }); return { ctl, amb }; };

test('defaults: ambience on, hum off, Om off', () => {
  fresh();
  assert.equal(A.ambienceOn(), true); assert.equal(A.humOn(), false); assert.equal(A.omOn(), false);
});

test('no node is made before a gesture; the first tap strikes once', () => {
  fresh(); gestured = false;
  const { ctl } = start();
  assert.equal(made.length, 0);
  doc.dispatchEvent(new Event('pointerdown'));
  assert.ok(oscs().length >= 8, 'a bowl strike (partials)');
  const n = oscs().length;
  doc.dispatchEvent(new Event('keydown'));
  assert.equal(oscs().length, n, 'only the first gesture');
  ctl.abort();
});

test('opening the page strikes; two more within 4 seconds strike once', () => {
  fresh();
  const { ctl, amb } = start();
  const one = oscs().length; assert.ok(one > 0);
  now += 1000; amb.strike(); assert.equal(oscs().length, one, 'within 4 s of the page strike');
  now += 3500; amb.strike(); const two = oscs().length; assert.ok(two > one, 'after 4 s');
  now += 2000; amb.strike(); assert.equal(oscs().length, two);
  ctl.abort();
});

for (const [name, set] of [
  ['Sound effects off', () => { mem['vm.sound'] = '0'; }],
  ['Calm on', () => { mem['vm.calm'] = '1'; }],
  ['Pause motion on', () => { paused = true; }],
  ['Calm music already playing', () => { music = true; }],
  ['the setting off', () => { mem['vm.sutraAmb'] = '0'; }],
]) test(`${name}: no ambience at all`, () => {
  fresh(); set();
  const { ctl, amb } = start(); now += 9000; amb.strike(); doc.dispatchEvent(new Event('pointerdown'));
  assert.equal(made.length, 0);
  ctl.abort();
});

test('reduced motion alone does not silence it', () => {
  fresh(); reduce = true;
  const { ctl } = start();
  assert.ok(oscs().length > 0);
  ctl.abort();
});

test('Low hum: starts with the strike; aborting ramps the bus to 0 and stops the hum', () => {
  fresh(); mem['vm.sutraHum'] = '1';
  const { ctl } = start();
  const hum = oscs().filter(o => o.frequency.value === 65.41);
  assert.equal(hum.length, 1, 'the C2 hum');
  ctl.abort();
  assert.ok(rampedTo0(bus()), 'faded out');
  assert.ok(hum[0].stopped !== null && hum[0].stopped <= 2.5, 'the hum stops within 2 s of the fade');
});

test('tab hidden fades out and stops the hum; shown again, the hum fades back with no strike', () => {
  fresh(); mem['vm.sutraHum'] = '1';
  const { ctl } = start();
  doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  assert.ok(rampedTo0(bus()));
  assert.ok(oscs().find(o => o.frequency.value === 65.41).stopped !== null);
  const before = oscs().length;
  doc.hidden = false; now += 10000; doc.dispatchEvent(new Event('visibilitychange'));
  const added = oscs().slice(before);
  assert.equal(added.filter(o => o.frequency.value === 65.41).length, 1, 'a new hum');
  assert.equal(added.length, 3, 'two hum tones and its swell, no bowl partials');
  ctl.abort();
});

test('Calm music starting fades the ambience out', () => {
  fresh();
  const { ctl } = start();
  music = true; musicSubs.forEach(f => f());
  assert.ok(rampedTo0(bus()));
  ctl.abort();
});

test('turning the setting off fades out at once', () => {
  fresh(); mem['vm.sutraHum'] = '1';
  const { ctl } = start();
  A.setAmbience(false);
  assert.ok(rampedTo0(bus()));
  ctl.abort();
});

test('Om off never fetches the Om; Om on plays it instead of the bowl', async () => {
  fresh();
  let { ctl } = start(); ctl.abort();
  assert.ok(!fetched.some(u => /om\.m4a/.test(u)));
  fresh(); mem['vm.sutraOm'] = '1';
  ({ ctl } = start());
  await tick();
  assert.ok(fetched.some(u => /sounds\/om\.m4a/.test(u)));
  assert.equal(oscs().length, 0, 'no bowl');
  assert.equal(sources().length, 1, 'the Om');
  ctl.abort();
});

test('the Om note says it is atmosphere and not part of the book', () => {
  assert.equal(A.OM_NOTE, 'Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book.');
  assert.ok(A.settingsHTML().includes(A.OM_NOTE));
  assert.match(A.ambienceButton(), /aria-pressed="(true|false)"/);
});

test('the Om URL carries its content hash, so a changed file is a new URL for the long-lived sound cache', async () => {
  const { OM } = await import('../js/say-clips.js');
  const real = await import('../js/sutra-ambience.js?real');
  assert.match(real.deps.omUrl(), new RegExp(`/sounds/om\\.m4a\\?v=${OM.v}$`));
});
