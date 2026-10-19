/* cloud.boardScore must send what cloud/firestore.rules accept: Arena boards take an even score up to
   the league cap, Ranked game boards up to 12000 and weekly Sparks boards (id xp-week-...) up to 60000 (any integer). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardScore, MAX_SCORE, MAX_GAME_SCORE, MAX_WEEK_SPARKS, weekSparksBoard } from '../js/cloud.js';

const rules = readFileSync(new URL('../cloud/firestore.rules', import.meta.url), 'utf8');

test('the caps match cloud/firestore.rules', () => {
  assert.match(rules, new RegExp(`kind\\(\\) == 'game' \\? ${MAX_GAME_SCORE} : kind\\(\\) == 'xp' \\? ${MAX_WEEK_SPARKS}`));
  for (const [league, cap] of Object.entries(MAX_SCORE)) assert.match(rules, new RegExp(`'${league}': ${cap}`));
});

test('Arena boards: even, from 10 to the league cap', () => {
  assert.equal(boardScore('daily-2026-10-14-challenger', 121), 120);
  assert.equal(boardScore('week-2026-W42-pro', 5000), 1200);
  assert.equal(boardScore('daily-2026-10-14-explorer', 9999), 2000);
  assert.equal(boardScore('daily-2026-10-14-challenger', 9), 0);
  assert.equal(boardScore('daily-2026-10-14-challenger', 11), 10);
});

test('Ranked game boards: any integer from 10 to 12000, whatever the league', () => {
  assert.equal(boardScore('g_times_sprint-daily-2026-10-14-pro', 1501), 1501);
  assert.equal(boardScore('g_times_sprint-week-2026-W42-challenger', 2500), 2500);
  assert.equal(boardScore('g_rain-daily-2026-10-14-explorer', 20000), 12000);
  assert.equal(boardScore('g_rain-daily-2026-10-14-explorer', 9.4), 0);
});

test('weekly Sparks boards: any integer from 10 to 60000, under the kept xp-week- id', () => {
  assert.equal(weekSparksBoard('2026-W42', 'pro'), 'xp-week-2026-W42-pro');
  assert.equal(boardScore('xp-week-2026-W42-challenger', 15), 15);
  assert.equal(boardScore('xp-week-2026-W42-pro', 4321), 4321);
  assert.equal(boardScore('xp-week-2026-W42-explorer', 70000), 60000);
  assert.equal(boardScore('xp-week-2026-W42-explorer', 5), 0);
});

test('unknown boards take nothing', () => {
  assert.equal(boardScore('daily-2026-10-14-nobody', 500), 0);
});

/* ---------- Posting consent and identity (docs/adr/0001 and 0002) ----------
   The Firebase SDK is swapped for stubs that record which files load and what is read, signed in and written. */
const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location ??= { hostname: 'sbmadhav.com' };
globalThis.self ??= globalThis;
const cloud = await import('../js/cloud.js');
const store = await import('../js/store.js');

/* saved: the Auth sessions Firebase would keep in this browser, by app name. Pass the same object to a later
   stubSdk() to act as a reload; a fresh one is a fresh browser. */
