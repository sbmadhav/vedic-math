import { test, expect, open, cloudLog, typeAnswer, showWorld } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec board-identity:
   - "No identity before the first post" / First post: a Player allowed to post finishes their first Ranked
     round, and only then is an anonymous identity created and the Score posted under it.
   - "World boards are readable without sign-in" / Signed-out list query: a signed-out client asks for the
     top 20 entries of today's Arena Board and gets them.
   Everything goes through the fixtures' fake Firebase SDK (never live). The fake signs in the first Player
   (p1, the default Firebase app) as 'e2e-fake-uid'. */

const UID = 'e2e-fake-uid';

const identity = (page: Page) => page.evaluate(() => ({
  uids: localStorage.getItem('vm.cloudUids'),
  legacy: localStorage.getItem('vm.cloudUid'),
  session: localStorage.getItem('e2e.fakeAuth'),
}));
const NO_IDENTITY = { uids: null, legacy: null, session: null };

const ids = (page: Page) => page.evaluate(async () => {
  const cloud = await import('/js/cloud.js' as string);
  return { day: cloud.dayId() as string, wk: cloud.weekId() as string };
});

const ROUNDS_OFF_WEBKIT = "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly";

test.describe('First post', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('finishing the first Ranked Arena round creates an identity and posts the Score under it', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(90_000);
    await page.clock.install();
    await open(page, '#/arena');
    const { day, wk } = await ids(page);
    // Before the round: World boards were read (after Show World board), but nothing signed in and no identity exists
    for (const id of ['#lbDay', '#lbWeek', '#lbSparks']) await showWorld(page, id);
    await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThanOrEqual(3);
    let log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(log.writes).toEqual([]);
    expect(await identity(page)).toEqual(NO_IDENTITY);

    const answer = await page.evaluate(async d => (await import('/js/arena.js' as string)).dailySet('challenger', d)[0].answer, day);
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500); // 3, 2, 1
    await typeAnswer(page, String(answer));
    await page.locator('#arForm button').click();
    await expect(page.locator('#arScore')).toHaveText('10');
    // Mid-round: still no identity
    log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(await identity(page)).toEqual(NO_IDENTITY);

    await page.clock.fastForward(61_000); // the round ends: the first post
    await expect(page.locator('.ar-result')).toBeVisible();
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBe(2);
    log = await cloudLog(page);
    // Exactly one anonymous identity, created now
    expect(log.authLoaded).toBe(true);
    expect(log.signIns).toBe(1);
    expect(JSON.parse((await identity(page)).uids!)).toEqual({ p1: UID });
    // The Score is posted under that identity
    expect(log.writes.map(w => w.path).sort()).toEqual([`boards/daily-${day}-challenger/scores/${UID}`, `boards/week-${wk}-challenger/scores/${UID}`]);
    for (const w of log.writes) expect(w.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 10 });
  });

  test('finishing the first Ranked game round creates an identity and posts the Score under it', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(90_000);
    await page.clock.install();
    await open(page, '#/game/times-sprint');
    const { day, wk } = await ids(page);
    await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
    let log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(await identity(page)).toEqual(NO_IDENTITY);

    await page.locator('#gStart').click();
    const q = (await page.locator('#gArea .g-q').textContent())!.replace(/,/g, '');
    const [x, y] = q.split('×').map(v => Number(v.trim()));
    await page.locator('#gArea .ans-in').fill(String(x * y));
    await page.locator('#gArea .ans-in').press('Enter');
    await expect(page.locator('#gPts')).toHaveText(/^[1-9]/);
    const score = Number((await page.locator('#gPts').textContent())!.replace(/,/g, ''));
    log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(await identity(page)).toEqual(NO_IDENTITY);

    await page.clock.fastForward(61_000); // the 60 second round ends
    await expect(page.locator('.g-result .md-kicker')).toHaveText('Ranked score');
    const gameBoards = [`boards/g_times_sprint-daily-${day}-challenger/scores/${UID}`, `boards/g_times_sprint-week-${wk}-challenger/scores/${UID}`];
    await expect.poll(async () => (await cloudLog(page)).writes.filter(w => w.path.startsWith('boards/g_')).length).toBe(2);
    log = await cloudLog(page);
    expect(log.signIns).toBe(1);
    expect(JSON.parse((await identity(page)).uids!)).toEqual({ p1: UID });
    const posted = log.writes.filter(w => w.path.startsWith('boards/g_'));
    expect(posted.map(w => w.path).sort()).toEqual(gameBoards.sort());
    for (const w of posted) expect(w.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score });
  });
});

