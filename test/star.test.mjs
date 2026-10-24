/* Star rounds (openspec star-round): the pools each Star deals from, the kinds of question, Dares, and the round's
   state machine (js/star.js). Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { TRICKS } from '../js/vedic.js';
import { STAR_THIRDS, starBand, starPool, kindOf, sigOf, dareFor, dareKatas, kata } from '../js/levels.js';
import { starRound, starAnswer, starNext, starDare, canDare, pickRematch, roundKeys, starIntro, ROUND, TARGET } from '../js/star.js';

const STARS = TRICKS.flatMap(t => [1, 2, 3].map(star => ({ trick: t.id, star })));
/* A seeded random for repeatable rounds */
const rng = (a = 1) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- Pools, kinds and Dares (task 1.1) ---------- */
test('63 Stars, three per Trick, on thirds 1-17, 18-34, 35-50', () => {
  assert.equal(STARS.length, 63);
  assert.deepEqual(STAR_THIRDS, [[1, 17], [18, 34], [35, 50]]);
});

test('kata problems carry their numbers, and the kind of question comes from their digit counts', () => {
  const p = kata('sq5', 40).problems[0];
  assert.ok(Array.isArray(p.vals));
  assert.equal(p.q, `${p.vals[0]}<sup>2</sup> = ?`);
  assert.equal(kindOf({ vals: [85] }), '2');
  assert.equal(kindOf({ vals: [115] }), '3');
  assert.equal(kindOf({ vals: [97, 94] }), '2x2');
  assert.equal(kindOf({ vals: [-7, 3.5] }), '1x1');
});

test('every pool problem of every Star comes from a Kata inside its third, at any Rating', () => {
  for (const { trick, star } of STARS) for (const r of [1, 7, 10, 14, 20]) {
    const [lo, hi] = STAR_THIRDS[star - 1], pool = starPool(trick, star, r);
    assert.ok(pool.length >= ROUND + 1, `${trick} Star ${star} at ${r}: only ${pool.length} distinct questions`);
    for (const p of pool) {
      assert.ok(p.kata >= lo && p.kata <= hi, `${trick} Star ${star}: Kata ${p.kata}`);
      assert.match(p.key, /^\d+:\d+$/); assert.ok(p.qkind && p.vals);
    }
    assert.equal(new Set(pool.map(sigOf)).size, pool.length, 'one entry per distinct question');
  }
});

test('the Rating picks the band: Rating 1 at the low end of the third, Rating 20 at the high end', () => {
  for (const star of [1, 2, 3]) {
    const [lo, hi] = STAR_THIRDS[star - 1];
    assert.deepEqual(starBand(star, 1), [lo, lo + 6]);
    assert.deepEqual(starBand(star, 20), [hi - 6, hi]);
    const mid = starBand(star, 10); assert.ok(mid[0] > lo && mid[1] < hi, `Star ${star} at 10: ${mid}`);
  }
  // the ratings spec scenario: Star 2 of sq5 at Rating 3 draws near Kata 18, at Rating 17 near Kata 34
  assert.ok(starPool('sq5', 2, 3).every(p => p.kata <= 24));
  assert.ok(starPool('sq5', 2, 17).every(p => p.kata >= 28));
});

test('every Dare comes from a harder Kata than the Star band (Star 3: its hardest Katas)', () => {
  for (const { trick, star } of STARS) {
    const [, hi] = starBand(star, 20), [a, b] = dareKatas(star);
    for (let i = 0; i < 5; i++) {
      const d = dareFor(trick, star);
      assert.ok(d.kata >= a && d.kata <= b, `${trick} Star ${star}: Dare from Kata ${d.kata}`);
      if (star < 3) assert.ok(d.kata > hi, `${trick} Star ${star}: Dare Kata ${d.kata} not above the band`);
      else assert.ok(d.kata >= 46);
    }
  }
  const exclude = new Set(starPool('sq5', 1, 1).map(sigOf));
  for (let i = 0; i < 20; i++) assert.ok(!exclude.has(sigOf(dareFor('sq5', 1, exclude))));
});

/* Stars whose rounds sometimes rematch with a question of another kind (design risk 1), when every question of the
   round is missed: their third holds too few distinct questions of one kind (small numbers in the first Katas, or four
   numbers whose kinds rarely repeat). The rematch then falls back to any unused question of the band. */
const ALLOWED_FALLBACK = new Set(['near-base Star 1', 'by9s Star 1', 'by9s Star 2', 'square-near Star 1', 'times5 Star 1', 'times5 Star 2', 'times5 Star 3',
  'transpose Star 2', 'transpose Star 3', 'add-sub Star 1', 'add-sub Star 2', 'add-sub Star 3', 'ratio-zero Star 2', 'ratio-zero Star 3']);
