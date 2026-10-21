/* Daily quests and badges (gamify.js): progress from a true 0 each day, whole numbers, stable ids,
   a seeded daily pick per Mode, and badges only for finishing or doing something. */
import test, { mock } from './support/node-test.mjs';
import assert from 'node:assert/strict';

const mem = { 'vm.sound': '0' };
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
// toast() needs a little DOM; nothing here is rendered
const toasts = [];
const node = () => { const n = { classList: { add() {}, toggle() {}, remove() {} }, setAttribute() {}, append() {}, remove() {}, getContext: () => null }; Object.defineProperty(n, 'innerHTML', { set: v => toasts.push(v), get: () => '' }); return n; };
globalThis.document = { querySelector: () => node(), createElement: node, body: node(), hidden: true };
globalThis.window = globalThis;
// reduced motion, so a New Title's confetti draws nothing
globalThis.matchMedia = () => ({ matches: true });

const at = (y, m, d) => new Date(y, m - 1, d, 10).getTime();
mock.timers.enable({ apis: ['Date'], now: at(2026, 10, 14) });
const store = await import('../js/store.js');
const gm = await import('../js/gamify.js');
const { SUTRAS, SUBSUTRAS } = await import('../js/sutras.js');
gm.init();

const day = n => { mock.timers.setTime(at(2026, 10, 14 + n)); };
/* A fresh Player in a Mode, on the given day */
function fresh(mode, n = 0) { day(n); store.addPlayer(); store.updatePlayer({ mode }); gm.startDay(); }
const answerQuest = () => gm.quests().find(q => ['answers', 'right'].includes(q.counter));
const quest = id => gm.quests().find(q => q.id === id);

test('day 1: progress starts at 0, shows 1 after one answer, and is always a whole number', () => {
  fresh('challenger');
  const q = answerQuest();
  assert.equal(q.prog, 0);
  store.record('3-mult', true, false);
  assert.equal(answerQuest().prog, 1);
  gm.quests().forEach(x => assert.ok(Number.isInteger(x.prog), `${x.id} progress ${x.prog}`));
});

test('a new date starts every quest at 0 again', () => {
  fresh('challenger', 1);
  for (let i = 0; i < 40; i++) store.record('3-mult', true, false);
  assert.equal(answerQuest().prog, answerQuest().goal);
  day(2);
  gm.quests().forEach(x => { assert.equal(x.prog, 0, x.id); assert.equal(x.done, false, x.id); });
  assert.equal(store.questDay().day, store.today());
});

test('progress is floored and clamped to the goal', () => {
  fresh('pro', 3);
  const q = answerQuest();
  store.bump(q.counter, 0.5);
  assert.equal(answerQuest().prog, 0);
  store.bump(q.counter, 1);
  assert.equal(answerQuest().prog, 1);
  store.bump(q.counter, 500);
  assert.equal(answerQuest().prog, q.goal);
});

test('completing a quest adds 25 Sparks once, and the message says Sparks', () => {
  fresh('challenger', 4);
  const q = answerQuest(), sp0 = store.sparks();
  toasts.length = 0;
  store.bump(q.counter, q.goal);
  assert.equal(store.sparks() - sp0, 25);
  assert.equal(answerQuest().done, true);
  store.bump(q.counter, q.goal);
  assert.equal(store.sparks() - sp0, 25, 'no more Sparks for the same quest that day');
  const msg = toasts.find(t => t.includes('Quest complete'));
  assert.match(msg, /\+25 Sparks/);
  assert.doesNotMatch(msg, /XP/);
});

test('a Mode switch after completing a Challenger quest marks no other quest done', () => {
  fresh('challenger', 5);
  const q = answerQuest();
  store.bump(q.counter, q.goal);
  assert.equal(answerQuest().done, true);
  store.updatePlayer({ mode: 'pro' });
  // no Pro quest asks the same thing as the Challenger one, so none is done
  assert.ok(!gm.QUEST_POOL.pro.some(x => x.id === q.id));
  gm.quests().forEach(x => assert.equal(x.done, false, `${x.id} shown done`));
});

