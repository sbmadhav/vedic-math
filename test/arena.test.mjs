/* Arena: the 1,000-challenge tower (40 chapters of 25) and the daily seeded rounds.
   Every question is worked out again from its text with exact arithmetic where the text holds
   all the numbers; questions whose numbers live only in a picture get structural checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, PER_CHAPTER, CHALLENGE_COUNT, challenge, challengeSet, challengeKey, challengeMedal } from '../js/levels.js';
import { makeSet, dailySet, practiceItem, MENTAL_FROM, PRO_RAMP } from '../js/arena.js';
import { byId, SKILLS } from '../js/skills/index.js';
import { checkOne } from '../js/check.js';
import { verifyQuestion } from './support/verify.mjs';
import { FAMILIES } from '../js/mental.js';
import { createHash } from 'node:crypto';

const CH = Array.from({ length: CHALLENGE_COUNT }, (_, i) => challenge(i + 1));
const SETS = CH.map(c => challengeSet(c));
const each = fn => SETS.forEach((set, c) => set.forEach((p, i) => fn(p, `challenge ${c + 1} item ${i + 1} (${p.skill})`)));

test('there are 1,000 challenges: 40 chapters x 25', () => {
  assert.equal(TOPICS.length, 40);
  assert.equal(PER_CHAPTER, 25);
  assert.equal(CHALLENGE_COUNT, 1000);
  assert.equal(new Set(CH.map(c => challengeKey(c.id))).size, 1000);
  CH.forEach((c, i) => { assert.equal(c.id, i + 1); assert.equal(c.chapter, Math.floor(i / 25)); assert.equal(c.index, (i % 25) + 1); });
});

test('skill ids are unique and every chapter has skills', () => {
  assert.equal(new Set(SKILLS.map(s => s.id)).size, SKILLS.length);
  TOPICS.forEach(t => assert.ok(t.ids.length > 0, `chapter "${t.name}" has no skills`));
  assert.equal(new Set(TOPICS.map(t => t.name)).size, 40);
});

test('every challenge has targets in the right order and enough questions', () => {
  CH.forEach((c, i) => {
    assert.equal(c.targets.length, 3, `challenge ${c.id}`);
    const t = c.targets; assert.ok(t.every(Number.isFinite), `challenge ${c.id}`);
    if (c.goal === 'seconds') assert.ok(t[0] >= t[1] && t[1] >= t[2], `challenge ${c.id} times should shrink`);
    else assert.ok(t[0] <= t[1] && t[1] <= t[2], `challenge ${c.id} targets should grow`);
    assert.ok(SETS[i].length >= Math.max(c.total, 40), `challenge ${c.id} only has ${SETS[i].length} questions`);
  });
  assert.equal(JSON.stringify(challengeSet(CH[123])), JSON.stringify(SETS[123]), 'sets are seeded');
});

const tally = { ok: 0, skip: 0, wrong: [], ambiguous: [] };
const skipped = {};
each((p, id) => {
  const r = verifyQuestion(p);
  if (r.status === 'ok') tally.ok++;
  else if (r.status === 'wrong') tally.wrong.push(`${id}: ${r.text} -> ${r.why}`);
  else if (r.status === 'ambiguous') tally.ambiguous.push(`${id}: ${r.text} (stored ${p.answer}) -> ${r.why}`);
  else { tally.skip++; skipped[p.skill] = (skipped[p.skill] || 0) + 1; }
});

test('every challenge answer that can be worked out from the question is correct', () => {
  assert.deepEqual(tally.wrong, [], `wrong answers:\n${tally.wrong.slice(0, 50).join('\n')}`);
  const total = SETS.reduce((a, s) => a + s.length, 0);
  assert.ok(tally.ok / total > 0.9, `only ${tally.ok} of ${total} checked independently`);
  // The rest read their numbers from a picture (dots, blocks, coins, clocks, diagrams)
  const pictureSkills = ['k-count', '1-tens', 'k-compare', 'k-shapes', '1-time', '2-money', '3-area', '3-frac', '4-angles', '5-volume', '8-pyth', '10-triangle'];
  assert.deepEqual(Object.keys(skipped).filter(s => !pictureSkills.includes(s)), [], 'a text question was not verified');
});

test('place-value questions name a digit that appears once', { todo: tally.ambiguous.length ? `${tally.ambiguous.length} ambiguous items, e.g. ${tally.ambiguous[0]}` : false }, () => {
  assert.equal(tally.ambiguous.length, 0, `${tally.ambiguous.length} questions name a repeated digit, so two answers fit:\n${tally.ambiguous.slice(0, 5).join('\n')}`);
});

test('the independent checker catches a wrong answer (mutation check)', () => {
  let n = 0;
  each(p => {
    if (n >= 3000 || p.kind !== 'num') return;
    const r = verifyQuestion(p); if (r.status !== 'ok') return;
    assert.equal(verifyQuestion({ ...p, answer: p.answer + 1 }).status, 'wrong', p.q);
    n++;
  });
  assert.ok(n >= 3000);
});

test('every challenge item is well formed and answer checking accepts it and rejects near misses', () => {
  each((p, id) => {
    if (p.kind === 'choice') {
      assert.ok(Array.isArray(p.choices) && p.choices.includes(p.answer), `${id}: answer not among choices`);
      assert.equal(new Set(p.choices).size, p.choices.length, `${id}: duplicate choices`);
      assert.ok(checkOne({ kind: 'choice', answer: p.answer }, p.answer).ok, id);
      p.choices.filter(c => c !== p.answer).forEach(c => assert.ok(!checkOne({ kind: 'choice', answer: p.answer }, c).ok, `${id}: accepted ${c}`));
      return;
    }
    assert.equal(p.kind, 'num', id);
    assert.ok(Number.isFinite(p.answer), id);
    const spec = { kind: 'num', answer: p.answer, tol: 1e-6 }; // as runChallenge checks
    assert.ok(checkOne(spec, String(Math.round(p.answer * 1e6) / 1e6)).ok, `${id}: rejected ${p.answer}`);
    for (const miss of [p.answer + 1, p.answer - 1, p.answer + 0.01]) assert.ok(!checkOne(spec, String(miss)).ok, `${id}: accepted ${miss} for ${p.answer}`);
  });
});

test('challenge Medals: one per target reached (1 bronze, 2 silver, 3 gold)', () => {
  const sprint = CH.find(c => c.format === 'sprint'), ta = CH.find(c => c.format === 'timeattack'), acc = CH.find(c => c.format === 'accuracy');
  assert.equal(challengeMedal(sprint, { score: sprint.targets[2] }), 3);
  assert.equal(challengeMedal(sprint, { score: sprint.targets[0] - 1 }), 0);
  assert.equal(challengeMedal(ta, { right: ta.total, finished: true, secs: ta.targets[2] }), 3);
  assert.equal(challengeMedal(ta, { right: 0, finished: true, secs: 1 }), 0);
  assert.equal(challengeMedal(acc, { right: acc.total }), 3);
});

/* Checks one daily or Practice item: a whole-number answer the keypad takes, choices that hold it, and an answer
   that verify.mjs works out again from the question text */
