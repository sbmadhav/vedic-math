/* Posting consent lives on each Player's record on this device: the Age answer (age). Set, read, kept apart per
   Player, and removed with the Player. The Parent step is retired (ADR 0006): nothing writes parentOk any more. */
import test from './support/node-test.mjs';
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
  const rec = JSON.parse(store.exportData()).records[store.player().id];
  assert.ok(rec.sky.lit['sq5:2']);
  assert.deepEqual(rec.sky.last['sq5:1'], ['3:1', '5:0']);
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

/* The active Player's record as the backup code carries it */
const mine = () => JSON.parse(store.exportData()).records[store.player().id];
test('importData keeps a backup round trip and drops markup and non-numbers from an old single-Player code', () => {
  store.addSparks(40); store.setBest('run-1', 12); store.lightStar('by11', 1); store.setStarLast('by11', 1, ['a', 'b']);
  const before = mine();
  store.importData(store.exportData());
  const after = mine();
  for (const f of ['sparks', 'best', 'skills', 'days', 'medals', 'katasDone', 'weekSparks', 'sky', 'questDay']) assert.deepEqual(after[f], before[f], f);
  const day = store.today(), x = '<img src=x onerror=alert(1)>';
  store.importData(JSON.stringify({ data: {
    skills: { 'mul-11': { n: 3, c: x, m: 0.5 }, [x]: { n: 1 } }, sparks: x, best: { 'run-1': x, ['arena-' + day]: '9', 'run-2': 7, [x]: 1 },
    last: x, grade: x, counts: { answers: Infinity, right: -3, runs: 2 }, questDay: { day: x, base: {}, done: {} },
    sky: { lit: { 'by11:1': x }, skipped: {}, last: { 'by11:1': ['ok', x, 3] } }, evil: x,
  } }));
  const d = mine();
  assert.equal(store.sparks(), 0);
  assert.equal(store.best('run-1'), 0);
  assert.equal(store.best('arena-' + day), 0);
  assert.equal(store.best('run-2'), 7);
  assert.deepEqual(d.skills, { 'mul-11': { n: 3, m: 0.5 } });
  assert.equal(d.last ?? null, null); assert.equal(d.grade ?? null, null); assert.equal(d.questDay ?? null, null); assert.equal(d.evil, undefined);
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

/* ---------- Backup code for every Player (openspec change learnvedicmath, progress-handoff spec; task 10.3) ---------- */
test('the backup code holds every Player in the hand-off payload format, and a round trip brings them all back', () => {
  const a = store.player().id, had = store.sparks();
  store.addSparks(30);
  const b = store.addPlayer(); store.addSparks(70); mem[`vm.play.${b.id}.daily`] = '{"day":"2026-10-23","done":2}';
  const c = store.addPlayer(); store.setAge(9); store.setBest('run-1', 5);
  mem.theme = 'dark'; mem['vm.calm'] = '1'; mem['vm.cloudUids'] = JSON.stringify({ [a]: 'uid-secret' }); mem['vm.board'] = '[{"board":"x","pid":"p1","score":1}]';
  const text = store.exportData(), code = JSON.parse(text);
  assert.equal(code.v, 1);
  assert.equal(code.from, 'learnvedicmath.com');
  assert.deepEqual(code.players.list.map(p => p.id), [a, b.id, c.id]);
  assert.equal(code.players.active, c.id);
  assert.equal(code.players.list[2].age, 9);
  assert.equal(code.records[a].sparks, had + 30); assert.equal(code.records[b.id].sparks, 70); assert.equal(code.records[c.id].best['run-1'], 5);
  assert.deepEqual(code.play, { [b.id]: { daily: { day: '2026-10-23', done: 2 } } });
  assert.deepEqual(code.settings, { theme: 'dark', 'vm.calm': '1' });
  assert.ok(!text.includes('uid-secret') && !text.includes('"board"'), 'World board identities and the Device board stay behind');
  // Lose two Players and reset the third, then restore: every Player, their progress, play records and settings are back
  store.switchPlayer(a); store.removePlayer(b.id); store.removePlayer(c.id); store.reset(); delete mem.theme; delete mem['vm.cloudUids'];
  assert.equal(store.allPlayers().length, 1); assert.equal(store.sparks(), 0); assert.equal(mem[`vm.play.${b.id}.daily`], undefined);
  const seen = [], off = store.on(t => seen.push(t));
  store.importData(text);
  off();
  assert.ok(seen.includes('import') && seen.includes('player'));
  assert.deepEqual(store.allPlayers().map(p => p.id), [a, b.id, c.id]);
  assert.equal(store.player().id, c.id, 'the code\'s active Player is playing');
  assert.equal(store.player().age, 9);
  store.switchPlayer(b.id); assert.equal(store.sparks(), 70);
  store.switchPlayer(a); assert.equal(store.sparks(), had + 30);
  assert.equal(mem[`vm.play.${b.id}.daily`], '{"day":"2026-10-23","done":2}');
  assert.equal(mem.theme, 'dark');
  assert.equal(mem['vm.board'], undefined, 'the Device board starts fresh');
  assert.equal(mem['vm.migratedAt'], undefined, 'a restore is not a move from the old site');
});

test('Keep both adds the code\'s Players next to this device\'s under new ids, and this device\'s settings win', () => {
  const text = store.exportData(), before = store.allPlayers().map(p => p.id);
  mem.theme = 'light';
  store.importData(text, 'both');
  const ids = store.allPlayers().map(p => p.id);
  assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6);
  assert.deepEqual(ids.slice(0, 3), before, 'this device\'s Players stay as they were');
  assert.equal(JSON.parse(mem['mathquest.v1.' + ids[4]]).sparks, 70, 'the copy keeps its own progress');
  assert.equal(JSON.parse(mem['mathquest.v1.' + before[1]]).sparks, 70);
  assert.equal(mem.theme, 'light');
});

test('Restore refuses a code the schema does not match, and nothing changes: unknown keys, a wrong version, another source, markup, too many Players, oversize', () => {
  const good = JSON.parse(store.exportData()), p0 = good.players.list[0], snapshot = JSON.stringify(mem);
  const bad = [
    ['an unknown key', { ...good, extra: 1 }],
    ['an unknown record field', { ...good, records: { ...good.records, [p0.id]: { ...good.records[p0.id], evil: 1 } } }],
    ['an unknown Player field', { ...good, players: { ...good.players, list: [{ ...p0, parentOk: 1 }, ...good.players.list.slice(1)] } }],
    ['a wrong version', { ...good, v: 2 }],
    ['another source', { ...good, from: 'evil.example' }],
    ['markup in a Nickname', { ...good, players: { ...good.players, list: [{ ...p0, name: '<img src=x onerror=alert(1)>' }, ...good.players.list.slice(1)] } }],
    ['too many Players', { ...good, players: { active: 'p1', list: Array.from({ length: 13 }, (_, i) => ({ ...p0, id: 'p' + (i + 1).toString(36) })) }, records: {}, play: undefined }],
    ['a record over the cap', { ...good, records: { ...good.records, [p0.id]: { ...good.records[p0.id], seen: Object.fromEntries(Array.from({ length: 5001 }, (_, i) => ['tip' + i, 1])) } } }],
  ];
  for (const [why, code] of bad) assert.throws(() => store.importData(JSON.stringify(code)), why);
  assert.throws(() => store.importData(JSON.stringify(good).padEnd(300 * 1024, ' ')), 'oversize text');
  for (const txt of ['not a code', '"text"', '[]', 'null', JSON.stringify({ data: { skills: null } })]) assert.throws(() => store.importData(txt), txt);
  assert.equal(JSON.stringify(mem), snapshot);
});

test('exportData makes no code that Restore would refuse: more Players than the cap, or more text than it reads', () => {
  const snapshot = JSON.stringify(mem), active = store.player().id;
  const extra = [];
  while (store.allPlayers().length <= store.MAX_PLAYERS) extra.push(store.addPlayer().id);
  assert.equal(store.allPlayers().length, store.MAX_PLAYERS + 1);
  assert.throws(() => store.exportData(), /too many Players/);
  for (const id of extra) store.removePlayer(id);
  store.switchPlayer(active);
  assert.equal(JSON.stringify(mem), snapshot, 'the Players added for the test are gone again');
  assert.doesNotThrow(() => store.exportData());
  const seen = Object.fromEntries(Array.from({ length: 4000 }, (_, i) => ['tip-' + i + '-' + 'x'.repeat(80), 1_700_000_000_000]));
  mem['mathquest.v1.' + active] = JSON.stringify({ ...JSON.parse(mem['mathquest.v1.' + active]), seen });
  assert.throws(() => store.exportData(), /too big/);
  mem['mathquest.v1.' + active] = JSON.stringify({ ...JSON.parse(mem['mathquest.v1.' + active]), seen: {} });
  assert.doesNotThrow(() => store.exportData());
});

test('readBackup checks a code without writing: an old single-Player code becomes one cleaned Player, a hand-off from sbmadhav.com is accepted, and restoreOffer says what the prompt needs', () => {
  const snapshot = JSON.stringify(mem);
  const p = store.readBackup(JSON.stringify({ player: { id: 'pzz', name: 'Bold Yak 55', avatar: 'plum', mode: 'pro', parentOk: 1, sky: true }, data: { skills: {}, sparks: 12, best: { bolt: '<b>' } } }));
  assert.deepEqual(p.players.list, [{ id: 'pzz', name: 'Bold Yak 55', avatar: 'plum', mode: 'pro', created: p.players.list[0].created }], 'the retired Parent step and unknown fields stay behind');
  assert.equal(p.records.pzz.sparks, 12); assert.deepEqual(p.records.pzz.best, {});
  assert.equal(p.from, 'learnvedicmath.com');
  const bare = store.readBackup(JSON.stringify({ skills: {}, sparks: 3 }));
  assert.equal(bare.players.list[0].id, store.player().id, 'a code that names no Player restores into the Player who pastes it');
  assert.equal(bare.players.list[0].name, store.player().name);
  assert.equal(bare.records[store.player().id].sparks, 3);
  const moved = store.readBackup(JSON.stringify({ ...JSON.parse(store.exportData()), from: 'sbmadhav.com' }));
  assert.equal(moved.from, 'sbmadhav.com');
  assert.equal(JSON.stringify(mem), snapshot, 'reading writes nothing');
  assert.deepEqual(store.restoreOffer(p), { has: true, names: store.allPlayers().map(q => q.name), both: true });
  assert.equal(store.restoreOffer(moved).both, true, '6 Players here plus 6 more is the cap, 12');
  const seven = { ...moved, players: { ...moved.players, list: [...moved.players.list, { ...moved.players.list[0], id: 'pextra' }] } };
  assert.equal(store.restoreOffer(store.readBackup(JSON.stringify(seven))).both, false, '6 here plus 7 is over the cap');
});