function stubSdk(saved = {}) {
  const log = { files: [], signIns: 0, signOuts: [], deleted: [], apps: [], reads: [], writes: [], saved };
  let n = Object.keys(saved).length;
  const auths = new Map();
  const mods = {
    'firebase-app.js': {
      initializeApp: (cfg, name = '[DEFAULT]') => { log.apps.push(name); return { cfg, name }; },
      deleteApp: async app => { log.deleted.push(app.name); },
    },
    'firebase-app-check.js': { initializeAppCheck: () => ({}), ReCaptchaEnterpriseProvider: class {}, ReCaptchaV3Provider: class {} },
    'firebase-auth.js': {
      getAuth: app => {
        if (!auths.has(app.name)) auths.set(app.name, { app, get currentUser() { return saved[app.name] || null; }, authStateReady: async () => {} });
        return auths.get(app.name);
      },
      signInAnonymously: async a => { log.signIns++; saved[a.app.name] = { uid: 'uid-' + ++n }; },
      signOut: async a => { log.signOuts.push(a.app.name); delete saved[a.app.name]; },
    },
    'firebase-firestore.js': {
      getFirestore: app => ({ app: app.name }), doc: (db, ...p) => ({ path: p.join('/'), app: db.app }), collection: (db, ...p) => ({ path: p.join('/') }),
      orderBy: () => ({}), limit: n => ({ n }), query: c => c,
      getDoc: async ref => { log.reads.push(ref.path); return { exists: () => false }; },
      getDocs: async q => { log.reads.push(q.path); return { docs: log.rows.map(([id, score]) => ({ id, data: () => ({ name: 'Brave Tiger 42', avatar: 'teal', score }) })) }; },
      setDoc: async (ref, data) => { log.writes.push({ path: ref.path, app: ref.app, data }); },
      serverTimestamp: () => 'server-time', Timestamp: { fromMillis: ms => ({ ms }) },
    },
  };
  log.rows = [];
  cloud._setLoader(async url => { const f = url.split('/').pop(); log.files.push(f); return mods[f]; });
  return log;
}
const ENTRY = { name: 'Brave Tiger 42', avatar: 'teal', score: 120 };
const BOARD = `daily-${cloud.dayId()}-challenger`;
const as = (age, parentOk = null) => { store.updatePlayer({ age, parentOk }); };

/* Under 13: Device boards only, in every Mode, whatever an old record or a hand-off says about the retired Parent step
   (openspec change learnvedicmath, posting-consent; ADR 0006) */
test('canPost: no Age answer needs it; under 13 is device-only, Parent step or not; 13 and over and grown-ups may post', () => {
  assert.equal(cloud.canPost({}), 'needs-age');
  assert.equal(cloud.canPost({ age: null }), 'needs-age');
  assert.equal(cloud.canPost({ age: '9' }), 'needs-age');
  for (const age of [4, 9, 12]) {
    assert.equal(cloud.canPost({ age }), 'device-only', `age ${age}`);
    assert.equal(cloud.canPost({ age, parentOk: 1760000000000 }), 'device-only', `age ${age} with an old Parent step`);
    for (const mode of ['explorer', 'challenger', 'pro']) assert.equal(cloud.canPost({ age, mode }), 'device-only', `age ${age} in ${mode}`);
  }
  for (const age of [13, 17, 'adult']) assert.equal(cloud.canPost({ age }), 'ok', `age ${age}`);
});

for (const [label, age, parentOk, reason] of [
  ['no Age answer', undefined, null, 'needs-age'],
  ['under 13', 9, null, 'device-only'],
  ['12 with an old Parent step', 12, Date.now(), 'device-only'],
  ['5 or under', 5, null, 'device-only'],
]) {
  test(`submit refuses (${label}) with nothing loaded, signed in or sent`, async () => {
    const log = stubSdk(); as(age, parentOk);
    assert.deepEqual(await cloud.submit(BOARD, ENTRY), { posted: false, reason });
    assert.deepEqual(log.files, []);
    assert.equal(log.signIns, 0);
    assert.deepEqual(log.writes, []);
  });
}

for (const [label, age, parentOk] of [['13', 13, null], ['a grown-up', 'adult', null]]) {
  test(`submit posts (${label}): signs in once, sends only nickname, color, score and times`, async () => {
    const log = stubSdk(); as(age, parentOk);
    assert.deepEqual(await cloud.submit(BOARD, { ...store.player(), score: 120 }), { posted: true });
    assert.ok(log.files.includes('firebase-auth.js'));
    assert.equal(log.signIns, 1);
    assert.equal(log.writes.length, 1);
    assert.equal(log.writes[0].path, `boards/${BOARD}/scores/uid-1`);
    assert.deepEqual(Object.keys(log.writes[0].data).sort(), ['avatar', 'exp', 'name', 'score', 'ts']);
    assert.ok(!/age|parent/i.test(JSON.stringify(log.writes[0].data)), 'the Age answer and Parent step are never sent');
  });
}

