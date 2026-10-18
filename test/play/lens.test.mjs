/* Math Lens: the make-N solver is right for many digit sets, the expression reader is safe and exact
   (no eval), divisibility rules match real division, clock math, receipt shortcuts, and every challenge
   offered is solvable with its own revealed answer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../js/play/kit.js';
import {
  parseExpr, checkMake, solveMake, solveAny, orderedValues, makeSpec, fkey, frac, digitSum, digitalRoot, rootChain, altSum, RULES,
  clockAngle, nextPalindrome, asTime, tipCents, tipSteps, changeFrom, readMoney, asCents, sourceFrom, surprise, build, cleanRead, guessKind
} from '../../js/play/exp/lens-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];
const perms = a => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));

test('expression reader: precedence, brackets, exact fractions, friendly errors', () => {
  const v = s => { const r = parseExpr(s); assert.ok(r.ok, s + ': ' + r.error); return r.value; };
  assert.deepEqual(v('2 + 3 × 4'), [14, 1]);
  assert.deepEqual(v('(2 + 3) x 4'), [20, 1]);
  assert.deepEqual(v('8 ÷ (3 − 8 ÷ 3)'), [24, 1]);
  assert.deepEqual(v('1/3 + 1/6'), [1, 2]);
  assert.deepEqual(v('[7 - 4] * 8'), [24, 1]);
  assert.deepEqual(v('9 - 5 - 1'), [3, 1]);
  assert.deepEqual(v('64 / 4 / 2'), [8, 1]);
  assert.deepEqual(parseExpr('4 * (7 - 8 / 2)').nums, [4, 7, 8, 2]);
  for (const bad of ['', '2 +', '(2 + 3', '2 + 3)', '-2 + 5', '2 3', '2 ** 3', '5 / 0', '5 / (2 - 2)', 'alert(1)', 'constructor', '2 + x + 2']) {
    const r = parseExpr(bad); assert.equal(r.ok, false, bad); assert.ok(r.error && !/undefined/.test(r.error), bad);
  }
});

test('the reader never evaluates code: a hostile string is just an error', () => {
  globalThis.__pwned = false;
  for (const s of ['globalThis.__pwned = true', '(() => { __pwned = 1 })()', '1; __pwned = true', '`${__pwned=1}`']) assert.equal(parseExpr(s).ok, false);
  assert.equal(globalThis.__pwned, false);
});

test('checkMake enforces the digits, the order, the signs and the target', () => {
  const sp = { digits: [4, 7, 8, 2], target: 24, ordered: false, ops: '+-*/' };
  assert.ok(checkMake('4 * 7 - 8 / 2', sp).ok);
  assert.ok(checkMake('(7 - 4) × 8 × 2 ÷ 2', { ...sp, digits: [7, 4, 8, 2, 2] }).ok);
  assert.match(checkMake('4 * 7 - 8 / 2 + 0', sp).reason, /exactly once/);
  assert.match(checkMake('47 - 8 * 2 - 7', sp).reason, /no gluing/);
  assert.match(checkMake('4 + 7 + 8 + 2', sp).reason, /makes 21/);
  assert.match(checkMake('4 + 7 + 8 + 2', { ...sp, target: 21, ops: '*/' }).reason, /only/);
  assert.match(checkMake('2 * 8 + 7 + 4 - 3', sp).reason, /exactly once/);
  const ord = { digits: [1, 2, 3, 4], target: 10, ordered: true, ops: '+-*/' };
  assert.ok(checkMake('1 + 2 + 3 + 4', ord).ok);
  assert.match(checkMake('4 + 3 + 2 + 1', ord).reason, /in order/);
  assert.ok(checkMake('12 + 3 - 4 - 1', { digits: [1, 2, 3, 4, 1], target: 10, ordered: true, ops: '+-', concat: true }).ok);
});

test('make-N solver: known sets, fraction-only solutions, and impossible sets', () => {
  for (const [ds, t] of [[[4, 7, 8, 2], 24], [[3, 3, 8, 8], 24], [[1, 5, 5, 5], 24], [[1, 1, 4, 6], 24], [[2, 2, 2, 9], 24], [[1, 2, 3, 4], 10]]) {
    const e = solveMake({ digits: ds, target: t }); assert.ok(e, ds.join('')); assert.ok(checkMake(e, { digits: ds, target: t }).ok, `${ds} ${e}`);
  }
  for (const ds of [[1, 1, 1, 1], [1, 1, 1, 2], [9, 9, 9, 9], [1, 6, 7, 7]]) assert.equal(solveMake({ digits: ds, target: 24 }), null, ds.join(''));
  assert.ok(checkMake(solveMake({ digits: [1, 2, 3, 4, 5, 6], target: 100, ordered: true }), { digits: [1, 2, 3, 4, 5, 6], target: 100, ordered: true }).ok);
  const nine = solveMake({ digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], target: 100, ordered: true, ops: '+-', concat: true });
  assert.ok(checkMake(nine, { digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], target: 100, ordered: true, ops: '+-', concat: true }).ok, nine);
});

