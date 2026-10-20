import { test, expect, APP, open } from '../fixtures';

/* first-visit spec, Requirements "Home fits a phone" and "Keep going does not repeat the first door": one test per
   scenario (openspec change find-and-home-polish). */
type Page = import('@playwright/test').Page;
async function answer(page: Page) {
  const q = (await page.locator('#stQ').innerText()).replace(/[−–]/g, '-').replace(/[×x]/g, '*').replace(/[^\d+\-*/(). ]/g, '');
  for (const ch of String(Math.round(Function(`return (${q})`)()))) await page.locator(`.star-key[data-k="${ch}"]`).click();
  await page.locator('.star-key[data-k="go"]').click();
}
async function trialThenHome(page: Page) {
  await page.goto(APP);
  await page.locator('#tryBtn').click();
  await page.locator('#stStart').click(); /* the trial Star teaches its Trick first (openspec try-trick-teaches) */
  for (let k = 1; k <= 4; k++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${k} of 4`);
    await answer(page);
  }
  await page.locator('#stExit').click();
  await expect(page.locator('h1.home-h')).toBeVisible();
}

test.describe('a new visitor on a phone', () => {
  test.use({ seedMode: null, viewport: { width: 390, height: 844 } });
  test('After Try a trick: Play this Star on screen, the Player strip at most 130 px, nothing sideways', async ({ page }) => {
    await trialThenHome(page);
    const play = page.locator('#view .md-btn--primary');
    await expect(play).toHaveText('Play this Star');
    const b = (await play.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    expect((await page.locator('.me-strip').boundingBox())!.height).toBeLessThanOrEqual(130);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('After the trial Star: no Keep going card, and the Star door offers that Trick\'s next Star', async ({ page }) => {
    await trialThenHome(page);
    await expect(page.locator('.mq-continue')).toHaveCount(0);
    const star = await page.locator('.dojo-card a.md-btn--primary').getAttribute('href');
    expect(star).toMatch(/^#\/star\/from9\/\d$/); /* the same Trick the trial taught */
  });
});

test.describe('a Challenger who practiced another Skill', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, last: '3-mult' } });
  test('Another Skill: the Keep going card offers that Skill', async ({ page }) => {
    await open(page);
    await expect(page.locator('.mq-continue')).toHaveAttribute('href', '#/skill/3-mult');
    await expect(page.locator('.mq-continue')).toContainText('Keep going');
  });
});