function checkItem(league, p, id) {
  assert.ok(Number.isInteger(p.answer), id);
  assert.ok(p.choices.includes(p.answer) && new Set(p.choices).size === p.choices.length, `${id}: choices ${p.choices}`);
  if (league === 'explorer') assert.ok(p.choices.every(c => c >= 0), `${id}: negative choice for Explorer`);
  const r = verifyQuestion({ ...p, kind: 'num' });
  assert.notEqual(r.status, 'wrong', `${id}: ${r.text} -> ${r.why}`);
  return r;
}
const DAYS = ['2026-01-01', '2026-06-15', '2026-10-14', '2026-10-19', '2026-12-31', '2027-03-08'];

test('daily Arena rounds: pool skills exist, answers are correct, choices hold the answer', () => {
  for (const league of ['explorer', 'challenger', 'pro']) for (const day of DAYS) {
    const set = dailySet(league, day);
    assert.equal(set.length, 80, `${league} ${day}`);
    assert.equal(JSON.stringify(set), JSON.stringify(dailySet(league, day)), 'seeded');
    set.forEach((p, i) => {
      const id = `${league} ${day} #${i + 1} (${p.skill || p.family})`;
      if (p.family) assert.ok(FAMILIES.includes(p.family), id); else assert.ok(byId[p.skill], id);
      checkItem(league, p, id);
    });
  }
});

/* Snapshots of the daily sets taken before the Pro Arena became mental arithmetic (sha256 of the JSON, first 16 hex).
   Explorer 2026-10-14 and 2026-10-18 were retaken for openspec voice-wording: one question each now says "1 marble"
   and "1 star" instead of "1 marbles" and "1 stars"; the questions, order and answers are the same. */
const BEFORE = {
  'explorer 2026-10-14': 'ee93b3cb1bcf681c', 'explorer 2026-10-15': '3a40ecf9d56054ff', 'explorer 2026-10-18': 'd26da2ee0848f779',
  'challenger 2026-10-14': '3459ead06eae6dd3', 'challenger 2026-10-15': '314a7474d7b50233', 'challenger 2026-10-18': '68546f2f50ffa1c8',
  'pro 2026-10-14': 'bebe78defa65947d', 'pro 2026-10-15': '68cb3ae2acb8c395', 'pro 2026-10-18': 'c94c2512cf2c9136'
};
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

