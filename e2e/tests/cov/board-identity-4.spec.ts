import { test, expect, open, cloudLog, FIREBASE_SDK } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec board-identity, Requirement "One identity per Player":
   - Two Players on one device post to the same Board
   - A higher Score from one Player never replaces another Player's entry

   The fixtures' fake Firestore forgets every write (getDoc never finds a doc, getDocs returns __e2eRows). To see what
   a Board would hold, this file serves its own fake firebase-firestore.js for this page only (a page route wins over
   the fixtures' context route): it keeps every setDoc in localStorage (e2e.board, so it survives navigation), answers
   getDoc / getDocs from it like Firestore would (one doc per path, ordered by score), and still records reads and
   writes in window.__e2eCloud. Auth stays the fixtures' fake: the first Player (p1, default app) gets
   'e2e-fake-uid', any other Player 'e2e-fake-vm-<id>'. Posts go through cloud.submit with the Player who finished,
   exactly as app.js sendScore does. Nothing reaches a real backend (the fixtures fail the test if it does). */

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

const PA = 'p1', PB = 'pbcov4';
const UID_A = 'e2e-fake-uid', UID_B = `e2e-fake-vm-${PB}`;
const A = { name: 'Swift Tiger 42', avatar: 'teal' };
const B = { id: PB, name: 'Lucky Otter 17', avatar: 'plum', mode: 'challenger', created: 1, age: 'adult' };

/** Adds Player B (a grown-up Challenger) to the seeded device once, before the page loads. */
async function seedPlayerB(page: Page) {
  await page.addInitScript(b => {
    if (localStorage.getItem('e2e.seededB')) return;
    localStorage.setItem('e2e.seededB', '1');
    const P = JSON.parse(localStorage.getItem('vm.players')!);
    P.list.push(b);
    localStorage.setItem('vm.players', JSON.stringify(P));
  }, B);
}

/** Today's Arena Board for the Challenger League. */
const dayBoard = (page: Page) => page.evaluate(async () =>
  `daily-${(await import('/js/cloud.js' as string)).dayId()}-challenger`);

/** Switches the device to a Player and posts a Score as them, the way app.js sendScore does. */
const postAs = (page: Page, id: string, board: string, score: number) => page.evaluate(async ([id, board, score]) => {
  const store = await import('/js/store.js' as string);
  const cloud = await import('/js/cloud.js' as string);
  store.switchPlayer(id);
  const p = store.playerById(id);
  return cloud.submit(board, { name: p.name, avatar: p.avatar, score }, p);
}, [id, board, score] as const);

/** What the Board holds, by identity. */
const boardDocs = (page: Page, board: string) => page.evaluate(b => {
  const m = JSON.parse(localStorage.getItem('e2e.board') || '{}');
  const out: Record<string, { name: string; avatar: string; score: number }> = {};
  for (const [k, d] of Object.entries(m) as [string, any][]) if (k.startsWith(`boards/${b}/scores/`)) out[k.split('/').pop()!] = { name: d.name, avatar: d.avatar, score: d.score };
  return out;
}, board);

/** The Arena's Today World board as rendered: [name, avatar class, score]. */
async function shownToday(page: Page) {
  await open(page, '#/me'); // a fresh route, so the Arena view loads its boards again
  await open(page, '#/arena');
  const wrap = page.locator('#lbDay');
  await expect(wrap.locator('[data-src="world"]')).toHaveAttribute('aria-selected', 'true');
  await expect(wrap.locator('ol.lb')).toBeVisible();
  return wrap.locator('ol.lb li').evaluateAll(lis => lis.map(li => [
    li.querySelector('.lb-name')!.textContent,
    [...li.querySelector('.av')!.classList].find(c => c.startsWith('av-')),
    li.querySelector('b')!.textContent,
  ]));
}

test.describe('One identity per Player', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test.beforeEach(async ({ page }) => {
    await statefulBoard(page);
    await seedPlayerB(page);
  });

  test('Two Players on one device post to the same Board: two entries, A 400 and B 300, each with its own Nickname and avatar', async ({ page }) => {
    await open(page, '#/arena');
    const board = await dayBoard(page);

    expect(await postAs(page, PA, board, 400)).toEqual({ posted: true });
    expect(await postAs(page, PB, board, 300)).toEqual({ posted: true });

    // The Board holds two entries, one per Player's own identity
    expect(await boardDocs(page, board)).toEqual({
      [UID_A]: { ...A, score: 400 },
      [UID_B]: { name: B.name, avatar: B.avatar, score: 300 },
    });
    const log = await cloudLog(page);
    expect(log.signIns).toBe(2); // one identity per Player, each created at that Player's first post
    expect(log.writes.map(w => w.path).sort()).toEqual([`boards/${board}/scores/${UID_A}`, `boards/${board}/scores/${UID_B}`].sort());

    // As shown on the World board: two rows, each Player's own Nickname and avatar
    expect(await shownToday(page)).toEqual([
      [A.name, `av-${A.avatar}`, '400'],
      [B.name, `av-${B.avatar}`, '300'],
    ]);
  });

  test('A higher Score from one Player never replaces another Player\'s entry', async ({ page }) => {
    await open(page, '#/arena');
    const board = await dayBoard(page);

    expect(await postAs(page, PA, board, 400)).toEqual({ posted: true });
    const before = (await boardDocs(page, board))[UID_A];
    expect(before).toEqual({ ...A, score: 400 });
    const writesBefore = (await cloudLog(page)).writes.length;

    // Player B posts a higher Score to the same Board
    expect(await postAs(page, PB, board, 600)).toEqual({ posted: true });

    // Player A's entry is unchanged, and B's post wrote only B's own entry
    const after = await boardDocs(page, board);
    expect(after[UID_A]).toEqual(before);
    expect(after[UID_B]).toEqual({ name: B.name, avatar: B.avatar, score: 600 });
    const newWrites = (await cloudLog(page)).writes.slice(writesBefore);
    expect(newWrites.map(w => w.path)).toEqual([`boards/${board}/scores/${UID_B}`]);

    // On the World board A still has an entry with 400, below B's 600
    expect(await shownToday(page)).toEqual([
      [B.name, `av-${B.avatar}`, '600'],
      [A.name, `av-${A.avatar}`, '400'],
    ]);
  });
});
