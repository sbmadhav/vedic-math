import { test, expect, open, cloudLog, heldClock, showWorld } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec board-identity, "One identity per Player":
   - A second Player who has never posted: Player A has posted, Player B (never posted) opens a World board on
     the same device: no identity is created for B and no sign-in request is made for B.
   - Weekly XP after switching Player: A earns Sparks, the device switches to B before the weekly Sparks total
     is posted, then the post happens: A's total goes under A's identity (or not at all), never under B's.
   Everything goes through the fixtures' fake Firebase SDK. The fake signs in p1 (the default app) as
   'e2e-fake-uid' and any other Player as 'e2e-fake-vm-<id>'; sessions live in e2e.fakeAuth. */

const PB = 'pb5two', A_UID = 'e2e-fake-uid', B_APP = `vm-${PB}`, B_UID = `e2e-fake-vm-${PB}`;
const A_NAME = 'Swift Tiger 42', B_NAME = 'Lucky Otter 17';

/** Adds Player B (adult, so B could post, but never has) to the fixtures' Player A, once per test. */
async function addPlayerB(page: Page, opts: { aPosted: boolean; active: 'p1' | 'b'; bMode?: string }) {
  await page.addInitScript(([pb, bName, aPosted, active, bMode, aUid]) => {
    if (localStorage.getItem('e2e.seeded5')) return;
    localStorage.setItem('e2e.seeded5', '1');
    const P = JSON.parse(localStorage.getItem('vm.players')!);
    P.list.push({ id: pb, name: bName, avatar: 'plum', mode: bMode, created: 1, age: 'adult' });
    if (active === 'b') P.active = pb;
    localStorage.setItem('vm.players', JSON.stringify(P));
    if (aPosted) {
      // A posted on an earlier visit: A's uid saved by the app, A's session kept by the (fake) SDK
      localStorage.setItem('vm.cloudUids', JSON.stringify({ p1: aUid }));
      localStorage.setItem('e2e.fakeAuth', JSON.stringify({ '[DEFAULT]': aUid }));
    }
  }, [PB, B_NAME, opts.aPosted, opts.active, opts.bMode || 'challenger', A_UID] as const);
}

const stored = (page: Page) => page.evaluate(() => ({
  uids: JSON.parse(localStorage.getItem('vm.cloudUids') || '{}') as Record<string, string>,
  auth: JSON.parse(localStorage.getItem('e2e.fakeAuth') || '{}') as Record<string, string>,
  active: JSON.parse(localStorage.getItem('vm.players')!).active as string,
}));

/** World board rows the fake SDK returns: A's entry among others. */
async function seedRows(page: Page) {
  await page.addInitScript(rows => { (globalThis as any).__e2eRows = rows; },
    [[A_UID, A_NAME, 400], ['u2', 'Brave Panda 12', 300], ['u3', 'Calm Heron 5', 200]] as [string, string, number][]);
}

async function expectArenaWorldBoards(page: Page) {
  for (const sel of ['#lbDay', '#lbWeek', '#lbSparks']) {
    const wrap = page.locator(sel);
    await showWorld(page, sel);
    await expect(wrap.locator('ol.lb li')).toHaveCount(3);
    await expect(wrap.locator('ol.lb li .lb-name').first()).toHaveText(A_NAME);
    // B has no identity, so nothing (not even A's row) is marked as B's own
    await expect(wrap.locator('li.me')).toHaveCount(0);
  }
}

async function expectNoIdentityForB(page: Page) {
  const s = await stored(page);
  expect(s.uids[PB]).toBeUndefined();
  expect(s.auth[B_APP]).toBeUndefined();
  const log = await cloudLog(page);
  expect(log.apps).not.toContain(B_APP);
  expect(log.writes.filter(w => w.app === B_APP || w.path.endsWith(B_UID))).toEqual([]);
}

test.describe('One identity per Player: a second Player who has never posted', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('A posted on an earlier visit; B opens the Arena World boards: no sign-in, no identity for B', async ({ page }) => {
    await addPlayerB(page, { aPosted: true, active: 'b' });
    await seedRows(page);
    await open(page, '#/arena');
    expect((await stored(page)).active).toBe(PB);
    await expectArenaWorldBoards(page);
    const log = await cloudLog(page);
    expect(log.reads.length).toBeGreaterThanOrEqual(3);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(log.writes).toEqual([]);
    await expectNoIdentityForB(page);
    // A's identity is untouched
    const s = await stored(page);
    expect(s.uids).toEqual({ p1: A_UID });
    expect(s.auth).toEqual({ '[DEFAULT]': A_UID });
  });

  test('A posts in this page, the device switches to B, B opens a World board: no sign-in for B', async ({ page }) => {
    await addPlayerB(page, { aPosted: false, active: 'p1' });
    await seedRows(page);
    await open(page, '#/me');
    // Player A posts (through the app's only posting path, against the fake SDK)
    const res = await page.evaluate(async () => {
      const cloud = await import('/js/cloud.js' as string);
      return cloud.submit(`daily-${cloud.dayId()}-challenger`, { name: 'Swift Tiger 42', avatar: 'teal', score: 400 });
    });
    expect(res).toEqual({ posted: true });
    let log = await cloudLog(page);
    expect(log.signIns).toBe(1);
    expect(log.writes).toHaveLength(1);
    expect(log.writes[0].path.split('/').pop()).toBe(A_UID);

    // Switch to B on the Me page, then open a World board as B
    await page.locator(`.players [data-switch="${PB}"]`).click();
    await expect(page.locator('.players .player.on')).toContainText(B_NAME);
    await page.evaluate(() => { location.hash = '#/arena'; });
    await expect(page.locator('#lbDay')).toBeVisible();
    await expectArenaWorldBoards(page);

    log = await cloudLog(page);
    expect(log.signIns, 'no sign-in request for B').toBe(1);
    expect(log.writes).toHaveLength(1);
    await expectNoIdentityForB(page);
    expect((await stored(page)).uids).toEqual({ p1: A_UID });
  });
});

