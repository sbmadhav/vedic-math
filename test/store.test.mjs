/* Posting consent lives on each Player's record on this device: the Age answer (age). Set, read, kept apart per
   Player, and removed with the Player. The Parent step is retired (ADR 0006): nothing writes parentOk any more. */
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: i => Object.keys(mem)[i] ?? null };
const store = await import('../js/store.js');
const saved = () => JSON.parse(mem['vm.players']);

test('a new Player has no Age answer, and nothing can give the retired Parent step', () => {
  assert.equal(store.setParentOk, undefined);
  const p = store.player();
  assert.equal(p.age, undefined);
  assert.equal(p.parentOk, undefined);
});

test('setAge stores a whole number of years or adult, on this device only', () => {
  store.setAge(9);
  assert.equal(store.player().age, 9);
  assert.equal(saved().list[0].age, 9);
  store.setAge('adult');
  assert.equal(store.player().age, 'adult');
  for (const bad of [0, -1, 9.5, '9', null, undefined, 'grown-up', 500]) assert.throws(() => store.setAge(bad), String(bad));
  assert.equal(store.player().age, 'adult');
});

test('each Player keeps their own answer across switches', () => {
  const first = store.player().id;
  store.setAge(8);
  const second = store.addPlayer();
  assert.equal(store.player().id, second.id);
  assert.equal(store.player().age, undefined);
  store.setAge(15);
  store.switchPlayer(first);
  assert.equal(store.player().age, 8);
  store.switchPlayer(second.id);
  assert.equal(store.player().age, 15);
  assert.equal(store.player().parentOk, undefined);
});

test('removing a Player removes their Age answer', () => {
  const gone = store.player().id;
  store.removePlayer(gone);
  assert.ok(!saved().list.some(p => p.id === gone));
  assert.ok(!mem['vm.players'].includes('"age":15'));
  assert.equal(store.allPlayers().length, 1);
  assert.equal(store.player().age, 8);
});

/* Stars (openspec star-round): lit, skipped and the last round's keys, on the device only */
test('a Star is open, then skipped, then lit; lighting clears skipped and skipping a lit Star changes nothing', () => {
  assert.equal(store.starState('sq5', 2), 'open');
  assert.equal(store.skipStar('sq5', 2), true);
  assert.equal(store.starState('sq5', 2), 'skipped');
  assert.equal(store.lightStar('sq5', 2), true);
  assert.equal(store.starState('sq5', 2), 'lit');
  assert.equal(store.load().sky.skipped['sq5:2'], undefined);
  assert.equal(store.skipStar('sq5', 2), false);
  assert.equal(store.starState('sq5', 2), 'lit');
  assert.equal(store.load().sky.skipped['sq5:2'], undefined);
  assert.equal(store.lightStar('sq5', 2), false, 'already lit');
});

test('the last round keys are kept per Star, and exportData includes the sky', () => {
  store.setStarLast('sq5', 1, ['3:1', '5:0']);
  assert.deepEqual(store.starLast('sq5', 1), ['3:1', '5:0']);
  assert.deepEqual(store.starLast('sq5', 3), []);
  const out = JSON.parse(store.exportData());
  assert.ok(out.data.sky.lit['sq5:2']);
  assert.deepEqual(out.data.sky.last['sq5:1'], ['3:1', '5:0']);
});

test('record(..., { sparks: false }) updates counts and mastery and emits no sparks event', () => {
  const seen = [], off = store.on(type => seen.push(type));
  const before = store.sparks(), answers = store.load().counts.answers || 0, n = store.skill('v-sq5').n;
  const r = store.record('v-sq5', true, false, { sparks: false });
  off();
  assert.equal(r.gain, 0);
  assert.equal(store.sparks(), before);
  assert.equal(store.load().counts.answers, answers + 1);
  assert.equal(store.skill('v-sq5').n, n + 1);
  assert.ok(store.mastery('v-sq5') > 0);
  assert.ok(seen.includes('answer') && !seen.includes('sparks'), seen.join());
  store.record('v-sq5', true, false);
  assert.ok(store.sparks() > before, 'the default still pays Practice Sparks');
});

/* ---------- sky-home: the Sky switch, kept Belts, Star states, one-time upgrades ---------- */
test('the Sky switch is stored on each Player record, apart per Player', () => {
  const a = store.player().id;
  store.updatePlayer({ sky: true });
  assert.equal(saved().list.find(p => p.id === a).sky, true);
  const b = store.addPlayer();
  assert.equal(store.player().sky, undefined, 'a new Player has not turned it on');
  store.switchPlayer(a);
  assert.equal(store.player().sky, true);
  store.updatePlayer({ sky: false });
  assert.equal(saved().list.find(p => p.id === a).sky, false);
  store.removePlayer(b.id);
});

test('keepBelt keeps a Belt once (with when), and keptBelts returns a copy', () => {
  const seen = [], off = store.on((type, d) => seen.push([type, d]));
  assert.equal(store.keepBelt('green'), true);
  assert.equal(store.keepBelt('green'), false);
  off();
  assert.deepEqual(seen, [['belt', 'green']]);
  const k = store.keptBelts(); k.black = 1;
  assert.equal(store.keptBelts().black, undefined);
  assert.ok(store.keptBelts().green > 0);
});

