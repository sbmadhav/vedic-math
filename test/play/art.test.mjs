/* Mandala Studio: the math under every piece is right. Chords follow k to m k mod n, Meru-prastāra matches
   the binomial numbers (and its remainders are exact far past floating point), shallow diagonals are
   Fibonacci, digital roots and walks close, Baudhāyana's diagonal is 577/408, and links round trip. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, b64url } from '../../js/play/kit.js';
import * as A from '../../js/play/exp/art-core.js';

test('colors parse from tokens in any CSS form', () => {
  assert.deepEqual(A.parseColor('#EE7A63'), [238, 122, 99, 1]);
  assert.deepEqual(A.parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(A.parseColor('rgba(27,33,43,.88)'), [27, 33, 43, 0.88]);
  assert.deepEqual(A.parseColor('rgb(1 2 3)'), [1, 2, 3, 1]);
  assert.equal(A.rgba('#000000', 0.5), 'rgba(0,0,0,0.5)');
  assert.deepEqual(A.mix([0, 0, 0, 1], [100, 200, 50, 1], 0.5), [50, 100, 25, 1]);
  assert.ok(A.luminance('#FFFFFF') > A.luminance('#151B2B'));
  assert.deepEqual(A.along([[0, 0, 0, 1], [10, 10, 10, 1]], 0.25), [5, 5, 5, 1]);
});

test('times-table chords join k to m k mod n, and their notes stay in the scale', () => {
  for (const n of [10, 37, 100, 200, 360]) for (const m of [2, 3, 34, 51.5, 99.99]) {
    const ch = A.chords(n, m);
    assert.equal(ch.length, n);
    ch.forEach(([k, t]) => {
      assert.ok(t >= 0 && t < n);
      if (Number.isInteger(m)) assert.equal(t, (m * k) % n);
      else assert.ok(Math.abs(((t - m * k) / n) - Math.round((t - m * k) / n)) < 1e-9, 'differs from m k by whole turns');
      const L = A.chordLength(k, t, n); assert.ok(L >= 0 && L <= 2 + 1e-12);
      const idx = A.chordNote(k, t, n); assert.ok(Number.isInteger(idx) && idx >= 0 && idx < A.PENTA.length);
    });
  }
  /* a diameter is the longest chord and the lowest note; a point to itself is the highest */
  assert.equal(A.chordLength(0, 50, 100), 2); assert.equal(A.chordNote(0, 50, 100), 0); assert.equal(A.chordNote(3, 3, 100), A.PENTA.length - 1);
  const [x, y] = A.onCircle(0, 8, 1); assert.ok(Math.abs(x + 1) < 1e-12 && Math.abs(y) < 1e-12);
  assert.equal(A.curveName(2, 200).name, 'Cardioid'); assert.equal(A.curveName(3, 200).name, 'Nephroid');
  assert.match(A.curveName(5, 200).name, /4 cusps/); assert.equal(A.curveName(2.5, 200), null); assert.equal(A.curveName(34, 200), null);
  for (let i = 1; i < A.PENTA.length; i++) assert.ok(A.PENTA[i] > A.PENTA[i - 1]);
});

test('Meru-prastāra: every cell is a binomial number, and each cell is the sum of the two above', () => {
  const rows = A.meruRows(64);
  rows.forEach((row, r) => {
    assert.equal(row.length, r + 1);
    row.forEach((v, k) => assert.equal(v, A.binom(r, k), `C(${r}, ${k})`));
    assert.equal(row.reduce((s, v) => s + v, 0n), 2n ** BigInt(r));
    if (r) for (let k = 1; k < r; k++) assert.equal(row[k], rows[r - 1][k - 1] + rows[r - 1][k]);
  });
  assert.equal(A.binom(10, 3), 120n); assert.equal(A.binom(63, 31), 916312070471295267n);
});