test('a score the board cannot take is refused before the consent check', async () => {
  const log = stubSdk(); as(undefined);
  assert.deepEqual(await cloud.submit(BOARD, { ...ENTRY, score: 4 }), { posted: false, reason: 'low' });
  assert.deepEqual(log.files, []);
});

test('top() reads without Auth: never imports it and never signs in, even with no saved identity', async () => {
  delete mem['vm.cloudUid']; delete mem['vm.cloudUids'];
  const log = stubSdk(); as(undefined);
  log.rows = [['someone', 300], ['uid-1', 200]];
  const rows = await cloud.top(BOARD, 50);
  assert.deepEqual(log.files.sort(), ['firebase-app-check.js', 'firebase-app.js', 'firebase-firestore.js']);
  assert.equal(log.signIns, 0);
  assert.deepEqual(log.reads, [`boards/${BOARD}/scores`]);
  assert.deepEqual(rows.map(r => r.me), [false, false], 'no identity yet: no row is "me"');
  assert.deepEqual(Object.keys(rows[0]).sort(), ['avatar', 'me', 'name', 'score']);
});

test('after the first post, top() marks this device\'s row as "me", still without loading Auth again', async () => {
  delete mem['vm.cloudUid']; delete mem['vm.cloudUids'];
  let log = stubSdk(); as('adult');
  await cloud.submit(BOARD, ENTRY);
  assert.deepEqual(JSON.parse(mem['vm.cloudUids']), { p1: 'uid-1' });
  log = stubSdk(); // a later page load
  log.rows = [['someone', 300], ['uid-1', 200]];
  const rows = await cloud.top(BOARD);
  assert.deepEqual(rows.map(r => r.me), [false, true]);
  assert.ok(!log.files.includes('firebase-auth.js'));
  assert.equal(log.signIns, 0);
});

test('weekly Sparks: an under-13 Player sends nothing, even with an old Parent step; 13 and over, the total posts', async () => {
  let log = stubSdk(); as(10);
  assert.deepEqual(await cloud.postWeekSparks('explorer', 250), { posted: false, reason: 'device-only' });
  assert.deepEqual(log.files, []);
  assert.equal(log.signIns, 0);
  log = stubSdk(); as(10, Date.now());
  assert.deepEqual(await cloud.postWeekSparks('explorer', 250), { posted: false, reason: 'device-only' });
  assert.deepEqual(log.files, []);
  log = stubSdk(); as(undefined);
  assert.deepEqual(await cloud.postWeekSparks('explorer', 250), { posted: false, reason: 'needs-age' });
  assert.deepEqual(log.files, []);
  log = stubSdk(); as(13);
  assert.deepEqual(await cloud.postWeekSparks('explorer', 70000), { posted: true });
  assert.equal(log.writes[0].path, `boards/xp-week-${cloud.weekId()}-explorer/scores/uid-1`);
  assert.equal(log.writes[0].data.score, 60000);
});

/* ---------- One identity per Player (openspec board-identity) ---------- */
const ADULT = { age: 'adult', parentOk: null };
function family() {
  delete mem['vm.cloudUid']; delete mem['vm.cloudUids']; delete mem['vm.cloudForget'];
  store.switchPlayer('p1'); for (const p of [...store.allPlayers()]) if (p.id !== 'p1') store.removePlayer(p.id);
  store.updatePlayer({ ...ADULT, name: 'Swift Tiger 42' });
  const a = store.player(), b = store.addPlayer(); store.updatePlayer({ ...ADULT, name: 'Lucky Otter 17', mode: 'challenger' });
  store.switchPlayer('p1');
  return [a, store.allPlayers().find(p => p.id === b.id)];
}
const settle = () => new Promise(r => setTimeout(r, 0));

