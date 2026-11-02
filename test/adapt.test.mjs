/* Adaptive difficulty: the dial moves the right way, points weight difficulty, and the question
   ladders behind the games are valid, never tie, and do not repeat within a round. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
globalThis.matchMedia ??= () => ({ matches: false });
globalThis.localStorage ??= { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const A = await import('../js/adapt.js');
const G = await import('../js/games.js');
const store = await import('../js/store.js');

test('right answers raise the dial, misses lower it, within 1 to 20', () => {
  let d = new A.Dial(9); for (let i = 0; i < 30; i++) d.hit(true); assert.equal(d.lv, 20);
  d = new A.Dial(9); for (let i = 0; i < 30; i++) d.hit(false); assert.equal(d.lv, 1);
  d = new A.Dial(10, { floor: 8 }); for (let i = 0; i < 30; i++) d.hit(false); assert.equal(d.lv, 8, 'level floor holds');
  d = new A.Dial(5); d.hit(true); assert.ok(d.lv > 5); const up = d.lv; d.hit(false); assert.ok(d.lv < up);
});

test('a steady player settles near where they get about 3 in 4 right', () => {
  // A simulated player who is right when the difficulty is at or below their true skill of 12
  const d = new A.Dial(5); for (let i = 0; i < 60; i++) d.hit(d.lv <= 12 || Math.random() < .2);
  assert.ok(d.settled() >= 10 && d.settled() <= 14, `settled at ${d.settled()}`);
});

test('points grow with difficulty, so harder rounds score more', () => {
  assert.equal(A.pointsAt(1), 10); assert.equal(A.pointsAt(20), 143);
  for (let d = 2; d <= 20; d++) assert.ok(A.pointsAt(d) > A.pointsAt(d - 1));
  const easy = new A.Dial(2, { ceil: 2 }), hard = new A.Dial(15, { floor: 15 });
  for (let i = 0; i < 10; i++) { easy.hit(true); hard.hit(true); }
  assert.ok(hard.points > easy.points * 5);
});

test('play modes start at different difficulties', () => {
  assert.ok(A.START.explorer < A.START.challenger && A.START.challenger < A.START.pro);
  assert.ok(A.rating('game:times-sprint', 'pro') >= 9, 'a 13-year-old in Pro mode does not start on the 2s table');
});

test('fresh() avoids repeats within a round', () => {
  const d = new A.Dial(13); const seen = new Set();
  for (let i = 0; i < 40; i++) { const q = d.fresh(() => G.timesQ(13)); const k = `${q.a}x${q.b}`; assert.ok(!seen.has(k), `repeat ${k}`); seen.add(k); }
});

test('question ladders are valid at every difficulty', () => {
  for (let lv = 1; lv <= 20; lv++) for (let i = 0; i < 200; i++) {
    const t = G.timesQ(lv)[1]; assert.ok(Number.isInteger(t.ans) && t.ans === t.a * t.b && t.ans > 0, `times ${lv}`);
    const m = G.moreQ(lv)[1]; assert.notEqual(m.va, m.vb, `more ${lv} tie ${JSON.stringify(m)}`); assert.ok(Number.isFinite(m.va) && Number.isFinite(m.vb));
    const s = G.seqQ(lv)[1]; assert.ok(Number.isFinite(s.ans) && s.shown.length >= 4, `seq ${lv}`);
    const b = G.balanceQ(lv)[1]; const strip = h => h.replace(/<[^>]+>/g, '').replace(/&minus;/g, '-').replace(/(\d)\(/g, '$1*(').replace(/(\d)x/g, '$1*x');
    const ev = e => Function('x', `return ${e}`)(b.x); assert.ok(Math.abs(ev(strip(b.L)) - ev(strip(b.R))) < 1e-9, `balance ${lv}: ${b.L} = ${b.R}, x = ${b.x}`);
  }
});

test('times sprint gets objectively harder: bigger products at the top than the bottom', () => {
  const med = lv => { const xs = Array.from({ length: 301 }, () => G.timesQ(lv)[1].ans).sort((a, b) => a - b); return xs[150]; };
  assert.ok(med(1) <= 50 && med(9) > 100 && med(20) > 10000, `${med(1)}, ${med(9)}, ${med(20)}`);
});

test('every game has a leaderboard id the rules accept', () => {
  const allowed = 'balloons|more_less|make_ten|quick_look|bonds|times_sprint|target|frac_faceoff|line_snipe|pairs|check_it|rain|sequence|balance'.split('|');
  for (const g of G.GAMES) assert.ok(allowed.includes(G.boardGame(g.id).slice(2)), g.id);
});

/* Ratings for games, the Arena and Skills (openspec ratings spec): full keys, Mode starts, the 4-answer rule */
const fresh = () => { localStorage._ = {}; store.reset(); };
const dialWith = (start, answers) => { const d = new A.Dial(start); answers.forEach(ok => d.hit(ok)); return d; };