/* A Firestore fake for this test only (page routes win over the fixtures' context route): like the fixtures'
   fake, but it records each list query's orderBy and limit and honors the limit, so the test checks what the
   app asks for and what comes back. Auth is never served by this file. */
const ROWS = Array.from({ length: 25 }, (_, i) => [`u${i + 1}`, `Player Name ${String(i + 10)}`, 500 - i * 10] as [string, string, number]);
const QUERY_FAKE = `const C = (globalThis.__e2eCloud ||= { signIns: 0, signOuts: [], apps: [], authLoaded: false, reads: [], writes: [] });
const Q = (globalThis.__e2eQueries ||= []);
const path = parts => parts.filter(p => typeof p === 'string').join('/');
export const getFirestore = app => ({ fake: true, app: app.name });
export const doc = (db, ...p) => ({ path: path(p), app: db.app });
export const collection = (db, ...p) => ({ path: path(p) });
export const orderBy = (f, d) => ({ orderBy: [f, d] });
export const limit = n => ({ limit: n });
export const query = (c, ...q) => ({ path: c.path, q });
export async function getDoc(ref) { C.reads.push(ref.path); return { exists: () => false, data: () => undefined }; }
export async function getDocs(q) {
  C.reads.push(q.path);
  const lim = q.q.find(x => 'limit' in x), ord = q.q.find(x => 'orderBy' in x);
  Q.push({ path: q.path, limit: lim ? lim.limit : null, orderBy: ord ? ord.orderBy : null });
  let rows = (globalThis.__e2eRows || []).slice();
  if (ord) rows.sort((a, b) => ord.orderBy[1] === 'desc' ? b[2] - a[2] : a[2] - b[2]);
  if (lim) rows = rows.slice(0, lim.limit);
  return { docs: rows.map(([id, name, score]) => ({ id, data: () => ({ name, avatar: 'teal', score }) })) };
}
export async function setDoc(ref, data) { C.writes.push({ path: ref.path, app: ref.app, data: JSON.parse(JSON.stringify(data)) }); }
export const serverTimestamp = () => ({ serverTimestamp: true });
export const Timestamp = { fromMillis: ms => ({ millis: ms }) };`;

test.describe('Signed-out list query', () => {
  test.use({ seedConsent: { age: 'adult' } }); // the app shows World boards only to a Player 13 or over
  test('a signed-out client asking for the top 20 entries of today\'s Arena Board gets them', async ({ page }) => {
    await page.route(/\/vendor\/firebase\/[^/]+\/firebase-firestore\.js$/, route =>
      route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: QUERY_FAKE }));
    // Shuffled, so the order on the page comes from the Score ordering
    const shuffled = [...ROWS].reverse();
    await page.addInitScript(rows => { (globalThis as any).__e2eRows = rows; }, shuffled);
    await open(page, '#/arena');
    const { day } = await ids(page);
    const board = `daily-${day}-challenger`;

    // A signed-out client asks for the top 20 of today's Arena Board
    const got = await page.evaluate(async b => (await import('/js/cloud.js' as string)).top(b, 20), board);
    const queries = await page.evaluate(() => (globalThis as any).__e2eQueries as { path: string; limit: number; orderBy: [string, string] }[]);
    const q = queries.filter(x => x.path === `boards/${board}/scores`);
    expect(q.length).toBeGreaterThanOrEqual(1);
    expect(q[q.length - 1]).toEqual({ path: `boards/${board}/scores`, limit: 20, orderBy: ['score', 'desc'] });
    // The entries are returned: the top 20 by Score, with only Nickname, avatar color and Score, nobody "me"
    expect(got).toEqual(ROWS.slice(0, 20).map(([, name, score]) => ({ name, avatar: 'teal', score, me: false })));

    // The Arena's own World board for today shows its top entries too, ordered by Score
    const items = page.locator('#lbDay ol.lb li');
    await showWorld(page, '#lbDay');
    await expect(items).toHaveCount(10);
    for (let i = 0; i < 10; i++) {
      await expect(items.nth(i).locator('.lb-name')).toHaveText(ROWS[i][1]);
      await expect(items.nth(i).locator('b')).toHaveText(ROWS[i][2].toLocaleString('en-US'));
    }
    // Every list query asked for at most 20 entries
    for (const x of await page.evaluate(() => (globalThis as any).__e2eQueries as { limit: number }[])) expect(x.limit).toBeLessThanOrEqual(20);

    // Signed out throughout: Auth never loaded, no sign-in, no identity, nothing written
    const log = await cloudLog(page);
    expect(log.authLoaded).toBe(false);
    expect(log.signIns).toBe(0);
    expect(log.writes).toEqual([]);
    expect(await identity(page)).toEqual(NO_IDENTITY);
  });
});
