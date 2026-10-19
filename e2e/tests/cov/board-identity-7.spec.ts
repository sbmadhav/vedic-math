import { test, expect, open, cloudLog, type Page } from '../fixtures';

/* openspec board-identity: "Existing shared identity stays with the first Player".
   A device from before Players had their own identity holds the shared id in vm.cloudUid, and its
   Firebase session lives in the default app (the fake SDK keeps sessions in e2e.fakeAuth by app name).
   Posts go through the fake SDK only: writes are recorded in window.__e2eCloud, never sent.
   The post used here is the weekly Sparks total: two Sutra cards give 10 Sparks, posted 3 seconds later. */
const LEGACY = 'legacy-shared-uid-1';
const PB = 'pbcov7', UID_B = `e2e-fake-vm-${PB}`;
const B = { id: PB, name: 'Lucky Otter 17', avatar: 'plum', mode: 'challenger', created: 1, age: 'adult' };

/** Seeds the pre-update shared identity (once, before the page loads), and optionally a second Player. */
async function seedLegacy(page: Page, second: boolean) {
  await page.addInitScript(([uid, b]) => {
    if (localStorage.getItem('e2e.seededLegacy')) return;
    localStorage.setItem('e2e.seededLegacy', '1');
    localStorage.setItem('vm.cloudUid', uid as string);
    localStorage.setItem('e2e.fakeAuth', JSON.stringify({ '[DEFAULT]': uid }));
    if (b) { const P = JSON.parse(localStorage.getItem('vm.players')!); P.list.push(b); localStorage.setItem('vm.players', JSON.stringify(P)); }
  }, [LEGACY, second ? B : null] as const);
}
const weekId = (page: Page) => page.evaluate(async () => (await import('/js/cloud.js' as string)).weekId() as string);
const stored = (page: Page) => page.evaluate(() => ({
  uids: JSON.parse(localStorage.getItem('vm.cloudUids') || '{}') as Record<string, string>,
  legacy: localStorage.getItem('vm.cloudUid'),
  auth: JSON.parse(localStorage.getItem('e2e.fakeAuth') || '{}') as Record<string, string>,
}));
async function earnAndPost(page: Page) {
  await page.locator('.sutra-card .sutra-face').nth(0).click();
  await page.locator('.sutra-card .sutra-face').nth(1).click();
  await page.clock.runFor(3_500);
}

test.describe('existing shared identity stays with the first Player', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('single-Player device: the post after the update is filed under the same identity, and none is created', async ({ page }) => {
    await seedLegacy(page, false);
    await page.clock.install();
    await open(page, '#/sutras');
    const wk = await weekId(page);
    await earnAndPost(page);
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBe(1);
    const log = await cloudLog(page);
    expect(log.writes[0].path).toBe(`boards/xp-week-${wk}-challenger/scores/${LEGACY}`);
    expect(log.writes[0].data).toMatchObject({ name: 'Swift Tiger 42', score: 10 });
    expect(log.signIns).toBe(0); // no new identity
    expect(log.apps.filter(n => n !== '[DEFAULT]')).toEqual([]); // no named app for another identity
    const s = await stored(page);
    expect(s.auth).toEqual({ '[DEFAULT]': LEGACY });
    expect(s.uids).toEqual({ p1: LEGACY });
  });

  test('second Player: their post creates a new identity, and the first Player\'s entries are not changed', async ({ page }) => {
    await seedLegacy(page, true);
    await page.clock.install();
    await open(page, '#/sutras');
    const wk = await weekId(page);
    await page.evaluate(async id => (await import('/js/store.js' as string)).switchPlayer(id), PB);
    await open(page, '#/sutras');
    await earnAndPost(page);
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBe(1);
    const log = await cloudLog(page);
    expect(log.writes[0].path).toBe(`boards/xp-week-${wk}-challenger/scores/${UID_B}`);
    expect(log.writes[0].data).toMatchObject({ name: 'Lucky Otter 17', score: 10 });
    expect(log.writes.some(w => w.path.endsWith('/' + LEGACY))).toBe(false); // nothing written to the first Player's entries
    expect(log.signIns).toBe(1); // one new identity, for the second Player
    expect(log.signOuts).toEqual([]);
    const s = await stored(page);
    expect(s.uids[PB]).toBe(UID_B);
    expect(s.uids[PB]).not.toBe(LEGACY);
    expect(s.legacy).toBe(LEGACY); // the shared identity still belongs to the first Player
    expect(s.auth['[DEFAULT]']).toBe(LEGACY);
    expect(await page.evaluate(async () => {
      const [cloud, store] = await Promise.all([import('/js/cloud.js' as string), import('/js/store.js' as string)]);
      return cloud.savedUid(store.allPlayers().find((p: { id: string }) => p.id === 'p1'));
    })).toBe(LEGACY);
  });
});
