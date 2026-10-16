/* The Lost Śulba Scroll: Katapayadi and bhūta-saṅkhyā codes, rope geometry, Piṅgala's lists, the weekly
   unlock schedule, and every puzzle's answer checked by recomputation for every level. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../js/play/exp/scroll-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];

test('Katapayadi digits follow the four runs (ka, ṭa, pa, ya)', () => {
  const runs = [['ka', 'kha', 'ga', 'gha', 'ṅa', 'ca', 'cha', 'ja', 'jha', 'ña'], ['ṭa', 'ṭha', 'ḍa', 'ḍha', 'ṇa', 'ta', 'tha', 'da', 'dha', 'na'], ['pa', 'pha', 'ba', 'bha', 'ma'], ['ya', 'ra', 'la', 'va', 'śa', 'ṣa', 'sa', 'ha']];
  runs.forEach(run => run.forEach((s, i) => assert.equal(S.kpDigit(s), (i + 1) % 10, s)));
  assert.deepEqual(S.KP_ROWS, runs);
  for (const v of ['a', 'ā', 'i', 'u', 'e', 'o', 'au']) assert.equal(S.kpDigit(v), 0, v);
  assert.equal(S.kpDigit('dra'), 2, 'cluster: last consonant');
  assert.equal(S.kpDigit('gya'), 1);
  assert.equal(S.kpDigit('khyam'), 1);
  for (const [d, list] of Object.entries(S.KP_EASY)) for (const s of list) assert.equal(S.kpDigit(s), +d, s);
});

test('Katapayadi decodes units first, including historical examples', () => {
  assert.equal(S.kpDecode(['ma', 'ka']), 15);
  assert.equal(S.kpDecodeWord('āyurārogyasaukhyam'), 1712210, 'Nārāyaṇīyam day count');
  const mela = { 'Kanakāṅgi': 1, 'Hanumatoḍi': 8, 'Māyāmāḷavagauḷa': 15, 'Kharaharapriya': 22, 'Harikāmbhoji': 28, 'Dhīraśaṅkarābharaṇam': 29, 'Calanāṭa': 36, 'Mecakalyāṇi': 65, 'Rasikapriya': 72 };
  for (const [name, n] of Object.entries(mela)) assert.equal(S.melakarta(name), n, name);
});

test('Katapayadi encode and decode round trip', () => {
  for (let n = 1; n < 5000; n += 7) {
    const w = S.kpEncode(n);
    assert.equal(w.length, String(n).length);
    assert.equal(S.kpDecode(w), n);
    assert.equal(S.kpDecode(S.kpEncode(n, S.KP_ROWS.flat().reverse())), n);
  }
});

test('bhūta-saṅkhyā table is accurate and round trips', () => {
  const want = { 'śūnya': 0, kha: 0, candra: 1, bhū: 1, netra: 2, bāhu: 2, pakṣa: 2, aśvin: 2, agni: 3, guṇa: 3, rāma: 3, veda: 4, yuga: 4, bāṇa: 5, bhūta: 5, ṛtu: 6, rasa: 6, ṛṣi: 7, svara: 7, vasu: 8, gaja: 8, graha: 9, aṅka: 9 };
  assert.equal(S.BHUTA.length, Object.keys(want).length);
  for (const e of S.BHUTA) assert.equal(e.d, want[e.w], e.w);
  for (let d = 0; d <= 9; d++) assert.ok(S.BHUTA.some(e => e.d === d), `a word for ${d}`);
  assert.equal(S.bhutaDecode(['ṛṣi', 'aśvin', 'veda']), 427, 'Pañcasiddhāntikā epoch, Śaka 427');
  for (let n = 1; n < 3000; n += 13) assert.equal(S.bhutaDecode(S.bhutaEncode(n)), n);
});

test('rope geometry: only 3-4-5 settings of a 12-knot rope make a right angle', () => {
  const r = S.rightSettings();
  assert.ok(r.length > 0);
  for (const [i, j] of r) assert.deepEqual(S.ropeSides(i, j).slice().sort((a, b) => a - b), [3, 4, 5]);
  for (let i = 1; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const s = S.ropeSides(i, j); if (!S.isTriangle(s)) continue;
    const hasRight = S.angles(s).some(a => Math.abs(a - 90) < 1e-9);
    assert.equal(hasRight, S.isRight(s), s.join());
  }
  assert.equal(S.diagonal(5, 12), 13);
  const r2 = S.sulbaRoot2(); assert.equal(r2.num, 577); assert.equal(r2.den, 408);
  assert.ok(Math.abs(577 / 408 - Math.SQRT2) < 3e-6);
});

test('Meru-prastāra and Piṅgala: rows, uddiṣṭa and naṣṭa agree', () => {
  const T = S.meru(10);
  for (let r = 0; r < 10; r++) assert.equal(T[r].reduce((a, b) => a + b, 0), 2 ** r);
  for (let n = 1; n <= 7; n++) {
    const list = S.prastara(n);
    assert.equal(list[0], 'G'.repeat(n)); assert.equal(list.at(-1), 'L'.repeat(n));
    assert.equal(new Set(list).size, 2 ** n);
    list.forEach((p, i) => { assert.equal(S.rowOf(p), i + 1); assert.equal(S.patternOf(i + 1, n), p); });
    for (let k = 0; k <= n; k++) assert.equal(list.filter(p => [...p].filter(c => c === 'G').length === k).length, S.choose(n, k));
  }
  assert.deepEqual(S.prastara(3), ['GGG', 'LGG', 'GLG', 'LLG', 'GGL', 'LGL', 'GLL', 'LLL']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(b => S.beatPatterns(b).length), [1, 2, 3, 5, 8, 13, 21]);
});

test('unlock schedule: chapter n opens on day 1 + 7(n - 1)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(S.openDay), [1, 8, 15, 22, 29, 36]);
  assert.equal(S.openCount(1), 1); assert.equal(S.openCount(7), 1); assert.equal(S.openCount(8), 2); assert.equal(S.openCount(36), 6); assert.equal(S.openCount(400), 6); assert.equal(S.openCount(0), 0);
  for (let d = 0; d < 50; d++) for (let n = 1; n <= 6; n++) assert.equal(S.isOpen(n, d), n <= S.openCount(d));
  assert.equal(S.openKey(1, '2026-10-16'), '2026-10-16');
  assert.equal(S.openKey(2, '2026-10-16'), '2026-10-23');
  assert.equal(S.openKey(3, '2026-12-27'), '2027-01-10');
  assert.equal(S.countdown(90 * 60000), '1 h 30 min');
  assert.equal(S.countdown(2 * 864e5 + 3 * 36e5), '2 days, 3 h');
});

test('every puzzle at every level: answer recomputes, passes its check, and wrong answers fail', () => {
  assert.equal(S.CHAPTERS.length, 6);
  for (const lv of LEVELS) {
    for (const c of S.CHAPTERS) {
      const ps = S.puzzlesFor(c.n, lv);
      assert.ok(ps.length >= 3 && ps.length <= 5, `${lv} ch${c.n} has ${ps.length}`);
      assert.ok(c.story[lv].length >= 2);
      if (c.n <= 5) assert.equal(ps.filter(p => p.keystone).length, 1, `ch${c.n} keystone`);
      assert.equal(new Set(ps.map(p => p.id)).size, ps.length);
      for (const p of ps) {
        const solved = p.solve();
        if (['kp', 'bhuta'].includes(p.kind)) assert.equal(solved, p.target, p.id);
        else assert.deepEqual(solved, p.answer, `${lv} ${p.id}`);
        assert.ok(S.check(p, p.kind === 'number' ? String(p.answer) : p.answer), `${lv} ${p.id} accepts its answer`);
        assert.ok(p.hints.length >= 3 && p.explain && p.prompt && p.title, p.id);
        const bad = { number: String(p.answer + 1), choice: 'nope', kp: ['ka', 'ka', 'ka', 'ka', 'ka', 'ka', 'ka', 'ka'], bhuta: ['candra'], order: p.kind === 'order' ? p.answer.slice().reverse() : null, rope: [1, 2], square: [1, 0], meter: 'G'.repeat(p.n || 1) }[p.kind];
        if (!(p.kind === 'kp' && p.target === 11111111) && !(p.kind === 'bhuta' && p.target === 1) && !(p.kind === 'meter' && p.target === 1)) assert.ok(!S.check(p, bad), `${lv} ${p.id} rejects a wrong answer`);
      }
    }
  }
});

test('the square puzzle accepts every square of double area, and the pro one has three', () => {
  const p = S.puzzlesFor(2, 'pro').find(q => q.kind === 'square');
  const ok = []; for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) if (S.check(p, [x, y])) ok.push([x, y]);
  assert.deepEqual(ok, [[1, 7], [5, 5], [7, 1]]);
});

test('chapter 6 is built from the keystones of chapters 1 to 5', () => {
  for (const lv of LEVELS) {
    const K = S.keystones(lv), ps = S.puzzlesFor(6, lv);
    assert.equal(new Set(K).size, 5, 'distinct keystones to order');
    assert.equal(ps.find(p => p.id === 'c6p2').answer, K[1] + K[2] + K[3]);
    assert.deepEqual(ps[0].answer.map(id => K[+id.slice(1) - 1]), K.slice().sort((a, b) => a - b));
  }
  assert.equal(S.puzzlesFor(6, 'explorer').find(p => p.id === 'c6p2').answer, S.keystones('explorer')[0], 'explorer seal circles back to the first shelf');
});

test('no em dashes in any chapter text', () => {
  for (const lv of LEVELS) for (const c of S.CHAPTERS) {
    const txt = JSON.stringify([c.title, c.place, c.story[lv], S.puzzlesFor(c.n, lv).map(p => [p.title, p.prompt, p.hints, p.explain])]);
    assert.ok(!txt.includes('—'), `${lv} ch${c.n}`);
  }
});
