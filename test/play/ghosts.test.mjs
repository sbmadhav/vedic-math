/* Ghost Races: question sets are deterministic and correct, ghosts survive the share code exactly (to the
   hundredth of a second), the ghost's position is interpolated between answers, and links stay small. */
import test from '../support/node-test.mjs';
import assert from 'node:assert/strict';
import * as G from '../../js/play/exp/ghosts-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];

test('every level has sprints, and every question is correct and deterministic from its seed', () => {
  for (const lv of LEVELS) {
    const kinds = G.sprintsFor(lv);
    assert.ok(kinds.length >= 3 && kinds.includes('mixed'), lv);
    for (const k of kinds) for (let seed = 1; seed < 60; seed++) {
      const a = G.questions(k, lv, seed, 20), b = G.questions(k, lv, seed, 20);
      assert.deepEqual(a, b);
      assert.equal(a.length, 20);
      for (const q of a) {
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0, `${k} ${q.text}`);
        const m = q.text.match(/^(\d+) ([+×−]) (\d+)$/), sq = q.text.match(/^(\d+)²$/), dbl = q.text.match(/^Double (\d+)$/), bond = q.text.match(/^(\d+) \+ \? = 10$/);
        const want = m ? { '+': +m[1] + +m[3], '×': m[1] * m[3], '−': m[1] - m[3] }[m[2]] : sq ? sq[1] ** 2 : dbl ? dbl[1] * 2 : bond ? 10 - bond[1] : NaN;
        assert.equal(q.answer, want, q.text);
        assert.ok(!q.text.includes('—'));
      }
      for (let i = 1; i < a.length; i++) assert.notEqual(a[i].text, a[i - 1].text);
    }
    assert.notDeepEqual(G.questions('mixed', lv, 1, 10), G.questions('mixed', lv, 2, 10));
  }
  assert.ok(G.questions('sq5', 'pro', 7, 20).every(q => q.text.match(/^\d*5²$/)));
});

test('ghost share code: exact round trip, including misses and nickname', () => {
  const g = G.makeGhost({ kind: 'x11', lv: 'pro', seed: 123456, n: 5, t: [1230, 2500, 4810, 6000, 9990], miss: [[2, 3100], [4, 7020]], nick: [3, 17] });
  const back = G.decode(G.encode(g));
  assert.deepEqual({ ...back, who: 'you' }, g);
  assert.equal(G.nickName(back.nick), 'Cosmic Kingfisher');
  const plain = G.makeGhost({ kind: 'mixed', lv: 'explorer', seed: 1, n: 3, t: [4000, 8000, 9000] });
  assert.deepEqual({ ...G.decode(G.encode(plain)), who: 'you' }, plain);
  assert.equal(G.nickName(null), 'A friend');
});

test('decode rejects torn or hostile codes', () => {
  for (const bad of ['', 'xyz', '!!!', 'AAAA', G.encode(G.makeGhost({ kind: 'dbl', lv: 'pro', seed: 5, n: 2, t: [100, 200] })).slice(0, 6)]) assert.equal(G.decode(bad), null, bad);
  assert.equal(G.decode(Buffer.from('1.99.0.5..a,b').toString('base64url')), null);
});

test('ghost position: interpolated between answer times, clamped at the ends', () => {
  const g = G.makeGhost({ kind: 'dbl', lv: 'challenger', seed: 1, n: 3, t: [1000, 3000, 4000] });
  assert.equal(G.progressAt(g, 0), 0);
  assert.equal(G.progressAt(g, -50), 0);
  assert.equal(G.progressAt(g, 500), 0.5);
  assert.equal(G.progressAt(g, 1000), 1);
  assert.equal(G.progressAt(g, 2000), 1.5);
  assert.equal(G.progressAt(g, 3500), 2.5);
  assert.equal(G.progressAt(g, 4000), 3);
  assert.equal(G.progressAt(g, 99999), 3);
  let last = 0; for (let ms = 0; ms <= 4200; ms += 37) { const p = G.progressAt(g, ms); assert.ok(p >= last); last = p; }
});

