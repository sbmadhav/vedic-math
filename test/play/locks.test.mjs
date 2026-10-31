/* Discovery Locks: generators feed the machine sensible inputs, the intended rule matches the machine on
   thousands of inputs, every other combination of tiles is caught, and wrong predictions explain themselves. */
import test from '../support/node-test.mjs';
import assert from 'node:assert/strict';
import { rng } from '../../js/play/kit.js';
import { CHAPTERS, levelsFor, runRule, checkRule, testInputs, allPicks, compare, chapterById, clearLevel, discover, counts, levelGoal } from '../../js/play/exp/locks-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];

test('six chapters, each with four to six levels, a sutra, three hints and a reveal', () => {
  assert.ok(CHAPTERS.length >= 6);
  for (const lv of LEVELS) { const L = levelsFor(lv); assert.ok(L.length >= 4 && L.length <= 6); assert.ok(L.some(l => l.kind === 'rule')); }
  for (const c of CHAPTERS) {
    assert.ok(c.sutra && c.meaning && c.title && c.blurb, c.id);
    assert.equal(c.hints.length, 3, c.id);
    assert.ok(!JSON.stringify(c).includes('—'), `${c.id} has an em dash`);
  }
});

test('the intended rule matches the machine on thousands of main and stretch inputs', () => {
  for (const c of CHAPTERS) for (const lv of LEVELS) {
    const r = rng(`${c.id}:${lv}`), R = c.rule(lv);
    for (let i = 0; i < 1500; i++) for (const stage of ['main', 'stretch']) {
      const x = c.gen(r, stage, lv);
      assert.equal(runRule(c, lv, R.answer, x), c.out(x), `${c.id} ${lv} ${stage} ${JSON.stringify(x)}`);
    }
  }
});

test('every other tile combination fails on the checker\'s test set', () => {
  for (const c of CHAPTERS) for (const lv of LEVELS) {
    for (const wide of [true, false]) {
    const inputs = testInputs(c, lv, rng(`check:${c.id}:${lv}`), 60, wide);
    const R = c.rule(lv), key = p => JSON.stringify(p);
    for (const p of allPicks(c, lv)) {
      const ok = checkRule(c, lv, p, inputs).ok;
      assert.equal(ok, key(p) === key(R.answer), `${c.id} ${lv} ${wide ? 'wide' : 'main'} ${key(p)}`);
    }
    }
  }
});

test('inputs fit the chapter: ends in 5, units make ten, gaps below the base, lamp sees all three kinds', () => {
  const r = rng('fit');
  for (const lv of LEVELS) for (let i = 0; i < 1000; i++) {
    assert.equal(chapterById('fives').gen(r, 'main', lv) % 10, 5);
    const b = chapterById('buddies').gen(r, i % 2 ? 'main' : 'stretch', lv);
    assert.equal((b.a % 10) + (b.b % 10), 10); assert.equal(Math.floor(b.a / 10), Math.floor(b.b / 10));
    const n = chapterById('nearbase').gen(r, i % 2 ? 'main' : 'stretch', lv);
    assert.ok(n.a < n.B && n.b < n.B && n.a !== n.b);
    const e = chapterById('eleven').gen(r, 'main', lv); assert.ok(Math.floor(e / 10) + (e % 10) <= 9, 'main x11 has no carries');
    const s = chapterById('eleven').gen(r, 'stretch', lv); assert.ok(Math.floor(s / 10) + (s % 10) >= 10, 'stretch x11 carries');
  }
  const lampIn = Array.from({ length: 400 }, () => chapterById('lamp').gen(r, 'main', 'challenger'));
  assert.ok(lampIn.some(x => x % 9 === 0) && lampIn.some(x => x % 3 === 0 && x % 9) && lampIn.some(x => x % 3));
});

test('wrong predictions are informative', () => {
  assert.equal(compare(517, 517).note, 'Exactly right.');
  assert.match(compare(527, 517).note, /tens digit/);
  assert.deepEqual(compare(527, 517).marks, [true, false, true]);
  assert.match(compare(71, 781).note, /2 digits/);
  assert.match(compare(3625, 4225).note, /last two digits match/);
  assert.equal(compare(600, 517).diff, 83);
});

