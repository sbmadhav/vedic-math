import { test, expect, open, heldClock, cloudLog } from '../fixtures';

/* openspec star-round: "Skip a Star / Skip a lit Star" and "Stars are Practice / No post".
   Questions are dealt at random, so each answer is worked out from the n² on screen. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const tag = (page: Page) => page.locator('#stMain .star-tag');

test.describe('Skip a lit Star', () => {
  const LIT_AT = 1760000000000;
  test.use({ seedProgress: { sky: { lit: { 'sq5:1': LIT_AT }, skipped: {}, last: {} } } });

  test('skipping a Star lit earlier leaves it lit with no skipped mark', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await page.locator('#stSkip').click();
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 stays lit');
    await expect(page.locator('.star-end')).toContainText('A lit Star stays lit.');
    await expect(page.locator('.star-end')).toContainText('+0 Sparks');
    const d = await saved(page);
    expect(d.sky.lit['sq5:1']).toBe(LIT_AT);
    expect(d.sky.skipped['sq5:1']).toBeUndefined();
    expect(d.sparks || 0).toBe(0);
    // Everywhere the Star is shown, it is lit and not skipped
    await page.locator('#stBack').click();
    await open(page, '#/dojo');
    await expect(page.locator('.dojo-star[href="#/star/sq5/1"]')).toHaveAttribute('aria-label', 'Square numbers ending in 5: Star 1, lit');
  });

  test.describe('on the Trick page (Pro)', () => {
    test.use({ seedMode: 'pro' });
    test('the skipped lit Star still shows Lit, not Skipped', async ({ page }) => {
      await open(page, '#/star/sq5/1');
      await page.locator('#stSkip').click();
      await expect(page.locator('.star-end-h')).toHaveText('Star 1 stays lit');
      await open(page, '#/skill/v-sq5');
      const first = page.locator('.star-links .star-link').nth(0);
      await expect(first).toHaveClass(/star-link--lit/);
      await expect(first).not.toHaveClass(/star-link--skipped/);
      await expect(first).toContainText('Lit');
      await expect(first).not.toContainText('Skipped');
    });
  });
});

test.describe('No post', () => {
  test.use({ seedConsent: { age: 'adult' } }); // a Player who may post

  test('a finished Star round sends nothing to any World board; only the weekly Sparks total goes out', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/sq5/1');
    for (let i = 1; i <= 4; i++) {
      await expect(tag(page)).toHaveText(`Question ${i} of 4`);
      await page.keyboard.type(await sq(page));
      await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
      await page.clock.runFor(2000);
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    // Let any queued post go out (the weekly Sparks post waits up to 65 seconds)
    await page.clock.runFor(70_000);
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBeLessThanOrEqual(1);
    const writes = (await cloudLog(page)).writes;
    for (const w of writes) {
      // Only the weekly Sparks Board of the Challenger League, with this week's Sparks total
      expect(w.path).toMatch(/^boards\/xp-week-\d{4}-W\d{2}-challenger\/scores\/[^/]+$/);
      expect(w.data.score).toBe(40);
      expect(Object.keys(w.data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']);
    }
    const d = await saved(page);
    expect(d.sparks).toBe(40);
    expect(Object.values(d.weekSparks || {})).toEqual([40]);
    // No Star result anywhere a board reads from: no Score is kept on this device's boards either
    const boards = await page.evaluate(() => Object.keys(localStorage).filter(k => /board/i.test(k)).map(k => [k, localStorage.getItem(k)]));
    for (const [, v] of boards) expect(v || '').not.toMatch(/star/i);
  });
});
