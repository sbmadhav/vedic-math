/* Tala Lab: the rhythm arithmetic is exact. Meeting points are least common multiples, every tihai the
   solver offers lands on sam (and it finds them all), phrases land by remainders, and the look-ahead
   scheduler plays every note exactly once, on time, however unevenly its timer runs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, b64url } from '../../js/play/kit.js';
import * as C from '../../js/play/exp/tala-core.js';

test('gcd and lcm, and where rhythms first meet', () => {
  assert.equal(C.gcd(12, 18), 6); assert.equal(C.lcm(3, 4), 12); assert.equal(C.lcm(4, 6), 12); assert.equal(C.lcm(5, 5), 5);
  assert.equal(C.firstMeet([3, 4]), 12); assert.equal(C.firstMeet([2, 3, 4]), 12); assert.equal(C.firstMeet([3, 4, 5]), 60); assert.equal(C.firstMeet([6, 9]), 18);
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) {
    /* brute force: the first count after 0 that both divide */
    let c = 1; while (c % a || c % b) c++;
    assert.equal(C.firstMeet([a, b]), c, `${a}, ${b}`);
    const nk = C.necklace([a, b]);
    assert.equal(nk.length, c);
    nk.forEach(x => assert.deepEqual(x.hits, [a, b].map((v, j) => (x.count % v === 0 ? j : -1)).filter(j => j >= 0)));
    assert.deepEqual(nk.filter(x => x.hits.length === 2).map(x => x.count), [c]);
    assert.ok(!C.meetWhy([a, b]).includes('—'));
  }
  assert.match(C.meetWhy([4, 6]), /share a factor of 2/);
  assert.match(C.meetWhy([3, 4]), /no factor/);
});

test('the necklace pattern strikes each rhythm on its multiples and blooms where all meet', () => {
  const p = C.necklacePattern([3, 4]);
  assert.equal(p.len, 12);
  assert.deepEqual(p.events.filter(e => e.track === 'r0').map(e => e.at), [0, 3, 6, 9]);
  assert.deepEqual(p.events.filter(e => e.track === 'r1').map(e => e.at), [0, 4, 8]);
  assert.deepEqual(p.events.filter(e => e.track === 'meet').map(e => e.at), [0]);
});

test('phrases land by remainders, come home after lcm / p phrases and draw star polygons', () => {
  assert.deepEqual(C.landings(5, 8), [1, 6, 3, 8, 5, 2, 7, 4]);
  assert.deepEqual(C.landings(6, 8), [1, 7, 5, 3]);
  assert.deepEqual(C.landings(4, 8), [1, 5]);
  for (let n = 3; n <= 12; n++) for (let p = 1; p <= 12; p++) {
    /* simulate: walk p beats at a time around the cycle */
    let at = 0; const seen = [];
    do { seen.push(at + 1); at = (at + p) % n; } while (at !== 0);
    assert.deepEqual(C.landings(p, n), seen, `p ${p} in ${n}`);
    assert.equal(C.phrasesToSam(p, n), seen.length);
    assert.equal(C.landing(p, n, seen.length + 1), 1);
    const s = C.star(p, n); assert.equal(s.points, seen.length); assert.equal(s.points * s.polygons, n);
  }
  for (const t of Object.values(C.TALAS)) { assert.equal(t.hands.length, t.beats); assert.equal(t.parts.reduce((a, b) => a + b, 0), t.beats); }
  assert.deepEqual(C.TALAS.adi.hands, ['clap', 'pinky', 'ring', 'middle', 'clap', 'wave', 'clap', 'wave']);
});

test('tihai: every solution lands on sam, and the solver finds all of them', () => {
  for (const Cn of [5, 6, 7, 8, 12, 16, 24, 32, 40, 56, 64]) for (let start = 0; start < Cn; start++) {
    const sols = C.tihaiSolutions(Cn, start), D = C.toSam(Cn, start);
    const brute = [];
    for (let p = 2; p <= 3 * Cn; p++) for (let g = 0; g <= 3 * Cn; g++) {
      /* play it: the last syllable sits at start + 2 (p + g) + p - 1, which must be the next sam */
      const last = start + 2 * (p + g) + p - 1;
      if (last === start + D) brute.push({ p, g });
    }
    assert.deepEqual(sols, brute, `C ${Cn} start ${start}`);
    for (const { p, g } of sols) {
      assert.equal(C.tihaiSpan(p, g), D + 1); assert.equal(C.tihaiMiss(Cn, start, p, g), 0);
      const counts = C.tihaiCounts(p, g);
      assert.equal(counts.length, 3 * p + 2 * g);
      assert.equal(counts.filter(x => x.last).length, 1);
      assert.equal(counts[counts.length - 1].word, 'thom');
      assert.equal((start + counts.length - 1) % Cn, 0, 'last syllable is on sam');
    }
  }
  assert.equal(C.tihaiMiss(8, 0, 2, 0), -3); assert.equal(C.tihaiMiss(8, 0, 4, 0), 3);
});