test('reveals render concrete lines for real inputs', () => {
  for (const c of CHAPTERS) { const x = c.gen(rng('rev' + c.id), 'main', 'challenger'); const lines = c.reveal.lines(x); assert.ok(lines.length >= 3); assert.ok(lines.every(l => typeof l === 'string' && l.length)); }
  assert.match(chapterById('lamp').reveal.lines(288).join(' '), /2 × 99 \+ 8 × 9/);
});

test('a level counts only the first time it is cleared; a sutra is discovered once', () => {
  const c = { done: 0 };
  assert.equal(clearLevel(c, 0), true); assert.equal(c.done, 1);
  assert.equal(clearLevel(c, 0), false, 'replaying level 1'); assert.equal(c.done, 1);
  assert.equal(clearLevel(c, 1), true); assert.equal(c.done, 2);
  const ruleAt = levelsFor('challenger').findIndex(l => l.kind === 'rule');
  const d = { done: ruleAt };
  assert.equal(discover(d, ruleAt), true);
  assert.equal(discover(d, ruleAt), false, 'solving the rule level again');
  clearLevel(d, ruleAt); assert.equal(discover(d, ruleAt), false);
  /* progress saved before discoveries were recorded: the rule level is already cleared */
  assert.equal(discover({ done: ruleAt + 1 }, ruleAt), false);
});

test('rule wording matches the numbers the lock is fed', () => {
  /* Nines Gate: the stretch is times the next row of nines, so the label names both round numbers */
  for (const lv of LEVELS) {
    const c = chapterById('nines'), R = c.rule(lv), right = R.slots.B[R.answer.B].label;
    const r = rng(`label:${lv}`);
    for (const stage of ['main', 'stretch']) for (let i = 0; i < 50; i++) {
      const x = c.gen(r, stage, lv);
      assert.ok(right.includes(String(x.z + 1)), `${lv} ${stage}: "${right}" should name ${x.z + 1}`);
    }
  }
  /* Base Camp: read literally, the rule must say what to do when R is too long (81 x 83: 64 and 323 -> 6723) */
  const nb = chapterById('nearbase').rule('challenger').parts.join(' ');
  assert.match(nb, /too many digits, carry the extra/);
  assert.match(nb, /a 0 in front if it is short/);
  /* Nine Lamp teaches casting out nines and says so */
  const lamp = chapterById('lamp');
  assert.equal(lamp.found, 'casting out nines');
  assert.match(lamp.credit, /digit sums/);
});

test('Calm: "Beat the lock" is untimed and a right answer counts whatever the time', () => {
  for (const lv of LEVELS) {
    const timed = levelsFor(lv).find(l => l.kind === 'quick'), calm = levelsFor(lv, true).find(l => l.kind === 'quick');
    assert.ok(timed.secs > 0); assert.equal(calm.secs, 0); assert.equal(calm.need, timed.need);
    assert.equal(levelsFor(lv, true).length, levelsFor(lv).length);
    assert.equal(counts(timed, true, timed.secs - 1), true); assert.equal(counts(timed, true, timed.secs + 1), false, 'too slow with a clock');
    assert.equal(counts(calm, true, 1e6), true, 'no clock under Calm'); assert.equal(counts(calm, false, 1), false);
  }
});

test('a cleared level names what the next one asks, so it never reads as the stage just done (Muse review, item 2)', () => {
  for (const lv of LEVELS) for (const calm of [false, true]) {
    const L = levelsFor(lv, calm);
    for (const l of L) { const g = levelGoal(l); assert.ok(g.length > 10, `${lv} ${l.kind}`); assert.ok(!g.includes('\u2014')); }
    /* level 2 asks for a streak, which level 1 (a few feeds and two guesses) does not */
    assert.match(levelGoal(L[1]), lv === 'explorer' ? /2 in a row/ : /3 in a row/);
    assert.notEqual(levelGoal(L[1]), levelGoal(L[2]));
  }
  assert.match(levelGoal(levelsFor('challenger')[2]), /within 14 seconds/);
  assert.match(levelGoal(levelsFor('challenger', true)[2]), /no clock/);
});