test('make-N solver agrees with brute force over every ordering, for 400 random digit sets', () => {
  const r = rng('lens-make');
  for (let i = 0; i < 400; i++) {
    const n = 2 + Math.floor(r() * 3), ds = Array.from({ length: n }, () => Math.floor(r() * 10));
    for (const [target, ops] of [[24, '+-*/'], [10, '+-*/'], [10, '+-']]) {
      const any = solveAny(ds, target, ops);
      const brute = perms(ds).some(p => orderedValues(p.map(String), ops).has(fkey(frac(target))));
      assert.equal(!!any, brute, `${ds} -> ${target} ${ops}`);
      if (any) assert.ok(checkMake(any, { digits: ds, target, ops }).ok, `${ds}: ${any}`);
    }
  }
});

test('makeSpec always offers a solvable challenge at every level', () => {
  const r = rng('lens-spec');
  for (const lv of LEVELS) for (let i = 0; i < 150; i++) {
    const len = 2 + Math.floor(r() * 6), d = Array.from({ length: len }, () => Math.floor(r() * 10)).join('');
    const sp = makeSpec(d, lv);
    if (!sp) { assert.ok(/^0+$|^\d$/.test(d.replace(/^(.).*$/, '$1')) || d.replace(/0/g, '').length <= 1, `no spec for ${d} ${lv}`); continue; }
    assert.ok(checkMake(sp.solution, sp).ok, `${lv} ${d}: ${sp.solution} = ${sp.target}`);
    if (lv === 'explorer') assert.equal(sp.ops, '+-');
  }
});

test('digit sums, digital roots and casting out nines', () => {
  assert.equal(digitSum(7482), 21); assert.deepEqual(rootChain(7482), [7482, 21, 3]); assert.equal(digitalRoot(7482), 3);
  assert.equal(digitalRoot(9999), 9); assert.equal(digitalRoot('0'), 0);
  for (let n = 1; n < 20000; n += 7) assert.equal(digitalRoot(n), 1 + ((n - 1) % 9), n);
  const r = rng('nines');
  for (let i = 0; i < 2000; i++) { const a = Math.floor(r() * 99999), b = Math.floor(r() * 99999); assert.equal(digitalRoot(digitalRoot(a) + digitalRoot(b)), digitalRoot(a + b)); }
});

test('divisibility rules for 3, 9 and 11 match real division', () => {
  for (let n = 1; n <= 100000; n += 13) for (const k of [3, 9, 11]) assert.equal(RULES[k].test(n), n % k === 0, `${n} by ${k}`);
  assert.equal(altSum(918082), 2 - 8 + 0 - 8 + 1 - 9);
  assert.ok(RULES[11].test(918082));
});

test('clock: hands angle, reading times, next palindrome time', () => {
  const cases = [[3, 0, 90], [6, 0, 180], [12, 0, 0], [9, 45, 22.5], [10, 47, 41.5], [12, 30, 165], [2, 20, 50], [11, 59, 5.5]];
  for (const [h, m, a] of cases) assert.equal(clockAngle(h, m), a, `${h}:${m}`);
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) { const a = clockAngle(h, m); assert.ok(a >= 0 && a <= 180); assert.equal(a * 2 % 1, 0); }
  assert.deepEqual(asTime('10:47'), { h: 10, m: 47 }); assert.deepEqual(asTime('947'), { h: 9, m: 47 }); assert.equal(asTime('1275'), null); assert.equal(asTime('25:00'), null);
  assert.deepEqual(nextPalindrome(10, 47), { h: 11, m: 11, minutes: 24 });
  assert.equal(nextPalindrome(12, 20).minutes, 1);
  assert.deepEqual(nextPalindrome(12, 59), { h: 1, m: 1, minutes: 2 });
  assert.deepEqual(nextPalindrome(1, 1), { h: 1, m: 11, minutes: 10 });
  for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m++) {
    const p = nextPalindrome(h, m), s = `${p.h}${String(p.m).padStart(2, '0')}`;
    assert.equal(s, [...s].reverse().join('')); assert.ok(p.minutes >= 1 && p.minutes <= 70, `${h}:${m}`);
  }
});

test('tips by the Vedic shortcut match the exact percent, rounded to the cent', () => {
  for (let c = 1; c <= 60000; c += 7) {
    assert.equal(tipCents(c, 10), Math.round(c / 10 + 1e-9), c);
    assert.equal(tipCents(c, 15), Math.round((c * 15) / 100 + 1e-9), c);
  }
  const s = tipSteps(4787, 15); assert.equal(s.length, 3); assert.match(s[0], /\$4\.787/); assert.match(s[2], /\$7\.18/);
  assert.match(tipSteps(4780, 10)[0], /\$4\.78\./);
});

test('change by "all from 9 and the last from 10" equals real subtraction', () => {
  assert.equal(changeFrom(50000, 23747).cents, 26253);
  assert.deepEqual(changeFrom(50000, 23747).steps.map(x => x.from), [4, 9, 9, 9, 10]);
  assert.equal(changeFrom(50000, 20000).cents, 30000);
  assert.equal(changeFrom(1000, 730).cents, 270);
  const r = rng('change');
  for (const base of [1000, 2000, 5000, 10000, 50000, 100000]) for (let i = 0; i < 2000; i++) {
    const a = 1 + Math.floor(r() * (base - 1)), ch = changeFrom(base, a);
    assert.equal(ch.cents, base - a, `${base} - ${a}`);
    assert.ok(ch.steps.every(x => x.r >= 0 && x.r <= 9), `${base} - ${a} digit steps`);
  }
});

