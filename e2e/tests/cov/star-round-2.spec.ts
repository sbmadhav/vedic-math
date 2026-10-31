import { test, expect, open, cloudLog, atRoute } from '../fixtures';

/* openspec star-round: "Three Stars per Trick / Nothing locked" and
   "A Star round is four shuffled questions / Two rounds in a row". */

type Page = import('@playwright/test').Page;
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);

const TRICKS = ['sq5', 'near-base', 'crosswise', 'from9', 'by9s', 'ends10', 'square-near', 'by11', 'div9', 'check9', 'recip',
  'transpose', 'zero-sum', 'times5', 'sub-base', 'duplex', 'sqroot', 'cuberoot', 'osculator', 'add-sub', 'ratio-zero'];

test.describe('Nothing locked: a new Player opens Star 3 of any Trick by link and the round starts', () => {
  for (const id of TRICKS) {
    test(`Star 3 of ${id}`, async ({ page }) => {
      await open(page, `#/star/${id}/3`);
      await expect(page.locator('.star-top .md-tag')).toHaveText('Star 3 of 3');
      await question(page, 1);
      await expect(page.locator('#stQ')).not.toBeEmpty();
      await expect(page.locator('#stMain')).not.toContainText(/locked/i);
      await expect(page).toHaveURL(atRoute(`#/star/${id}/3`));
      expect((await cloudLog(page)).writes).toEqual([]);
    });
  }
});

/** The n of the n² on screen */
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);

/** Plays a whole round of Square numbers ending in 5 right first time, returning the 4 questions as shown */
async function playRound(page: Page) {
  const qs: number[] = [];
  for (let i = 1; i <= 4; i++) {
    await question(page, i);
    const n = await base(page);
    qs.push(n);
    await page.keyboard.type(String(n * n));
    await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end')).toBeVisible();
  return qs;
}

test('Two rounds in a row: the second round of the same Star asks 4 questions different from the first', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  const first = await playRound(page);
  expect(new Set(first).size).toBe(4);
  await page.locator('#stAgain').click();
  const second = await playRound(page);
  expect(new Set(second).size).toBe(4);
  expect(second.filter(n => first.includes(n))).toEqual([]);
  expect((await cloudLog(page)).writes).toEqual([]);
});