test('Ratings: each key starts at the Mode start (Explorer 1, Challenger 5, Pro 9)', () => {
  fresh();
  for (const key of ['game:times-sprint', 'arena:pro', 'arena:explorer', 'skill:3-mult']) {
    assert.equal(A.rating(key, 'explorer'), 1, key); assert.equal(A.rating(key, 'challenger'), 5, key); assert.equal(A.rating(key, 'pro'), 9, key);
  }
});

test('Ratings: saving one key leaves the others alone; under 4 answers changes nothing', () => {
  fresh();
  assert.equal(A.saveRating('arena:pro', dialWith(9, [true, true, true])), 0, 'three answers: not saved');
  assert.equal(store.rating('arena:pro'), 0);
  const up = A.saveRating('arena:pro', dialWith(15, Array(10).fill(true)));
  assert.ok(up > 15, `arena:pro ${up}`);
  assert.equal(A.rating('arena:pro', 'pro'), up);
  assert.equal(A.rating('game:times-sprint', 'pro'), 9, 'the game Rating is unchanged');
  assert.equal(A.rating('skill:3-mult', 'pro'), 9, 'Skill Ratings are unchanged');
  assert.equal(A.rating('arena:challenger', 'pro'), 9, 'another League is separate');
  const sk = A.saveRating('skill:3-mult', dialWith(5, [true, true, true, true, false, true, true, true, true, true]));
  assert.ok(sk > 5, `skill ${sk}`);
  assert.equal(A.rating('arena:pro', 'pro'), up, 'the Arena Rating is unchanged by a Skill');
  // Moving average: a bad round pulls the Rating down only part way
  const down = A.saveRating('arena:pro', dialWith(up, Array(6).fill(false)));
  assert.ok(down < up && down > 1, `${up} -> ${down}`);
});

test('Ratings: existing game values read the same under their game: keys', () => {
  fresh();
  store.setRating('game:times-sprint', 13.4);
  assert.equal(A.rating('game:times-sprint', 'explorer'), 13.4);
  assert.equal(store.load().ratings['game:times-sprint'], 13.4, 'stored data under game: keys is unchanged');
});

test('Skill Ratings: the band picks generator levels 1 to 3; started Skills fall back to their mastery level', () => {
  for (let d = 1; d <= 20; d++) assert.equal(A.levelFor(d), d <= 7 ? 1 : d <= 13 ? 2 : 3, `d ${d}`);
  [1, 2, 3].forEach(lv => assert.equal(A.levelFor(A.ratingFromLevel(lv)), lv, `level ${lv} keeps its level`));
  fresh();
  assert.equal(A.skillRating('3-mult', 'pro'), 9, 'never practiced: the Mode start');
  for (let i = 0; i < 3; i++) store.record('3-mult', false, false);
  assert.equal(store.level('3-mult'), 1);
  assert.equal(A.skillRating('3-mult', 'pro'), A.ratingFromLevel(1), 'started at level 1: stays at level 1, not the Pro start');
  for (let i = 0; i < 12; i++) store.record('3-mult', true, false);
  assert.equal(store.level('3-mult'), 3);
  assert.equal(A.levelFor(A.skillRating('3-mult', 'explorer')), 3, 'mastered: stays at level 3');
  store.setRating('skill:3-mult', 6.2);
  assert.equal(A.skillRating('3-mult', 'pro'), 6.2, 'a saved Skill Rating wins');
});

