import { test, expect, open, cloudLog, chromiumOnly } from '../fixtures';

/* sparks spec, requirement "The weekly Sparks Board":
   - The week of the update: a Player with a weekly XP entry of 800 from before the update who earns 50 Sparks
     after it, in the same week, sees their entry on the same Board rise to 850.
   - Label: covered by e2e/tests/arena.spec.ts:47 (heading "Most Sparks this week", no "XP" in the lobby). */

/* ISO week id like 2026-W42 in local time, the same rule as store.isoWeek / cloud.weekId */
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((+t - +y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
const WK = isoWeek();
const UID = 'e2e-fake-uid';

test.describe('the week of the update', () => {
  // A grown-up Player who may post, with a saved record from before Sparks (schema v2: xp and weekXp)
  test.use({ seedConsent: { age: 'adult' }, seedProgress: { v: 2, xp: 800, weekXp: { [WK]: 800 }, skills: {}, days: {}, best: {}, badges: {}, counts: {}, seen: {} } });

  test('a weekly XP entry of 800 plus 50 Sparks earned after the update posts 850 to the same xp-week Board', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    await page.clock.install();
    await open(page, '#/arena');
    const ids = await page.evaluate(async () => {
      const cloud = await import('/vedic-math/js/cloud.js' as string);
      const store = await import('/vedic-math/js/store.js' as string);
      return { wk: cloud.weekId() as string, board: cloud.weekSparksBoard(cloud.weekId(), 'challenger') as string, week: store.weekSparks() as number };
    });
    test.skip(ids.wk !== WK, 'the ISO week turned over between seeding and loading');
    // The old weekly XP carried over as this week's Sparks
    expect(ids.board).toBe(`xp-week-${WK}-challenger`);
    expect(ids.week).toBe(800);
    expect((await cloudLog(page)).writes).toEqual([]);

    // Earn 50 Sparks after the update
    await page.evaluate(async () => { (await import('/vedic-math/js/store.js' as string)).addSparks(50, 'e2e'); });
    await page.clock.runFor(3_500);
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBe(1);
    const [w] = (await cloudLog(page)).writes;
    expect(w.path).toBe(`boards/xp-week-${WK}-challenger/scores/${UID}`);
    expect(w.data.score).toBe(850);
  });

  test('earning Sparks in the app (sutra cards) raises the carried-over 800 on the same Board', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    await page.clock.install();
    await open(page, '#/sutras');
    const cards = page.locator('.sutra-card .sutra-face');
    await expect(cards.nth(1)).toBeVisible();
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.clock.runFor(3_500);
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBe(1);
    const week = await page.evaluate(async () => (await import('/vedic-math/js/store.js' as string)).weekSparks() as number);
    expect(week).toBeGreaterThanOrEqual(810);
    const [w] = (await cloudLog(page)).writes;
    expect(w.path).toBe(`boards/xp-week-${WK}-challenger/scores/${UID}`);
    expect(w.data.score).toBe(week);
  });
});
