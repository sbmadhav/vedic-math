import { test, expect, open, cloudLog, FIREBASE_SDK, showWorld, needsWorldBoards } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec board-identity, Requirement "Removing a Player forgets their identity":
   - Remove a Player who has posted: the new Player gets a new identity at their first post, and the removed
     Player's World board entries are unchanged.
   ("Switching Player changes the highlighted row" is already asserted by e2e/tests/privacy.spec.ts:373.)

   A stateful fake firebase-firestore.js (this page only; a page route wins over the fixtures' context route) keeps
   every setDoc in localStorage (e2e.board) so the Board's entries can be compared before and after the removal.
   Auth stays the fixtures' fake: p1 (default app) gets 'e2e-fake-uid', any other Player 'e2e-fake-vm-<id>'. Posts go
   through cloud.submit with the Player who finished, as app.js sendScore does. Nothing reaches a real backend. */

const STATEFUL_FIRESTORE = `const C = (globalThis.__e2eCloud ||= { signIns: 0, signOuts: [], apps: [], authLoaded: false, reads: [], writes: [] });
const LOAD = () => { try { return JSON.parse(localStorage.getItem('e2e.board')) || {}; } catch (e) { return {}; } };
const STORE = m => { try { localStorage.setItem('e2e.board', JSON.stringify(m)); } catch (e) {} };
const path = parts => parts.filter(p => typeof p === 'string').join('/');
export const getFirestore = app => ({ fake: true, app: app.name });
export const doc = (db, ...p) => ({ path: path(p), app: db.app });
export const collection = (db, ...p) => ({ path: path(p) });
export const orderBy = (f, d) => ({ orderBy: [f, d] });
export const limit = n => ({ limit: n });
export const query = (c, ...q) => ({ path: c.path, q });
export async function getDoc(ref) { C.reads.push(ref.path); const d = LOAD()[ref.path]; return { exists: () => !!d, data: () => d }; }
export async function getDocs(q) {
  C.reads.push(q.path);
  const n = (q.q.find(x => x.limit) || {}).limit || 20;
  const docs = Object.entries(LOAD()).filter(([k]) => k.slice(0, k.lastIndexOf('/')) === q.path)
    .sort((a, b) => b[1].score - a[1].score).slice(0, n)
    .map(([k, d]) => ({ id: k.split('/').pop(), data: () => d }));
  return { docs };
}
export async function setDoc(ref, data) { const m = LOAD(); m[ref.path] = JSON.parse(JSON.stringify(data)); STORE(m); C.writes.push({ path: ref.path, app: ref.app, data: JSON.parse(JSON.stringify(data)) }); }
export const serverTimestamp = () => ({ serverTimestamp: true });
export const Timestamp = { fromMillis: ms => ({ millis: ms }) };`;

async function statefulBoard(page: Page) {
  await page.route(FIREBASE_SDK, route => {
    if (new URL(route.request().url()).pathname.endsWith('/firebase-firestore.js'))
      return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: STATEFUL_FIRESTORE });
    return route.fallback();
  });
}

const PA = 'p1', PB = 'pbcov6';
const UID_A = 'e2e-fake-uid', UID_B = `e2e-fake-vm-${PB}`;
const A = { name: 'Swift Tiger 42', avatar: 'teal' };
const B = { id: PB, name: 'Lucky Otter 17', avatar: 'plum', mode: 'challenger', created: 1, age: 'adult' };

async function seedPlayerB(page: Page) {
  await page.addInitScript(b => {
    if (localStorage.getItem('e2e.seededB6')) return;
    localStorage.setItem('e2e.seededB6', '1');
    const P = JSON.parse(localStorage.getItem('vm.players')!);
    P.list.push(b);
    localStorage.setItem('vm.players', JSON.stringify(P));
  }, B);
}

const dayBoard = (page: Page) => page.evaluate(async () =>
  `daily-${(await import('/js/cloud.js' as string)).dayId()}-challenger`);

/** Switches the device to a Player and posts a Score as them, the way app.js sendScore does. */
const postAs = (page: Page, id: string, board: string, score: number) => page.evaluate(async ([id, board, score]) => {
  const store = await import('/js/store.js' as string);
  const cloud = await import('/js/cloud.js' as string);
  store.switchPlayer(id);
  const p = store.playerById ? store.playerById(id) : store.allPlayers().find((q: any) => q.id === id);
  return cloud.submit(board, { name: p.name, avatar: p.avatar, score }, p);
}, [id, board, score] as const);

/** Every stored doc of a Board, by identity, exactly as written. */
const boardDocs = (page: Page, board: string) => page.evaluate(b => {
  const m = JSON.parse(localStorage.getItem('e2e.board') || '{}');
  const out: Record<string, any> = {};
  for (const [k, d] of Object.entries(m) as [string, any][]) if (k.startsWith(`boards/${b}/scores/`)) out[k.split('/').pop()!] = d;
  return out;
}, board);

const savedUids = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.cloudUids') || '{}'));

/** The fake Auth sessions saved in this browser, by Firebase app name. */
const fakeSessions = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('e2e.fakeAuth') || '{}'));

/** The Arena's Today World board as rendered: [name, score, marked me]. */
async function shownToday(page: Page) {
  await open(page, '#/me');
  await open(page, '#/arena');
  const wrap = page.locator('#lbDay');
  await showWorld(page, '#lbDay');
  await expect(wrap.locator('ol.lb')).toBeVisible();
  return wrap.locator('ol.lb li').evaluateAll(lis => lis.map(li => [
    li.querySelector('.lb-name')!.textContent, li.querySelector('b')!.textContent, li.classList.contains('me'),
  ]));
}