test('starStates returns copies of the lit and skipped Stars', () => {
  store.skipStar('by11', 3);
  const st = store.starStates();
  assert.ok(st.skipped['by11:3']);
  st.lit['zero-sum:3'] = 1;
  assert.equal(store.starState('zero-sum', 3), 'open');
});

test('upgrade(fn) saves only when fn changed the record, and importData tells listeners', () => {
  assert.equal(store.upgrade(S => { S.e2eFlag = 1; return true; }), true);
  assert.equal(JSON.parse(mem['mathquest.v1.' + store.player().id]).e2eFlag, 1);
  assert.equal(store.upgrade(() => false), false);
  const seen = [], off = store.on(type => seen.push(type));
  store.importData(JSON.stringify({ data: { skills: {} } }));
  off();
  assert.ok(seen.includes('import'));
});

test('removing a Player also forgets their play-experience progress (vm.play.<id>.*), and only theirs', () => {
  const keep = store.player().id, b = store.addPlayer();
  mem[`vm.play.${b.id}.daily`] = '{"x":1}'; mem[`vm.play.${b.id}.wall`] = '[]'; mem[`vm.play.${keep}.daily`] = '{"y":2}';
  store.switchPlayer(keep); store.removePlayer(b.id);
  assert.equal(mem[`vm.play.${b.id}.daily`], undefined);
  assert.equal(mem[`vm.play.${b.id}.wall`], undefined);
  assert.equal(mem[`vm.play.${keep}.daily`], '{"y":2}');
});

test('importData keeps a backup round trip and drops markup and non-numbers from a restored record', () => {
  store.addSparks(40); store.setBest('run-1', 12); store.lightStar('by11', 1); store.setStarLast('by11', 1, ['a', 'b']);
  const before = JSON.parse(store.exportData()).data;
  store.importData(store.exportData());
  const after = JSON.parse(store.exportData()).data;
  for (const f of ['sparks', 'best', 'skills', 'days', 'medals', 'katasDone', 'weekSparks', 'sky', 'questDay']) assert.deepEqual(after[f], before[f], f);
  const day = store.today(), x = '<img src=x onerror=alert(1)>';
  store.importData(JSON.stringify({ data: {
    skills: { 'mul-11': { n: 3, c: x, m: 0.5 }, [x]: { n: 1 } }, sparks: x, best: { 'run-1': x, ['arena-' + day]: '9', 'run-2': 7, [x]: 1 },
    last: x, grade: x, counts: { answers: Infinity, right: -3, runs: 2 }, questDay: { day: x, base: {}, done: {} },
    sky: { lit: { 'by11:1': x }, skipped: {}, last: { 'by11:1': ['ok', x, 3] } }, evil: x,
  } }));
  const d = JSON.parse(store.exportData()).data;
  assert.equal(store.sparks(), 0);
  assert.equal(store.best('run-1'), 0);
  assert.equal(store.best('arena-' + day), 0);
  assert.equal(store.best('run-2'), 7);
  assert.deepEqual(d.skills, { 'mul-11': { n: 3, m: 0.5 } });
  assert.equal(d.last, null); assert.equal(d.grade, null); assert.equal(d.questDay, null); assert.equal(d.evil, undefined);
  assert.deepEqual(d.counts, { runs: 2 });
  assert.deepEqual(d.sky, { lit: {}, skipped: {}, last: { 'by11:1': ['ok'] } });
  assert.ok(!store.exportData().includes('<img'));
});

test('importData refuses a backup whose skills are null or a list, and keeps the progress it had', () => {
  store.importData(JSON.stringify({ data: { skills: {}, sparks: 55 } }));
  for (const skills of [null, [], 'x']) assert.throws(() => store.importData(JSON.stringify({ data: { skills, sparks: 1 } })), String(skills));
  assert.throws(() => store.importData('[]'));
  assert.equal(store.sparks(), 55);
});

/* Mode guess (openspec first-visit): Try a trick marks the Mode as a guess; any pick, or forgetting the Mode, clears it */
test('setPlayerMode marks a guess only when asked, and a pick or null clears it', () => {
  store.setPlayerMode('challenger', { guess: true });
  assert.equal(store.player().mode, 'challenger');
  assert.equal(store.modeGuessed(), true);
  assert.equal(saved().list.find(p => p.id === store.player().id).modeGuess, true);
  store.setPlayerMode('pro');
  assert.equal(store.player().mode, 'pro');
  assert.equal(store.modeGuessed(), false);
  assert.ok(!('modeGuess' in saved().list.find(p => p.id === store.player().id)), 'the field is removed, not set to false');
  store.setPlayerMode('challenger', { guess: true });
  store.setPlayerMode(null);
  assert.equal(store.player().mode, null);
  assert.equal(store.modeGuessed(), false);
});
