import { test, expect, APP, open, pathTo } from '../fixtures';

/* first-visit spec, Requirements "Home fits a phone" and "Keep going does not repeat the first door": one test per
   scenario (openspec change find-and-home-polish). */
type Page = import('@playwright/test').Page;
/* A new visitor tries the Challenger trick (openspec try-trick-in-modes), plays Star 1 of Bolt's first Trick from Home,
   then comes Home again */
async function trialThenHome(page: Page) {
  await page.goto(APP);
  await page.locator('.mode-card[data-mode="challenger"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
  await page.locator('#tyStart').click();
  for (const a of [625, 2025, 4225]) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); await page.locator('#tyNext').click(); }
  await page.locator('#tyHome').click();
  await expect(page.locator('h1.home-h')).toBeVisible();
}
async function answer(page: Page) {
  const q = (await page.locator('#stQ').innerText()).replace(/[−–]/g, '-').replace(/[×x]/g, '*').replace(/[^\d+\-*/(). ]/g, '');
  for (const ch of String(Math.round(Function(`return (${q})`)()))) await page.locator(`.star-key[data-k="${ch}"]`).click();
  await page.locator('.star-key[data-k="go"]').click();
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

  test('After the trial Star: a visitor who played a Star of Bolt\'s first Trick from Home has no Keep going card, and the Star door offers that Trick', async ({ page }) => {
    await trialThenHome(page);
    await page.locator('.dojo-card a.md-btn--primary').click();
    for (let k = 1; k <= 4; k++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${k} of 4`);
      await answer(page);
    }
    await page.locator('#stExit').click();
    await expect(page.locator('h1.home-h')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('mathquest.v1.' + JSON.parse(localStorage.getItem('vm.players')!).active))).toContain('"last":"v-from9"');
    await expect(page.locator('.mq-continue')).toHaveCount(0);
    const star = await page.locator('.dojo-card a.md-btn--primary').getAttribute('href');
    expect(star).toMatch(new RegExp(`^${APP}star/from9/\\d$`));
  });
});

test.describe('a Challenger who practiced another Skill', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, last: '3-mult' } });
  test('Another Skill: the Keep going card offers that Skill', async ({ page }) => {
    await open(page);
    await expect(page.locator('.mq-continue')).toHaveAttribute('href', pathTo('#/skill/3-mult'));
    await expect(page.locator('.mq-continue')).toContainText('Keep going');
  });
});