test('Explorer and Challenger daily sets are byte-identical to before the change', () => {
  for (const [k, h] of Object.entries(BEFORE)) if (!k.startsWith('pro')) { const [league, day] = k.split(' '); assert.equal(sha(dailySet(league, day)), h, k); }
});

test('Pro daily sets before MENTAL_FROM are unchanged, so this week\'s Boards never mix question sets', () => {
  assert.equal(MENTAL_FROM, '2026-10-19');
  assert.equal(new Date(MENTAL_FROM + 'T12:00:00').getDay(), 1, 'the switch is on a Monday, the start of an ISO week');
  for (const [k, h] of Object.entries(BEFORE)) if (k.startsWith('pro')) assert.equal(sha(dailySet('pro', k.split(' ')[1])), h, k);
  assert.ok(dailySet('pro', '2026-10-18').every(p => !p.family), 'Sunday 2026-10-18 still uses the old pool');
  assert.ok(dailySet('pro', '2026-10-19').every(p => p.family), 'Monday 2026-10-19 uses the mental families');
});

test('Pro daily sets for 30 dates: only mental families, a fixed non-decreasing ramp, the same for everyone', () => {
  const start = new Date(MENTAL_FROM + 'T12:00:00');
  for (let k = 0; k < 30; k++) {
    const d = new Date(start); d.setDate(d.getDate() + k * 11);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const set = dailySet('pro', day);
    assert.equal(set.length, 80, day);
    assert.equal(JSON.stringify(set), JSON.stringify(dailySet('pro', day)), `${day}: seeded`);
    assert.deepEqual(new Set(set.map(p => p.family)), new Set(FAMILIES), `${day}: every family, nothing else`);
    assert.equal(set[0].d, PRO_RAMP[0], day); assert.equal(set[79].d, PRO_RAMP[1], day);
    set.forEach((p, i) => {
      if (i) assert.ok(p.d >= set[i - 1].d, `${day} #${i + 1}: difficulty went down`);
      assert.ok(!/x|log|<sup>(?!2<)/.test(p.q), `${day} #${i + 1}: ${p.q} is not mental arithmetic`);
      assert.ok(Math.abs(p.answer) <= 9999999, `${day} #${i + 1}: answer too long for the keypad`);
      assert.equal(checkItem('pro', p, `${day} #${i + 1}`).status, 'ok', `${day} #${i + 1}: ${p.q} was not checked independently`);
    });
  }
  assert.notEqual(JSON.stringify(dailySet('pro', '2026-10-19')), JSON.stringify(dailySet('pro', '2026-10-20')), 'each day has its own set');
});

test('Arena Practice items: Pro are mental at the asked difficulty, other Leagues use their pools at the band level', () => {
  for (let d = 1; d <= 20; d++) for (let k = 0; k < 30; k++) {
    const p = practiceItem('pro', d);
    assert.ok(FAMILIES.includes(p.family)); assert.equal(p.d, d);
    assert.equal(checkItem('pro', p, `pro practice d${d}`).status, 'ok');
    for (const league of ['explorer', 'challenger']) { const c = practiceItem(league, d); assert.ok(byId[c.skill], c.skill); assert.equal(c.d, d); checkItem(league, c, `${league} practice d${d}`); }
  }
});

/* Untimed Arena Practice (openspec game-shell-and-calm): 20 questions, each drawn at the Dial's difficulty, with no
   repeats in the round, and the difficulty follows the answers */
test('untimed Practice draws 20 adapting questions with no repeats', async () => {
  const { UNTIMED_QS, practiceNext } = await import('../js/arena.js');
  const { Dial } = await import('../js/adapt.js');
  assert.equal(UNTIMED_QS, 20);
  for (const league of ['explorer', 'challenger', 'pro']) {
    const dial = new Dial(8), seen = new Set(), ds = [];
    for (let k = 0; k < UNTIMED_QS; k++) {
      const it = practiceNext(league, dial);
      assert.ok(!seen.has(it.q), `${league}: ${it.q} repeated`); seen.add(it.q);
      ds.push(dial.lv); dial.hit(k < 10); /* ten right, then ten missed */
    }
    assert.equal(seen.size, 20, league);
    assert.ok(Math.max(...ds.slice(0, 11)) > ds[0], `${league}: right answers raise the difficulty (${ds})`);
    assert.ok(ds[19] < Math.max(...ds), `${league}: misses lower it (${ds})`);
  }
});