/** Removes a Player from the Me page (accepting the confirm), as a person would. */
async function removeOnMePage(page: Page, id: string) {
  await open(page, '#/me');
  page.once('dialog', d => d.accept());
  await page.locator(`[data-del="${id}"]`).click();
  await expect(page.locator(`[data-del="${id}"]`)).toHaveCount(0);
}

/** Adds a Player with the Me page's "Add a player" button, then gives them a mode and a grown-up Age answer. */
async function addPlayerOnMePage(page: Page) {
  await open(page, '#/me');
  await page.locator('#meAdd').click();
  return page.evaluate(async () => {
    const store = await import('/js/store.js' as string);
    store.updatePlayer({ mode: 'challenger', age: 'adult' });
    const p = store.player();
    return { id: p.id as string, name: p.name as string };
  });
}

test.describe('Removing a Player forgets their identity', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test.beforeEach(async ({ page }) => {
    await statefulBoard(page);
    await seedPlayerB(page);
  });

  test('Remove a Player who has posted: a new Player gets a new identity at their first post, the removed Player\'s entry is unchanged', async ({ page }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    await open(page, '#/arena');
    const board = await dayBoard(page);
    expect(await postAs(page, PA, board, 400)).toEqual({ posted: true });
    expect(await postAs(page, PB, board, 300)).toEqual({ posted: true });
    expect((await savedUids(page))[PB]).toBe(UID_B);
    const before = await boardDocs(page, board);
    expect(Object.keys(before).sort()).toEqual([UID_A, UID_B].sort());

    // A plays again; B, who has posted, is removed
    await postAs(page, PA, board, 10); // only to make A the active Player (lower Score, not posted)
    await removeOnMePage(page, PB);

    // B is signed out and forgotten on this device
    await expect.poll(async () => (await cloudLog(page)).signOuts).toContain(`vm-${PB}`);
    expect((await savedUids(page))[PB]).toBeUndefined();
    expect(await fakeSessions(page)).not.toHaveProperty(`vm-${PB}`);
    // B's entries on the World board are unchanged by the removal
    expect(await boardDocs(page, board)).toEqual(before);

    // A new Player is added: no identity until their first post (WebKit may reload on the route change, which
    // resets the in-page log, so the count is taken after the add; the saved sessions persist across reloads)
    const n = await addPlayerOnMePage(page);
    expect(n.id).not.toBe(PB);
    expect((await savedUids(page))[n.id]).toBeUndefined();
    expect(await fakeSessions(page)).not.toHaveProperty(`vm-${n.id}`);
    const signInsBefore = (await cloudLog(page)).signIns;

    // Their first post creates a new identity, not B's (and not A's)
    const writesBefore = (await cloudLog(page)).writes.length;
    expect(await postAs(page, n.id, board, 200)).toEqual({ posted: true });
    const log = await cloudLog(page);
    expect(log.signIns).toBe(signInsBefore + 1);
    const newUid = (await savedUids(page))[n.id];
    expect(newUid).toBeTruthy();
    expect(newUid).not.toBe(UID_B);
    expect(newUid).not.toBe(UID_A);
    expect(await fakeSessions(page)).toHaveProperty(`vm-${n.id}`, newUid);
    expect(log.writes.slice(writesBefore).map(w => w.path)).toEqual([`boards/${board}/scores/${newUid}`]);

    // The removed Player's entry is still on the Board, exactly as it was
    const after = await boardDocs(page, board);
    expect(after[UID_B]).toEqual(before[UID_B]);
    expect(after[UID_A]).toEqual(before[UID_A]);
    expect(after[newUid]).toMatchObject({ name: n.name, score: 200 });

    // As shown: B's entry stays, and only the new Player's own entry is marked "me"
    expect(await shownToday(page)).toEqual([
      [A.name, '400', false],
      [B.name, '300', false],
      [n.name, '200', true],
    ]);
  });

  test('Remove the first Player after they posted: their default identity is signed out and a new Player gets a new one', async ({ page }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    await open(page, '#/arena');
    const board = await dayBoard(page);
    expect(await postAs(page, PA, board, 400)).toEqual({ posted: true });
    const before = await boardDocs(page, board);
    expect(Object.keys(before)).toEqual([UID_A]);

    // B takes over the device and removes A
    await page.evaluate(async id => (await import('/js/store.js' as string)).switchPlayer(id), PB);
    await removeOnMePage(page, PA);
    await expect.poll(async () => (await cloudLog(page)).signOuts).toContain('[DEFAULT]');
    expect(await fakeSessions(page)).not.toHaveProperty('[DEFAULT]');
    expect((await savedUids(page))[PA]).toBeUndefined();
    expect(await boardDocs(page, board)).toEqual(before);

    const n = await addPlayerOnMePage(page);
    expect((await savedUids(page))[n.id]).toBeUndefined();
    const signInsBefore = (await cloudLog(page)).signIns;
    expect(await postAs(page, n.id, board, 200)).toEqual({ posted: true });
    expect((await cloudLog(page)).signIns).toBe(signInsBefore + 1);
    const newUid = (await savedUids(page))[n.id];
    expect(newUid).toBeTruthy();
    expect(newUid).not.toBe(UID_A);

    const after = await boardDocs(page, board);
    expect(after[UID_A]).toEqual(before[UID_A]);
    expect(await shownToday(page)).toEqual([
      [A.name, '400', false],
      [n.name, '200', true],
    ]);
  });
});