test('every tihai puzzle can be solved, fixed values allow a solution, and the pattern lands', () => {
  for (const z of C.TIHAI_PUZZLES) {
    const sols = C.tihaiSolutions(z.C, z.start);
    assert.ok(sols.length, z.id);
    const ok = sols.filter(s => !z.fix || Object.entries(z.fix).every(([k, v]) => s[k] === v));
    assert.ok(ok.length >= 1, `${z.id} with ${JSON.stringify(z.fix)}`);
    assert.equal(z.C % z.gati, 0); assert.equal(z.start % z.gati, 0, 'starts on a beat');
    assert.ok(!z.say.includes('—'));
    const { p, g } = ok[0], pat = C.tihaiPattern({ C: z.C, start: z.start, p, g, gati: z.gati });
    const land = pat.events.find(e => e.track === 'land');
    assert.equal(land.miss, 0); assert.equal(land.voice, 'bloom'); assert.equal(land.at, z.C);
    const sam = pat.events.filter(e => e.track === 'tala' && e.voice === 'sam').map(e => e.at);
    assert.ok(sam.includes(z.C), 'a sam clap on the landing');
  }
  assert.deepEqual(C.puzzlesFor('explorer').map(z => z.id), ['t1', 't2', 't3']);
  assert.equal(C.puzzlesFor('pro').length, C.TIHAI_PUZZLES.length);
});

test('phrases have the right length and end on thom', () => {
  for (let p = 1; p <= 24; p++) { const ph = C.phrase(p); assert.equal(ph.length, p, `p ${p}`); assert.equal(ph[p - 1], 'thom'); ph.forEach(w => assert.ok(C.PALETTE.includes(w) || ['ju'].includes(w), w)); }
  assert.deepEqual(C.phrase(5), ['ta', 'di', 'ki', 'na', 'thom']);
  for (const g of C.GATI_ORDER) assert.equal(C.GATIS[g].words.length, g);
});

test('scheduler math: windows cover every event once, at exact times', () => {
  const pats = [C.gatiPattern(3), C.gatiPattern(7), C.gatiPattern([4, 4, 3, 3, 5, 5, 7, 7]), C.necklacePattern([3, 4]), C.compPattern({ n: 7, gati: 3, seq: C.parseSeq('ta ki ta ta ka di mi') })];
  for (const pat of pats) {
    const bpm = 90, start = 1.25, unit = 60 / bpm / pat.perBeat, until = start + 3 * pat.len * unit;
    /* windows of varying size, back to back */
    const r = rng('windows'); let from = 0; const got = [];
    while (from < until) { const to = from + 0.005 + r() * 0.2; got.push(...C.eventsInWindow(pat, start, bpm, from, to)); from = to; }
    const want = [];
    for (let k = 0; k < 3; k++) for (const e of pat.events) want.push(start + (k * pat.len + e.at) * unit);
    const times = got.filter(e => e.time < until - 1e-9).map(e => e.time);
    assert.equal(times.length, want.length);
    want.sort((a, b) => a - b).forEach((t, i) => assert.ok(Math.abs(times[i] - t) < 1e-9, `event ${i}`));
    for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1]);
  }
  /* a pattern that plays once stops */
  const once = { ...C.gatiPattern(4, 1), loop: false };
  assert.equal(C.eventsInWindow(once, 0, 60, 0, 100).length, once.events.length);
});

test('journey: one beat holds 3, 4, 5 and 7 exactly, on lcm 420 ticks', () => {
  const pat = C.gatiPattern([4, 3, 5, 7]);
  assert.equal(pat.perBeat, 420);
  for (const [b, g] of [[0, 4], [1, 3], [2, 5], [3, 7]]) {
    const ev = pat.events.filter(e => e.track === 'gati' && e.beat === b);
    assert.equal(ev.length, g);
    ev.forEach((e, i) => assert.equal(e.at, b * 420 + (i * 420) / g));
  }
  assert.equal(C.countMs(60, 4), 250); assert.equal(C.countMs(72, 3), 277.8);
});

test('the look-ahead loop: jittery ticks still schedule every note once, ahead of time', () => {
  const pat = C.gatiPattern(5), bpm = 100, start = 0.1, ahead = 0.12;
  const r = rng('jitter'); let now = 0, horizon = start; const seen = new Map();
  while (now < 6) {
    const w = C.plan(horizon, now, ahead); horizon = w.horizon;
    for (const e of C.eventsInWindow(pat, start, bpm, w.from, w.to)) {
      const key = `${e.time.toFixed(9)} ${e.track} ${e.at}`;
      assert.ok(!seen.has(key), 'scheduled twice'); seen.set(key, now);
      assert.ok(e.time >= now - 1e-9, 'scheduled before it sounds');
    }
    now += 0.01 + r() * 0.09; /* timers fire anywhere from 10 to 100 ms apart */
  }
  /* the same notes as one big window over the whole time */
  const expect = C.eventsInWindow(pat, start, bpm, 0, horizon).length;
  assert.ok(expect > 50);
  assert.equal(seen.size, expect);
  /* a stalled tab: after a 2 second gap it skips stale notes rather than bursting them */
  const w = C.plan(1, 3, ahead, 0.05); assert.ok(w.from >= 2.95);
});