test('appNameFor: p1 keeps the default app, every other Player gets their own', () => {
  assert.equal(cloud.appNameFor({ id: 'p1' }), '[DEFAULT]');
  assert.equal(cloud.appNameFor({ id: 'pmf3x9' }), 'vm-pmf3x9');
});

test('two Players get two apps and two sign-ins; the same Player twice signs in once', async () => {
  const [a, b] = family(), log = stubSdk();
  await cloud.submit(BOARD, { ...ENTRY, name: a.name }, a);
  await cloud.submit(BOARD, { ...ENTRY, name: b.name }, b);
  await cloud.submit(`week-${cloud.weekId()}-challenger`, { ...ENTRY, name: b.name, score: 200 }, b);
  assert.equal(log.signIns, 2);
  assert.deepEqual([...new Set(log.apps)].sort(), ['[DEFAULT]', 'vm-' + b.id].sort());
  assert.equal(log.saved['[DEFAULT]'].uid, 'uid-1');
  assert.equal(log.saved['vm-' + b.id].uid, 'uid-2');
  assert.deepEqual(JSON.parse(mem['vm.cloudUids']), { p1: 'uid-1', [b.id]: 'uid-2' });
});

test("a submit for Player B writes only B's entry, through B's app, and never reads or writes A's", async () => {
  const [a, b] = family(), log = stubSdk();
  await cloud.submit(BOARD, { ...ENTRY, name: a.name }, a);
  const aPath = `boards/${BOARD}/scores/uid-1`;
  log.reads.length = 0; log.writes.length = 0;
  assert.deepEqual(await cloud.submit(BOARD, { ...ENTRY, name: b.name, score: 400 }, b), { posted: true });
  assert.deepEqual(log.reads, [`boards/${BOARD}/scores/uid-2`]);
  assert.equal(log.writes.length, 1);
  assert.equal(log.writes[0].path, `boards/${BOARD}/scores/uid-2`);
  assert.equal(log.writes[0].app, 'vm-' + b.id, "B's write goes through B's Firestore, so it carries B's token");
  assert.equal(log.writes[0].data.name, 'Lucky Otter 17');
  assert.ok(![...log.reads, ...log.writes.map(w => w.path)].includes(aPath));
});

test('the consent gate is checked for the Player whose post it is, not the active one', async () => {
  const [, b] = family(), log = stubSdk();
  store.switchPlayer(b.id); store.updatePlayer({ age: 9, parentOk: null }); store.switchPlayer('p1');
  const kid = store.allPlayers().find(p => p.id === b.id);
  assert.deepEqual(await cloud.submit(BOARD, ENTRY, kid), { posted: false, reason: 'device-only' });
  assert.deepEqual(log.files, []);
});

test('a reload keeps each Player\'s own identity: no new sign-in', async () => {
  const [a, b] = family(), saved = {};
  stubSdk(saved);
  await cloud.submit(BOARD, ENTRY, a); await cloud.submit(BOARD, ENTRY, b);
  const log = stubSdk(saved); /* a later page load in the same browser */
  await cloud.submit(`week-${cloud.weekId()}-challenger`, ENTRY, b);
  await cloud.submit(`week-${cloud.weekId()}-challenger`, ENTRY, a);
  assert.equal(log.signIns, 0);
  assert.deepEqual(log.writes.map(w => w.path.split('/').pop()).sort(), ['uid-1', 'uid-2']);
});