test('Challenger to Explorer mid-day: "Get 5 right" counts only today', () => {
  // a date whose Explorer draw holds "Get 5 right"
  let n = 6; while (!pickHas(n, 'explorer', 'right-5')) n++;
  fresh('challenger', n - 1);
  store.bump('right', 500); store.bump('answers', 500);
  day(n); gm.startDay(); // the app opens (or midnight passes) on the new date
  store.record('3-mult', true, false); store.record('3-mult', true, false);
  store.updatePlayer({ mode: 'explorer' });
  const q = quest('right-5');
  assert.ok(q, 'Get 5 right is in today\'s Explorer quests');
  assert.equal(q.prog, 2);
  assert.equal(q.done, false);
});
function pickHas(n, mode, id) { day(n); return gm.pickQuests(store.today(), mode).some(q => q.id === id); }

test('three quests a day per Mode, seeded by date, always one answer quest, rotating', () => {
  for (const [mode, pool] of Object.entries(gm.QUEST_POOL)) {
    assert.ok(pool.length >= 6 && pool.length <= 8, `${mode} pool has ${pool.length}`);
    assert.equal(new Set(pool.map(q => q.id)).size, pool.length);
    const sets = [];
    for (let d = 1; d <= 7; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const a = gm.pickQuests(date, mode), b = gm.pickQuests(date, mode);
      assert.deepEqual(a.map(q => q.id), b.map(q => q.id), 'same date and Mode, same quests');
      assert.equal(a.length, 3);
      assert.equal(new Set(a.map(q => q.id)).size, 3);
      assert.equal(a.filter(q => ['answers', 'right'].includes(q.counter)).length, 1, `${mode} ${date}: one answer quest`);
      assert.ok(['answers', 'right'].includes(a[0].counter), 'the answer quest comes first');
      sets.push(a.map(q => q.id).sort().join());
    }
    const changes = sets.filter((s, i) => i > 0 && s !== sets[i - 1]).length;
    assert.ok(changes >= 5, `${mode}: the set changed on only ${changes} of 6 days`);
  }
});

test('Duelist needs a finished duel, not a Start press', () => {
  fresh('challenger', 20);
  store.bump('duels');
  assert.ok(!store.badges().duel);
  store.bump('duelsDone');
  assert.ok(store.badges().duel);
});

test('Sutra scholar needs 10 collected cards; opening the Sutras page is not enough', () => {
  fresh('pro', 21);
  store.markSeen('sutras');
  const cards = [...SUTRAS, ...SUBSUTRAS];
  for (let i = 0; i < 9; i++) store.markSeen('sutra:' + cards[i].name);
  assert.equal(gm.collectedCount(), 9);
  assert.ok(!store.badges().sutras);
  store.markSeen('sutra:' + cards[9].name);
  assert.equal(gm.collectedCount(), 10);
  assert.ok(store.badges().sutras);
});

test('Video learner needs a minute in the player, not a click', () => {
  fresh('pro', 22);
  store.bump('watched');
  assert.ok(!store.badges().watch);
  store.bump('watchedMinute');
  assert.ok(store.badges().watch);
});

test('a badge earned under the old rule stays earned', () => {
  fresh('challenger', 23);
  store.award('duel'); store.award('sutras'); store.award('watch');
  store.bump('answers'); // runs every badge check
  ['duel', 'sutras', 'watch'].forEach(b => assert.ok(store.badges()[b], b));
  assert.equal(gm.BADGES.find(b => b.id === 'duel').test(), false, 'the new rule would not award it');
});

/* ---------- Titles from Sparks (sparks spec) ---------- */
/* The old numbered level, copied here as the reference: Titles must change exactly where it changed Title */
const oldLevelOf = xp => Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
const OLD_TITLES = ['Number Rookie', 'Digit Dasher', 'Sum Sprinter', 'Times Tamer', 'Fraction Fighter', 'Sutra Scout', 'Mental Ninja', 'Equation Ace', 'Pattern Sage', 'Calculus Comet', 'Vedic Legend'];
const oldTitleOf = lv => OLD_TITLES[Math.min(OLD_TITLES.length - 1, Math.floor((lv - 1) / 2))];