test('remainder rows are exact for every divisor, including where floating point would fail', () => {
  const rows = A.meruRows(64);
  for (let m = 2; m <= 9; m++) {
    const res = A.meruMod(64, m);
    res.forEach((row, r) => row.forEach((v, k) => assert.equal(BigInt(v), rows[r][k] % BigInt(m), `row ${r} mod ${m}`)));
  }
  /* mod 2: C(n, k) is odd exactly when the bits of k sit inside the bits of n (Lucas), the Sierpinski rule */
  A.meruMod(64, 2).forEach((row, n) => row.forEach((v, k) => assert.equal(v, (k & ~n) === 0 ? 1 : 0)));
});

test('shallow diagonals add up to Fibonacci numbers, which count short and long rhythms', () => {
  for (let d = 0; d <= 80; d++) assert.equal(A.diagonalSum(d), A.fib(d + 1), `diagonal ${d}`);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(d => Number(A.diagonalSum(d))), [1, 2, 3, 5, 8, 13, 21]);
  for (let n = 0; n <= 14; n++) {
    const ms = A.meters(n);
    assert.equal(BigInt(ms.length), A.fib(n + 1));
    assert.equal(new Set(ms).size, ms.length);
    ms.forEach(s => assert.equal([...s].reduce((t, c) => t + (c === 'S' ? 1 : 2), 0), n));
  }
});

test('the digital-root square', () => {
  for (let n = 1; n <= 2000; n++) { let x = n; while (x > 9) x = [...String(x)].reduce((s, c) => s + +c, 0); assert.equal(A.digitalRoot(n), x); }
  const sq = A.vedicSquare();
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { assert.equal(sq[i][j], sq[j][i]); assert.equal(sq[i][j], A.digitalRoot((i + 1) * (j + 1))); }
  assert.deepEqual(sq[8], [9, 9, 9, 9, 9, 9, 9, 9, 9]);
  assert.deepEqual(A.rowOf(2), [2, 4, 6, 8, 1, 3, 5, 7, 9]);
  assert.equal(A.cellsOf(9).length, 21); /* row 9, column 9, and 3·3, 3·6, 6·3, 6·6 */ assert.equal([1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, d) => s + A.cellsOf(d).length, 0), 81);
  for (const d of [1, 2, 4, 5, 7, 8]) assert.equal(new Set(A.starOrder(d)).size, 9, `row ${d} visits all nine`);
  for (const d of [3, 6]) assert.deepEqual([...new Set(A.starOrder(d))].sort(), [3, 6, 9]);
});

test('every digit walk closes, after the predicted number of rounds', () => {
  const expectReps = a => { for (let k = 1; k <= 12; k++) if ((k * 9 * a) % 360 === 0) return k; return 0; };
  for (let d = 1; d <= 9; d++) for (const a of A.ANGLES) {
    const w = A.turtle(d, a);
    assert.ok(w.closed, `digit ${d}, ${a} degrees`);
    assert.equal(w.pts.length, w.reps * 9 + 1);
    assert.ok(w.reps <= expectReps(a), `${d} ${a}: ${w.reps}`);
    const [x, y] = w.pts[w.pts.length - 1]; assert.ok(Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6);
  }
  assert.equal(A.turtle(2, 90).reps, 4); assert.equal(A.turtle(2, 60).reps, 2); assert.equal(A.turtle(2, 72).reps, 5);
});

test("Baudhāyana's diagonal is 577/408, close to the square root of 2", () => {
  assert.ok(Math.abs(A.SQRT2_APPROX - 577 / 408) < 1e-15);
  assert.equal(577 * 577 - 2 * 408 * 408, 1);
  const err = A.SQRT2_APPROX - Math.SQRT2;
  assert.ok(err > 2.1e-6 && err < 2.2e-6, String(err));
  A.SQRT2_STEPS.forEach(s => assert.ok(Math.abs(s.value - s.frac[0] / s.frac[1]) < 1e-15, s.add));
  /* each step gets closer */
  for (let i = 1; i < A.SQRT2_STEPS.length; i++) assert.ok(Math.abs(A.SQRT2_STEPS[i].value - Math.SQRT2) < Math.abs(A.SQRT2_STEPS[i - 1].value - Math.SQRT2));
  assert.ok(A.beatRate(577 / 408) < 0.001); assert.ok(A.beatRate(4 / 3) > 15);
  assert.equal(A.ropePitch(Math.SQRT2), 330);
});