test('for every Star at Ratings 1, 10 and 20, 50 dealt rounds each have a same-kind rematch for every question', () => {
  const misses = new Map();
  for (const { trick, star } of STARS) for (const rating of [1, 10, 20]) for (let r = 0; r < 50; r++) {
    let st = starRound({ trick, star, rating, rand: rng(r + 1) });
    for (let i = 0; i < ROUND; i++) {
      const missed = st.current; st = starAnswer(st, false).state; st = starNext(st).state;
      if (st.current.qkind !== missed.qkind) misses.set(`${trick} Star ${star}`, (misses.get(`${trick} Star ${star}`) || 0) + 1);
      assert.notEqual(sigOf(st.current), sigOf(missed));
      st = starAnswer(st, true).state;
    }
  }
  const unexpected = [...misses.keys()].filter(k => !ALLOWED_FALLBACK.has(k));
  assert.deepEqual(unexpected, [], `rematches changed kind: ${[...misses].map(([k, n]) => `${k} (${n})`).join(', ')}`);
  // the first miss of a round always finds one of its kind, except where a third has almost none
  assert.ok([...misses.values()].every(n => n < 600 * 0.15), `fallbacks: ${[...misses].map(([k, n]) => `${k} (${n})`).join(', ')}`);
});

/* ---------- The round engine (task 2.1) ---------- */
/* A made-up pool: kinds A and B, so every rule can be steered */
const mk = (kind, i) => ({ q: `${kind}${i}`, kind: 'num', answer: i, vals: [kind === 'A' ? i : i * 1000], key: `${kind}:${i}`, kata: i, qkind: kind });
const POOL = [...[1, 2, 3, 4, 5, 6, 7, 8].map(i => mk('A', i)), ...[1, 2, 3].map(i => mk('B', i))];
const round = (pool = POOL) => starRound({ trick: 'sq5', star: 1, pool, rand: rng(7) });
const types = evs => evs.map(e => e.type);
const play = (st, ok) => { const r = starAnswer(st, ok); return [r.state, r.events]; };

test('four first-try rights earn 40 and light the Star', () => {
  let st = round(), all = [];
  assert.equal(st.qs.length, 4);
  for (let i = 0; i < 4; i++) { let ev; [st, ev] = play(st, true); all.push(...ev); }
  assert.equal(st.sparks, 40); assert.equal(TARGET, 40);
  assert.deepEqual(types(all), ['right', 'right', 'right', 'right', 'lit', 'end']);
  assert.equal(all.filter(e => e.sparks).reduce((t, e) => t + e.sparks, 0), 40);
  assert.equal(st.mode, 'end'); assert.equal(st.lit, true);
});

test('a miss replays, then a right rematch of the same kind is a Comeback worth 15', () => {
  let st = round(), ev;
  const missed = st.current;
  [st, ev] = play(st, false);
  assert.deepEqual(types(ev), ['miss', 'replay']);
  assert.equal(ev[1].problem, missed); assert.equal(st.mode, 'replay');
  ({ state: st, events: ev } = starNext(st));
  assert.deepEqual(types(ev), ['rematch']);
  assert.equal(st.current.qkind, missed.qkind); assert.notEqual(st.current.q, missed.q);
  assert.ok(!st.qs.some(q => q.q === st.current.q), 'not a question already dealt');
  [st, ev] = play(st, true);
  assert.equal(ev[0].type, 'comeback'); assert.equal(ev[0].sparks, 15); assert.equal(st.sparks, 15);
  assert.equal(st.k, 1); assert.equal(st.mode, 'main');
});

test('a second right rematch of the same kind earns 10 and no Comeback; another kind gives a second Comeback', () => {
  const pool = [mk('A', 1), mk('A', 2), mk('B', 1), mk('A', 3), mk('A', 4), mk('A', 5), mk('B', 2), mk('B', 3)];
  let st = starRound({ trick: 'sq5', star: 1, pool, rand: () => 0.999 }), ev; // rand near 1 keeps the order
  st.qs = [mk('A', 1), mk('A', 2), mk('B', 1), mk('A', 3)]; st.current = st.qs[0];
  st.band = pool.slice(); st.used = new Set(st.qs.map(sigOf));
  const missThenFix = () => { [st, ev] = play(st, false); st = starNext(st).state; const k = st.current.qkind; [st, ev] = play(st, true); return [k, ev[0]]; };
  let [k, e] = missThenFix(); assert.equal(k, 'A'); assert.equal(e.type, 'comeback'); assert.equal(e.sparks, 15);
  [k, e] = missThenFix(); assert.equal(k, 'A'); assert.equal(e.type, 'right'); assert.equal(e.sparks, 10);
  [k, e] = missThenFix(); assert.equal(k, 'B'); assert.equal(e.type, 'comeback'); assert.equal(e.sparks, 15);
  assert.equal(st.sparks, 40);
});