test('legacy: a device that posted under the shared identity keeps it for p1, with no new sign-in', async () => {
  const [a, b] = family();
  mem['vm.cloudUid'] = 'old-shared';
  const log = stubSdk({ '[DEFAULT]': { uid: 'old-shared' } });
  log.rows = [['old-shared', 300]];
  assert.deepEqual((await cloud.top(BOARD, 20, a)).map(r => r.me), [true], 'p1 still sees the old entry as "me"');
  assert.deepEqual((await cloud.top(BOARD, 20, b)).map(r => r.me), [false]);
  await cloud.submit(BOARD, ENTRY, a);
  assert.equal(log.signIns, 0);
  assert.equal(log.writes[0].path, `boards/${BOARD}/scores/old-shared`);
  await cloud.submit(BOARD, ENTRY, b);
  assert.equal(log.signIns, 1, 'the second Player gets a new identity');
  assert.notEqual(log.writes[1].path, `boards/${BOARD}/scores/old-shared`);
});

test('top(): "me" marks only the given Player\'s own entry, never initializing Auth', async () => {
  const [a, b] = family();
  stubSdk(); await cloud.submit(BOARD, ENTRY, a); await cloud.submit(BOARD, ENTRY, b);
  const log = stubSdk({});
  log.rows = [['uid-1', 400], ['uid-2', 300], ['someone', 200]];
  assert.deepEqual((await cloud.top(BOARD, 20, a)).map(r => r.me), [true, false, false]);
  assert.deepEqual((await cloud.top(BOARD, 20, b)).map(r => r.me), [false, true, false]);
  const c = store.addPlayer(); store.switchPlayer('p1');
  assert.deepEqual((await cloud.top(BOARD, 20, c)).map(r => r.me), [false, false, false], 'a Player who never posted has no row');
  assert.ok(!log.files.includes('firebase-auth.js'));
  assert.equal(log.signIns, 0);
});

test('a Player who has never posted creates no identity by viewing a board', async () => {
  const [a] = family(), log = stubSdk();
  await cloud.submit(BOARD, ENTRY, a);
  const c = store.addPlayer();
  log.files.length = 0;
  await cloud.top(BOARD, 20, c);
  assert.equal(log.signIns, 1);
  assert.ok(!log.apps.includes('vm-' + c.id));
  store.switchPlayer('p1');
});

test('weekly Sparks post under the identity of the Player passed in', async () => {
  const [, b] = family(), log = stubSdk();
  assert.deepEqual(await cloud.postWeekSparks('challenger', 120, b), { posted: true });
  assert.equal(log.writes[0].app, 'vm-' + b.id);
  assert.equal(log.writes[0].data.name, 'Lucky Otter 17');
  assert.ok(!('[DEFAULT]' in log.saved), 'the active Player (p1) got no identity');
});

test('removing a Player who posted signs them out and deletes their app now; a new Player gets a new identity', async () => {
  const [, b] = family(), saved = {}, log = stubSdk(saved);
  await cloud.submit(BOARD, ENTRY, b);
  store.removePlayer(b.id); await settle(); await settle();
  assert.deepEqual(log.signOuts, ['vm-' + b.id]);
  assert.deepEqual(log.deleted, ['vm-' + b.id]);
  assert.ok(!('vm-' + b.id in saved), 'the saved session is gone from the browser');
  assert.ok(!(b.id in JSON.parse(mem['vm.cloudUids'])));
  const c = store.addPlayer(); store.updatePlayer(ADULT);
  await cloud.submit(BOARD, ENTRY, store.player());
  assert.equal(log.signIns, 2);
  assert.equal(log.writes.at(-1).path, `boards/${BOARD}/scores/uid-2`);
  store.switchPlayer('p1'); store.removePlayer(c.id); await settle();
});

test('removing a Player who posted on an earlier visit loads the SDK (no sign-in) and clears the saved session', async () => {
  const [, b] = family(), saved = {};
  stubSdk(saved); await cloud.submit(BOARD, ENTRY, b);
  const log = stubSdk(saved); /* a later page load */
  store.removePlayer(b.id);
  for (let i = 0; i < 5; i++) await settle();
  assert.equal(log.signIns, 0);
  assert.deepEqual(log.signOuts, ['vm-' + b.id]);
  assert.ok(!('vm-' + b.id in saved));
});