test('Skill Ratings: a good session raises the Rating and moves the questions up a level', () => {
  fresh();
  const d = new A.Dial(A.skillRating('3-mult', 'challenger'));
  assert.equal(A.levelFor(d.lv), 1);
  [true, true, true, false, true, true, true, true, true, true].forEach(ok => d.hit(ok));
  assert.ok(A.levelFor(d.lv) >= 2, `dial ${d.lv}`);
  assert.ok(A.saveRating('skill:3-mult', d) > 5);
});

/* The Placement level (openspec placement, ratings spec "Starting Rating by Mode"): only Practice reads it, and only when
   no Rating and no mastery band apply. LEVEL_START[the Mode's first grade] is the Mode's START, so a Player placed at
   their Mode's start behaves as before. */
test('Placement: LEVEL_START anchors each Mode\'s first grade to its START; skillStart is 10, 5, 1 below, at and above', () => {
  assert.equal(A.LEVEL_START.K, A.START.explorer); assert.equal(A.LEVEL_START[3], A.START.challenger); assert.equal(A.LEVEL_START[8], A.START.pro);
  assert.equal(A.skillStart(4, 6), 10); assert.equal(A.skillStart(6, 6), 5); assert.equal(A.skillStart(8, 6), 1); assert.equal(A.skillStart('K', 'K'), 5);
});

test('Placement: an Explorer placed at grade 5 starts Endless Make ten practice at 7, but a Ranked round at 1', () => {
  fresh(); store.setPlacement({ grade: 5, steps: 5 });
  assert.equal(A.rating('game:make-ten', 'explorer', 0, { practice: true }), 7);
  assert.equal(A.rating('game:make-ten', 'explorer'), 1, 'Ranked rounds keep the Mode\'s start');
  assert.equal(A.rating('arena:explorer', 'explorer', 0, { practice: true }), 7, 'Arena Practice too');
  assert.equal(A.rating('arena:explorer', 'explorer'), 1, 'the daily Arena round does not');
  store.setRating('game:make-ten', 3);
  assert.equal(A.rating('game:make-ten', 'explorer', 0, { practice: true }), 3, 'a saved Rating wins over the level');
});

test('Placement: a Challenger placed at grade 3 (the Mode\'s first grade) starts a new game at 5, as one who skipped', () => {
  fresh(); assert.equal(A.rating('game:times-sprint', 'challenger', 0, { practice: true }), 5);
  store.setPlacement({ grade: 3, steps: 0 });
  assert.equal(A.rating('game:times-sprint', 'challenger', 0, { practice: true }), 5);
  assert.equal(A.rating('game:times-sprint', 'challenger'), 5);
});

test('Placement: a Skill below the level starts at 10 (level 2), at the level at 5, above at 1; the mastery band still wins; Tricks use their grade', () => {
  fresh(); store.setPlacement({ grade: 6, steps: 3 });
  assert.equal(A.skillRating('4-mult2', 'challenger', { practice: true }), 10);
  assert.equal(A.levelFor(A.skillRating('4-mult2', 'challenger', { practice: true })), 2, 'the first 4-mult2 question is generated at level 2');
  assert.equal(A.skillRating('6-ratio', 'challenger', { practice: true }), 5);
  assert.equal(A.skillRating('8-pyth', 'challenger', { practice: true }), 1);
  assert.equal(A.skillRating('v-sq5', 'challenger', { practice: true }), 10, 'a grade 4 Trick is below the level');
  assert.equal(A.skillRating('v-sqroot', 'challenger', { practice: true }), 1, 'a grade 7 Trick is above it');
  assert.equal(A.skillRating('4-mult2', 'challenger'), 5, 'without the Practice flag the Mode start');
  for (let i = 0; i < 3; i++) store.record('4-mult2', false, false);
  assert.equal(A.skillRating('4-mult2', 'challenger', { practice: true }), A.ratingFromLevel(1), 'a Skill practiced before Ratings keeps its mastery band');
  store.setRating('skill:8-pyth', 14);
  assert.equal(A.skillRating('8-pyth', 'challenger', { practice: true }), 14, 'a saved Skill Rating wins');
});