test('a 20 question ghost link stays under 500 characters, even with slow answers and misses', () => {
  const t = []; let acc = 0; for (let i = 0; i < 20; i++) t.push(acc += 29999);
  const g = G.makeGhost({ kind: 'comp1000', lv: 'pro', seed: 36 ** 5 - 1, n: 20, t, miss: Array.from({ length: 10 }, (_, i) => [i * 2, t[i * 2] - 5]), nick: [19, 19] });
  const url = `https://learnvedicmath.com/learn/arena/ghosts/r/${G.encode(g)}`;
  assert.ok(url.length < 500, `${url.length}`);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(G.encode(g)));
});

test('pace characters are invented, steady and deterministic; compare splits the race', () => {
  for (const p of G.PACERS) assert.ok(p.name && p.blurb);
  const a = G.pacerGhost('comet', 'x11', 'pro', 9, 10), b = G.pacerGhost('comet', 'x11', 'pro', 9, 10);
  assert.deepEqual(a, b);
  assert.ok(G.total(G.pacerGhost('tortoise', 'x11', 'pro', 9, 10)) > G.total(a));
  const you = G.makeGhost({ kind: 'dbl', lv: 'pro', seed: 1, n: 3, t: [1000, 2500, 3000] });
  const foe = G.makeGhost({ kind: 'dbl', lv: 'pro', seed: 1, n: 3, t: [1500, 2500, 3500] });
  assert.deepEqual(G.compare(you, foe).map(r => [r.gain, r.lead]), [[500, 500], [-500, 0], [500, 500]]);
});

test('judging typed digits: right at once, wrong only at full length', () => {
  assert.equal(G.judge('12', 121), 'typing');
  assert.equal(G.judge('121', 121), 'right');
  assert.equal(G.judge('122', 121), 'wrong');
  assert.equal(G.judge('9', 7), 'wrong');
  assert.equal(G.judge('', 7), 'typing');
});

test('decode rejects ghosts that could never end: splits outside 0.01 s to 10 min, too many misses', () => {
  const code = (sp, miss = '') => Buffer.from(['1', '4', '1', 'a', '', sp, miss].join('.')).toString('base64url');
  const h = n => n.toString(36);
  assert.ok(G.decode(code([h(100), h(250)].join(','))), 'a normal ghost decodes');
  assert.ok(G.decode(code([h(1), h(60000)].join(','))), 'the limits themselves are fine');
  assert.equal(G.decode(code([h(100), h(60001)].join(','))), null, 'over 10 minutes for one question');
  assert.equal(G.decode(code([h(100), '0'].join(','))), null, 'zero');
  assert.equal(G.decode(code(['-5', h(100)].join(','))), null, 'negative');
  assert.equal(G.decode(code(['zzzzzzzzzzzz', h(100)].join(','))), null, 'huge');
  assert.equal(G.decode(code(Array(41).fill(h(100)).join(','))), null, 'too many questions');
  const misses = n => Array.from({ length: n }, () => `0:${h(50)}`).join(',');
  assert.ok(G.decode(code(h(100), misses(200))), '200 misses are allowed');
  assert.equal(G.decode(code(h(100), misses(201))), null, 'more than 200 misses');
  assert.equal(G.decode(code(h(100), `0:${h(5000)}`)), null, 'a miss after the race ended');
  assert.equal(G.decode(code(h(100), `-1:${h(50)}`)), null, 'a miss on no question');
  const g = G.decode(code([h(100), h(60000)].join(',')));
  assert.equal(G.total(g), 601000);
});

/* Every count of misses agrees in number: "1 miss", never "1 misses" (Muse review round 2, item 4) */
test('misses are counted in words that agree with the number', () => {
  assert.equal(G.missWord(0), '0 misses');
  assert.equal(G.missWord(1), '1 miss');
  assert.equal(G.missWord(2), '2 misses');
});