test('tap timing: nearest pulse and kind words', () => {
  assert.deepEqual(C.nearestPulse(1.012, 0, 0.5), { index: 2, ms: 12 });
  assert.deepEqual(C.nearestPulse(0.97, 0, 0.5), { index: 2, ms: -30 });
  assert.equal(C.feel(10).grade, 3); assert.equal(C.feel(-50).grade, 2); assert.equal(C.feel(100).grade, 1); assert.equal(C.feel(300).grade, 0);
  assert.match(C.feel(40).text, /late/); assert.match(C.feel(-40).text, /early/);
  assert.equal(C.meanAbs([10, -20, 30]), 20);
});

test('composer links round trip and bad links are refused', () => {
  const r = rng('comp');
  for (let i = 0; i < 300; i++) {
    const n = 3 + Math.floor(r() * 30), c = C.cleanComp({ n, gati: 1 + Math.floor(r() * 9), bpm: 40 + Math.floor(r() * 120), seq: Array.from({ length: n }, () => C.PALETTE[Math.floor(r() * C.PALETTE.length)]) });
    const code = C.encodeComp(c, b64url);
    assert.match(code, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(C.decodeComp(code, b64url), c);
  }
  assert.equal(C.decodeComp('not a code!', b64url), null);
  assert.equal(C.decodeComp(b64url.enc('v9.8.4.72.1111'), b64url), null);
  const wild = C.decodeComp(b64url.enc('v1.999.0.5000.12'), b64url);
  assert.deepEqual([wild.n, wild.gati, wild.bpm], [32, 1, 160]);
  for (const p of C.PRESETS) { const s = C.parseSeq(p.s); assert.equal(s.length, p.n, p.name); s.forEach(w => assert.ok(C.PALETTE.includes(w))); }
});

test('clap detection: one onset per clap, none in steady noise', () => {
  const det = C.onsetDetector(), r = rng('mic'); let hits = 0;
  for (let ms = 0; ms < 4000; ms += 10) {
    const clap = ms % 500 < 20 && ms > 200;
    const level = clap ? 0.4 + r() * 0.1 : 0.01 + r() * 0.01;
    if (det(level, ms)) hits++;
  }
  assert.equal(hits, 7); /* claps at 500, 1000, ... 3500 ms */
  const quiet = C.onsetDetector(); let q = 0;
  for (let ms = 0; ms < 3000; ms += 10) if (quiet(0.03 + 0.01 * Math.sin(ms), ms)) q++;
  assert.equal(q, 0);
  assert.equal(C.rms(new Float32Array([0.5, -0.5, 0.5, -0.5])), 0.5);
});

test('a tempo change while playing neither doubles nor drops a note (the real scheduler)', async t => {
  const { schedule } = await import('../../js/play/exp/tala-audio.js');
  /* drive it by hand: a fake clock, mocked setInterval for the 25 ms tick, and a queue for animation frames */
  t.mock.timers.enable({ apis: ['setInterval'] });
  let frames = [];
  globalThis.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  /* the change lands at many phases between notes, since a doubled or dropped note depends on where it falls */
  for (const [from, to] of [[60, 140], [140, 45], [90, 60], [72, 72]]) for (let at = 2; at < 2.5; at += 0.0125) {
    let T = 10; frames = [];
    const clock = { audio: null, now: () => T, latency: () => 0 }, ctl = new AbortController(), got = [];
    const pat = C.gatiPattern(4);
    const s = schedule({ clock, pattern: pat, bpm: from, signal: ctl.signal, onCue: e => got.push(e) });
    const run = secs => { for (let i = 0; i < secs / 0.025; i++) { T += 0.025; t.mock.timers.tick(25); const f = frames; frames = []; f.forEach(fn => fn(T * 1000)); } };
    run(at); s.setBpm(to); run(2);
    ctl.abort();
    /* every count of the pattern, in order, once: syllable i of beat b in repeat k */
    const syl = got.filter(e => e.track === 'gati').map(e => e.k * pat.len + e.at);
    assert.ok(syl.length > 15, `${from} to ${to}`);
    syl.forEach((x, i) => assert.equal(x, syl[0] + i, `${from} to ${to} at ${at}: count ${i} is ${x}`));
    for (let i = 1; i < got.length; i++) assert.ok(got[i].time >= got[i - 1].time - 1e-9, 'cues in time order');
  }
});
