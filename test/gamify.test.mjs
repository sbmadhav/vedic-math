/* Daily quests and badges (gamify.js): progress from a true 0 each day, whole numbers, stable ids,
   a seeded daily pick per Mode, and badges only for finishing or doing something. */
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const mem = { 'vm.sound': '0' };
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
// toast() needs a little DOM; nothing here is rendered
const node = () => ({ classList: { add() {}, toggle() {}, remove() {} }, setAttribute() {}, append() {}, remove() {} });
globalThis.document = { querySelector: () => node(), createElement: node, body: node(), hidden: true };
globalThis.window = globalThis;

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

test('completing a quest adds 25 XP once', () => {
  fresh('challenger', 4);
  const q = answerQuest(), xp0 = store.xp();
  store.bump(q.counter, q.goal);
  assert.equal(store.xp() - xp0, 25);
  assert.equal(answerQuest().done, true);
  store.bump(q.counter, q.goal);
  assert.equal(store.xp() - xp0, 25, 'no more XP for the same quest that day');
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