test('removing a Player who never posted loads nothing', async () => {
  const [, b] = family(), log = stubSdk();
  store.removePlayer(b.id); await settle();
  assert.deepEqual(log.files, []);
});

test('if clearing fails (offline), the next post on this device clears the removed Player\'s session', async () => {
  const [a, b] = family(), saved = {};
  stubSdk(saved); await cloud.submit(BOARD, ENTRY, b);
  cloud._setLoader(async () => { throw new Error('offline'); });
  store.removePlayer(b.id);
  for (let i = 0; i < 5; i++) await settle();
  assert.deepEqual(JSON.parse(mem['vm.cloudForget']), [b.id]);
  assert.ok('vm-' + b.id in saved);
  const log = stubSdk(saved);
  await cloud.submit(BOARD, ENTRY, a);
  assert.deepEqual(log.signOuts, ['vm-' + b.id]);
  assert.ok(!('vm-' + b.id in saved));
  assert.deepEqual(JSON.parse(mem['vm.cloudForget']), []);
});

test('if p1 is gone, the shared default identity is signed out at the next post and never reused', async () => {
  const [, b] = family();
  mem['vm.cloudUid'] = 'old-shared';
  const saved = { '[DEFAULT]': { uid: 'old-shared' } };
  cloud._setLoader(async () => { throw new Error('offline'); });
  store.switchPlayer(b.id); store.removePlayer('p1');
  for (let i = 0; i < 5; i++) await settle();
  assert.equal(mem['vm.cloudUid'], undefined);
  const log = stubSdk(saved);
  await cloud.submit(BOARD, ENTRY, store.player());
  assert.ok(log.signOuts.includes('[DEFAULT]'));
  assert.ok(!('[DEFAULT]' in saved));
  assert.ok(!log.writes.some(w => w.path.endsWith('old-shared')));
  assert.equal(log.writes[0].app, 'vm-' + b.id);
});

/* Expired entries are never shown (openspec change learnvedicmath, board-identity "The app's own guard"; task 8.3a) */
test('top() drops a row whose exp has passed, and keeps one whose exp is ahead or missing', async () => {
  const log = stubSdk(); as('adult');
  const ms = Date.now();
  const exp = d => ({ toMillis: () => ms + d * 864e5 });
  log.rows = [['a', 500], ['b', 400], ['c', 300]];
  /* the stub gives every row the same data shape; give each its own exp */
  const getDocs = async () => ({ docs: [['a', 500, exp(-1)], ['b', 400, exp(10)], ['c', 300, undefined]].map(([id, score, e]) => ({ id, data: () => ({ name: 'Brave Tiger 42', avatar: 'teal', score, exp: e }) })) });
  cloud._setLoader(async url => { const f = url.split('/').pop(); if (f === 'firebase-firestore.js') return { getFirestore: () => ({}), collection: () => ({}), orderBy: () => ({}), limit: () => ({}), query: c => c, getDocs }; if (f === 'firebase-app.js') return { initializeApp: (c, n = '[DEFAULT]') => ({ name: n }) }; return { initializeAppCheck: () => ({}), ReCaptchaEnterpriseProvider: class {}, ReCaptchaV3Provider: class {} }; });
  const rows = await cloud.top(BOARD, 20);
  assert.deepEqual(rows.map(r => r.score), [400, 300]);
});

test('canViewWorld: only a Player whose Age answer is 13 or over may see a World board', () => {
  for (const [p, want] of [[{}, false], [{ age: 9 }, false], [{ age: 12, parentOk: 1 }, false], [{ age: 13 }, true], [{ age: 'adult' }, true]])
    assert.equal(cloud.canViewWorld(p), want, JSON.stringify(p));
});
