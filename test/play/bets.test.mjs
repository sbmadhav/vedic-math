/* Estimation Bets: the scoring rule rewards catching the answer, tighter ranges and honest chips; the bank
   is large, varied, sane and spoiler free; slider and number parsing behave. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../../js/play/exp/bets-core.js';

test('scoring: a range that contains the answer scores, a miss loses', () => {
  for (const c of [1, 2, 3]) {
    const hit = B.score(50, 200, c, 100), miss = B.score(150, 600, c, 100);
    assert.ok(hit.hit && hit.points > 0, `hit ${c}`);
    assert.ok(!miss.hit && miss.points < 0, `miss ${c}`);
  }
  assert.ok(B.score(100, 100, 1, 100).hit, 'exact guess counts');
  assert.ok(B.score(100, 200, 1, 200).hit && B.score(100, 200, 1, 100).hit, 'ends are inclusive');
});

test('scoring: narrower beats wider when both contain the answer', () => {
  for (const c of [1, 2, 3]) {
    let last = Infinity;
    for (const f of [1, 1.2, 1.5, 2, 4, 10, 100, 1e4]) { const s = B.score(100, 100 * f, c, 100); assert.ok(s.hit); assert.ok(s.points <= last, `${f}`); last = s.points; }
    assert.ok(B.score(90, 110, c, 100).points > B.score(10, 1000, c, 100).points);
  }
  assert.equal(B.tightness(7, 7), 10);
  assert.ok(Math.abs(B.tightness(10, 20) - 5) < 0.01);
  assert.ok(B.tightness(1, 1e9) > 0);
});

test('scoring: chips scale wins and losses, and honest chips are the best bet', () => {
  const hits = [1, 2, 3].map(c => B.score(80, 160, c, 100).points), misses = [1, 2, 3].map(c => B.score(80, 160, c, 1000).points);
  assert.ok(hits[0] < hits[1] && hits[1] < hits[2], `${hits}`);
  assert.ok(misses[0] > misses[1] && misses[1] > misses[2], `${misses}`);
  assert.equal(B.breakEven(1), 0.6); assert.equal(B.breakEven(2), 0.8);
  const ev = (c, p) => p * B.WIN[c] - (1 - p) * B.LOSE[c];
  const bestAt = p => [1, 2, 3].reduce((a, c) => (ev(c, p) > ev(a, p) ? c : a), 1);
  assert.equal(bestAt(0.5), 1); assert.equal(bestAt(0.7), 2); assert.equal(bestAt(0.9), 3);
  assert.ok(ev(1, 0.5) > 0, 'one chip at a coin flip is still worth playing');
  assert.throws(() => B.score(10, 5, 1, 7)); assert.throws(() => B.score(0, 5, 1, 1)); assert.throws(() => B.score(1, 5, 4, 1));
});

test('bank: at least 80 questions, every theme, every level, sane answers, breakdown and source', () => {
  assert.ok(B.BANK.length >= 80, `${B.BANK.length}`);
  assert.equal(new Set(B.BANK.map(x => x.id)).size, B.BANK.length, 'unique ids');
  assert.equal(new Set(B.BANK.map(x => x.q.toLowerCase())).size, B.BANK.length, 'unique questions');
  for (const th of ['time', 'space', 'body', 'india', 'food', 'sport', 'nature']) assert.ok(B.BANK.filter(x => x.theme === th).length >= 5, th);
  for (const lv of ['explorer', 'challenger', 'pro']) assert.ok(B.forLevel(lv).length >= 25, lv);
  for (const x of B.BANK) {
    assert.ok(typeof x.a === 'number' && Number.isFinite(x.a) && x.a > 0, x.id);
    assert.ok(x.q.endsWith('?'), x.id);
    assert.ok(x.fermi && x.fermi.length > 3, x.id);
    assert.ok(x.source && x.source.length > 3, x.id);
    assert.ok(B.THEMES[x.theme], x.id);
    assert.ok(x.levels.length, x.id);
    assert.ok(!/—/.test(JSON.stringify(x)), x.id);
    assert.ok(!/birth|your age|how old are you|where do you live/i.test(x.q), `${x.id} asks for personal data`);
    const [lo, hi] = B.bounds(x);
    assert.ok(lo < x.a && x.a < hi, `${x.id} inside slider bounds`);
  }
});

test('bank: computable answers check out', () => {
  const a = id => B.byId(id).a;
  assert.equal(a('sec-week'), 7 * 24 * 3600); assert.equal(a('min-day'), 24 * 60); assert.equal(a('hr-leap'), 366 * 24);
  assert.equal(a('heart-day'), 70 * 60 * 24); assert.equal(a('rice-kg'), 1000 / 0.02); assert.equal(a('chess-squares'), [1, 2, 3, 4, 5, 6, 7, 8].reduce((s, k) => s + k * k, 0));
  assert.equal(a('handshakes'), 30 * 29 / 2); assert.equal(a('gauss'), 5050); assert.equal(a('books-5'), 120); assert.equal(a('marathon'), 42195);
  assert.ok(Math.abs(a('sun-light') - 149597870.7 / 299792.458) < 1); assert.ok(Math.abs(a('pitch') - 22 * 0.9144) < 0.01);
  assert.ok(Math.abs(a('dosa-area') - Math.PI * 225) < 0.01); assert.ok(Math.abs(a('bolt-speed') - 100 / 9.58 * 3.6) < 0.01);
  assert.equal(a('primes-100'), [...Array(100).keys()].filter(n => n > 1 && [...Array(n).keys()].slice(2).every(d => n % d)).length);
  assert.equal(a('sevens'), Math.floor(1000 / 7)); assert.equal(a('days-century'), 36524);
});

test('slider: log scale round trips, and the middle never gives the answer away', () => {
  for (const x of B.BANK) {
    const bd = B.bounds(x);
    const s = B.toSlider(x.a, bd);
    assert.ok(Math.abs(B.fromSlider(s, bd) / x.a - 1) < 0.06, x.id);
    assert.ok(Math.log10(bd[1] / bd[0]) >= 3, x.id);
  }
  const mids = B.BANK.map(x => B.toSlider(x.a, B.bounds(x)));
  assert.ok(new Set(mids.map(m => Math.round(m / 100))).size >= 4, 'answers sit at many places on the slider');
});

test('typed numbers: digits, commas and number words', () => {
  assert.equal(B.parseNum('1,200'), 1200); assert.equal(B.parseNum('1.2k'), 1200); assert.equal(B.parseNum('3 million'), 3e6);
  assert.equal(B.parseNum('5 lakh'), 5e5); assert.equal(B.parseNum('1.2 crore'), 1.2e7); assert.equal(B.parseNum('2e6'), 2e6); assert.equal(B.parseNum('0.5'), 0.5);
  assert.ok(Number.isNaN(B.parseNum(''))); assert.ok(Number.isNaN(B.parseNum('lots'))); assert.ok(Number.isNaN(B.parseNum('-5'))); assert.ok(Number.isNaN(B.parseNum('0')));
  assert.equal(B.show(604800), '604,800'); assert.equal(B.show(18446744073709551615), '18.4 quintillion');
});

test('calibration counts bets and hits per chip level; rounds deal new questions first', () => {
  const cal = B.calibration([{ chips: 3, hit: true }, { chips: 3, hit: false }, { chips: 1, hit: true }, { chips: 2, hit: false }]);
  assert.deepEqual(cal, { 1: { n: 1, hit: 1 }, 2: { n: 1, hit: 0 }, 3: { n: 2, hit: 1 } });
  const pool = B.forLevel('challenger').map(x => x.id), seen = pool.slice(0, pool.length - 3);
  const r = B.deal('challenger', seen, 5, 3).map(x => x.id);
  assert.equal(r.length, 5);
  assert.deepEqual(r.slice(0, 3).sort(), pool.slice(-3).sort());
  assert.deepEqual(B.deal('pro', [], 5, 9), B.deal('pro', [], 5, 9));
});

test('the answer as shown counts: a range holding the shown (rounded) answer catches it', () => {
  const ev = B.byId('everest'), c = B.byId('light-speed');
  assert.equal(B.show(ev.a), '8,849');
  assert.ok(B.score(8849, 8849, 1, ev.a).hit, 'Everest shows as 8,849');
  assert.ok(B.score(299792, 299792, 3, c.a).hit, 'light shows as 299,792');
  assert.ok(!B.score(8850, 8900, 1, ev.a).hit);
  for (const x of B.BANK) { const v = B.parseNum(B.show(x.a)); assert.ok(B.score(v, v, 1, x.a).hit, `${x.id}: ${B.show(x.a)}`); }
});

test('a miss always costs at least the chips bet, even for a huge range', () => {
  for (const c of [1, 2, 3]) {
    const s = B.score(1, 1e12, c, 1e15);
    assert.ok(!s.hit && s.points <= -c, `${c} chips: ${s.points}`);
    assert.ok(!Object.is(s.points, -0));
    assert.equal(B.stakes(1, 1e12, c).lose, -s.points, 'the preview shows what a miss costs');
  }
  for (const [lo, hi] of [[90, 110], [50, 200], [1, 1e6]]) for (const c of [1, 2, 3]) {
    assert.equal(B.score(lo, hi, c, 100).points, B.stakes(lo, hi, c).win);
    assert.equal(B.score(lo, hi, c, 1e9).points, -B.stakes(lo, hi, c).lose);
  }
});

test('typed numbers read back everything show() writes', () => {
  assert.equal(B.parseNum('1e+6'), 1e6); assert.equal(B.parseNum('3e-2'), 0.03);
  assert.equal(B.parseNum('18.4 quintillion'), 18.4e18); assert.equal(B.parseNum('2 quadrillion'), 2e15); assert.equal(B.parseNum('4 trillions'), 4e12);
  assert.equal(B.show(999999999), '1 billion');
  const vals = [];
  for (let e = -3; e <= 26; e += 0.137) vals.push(10 ** e);
  for (const x of B.BANK) { vals.push(x.a); const [lo, hi] = B.bounds(x); vals.push(lo, hi); }
  for (const v of vals) {
    const txt = B.show(v), back = B.parseNum(txt);
    assert.ok(back > 0, `${v} shows as "${txt}", which parses`);
    assert.ok(Math.abs(back / v - 1) < 0.006, `${v} -> "${txt}" -> ${back}`);
    assert.equal(B.show(back), txt, `show is stable for "${txt}"`);
  }
});

test('question wording: 2^10 is ten 2s multiplied together, and Kangchenjunga is not called India\'s highest', () => {
  assert.match(B.byId('two-10').q, /ten 2s/);
  assert.doesNotMatch(B.byId('kanchenjunga').q, /highest/);
});
