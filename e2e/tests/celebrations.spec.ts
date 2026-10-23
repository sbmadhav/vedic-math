import { test, expect, APP, open } from './fixtures';

/* Celebrations (openspec celebrations): the big confetti is only for true wins, such as a Star lit; everyday moments
   (picking a Mode, a right answer) get a small one, such as a card pop and a few sparkles. Nothing moves under reduced
   motion, Pause motion or Calm, and the screen that follows still comes. */
type Page = import('@playwright/test').Page;

/* Counts every confetti canvas and sparkle layer the page adds, however short-lived */
async function watchFx(page: Page) {
  await page.addInitScript(() => {
    const seen = ((globalThis as any).__fx = { confetti: 0, sparkles: 0 });
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      const c = (n as Element).classList; if (!c) return;
      if (c.contains('fx-confetti')) seen.confetti++;
      if (c.contains('fx-sparkles')) seen.sparkles++;
    }))).observe(document, { childList: true, subtree: true });
  });
}
const fx = (page: Page): Promise<{ confetti: number; sparkles: number }> => page.evaluate(() => (globalThis as any).__fx);

/* Square numbers ending in 5: every question is n² */
const sq = async (page: Page) => { const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]); return String(n * n); };
async function lightStar(page: Page, afterFirst?: () => Promise<void>) {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    if (i === 1 && afterFirst) await afterFirst();
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
}

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test.describe('picking a Mode', () => {
    test.use({ seedMode: null });
    test('is everyday: the card pops, a few sparkles fly, the family cheers, Home opens, and there is no big confetti', async ({ page }) => {
      await watchFx(page);
      await page.goto(APP);
      const card = page.locator('.mode-card[data-mode="challenger"]');
      await card.click();
      await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
      await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
      expect((await fx(page)).confetti).toBe(0);
      await expect(page.locator('.fx-sparkles')).toHaveCount(0); // they clean up after themselves
    });
  });

  test('a right answer in a Star twinkles with a few sparkles; lighting the Star is a true win with the big confetti', async ({ page }) => {
    await watchFx(page);
    await lightStar(page, async () => {
      await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
      expect((await fx(page)).confetti).toBe(0);
    });
    await expect.poll(async () => (await fx(page)).confetti).toBeGreaterThanOrEqual(1);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 5000 }); // the burst ends and removes itself
  });

  test('turning on Pause motion stops the big confetti at once', async ({ page }) => {
    await watchFx(page);
    await lightStar(page);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(1);
    // What the Pause motion switch does (fx.setMotionPaused): the class on <html> and the sitemotion event
    await page.evaluate(() => { document.documentElement.classList.add('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } })); });
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 500 });
  });
});

/* No motion: the same three sources (openspec calm "Calm stops motion", accessibility) */
const STILL = [
  ['reduced motion', { reducedMotion: 'reduce' as const }, null],
  ['Pause motion', { reducedMotion: 'no-preference' as const }, 'motion-paused'],
  ['Calm', { reducedMotion: 'no-preference' as const }, 'vm.calm'],
] as const;
for (const [name, use, key] of STILL) {
  test.describe(name, () => {
    test.use(use);
    test.beforeEach(async ({ page }) => {
      if (key) await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await watchFx(page);
    });

    test.describe('picking a Mode', () => {
      test.use({ seedMode: null });
      test('opens Home at once with no sparkles, no confetti and nothing moving', async ({ page }) => {
        await page.goto(APP);
        await page.locator('.mode-card[data-mode="pro"]').click();
        await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
        expect(await fx(page)).toEqual({ confetti: 0, sparkles: 0 });
      });
    });

    test('lighting a Star shows the same end screen with no confetti or sparkles', async ({ page }) => {
      await lightStar(page);
      await expect(page.locator('.star-end')).toContainText('+40 Sparks');
      expect(await fx(page)).toEqual({ confetti: 0, sparkles: 0 });
    });
  });
}