test('every total from 0 to 25000 has the Title it had under the old levels', () => {
  for (let n = 0; n <= 25000; n += 10) assert.equal(gm.titleInfo(n).title, oldTitleOf(oldLevelOf(n)), `${n} Sparks`);
  for (const [t] of gm.TITLES.slice(1)) { assert.equal(gm.titleInfo(t - 1).title, oldTitleOf(oldLevelOf(t - 1)), `${t - 1}`); assert.equal(gm.titleInfo(t).title, oldTitleOf(oldLevelOf(t)), `${t}`); }
});

test('the eleven Titles start where the spec says', () => {
  assert.deepEqual(gm.TITLES, [[0, 'Number Rookie'], [300, 'Digit Dasher'], [1000, 'Sum Sprinter'], [2100, 'Times Tamer'], [3600, 'Fraction Fighter'], [5500, 'Sutra Scout'], [7800, 'Mental Ninja'], [10500, 'Equation Ace'], [13600, 'Pattern Sage'], [17100, 'Calculus Comet'], [21000, 'Vedic Legend']]);
});

test('titleInfo gives the Sparks into and needed for the next Title; Vedic Legend has a full bar and no next', () => {
  assert.deepEqual(gm.titleInfo(0), { title: 'Number Rookie', next: 'Digit Dasher', into: 0, need: 300, pct: 0 });
  assert.deepEqual(gm.titleInfo(2340), { title: 'Times Tamer', next: 'Fraction Fighter', into: 240, need: 1500, pct: 240 / 1500 });
  const top = gm.titleInfo(30000);
  assert.equal(top.title, 'Vedic Legend'); assert.equal(top.next, null); assert.equal(top.pct, 1);
});

test('crossing a Title line shows one New Title message; earning within a Title shows none', () => {
  fresh('challenger', 30);
  store.addSparks(3590);
  toasts.length = 0;
  store.addSparks(5);
  assert.equal(toasts.filter(t => t.includes('New Title')).length, 0);
  store.addSparks(7); /* 3590 + 12 = 3602 */
  const msgs = toasts.filter(t => t.includes('New Title'));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /New Title: Fraction Fighter/);
  assert.ok(!toasts.some(t => /Level \d/.test(t)), 'no level number');
});

test('Title badges: Sum Sprinter at 1000 and Fraction Fighter at 3600, same ids as Level 5 and Level 10', () => {
  const b5 = gm.BADGES.find(b => b.id === 'level5'), b10 = gm.BADGES.find(b => b.id === 'level10');
  assert.equal(b5.name, 'Sum Sprinter'); assert.equal(b10.name, 'Fraction Fighter');
  assert.match(b5.how, /Sum Sprinter Title \(1000 Sparks\)/); assert.match(b10.how, /Fraction Fighter Title \(3600 Sparks\)/);
  fresh('pro', 31);
  store.addSparks(999); assert.ok(!store.badges().level5);
  store.addSparks(1); assert.ok(store.badges().level5);
  store.addSparks(2599); assert.ok(!store.badges().level10);
  store.addSparks(1); assert.ok(store.badges().level10, '3600 Sparks earns Fraction Fighter');
});

test('a Player who earned Level 10 before keeps it as Fraction Fighter', () => {
  fresh('challenger', 32);
  store.award('level10');
  store.addSparks(20); /* runs every badge check, far below 3600 */
  assert.ok(store.badges().level10);
  assert.equal(gm.BADGES.find(b => b.id === 'level10').name, 'Fraction Fighter');
});

test('no badge text names a level number or XP', () => {
  for (const b of gm.BADGES) { assert.doesNotMatch(b.how + ' ' + b.name, /level \d|\bXP\b/i, b.id); }
});