test('rope geometry: knotted triples make right angles, and ropes never stretch', () => {
  for (const [a, b, c] of A.TRIPLES) { assert.equal(a * a + b * b, c * c); assert.equal(A.isTriple(a, b), c); }
  assert.equal(A.isTriple(2, 3), 0); assert.equal(A.isTriple(6, 8), 10);
  const pts = A.taut([0, 0], 5, [4, 0], 3);
  assert.equal(pts.length, 2);
  pts.forEach(p => { assert.ok(Math.abs(Math.abs(p[1]) - 3) < 1e-9 && Math.abs(p[0] - 4) < 1e-9); assert.ok(Math.abs(A.angleAt([4, 0], [0, 0], p) - 90) < 1e-9); assert.ok(A.isTaut(p, [0, 0], 5, [4, 0], 3)); });
  const r = rng('reach');
  for (let i = 0; i < 2000; i++) {
    const p = [r() * 20 - 10, r() * 20 - 10], q = A.reach(p, [0, 0], 5, [4, 0], 3);
    assert.ok(Math.hypot(q[0], q[1]) <= 5 + 1e-6 && Math.hypot(q[0] - 4, q[1]) <= 3 + 1e-6);
    if (Math.hypot(p[0], p[1]) <= 5 && Math.hypot(p[0] - 4, p[1]) <= 3) assert.deepEqual(q, p);
  }
});

test('the altar: nested squares, each half the last, regions tile the whole square', () => {
  for (let L = 2; L <= 6; L++) {
    const regs = A.altar(L);
    assert.equal(regs.length, 4 * L + 1);
    const total = regs.reduce((s, r) => s + A.polyArea(r.pts), 0);
    assert.ok(Math.abs(total - 4) < 1e-9, 'tiles the 2 by 2 square');
    for (let k = 0; k < L; k++) {
      const ring = regs.filter(r => r.ring === k).reduce((s, r) => s + A.polyArea(r.pts), 0);
      assert.ok(Math.abs(ring - 2 / 2 ** k) < 1e-9, `ring ${k} is half of square ${k}`);
    }
    assert.ok(Math.abs(A.polyArea(regs[regs.length - 1].pts) - 4 / 2 ** L) < 1e-9);
  }
  assert.ok(A.inPoly(0, 0, A.altar(3).at(-1).pts)); assert.ok(!A.inPoly(0.99, 0.99, A.altar(3).at(-1).pts));
});

test('share links round trip for every kind, and surprises are valid pieces', () => {
  const r = rng('art-links');
  for (let i = 0; i < 400; i++) {
    const p = A.surprise(r), code = A.encodePiece(p, b64url);
    assert.match(code, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(A.decodePiece(code, b64url), p);
    assert.deepEqual(A.cleanPiece(p), p);
    assert.ok(A.describe(p).length > 4);
  }
  const alt = A.cleanPiece({ k: 'altar', levels: 3, f: [1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 9] });
  assert.equal(alt.f.length, 13); assert.equal(alt.f[12], 4);
  assert.deepEqual(A.decodePiece(A.encodePiece(alt, b64url), b64url), alt);
  assert.equal(A.decodePiece('%%%', b64url), null);
  assert.equal(A.decodePiece(b64url.enc('{"v":2,"k":"times"}'), b64url), null);
  assert.deepEqual(A.cleanPiece({ k: 'times', n: 1e9, m: -4 }), { k: 'times', n: 400, m: 1, p: 2 });
  assert.deepEqual(A.cleanPiece({ k: 'nope' }).k, 'times');
});
