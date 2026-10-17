import { test, expect, open } from '../fixtures';

/* openspec star-round, Requirement: Comeback, Scenario: Second rematch of the same kind.
   Star 1 of Square numbers ending in 5 deals only two-digit n² (15 to 95), so every question is the same kind. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const meter = (page: Page) => page.locator('#stMeter');
const tag = (page: Page) => page.locator('#stMain .star-tag');
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
const noYouTube = (page: Page) => page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));

/** Misses the current main question, skips the replay (and the video offer if one comes) and returns the rematch's n */
async function missToRematch(page: Page) {
  const n = await base(page);
  await enter(page, '1');
  await expect(page.locator('.star-replay')).toBeVisible();
  await page.keyboard.press('Escape');
  const offer = page.locator('.star-offer');
  await expect(tag(page).or(offer).first()).toBeVisible();
  if (await offer.isVisible()) await page.locator('#stNoVid').click();
  await expect(tag(page)).toHaveText('Rematch');
  const m = await base(page);
  expect(m).not.toBe(n);
  expect(String(m).length).toBe(String(n).length); // the same kind of question
  return m;
}

test('a second right rematch of the same kind earns 10 Sparks and no Comeback', async ({ page }) => {
  await noYouTube(page);
  await open(page, '#/star/sq5/1');

  await question(page, 1);
  await missToRematch(page);
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('Comeback');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '15');

  await question(page, 2);
  await missToRematch(page);
  await page.locator('#vmLive').evaluate(el => { el.textContent = ''; });
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  await expect(page.locator('#stSay')).not.toContainText('Comeback');
  await expect(page.locator('#stPop')).toHaveText('+10');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '25');
  await expect(page.locator('#vmLive')).toContainText('10 Sparks');
  await expect(page.locator('#vmLive')).not.toContainText('Comeback');

  await question(page, 3);
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '25');
  await expect(page.locator('#stDots i').nth(0)).toHaveClass(/\bcb\b/);
  await expect(page.locator('#stDots i').nth(1)).not.toHaveClass(/\bcb\b/);
});
