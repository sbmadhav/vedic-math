import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* ratings spec, "A Star uses its Trick's Rating", scenario Missed Dare:
   WHEN a Player misses a Dare THEN their Rating for the Trick does not go down for it.

   The Star's Rating is a Dial (js/adapt.js) saved at the end of the round. Four right main answers from a known
   start give an exact saved Rating; a missed Dare in the same round must leave that number exactly as it is
   (a Dial miss would lower it). Questions on Square numbers ending in 5 are all n², read from the page. */

const KEY = 'skill:v-sq5';
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const tag = (page: Page) => page.locator('#stMain .star-tag');
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const enter = async (page: Page, v: string) => { await page.keyboard.type(v); await page.keyboard.press('Enter'); };
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);

/** Plays Star 1: question 1 right, then (with dare) takes the Dare on question 2 and misses it, skips its replay,
    then answers questions 2 to 4 right. Returns the saved Rating at the end. */
async function play(page: Page, dare: boolean) {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  await enter(page, await sq(page));
  await question(page, 2);
  if (dare) {
    const q2 = await base(page);
    await expect(page.locator('#stDare')).toBeVisible();
    await page.locator('#stDare').click();
    await expect(tag(page)).toHaveText('Dare');
    const n = await base(page);
    await enter(page, String(n * n + 1)); // a wrong answer
    await expect(page.locator('#stSay')).toContainText('A Dare miss costs nothing');
    await expect(page.locator('.star-replay')).toBeVisible();
    await page.keyboard.press('Escape');
    await question(page, 2);
    expect(await base(page)).toBe(q2);
  }
  for (let i = 2; i <= 4; i++) {
    await question(page, i);
    await enter(page, await sq(page));
    if (i < 4) await question(page, i + 1);
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  return (await saved(page)).ratings?.[KEY];
}

test.describe('Missed Dare, a new Challenger (Rating starts at 5)', () => {
  test.use({ seedMode: 'challenger' });

  test('four right answers without a Dare save Rating 9.2', async ({ page }) => {
    // Dial from 5: 6.5, 8, 9.5, 11; settled over levels 5, 7, 8, 10, 11 = 9.2
    expect(await play(page, false)).toBe(9.2);
  });

  test('the same four right answers plus a missed Dare still save Rating 9.2: the Dare miss does not lower it', async ({ page }) => {
    expect(await play(page, true)).toBe(9.2);
  });
});

test.describe('Missed Dare, a Player with Rating 10', () => {
  test.use({ seedMode: 'challenger', seedProgress: { ratings: { [KEY]: 10 } } });

  test('a missed Dare in a round of four right answers leaves the Rating where four right answers put it (12.5)', async ({ page }) => {
    // Dial from 10: 11.5, 13, 14.5, 16; settled over 10, 12, 13, 15, 16 = 14.2; saved 10 * 0.4 + 14.2 * 0.6 = 12.5
    const r = await play(page, true);
    expect(r).toBe(12.5);
    expect(r).toBeGreaterThan(10);
  });
});
