/* cloud.boardScore must send what cloud/firestore.rules accept: Arena boards take an even score up to
   the league cap, Ranked game boards up to 12000 and weekly XP boards up to 60000 (any integer). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardScore, MAX_SCORE, MAX_GAME_SCORE, MAX_WEEK_XP } from '../js/cloud.js';

const rules = readFileSync(new URL('../cloud/firestore.rules', import.meta.url), 'utf8');

test('the caps match cloud/firestore.rules', () => {
  assert.match(rules, new RegExp(`kind\\(\\) == 'game' \\? ${MAX_GAME_SCORE} : kind\\(\\) == 'xp' \\? ${MAX_WEEK_XP}`));
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

test('weekly XP boards: any integer from 10 to 60000', () => {
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

function stubSdk() {
  const log = { files: [], signIns: 0, reads: [], writes: [] };
  const authState = { currentUser: null };
  const mods = {
    'firebase-app.js': { initializeApp: cfg => ({ cfg }) },
    'firebase-app-check.js': { initializeAppCheck: () => ({}), ReCaptchaEnterpriseProvider: class {}, ReCaptchaV3Provider: class {} },
    'firebase-auth.js': {
      getAuth: () => ({ get currentUser() { return authState.currentUser; }, authStateReady: async () => {} }),
      signInAnonymously: async () => { log.signIns++; authState.currentUser = { uid: 'uid-1' }; },
    },
    'firebase-firestore.js': {
      getFirestore: () => ({}), doc: (db, ...p) => ({ path: p.join('/') }), collection: (db, ...p) => ({ path: p.join('/') }),
      orderBy: () => ({}), limit: n => ({ n }), query: c => c,
      getDoc: async ref => { log.reads.push(ref.path); return { exists: () => false }; },
      getDocs: async q => { log.reads.push(q.path); return { docs: log.rows.map(([id, score]) => ({ id, data: () => ({ name: 'Brave Tiger 42', avatar: 'teal', score }) })) }; },
      setDoc: async (ref, data) => { log.writes.push({ path: ref.path, data }); },
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

test('canPost: no Age answer needs it; under 13 needs the Parent step; 13 and over and grown-ups may post', () => {
  assert.equal(cloud.canPost({}), 'needs-age');
  assert.equal(cloud.canPost({ age: null }), 'needs-age');
  assert.equal(cloud.canPost({ age: '9' }), 'needs-age');
  for (const age of [4, 9, 12]) {
    assert.equal(cloud.canPost({ age }), 'needs-parent', `age ${age}`);
    assert.equal(cloud.canPost({ age, parentOk: null }), 'needs-parent', `age ${age}, withdrawn`);
    assert.equal(cloud.canPost({ age, parentOk: 1760000000000 }), 'ok', `age ${age} with the Parent step`);
  }
  for (const age of [13, 17, 'adult']) assert.equal(cloud.canPost({ age }), 'ok', `age ${age}`);
});

for (const [label, age, parentOk, reason] of [
  ['no Age answer', undefined, null, 'needs-age'],
  ['under 13 without the Parent step', 9, null, 'needs-parent'],
  ['12, the step withdrawn', 12, null, 'needs-parent'],
]) {
  test(`submit refuses (${label}) with nothing loaded, signed in or sent`, async () => {
    const log = stubSdk(); as(age, parentOk);
    assert.deepEqual(await cloud.submit(BOARD, ENTRY), { posted: false, reason });
    assert.deepEqual(log.files, []);
    assert.equal(log.signIns, 0);
    assert.deepEqual(log.writes, []);
  });
}

for (const [label, age, parentOk] of [['under 13 with the Parent step', 9, Date.now()], ['13', 13, null], ['a grown-up', 'adult', null]]) {
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
  delete mem['vm.cloudUid'];
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
  delete mem['vm.cloudUid'];
  let log = stubSdk(); as('adult');
  await cloud.submit(BOARD, ENTRY);
  assert.equal(mem['vm.cloudUid'], 'uid-1');
  log = stubSdk(); // a later page load
  log.rows = [['someone', 300], ['uid-1', 200]];
  const rows = await cloud.top(BOARD);
  assert.deepEqual(rows.map(r => r.me), [false, true]);
  assert.ok(!log.files.includes('firebase-auth.js'));
  assert.equal(log.signIns, 0);
});

test('weekly XP: an under-13 Player without the Parent step sends nothing; with it, the total posts', async () => {
  let log = stubSdk(); as(10);
  assert.deepEqual(await cloud.postWeekXP('explorer', 250), { posted: false, reason: 'needs-parent' });
  assert.deepEqual(log.files, []);
  assert.equal(log.signIns, 0);
  log = stubSdk(); as(undefined);
  assert.deepEqual(await cloud.postWeekXP('explorer', 250), { posted: false, reason: 'needs-age' });
  assert.deepEqual(log.files, []);
  log = stubSdk(); as(10, Date.now());
  assert.deepEqual(await cloud.postWeekXP('explorer', 70000), { posted: true });
  assert.equal(log.writes[0].path, `boards/xp-week-${cloud.weekId()}-explorer/scores/uid-1`);
  assert.equal(log.writes[0].data.score, 60000);
});