test('a missed rematch shows its answer, no second replay, and the next main question follows', () => {
  let st = round(), ev;
  [st] = play(st, false); st = starNext(st).state;
  const rm = st.current;
  [st, ev] = play(st, false);
  assert.deepEqual(types(ev), ['miss', 'reveal']);
  assert.equal(ev[1].problem, rm);
  assert.equal(st.mode, 'main'); assert.equal(st.k, 1); assert.equal(st.current, st.qs[1]);
  assert.equal(st.misses, 2); assert.equal(st.sparks, 0);
});

test('Dare: not before question 2, offered once, +20 when won, and back to the same main question', () => {
  let st = round(), ev;
  assert.equal(canDare(st), false);
  assert.deepEqual(starDare(st).events, []);
  [st] = play(st, true);
  assert.equal(st.dareOffered, true); assert.equal(canDare(st), true);
  const q2 = st.current;
  ({ state: st, events: ev } = starDare(st, mk('B', 9)));
  assert.deepEqual(types(ev), ['dare']); assert.equal(st.mode, 'dare');
  [st, ev] = play(st, true);
  assert.deepEqual(ev.map(e => [e.type, e.sparks]), [['dare-won', 20]]);
  assert.equal(st.sparks, 30); assert.equal(st.current, q2); assert.equal(st.k, 1);
  assert.equal(canDare(st), false, 'one Dare a round');
});

test('a lost Dare costs nothing: same Sparks and misses, a replay on its numbers, then the same main question', () => {
  let st = round(), ev;
  [st] = play(st, true);
  const q2 = st.current, d = mk('B', 9);
  st = starDare(st, d).state;
  [st, ev] = play(st, false);
  assert.deepEqual(types(ev), ['dare-lost', 'replay']);
  assert.equal(ev[1].problem, d);
  assert.equal(ev.some(e => e.dial !== undefined), false, 'no Dial change');
  assert.equal(st.sparks, 10); assert.equal(st.misses, 0);
  ({ state: st, events: ev } = starNext(st, { videoAvailable: true }));
  assert.deepEqual(ev, [], 'no rematch, no offer');
  assert.equal(st.mode, 'main'); assert.equal(st.current, q2);
});

test('the video offer: once, after the second miss replay, only when a video is available', () => {
  const run = videoAvailable => {
    let st = round(); const seen = [];
    for (let i = 0; i < 3; i++) { // three main misses, each rematch right
      st = starAnswer(st, false).state;
      let r = starNext(st, { videoAvailable }); seen.push(...types(r.events)); st = r.state;
      if (st.mode === 'offer') { r = starNext(st, { videoAvailable }); seen.push(...types(r.events)); st = r.state; }
      st = starAnswer(st, true).state;
    }
    return seen;
  };
  assert.deepEqual(run(true), ['rematch', 'offer', 'rematch', 'rematch']);
  assert.deepEqual(run(false), ['rematch', 'rematch', 'rematch']);
});

test('Dial hits: main and rematch answers count, a won Dare counts as right, a lost Dare not at all', () => {
  let st = round(); const dial = [];
  const go = ok => { const r = starAnswer(st, ok); st = r.state; r.events.forEach(e => e.dial !== undefined && dial.push(e.dial)); };
  go(true);                                   // main right
  st = starDare(st, mk('B', 9)).state; go(false); st = starNext(st).state; // lost Dare: nothing
  go(false); st = starNext(st).state; go(true); // main miss, rematch right
  st = starDare(st, mk('B', 8)).state;        // no second Dare
  assert.equal(st.mode, 'main');
  go(true); go(true);
  assert.deepEqual(dial, [true, false, true, true, true]);
  assert.equal(st.mode, 'end');
});

test('a round below 40 does not light the Star', () => {
  let st = round(), ev, all = [];
  [st, ev] = play(st, false); all.push(...ev); st = starNext(st).state; [st, ev] = play(st, false); all.push(...ev);
  for (let i = 0; i < 3; i++) { [st, ev] = play(st, true); all.push(...ev); }
  assert.equal(st.sparks, 30); assert.equal(st.lit, false);
  assert.ok(!types(all).includes('lit')); assert.equal(all.at(-1).type, 'end');
});