/* Earning Sparks: each sutra card opened for the first time is worth 5 Sparks. The weekly Sparks post waits
   3 s after the last Sparks (and at most once a minute), so the switch to B happens while it is pending. */
async function earnSparks(page: Page, cards: number[], pid: string, total: number) {
  await page.evaluate(() => { location.hash = '#/sutras'; });
  await expect(page.locator('.sutra-card .sutra-face').first()).toBeVisible();
  for (const i of cards) await page.locator('.sutra-card .sutra-face').nth(i).click();
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('mathquest.v1.' + id) || '{}').sparks, pid)).toBe(total);
}

async function switchTo(page: Page, id: string, name: string) {
  await page.evaluate(() => { location.hash = '#/me'; });
  await page.locator(`.players [data-switch="${id}"]`).click();
  await expect(page.locator('.players .player.on')).toContainText(name);
  expect((await stored(page)).active).toBe(id);
}

const sparksWrites = (page: Page) => cloudLog(page).then(l => l.writes.filter(w => w.path.startsWith('boards/xp-week-')));

test.describe('One identity per Player: weekly XP after switching Player', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('A earns Sparks, the device switches to B before the post: A\'s total goes under A\'s identity, never B\'s', async ({ page }) => {
    await heldClock(page);
    await addPlayerB(page, { aPosted: false, active: 'p1', bMode: 'pro' });
    await open(page, '#/');
    await earnSparks(page, [0, 1, 2, 3], 'p1', 20);
    // Nothing posted yet: the weekly Sparks post is still waiting
    expect(await sparksWrites(page)).toEqual([]);

    await switchTo(page, PB, B_NAME);
    expect(await sparksWrites(page)).toEqual([]);

    // The post happens now, with B active
    await page.clock.runFor(130_000);
    const wk = await page.evaluate(async () => (await import('/js/cloud.js' as string)).weekId());
    await expect.poll(() => sparksWrites(page)).toHaveLength(1);
    const [w] = await sparksWrites(page);
    // A's total, on A's League board, under A's identity (the default app)
    expect(w.path).toBe(`boards/xp-week-${wk}-challenger/scores/${A_UID}`);
    expect(w.app).toBe('[DEFAULT]');
    expect(w.data).toMatchObject({ name: A_NAME, score: 20 });
    // Never under B's
    const log = await cloudLog(page);
    expect(log.writes.some(x => x.path.endsWith(B_UID) || x.app === B_APP)).toBe(false);
    expect(log.signIns).toBe(1);
    await expectNoIdentityForB(page);
    expect((await stored(page)).uids).toEqual({ p1: A_UID });
  });

  test('A and B both earn Sparks around the switch: each total goes under its own Player\'s identity', async ({ page }) => {
    await heldClock(page);
    await addPlayerB(page, { aPosted: false, active: 'p1', bMode: 'pro' });
    await open(page, '#/');
    await earnSparks(page, [0, 1, 2, 3], 'p1', 20);
    await switchTo(page, PB, B_NAME);
    await earnSparks(page, [0, 1, 2, 3, 4, 5], PB, 30);
    expect(await sparksWrites(page)).toEqual([]);

    await page.clock.runFor(130_000);
    const wk = await page.evaluate(async () => (await import('/js/cloud.js' as string)).weekId());
    await expect.poll(() => sparksWrites(page)).toHaveLength(2);
    const writes = await sparksWrites(page);
    const a = writes.find(w => w.data.name === A_NAME), b = writes.find(w => w.data.name === B_NAME);
    expect(a?.path).toBe(`boards/xp-week-${wk}-challenger/scores/${A_UID}`);
    expect(a?.data.score).toBe(20);
    expect(b?.path).toBe(`boards/xp-week-${wk}-pro/scores/${B_UID}`);
    expect(b?.data.score).toBe(30);
    // A's total is never filed under B's identity, nor B's under A's
    expect(writes.filter(w => w.path.endsWith(B_UID)).map(w => w.data.name)).toEqual([B_NAME]);
    expect(writes.filter(w => w.path.endsWith(A_UID)).map(w => w.data.name)).toEqual([A_NAME]);
  });
});
