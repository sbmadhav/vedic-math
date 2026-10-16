import { test, expect, open } from '../fixtures';

/* star-round spec: "Calm path and announcements / Screen reader on a Comeback" and
   "Where Stars are offered / Trick page in Pro". Questions are random, so answers are worked out from the page. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);

/** Records every text the polite live region shows, in order */
async function watchLive(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__live = [];
    const hook = () => {
      const el = document.getElementById('vmLive'); if (!el) return false;
      new MutationObserver(() => { const t = (el.textContent || '').trim(); if (t) w.__live.push(t); })
        .observe(el, { childList: true, characterData: true, subtree: true });
      return true;
    };
    if (!hook()) document.addEventListener('DOMContentLoaded', hook, { once: true });
  });
}
const live = (page: Page) => page.evaluate(() => (window as any).__live as string[]);

test.describe('Screen reader on a Comeback', () => {
  test('a right rematch is announced politely, once: the right answer, "Comeback" and 15 Sparks', async ({ page }) => {
    await watchLive(page);
    await open(page, '#/star/sq5/1');
    const region = page.locator('#vmLive');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await question(page, 1);
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await expect(page.locator('.star-replay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tag(page)).toHaveText('Rematch');
    const m = await base(page);
    const ans = String(m * m);
    await page.keyboard.type(ans);
    await page.keyboard.press('Enter');
    await expect(region).toHaveText(`Right, ${ans}. Comeback! 15 Sparks.`);
    await question(page, 2);
    const said = (await live(page)).filter(t => /Comeback/.test(t));
    expect(said).toEqual([`Right, ${ans}. Comeback! 15 Sparks.`]);
  });
});

test.describe('Trick page in Pro', () => {
  test.use({ seedMode: 'pro', seedProgress: { sky: { lit: { 'sq5:1': 1 }, skipped: { 'sq5:2': 1 }, last: {} } } });

  test('the three Stars show their state (lit, skipped, open)', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    await expect(page.locator('#view h1')).toContainText('Square numbers ending in 5');
    const links = page.locator('.star-links .star-link');
    await expect(links).toHaveCount(3);
    const want = [['lit', 'Lit'], ['skipped', 'Skipped'], ['open', 'Open']];
    for (let i = 0; i < 3; i++) {
      await expect(links.nth(i)).toBeVisible();
      await expect(links.nth(i)).toContainText(`Star ${i + 1}`);
      await expect(links.nth(i)).toHaveClass(new RegExp(`star-link--${want[i][0]}\\b`));
      await expect(links.nth(i)).toContainText(want[i][1]);
    }
  });

  for (const n of [1, 2, 3]) {
    test(`Star ${n} opens its own round`, async ({ page }) => {
      await open(page, '#/skill/v-sq5');
      await page.locator('.star-links .star-link').nth(n - 1).click();
      await expect(page).toHaveURL(new RegExp(`#/star/sq5/${n}$`));
      await expect(page.locator('#view h1')).toHaveText('Square numbers ending in 5');
      await expect(page.locator('.star-top .md-tag')).toHaveText(`Star ${n} of 3`);
      await question(page, 1);
      await expect(page.locator('#stQ')).toContainText(/^\d+2/);
      await expect(page.locator('.star-plain')).toBeVisible(); // Pro layout
    });
  }
});