/* ---------- Dealing avoids the last round (task 2.2) ---------- */
test('200 pairs of rounds in a row on Star 1 of sq5 share no question', () => {
  for (let i = 0; i < 200; i++) {
    const a = starRound({ trick: 'sq5', star: 1, rating: 1 }), b = starRound({ trick: 'sq5', star: 1, rating: 1, last: roundKeys(a) });
    const qa = new Set(a.qs.map(p => p.q));
    assert.ok(!b.qs.some(p => qa.has(p.q)), `${[...qa]} then ${b.qs.map(p => p.q)}`);
  }
});

test('the last round is found by its numbers even when the Rating moved the band', () => {
  for (let i = 0; i < 50; i++) {
    const a = starRound({ trick: 'sq5', star: 1, rating: 1 }), b = starRound({ trick: 'sq5', star: 1, rating: 20, last: roundKeys(a) });
    const qa = new Set(a.qs.map(p => p.q));
    assert.ok(b.qs.filter(p => qa.has(p.q)).length <= Math.max(0, 8 - starPool('sq5', 1, 20).length));
  }
});

test('with a small pool the second round reuses as few questions as it can; order is shuffled', () => {
  const orders = new Set();
  for (let i = 0; i < 100; i++) {
    for (const [size, most] of [[7, 1], [5, 3]]) {
      const pool = POOL.slice(0, size), a = starRound({ trick: 'sq5', star: 1, pool }), b = starRound({ trick: 'sq5', star: 1, pool, last: roundKeys(a) });
      assert.ok(b.qs.filter(p => a.qs.includes(p)).length <= most, `pool of ${size}`);
      assert.ok(pool.filter(p => !a.qs.includes(p)).every(p => b.qs.includes(p)), 'every unused question is dealt first');
      if (size === 7) orders.add(a.qs.map(p => p.q).join());
    }
  }
  assert.ok(orders.size > 10, 'questions do not come in a fixed order');
});

test('a rematch never repeats a question already in the round', () => {
  const st = round(); const seen = new Set(st.qs.map(sigOf));
  for (let i = 0; i < 6; i++) { const p = pickRematch(st, st.qs[0]); assert.ok(!seen.has(sigOf(p))); seen.add(sigOf(p)); }
});

/* ---------- The trial Star's worked example (openspec try-trick-teaches) ---------- */
test('the worked example is the easiest problem of the band the round does not deal, and is never dealt or rematched after', () => {
  for (const { trick, star } of STARS) {
    const st = starRound({ trick, star, rating: 5, rand: rng(7) }), dealt = new Set(st.qs.map(sigOf));
    const { state, example } = starIntro(st);
    assert.ok(example, `${trick} ${star}: an example`);
    assert.ok(!dealt.has(sigOf(example)), `${trick} ${star}: not one of the round's questions`);
    const lowest = Math.min(...st.band.filter(p => !dealt.has(sigOf(p))).map(p => p.kata));
    assert.equal(example.kata, lowest, `${trick} ${star}: lowest Kata first`);
    assert.ok(state.used.has(sigOf(example)), 'marked used');
    assert.ok(!st.used.has(sigOf(example)), 'the round passed in is not changed');
    assert.deepEqual(state.qs, st.qs, 'the round deals the same four questions');
    const re = pickRematch(state, state.qs[0]);
    assert.notEqual(sigOf(re), sigOf(example), 'a rematch never repeats the example');
  }
});

test('Try a trick\'s first Star (from9, Star 1) explains a two-digit subtraction from 100', () => {
  const { example } = starIntro(starRound({ trick: 'from9', star: 1, rating: 5, rand: rng(3) }));
  assert.equal(example.vals.length, 1);
  assert.ok(example.vals[0] >= 10 && example.vals[0] <= 99);
  assert.equal(example.q, `100 &minus; ${example.vals[0]} = ?`);
  assert.equal(TRICKS.find(t => t.id === 'from9').steps(example.vals).at(-1).say, `So 100 \u2212 ${example.vals[0]} = ${100 - example.vals[0]}.`);
});

test('with every band problem dealt, the example comes from the Star\'s third; with nothing left, there is none', () => {
  const band = starRound({ trick: 'sq5', star: 1, rating: 1 }).band.slice(0, ROUND);
  const st = starRound({ trick: 'sq5', star: 1, pool: band, rand: rng(2) });
  const { example } = starIntro(st);
  assert.ok(example && !st.used.has(sigOf(example)));
  const all = starRound({ trick: 'sq5', star: 1, pool: band, third: band, rand: rng(2) });
  assert.equal(starIntro(all).example, null);
});