/* ---------- Belts by Stars (sky-home) ---------- */
const lightAll = tricks => tricks.forEach(t => [1, 2, 3].forEach(n => store.lightStar(t, n)));
const saved = () => JSON.parse(localStorage.getItem('mathquest.v1.' + store.player().id));

test('9 lit white belt Stars earn the White belt and its badge; 8 do not', () => {
  fresh('challenger', 40);
  lightAll(['from9', 'by11']);
  store.lightStar('times5', 1); store.lightStar('times5', 2);
  let white = gm.beltProgress()[0];
  assert.equal(white.lit, 8); assert.equal(white.earned, false);
  assert.ok(!store.badges()['belt-white']);
  store.lightStar('times5', 3);
  white = gm.beltProgress()[0];
  assert.equal(white.lit, 9); assert.equal(white.done, 9); assert.equal(white.earned, true);
  assert.ok(store.badges()['belt-white'], 'the badge follows the Belt');
  assert.equal(gm.currentBelt().id, 'white');
});

test('a Belt earned by Stars is written to S.belts', () => {
  fresh('pro', 41);
  lightAll(['sq5', 'by9s', 'ends10']);
  assert.ok(saved().belts.yellow > 0);
  assert.ok(store.keptBelts().yellow > 0);
});

test('a kept yellow Belt with 4 lit Stars stays earned', () => {
  fresh('challenger', 42);
  store.keepBelt('yellow');
  lightAll(['sq5']); store.lightStar('by9s', 1);
  const y = gm.beltProgress()[1];
  assert.equal(y.lit, 4); assert.equal(y.earned, true);
  assert.equal(gm.beltProgress()[0].earned, false, 'the white belt is not earned');
});

test('mastering the three Tricks no longer earns a Belt by itself (after the one-time migration)', () => {
  fresh('challenger', 43);
  for (const t of ['from9', 'by11', 'times5']) for (let i = 0; i < 12; i++) store.record('v-' + t, true, false);
  assert.ok(store.mastered('v-from9'));
  assert.equal(gm.beltProgress()[0].earned, false);
});

test('belt badge texts say to light Stars, never to master the tricks', () => {
  const how = id => gm.BADGES.find(b => b.id === id).how;
  assert.match(how('belt-white'), /Light all 9 white belt Stars/);
  assert.match(how('belt-green'), /Earn the green belt/);
  assert.match(how('belt-black'), /Earn the black belt/);
  for (const b of gm.BADGES) assert.doesNotMatch(b.how, /Master the 3/i, b.id);
});

/* Explorer is not offered Stars or Sutra cards (star-round spec), so the Me page lists the badges that need them
   only once earned (openspec explorer-belts) */
test('badgesFor: Explorer is not listed the belt and Sutra scholar badges until earned; Challenger and Pro see every badge', () => {
  const gated = ['belt-white', 'belt-green', 'belt-black', 'sutras'];
  const ids = l => l.map(b => b.id);
  for (const id of gated) assert.deepEqual(gm.BADGES.find(b => b.id === id).modes, ['challenger', 'pro'], id);
  for (const b of gm.BADGES) if (!gated.includes(b.id)) assert.equal(b.modes, undefined, `${b.id} is open to every Mode`);
  const explorer = ids(gm.badgesFor('explorer', {}));
  for (const id of gated) assert.ok(!explorer.includes(id), `${id} not listed to Explorer`);
  assert.equal(explorer.length, gm.BADGES.length - gated.length);
  assert.deepEqual(ids(gm.badgesFor('challenger', {})), ids(gm.BADGES));
  assert.deepEqual(ids(gm.badgesFor('pro', {})), ids(gm.BADGES));
  assert.deepEqual(ids(gm.badgesFor(null, {})), ids(gm.BADGES), 'no Mode yet reads as Challenger');
  // Earned in Challenger, then switched to Explorer: the belt stays listed
  const kept = ids(gm.badgesFor('explorer', { 'belt-white': Date.now() }));
  assert.ok(kept.includes('belt-white') && !kept.includes('belt-green'));
});