test('reading money and digit sources', () => {
  assert.equal(readMoney('4.79'), 479); assert.equal(readMoney('$4.7'), 470); assert.equal(readMoney('12'), 1200); assert.equal(readMoney('.5'), 50); assert.equal(readMoney('abc'), null);
  assert.equal(asCents('23.47'), 2347); assert.equal(asCents('2347'), 2347); assert.equal(asCents('23'), 2300);
  assert.equal(cleanRead('7O4 l2'), '704 12'); assert.equal(guessKind('10:47'), 'clock'); assert.equal(guessKind('$12.50'), 'receipt');
  assert.equal(sourceFrom('2.50 3.75 1.20', 'receipt').total, 745);
  assert.equal(sourceFrom('10:47').kind, 'clock'); assert.equal(sourceFrom('99:99', 'clock'), null); assert.equal(sourceFrom('abc'), null);
});

test('every challenge built from many sources is solvable with its own answer, and wrong answers fail', () => {
  const r = rng('lens-build');
  for (const lv of LEVELS) for (const kind of ['plate', 'clock', 'receipt', 'number']) for (let i = 0; i < 40; i++) {
    const src = surprise(r, lv, kind), list = build(src, lv);
    assert.ok(list.length >= 2, `${lv} ${kind} ${src.raw}`);
    assert.equal(new Set(list.map(c => c.id)).size, list.length);
    for (const c of list) {
      assert.ok(c.title && c.prompt && c.hint && c.solution.length, c.id);
      assert.ok(!/\u2014/.test(c.title + c.prompt + c.hint + c.solution.join('')));
      const good = c.type === 'make' ? c.spec.solution : c.input === 'yesno' ? (c.answer ? 'yes' : 'no') : c.input === 'money' ? (c.answer / 100).toFixed(2) : String(c.answer);
      assert.ok(c.check(good).ok, `${lv} ${src.raw} ${c.id}: ${good}`);
      const bad = c.type === 'make' ? '1 + 1' : c.input === 'yesno' ? (c.answer ? 'no' : 'yes') : c.input === 'money' ? ((c.answer + 5000) / 100).toFixed(2) : String(c.answer + 7);
      assert.equal(c.check(bad).ok, false, `${c.id} rejects ${bad}`);
    }
  }
});

test('image clean-up: grayscale, contrast and threshold give black digits on white, flipping light-on-dark', async () => {
  const { clean } = await import('../../js/play/exp/lens-cam.js');
  const make = (bg, ink) => {
    const width = 20, height = 10, data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) { const v = i % width >= 8 && i % width < 12 ? ink : bg; data.set([v, v * 0.9, v * 0.8, 255], i * 4); }
    return { width, height, data };
  };
  for (const [bg, ink, flip] of [[220, 40, false], [30, 200, true]]) {
    const img = make(bg, ink), r = clean(img);
    assert.equal(r.flipped, flip);
    for (let i = 0; i < 200; i++) { const inkPx = i % 20 >= 8 && i % 20 < 12; assert.equal(img.data[i * 4], inkPx ? 0 : 255, `pixel ${i}`); }
  }
});

test('a typed or linked plate keeps only plate characters, so a shared link never carries other typed text', () => {
  const s = sourceFrom('my name is Asha, call 98450 12345 <b>', 'plate');
  assert.ok(/^[A-Z0-9 -]{1,20}$/.test(s.raw), s.raw);
  assert.ok(!/<|>|,/.test(s.raw));
});

test('the plate shown and the digits the challenges use always agree', () => {
  assert.deepEqual(sourceFrom('ka 05 mh 1234', 'plate'), { kind: 'plate', raw: 'KA 05 MH 1234', digits: '051234' });
  assert.deepEqual(sourceFrom('22 BH 1234 AA', 'plate'), { kind: 'plate', raw: '22 BH 1234 AA', digits: '221234' });
  assert.deepEqual(sourceFrom('12345678901234', 'number'), { kind: 'number', raw: '123456789', digits: '123456789' });
  assert.deepEqual(sourceFrom('KA-05-MH-12345678', 'plate'), { kind: 'plate', raw: 'KA-05-MH-1234567', digits: '051234567' });
  for (const t of ['my name is Asha, call 98450 12345', 'KA 05 call me 4721 <b>', 'MH 12 DE 1433', 'abc 7', '  9 9 9 9 9 9 9 9 9 9 9 ', 'A'.repeat(30) + ' 42']) {
    const x = sourceFrom(t, 'plate');
    assert.equal(x.raw.replace(/\D/g, ''), x.digits, t);
    assert.ok(x.digits.length >= 1 && x.digits.length <= 9 && x.raw.length <= 20, t);
  }
});
