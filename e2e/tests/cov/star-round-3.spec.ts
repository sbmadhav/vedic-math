import { test, expect, open } from '../fixtures';

/* openspec star-round, Requirement: A Star round is four shuffled questions
   - Order: WHEN a Player plays a Star many times THEN the questions do not come in a fixed order
   (Sparks in a Star light it / Four right is covered by e2e/tests/star.spec.ts:23.) */

type Page = import('@playwright/test').Page;
const tag = (page: Page) => page.locator('#stMain .star-tag');
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const lastKeys = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sky.last['sq5:1'] as string[]);
/** The n of the n² a Kata key ("kata:index") stands for, from the app's own seeded Katas */
const keyBases = (page: Page, keys: string[]) => page.evaluate(async keys => {
  const L = await import('/vedic-math/js/levels.js' as string);
  return keys.map(k => { const [n, i] = k.split(':').map(Number); return L.kata('sq5', n).problems[i].vals[0] as number; });
}, keys);
/** Difficulty rank of each key in dealt order (by Kata, then by place in the Kata): the shape of the order */
const shape = (keys: string[]) => {
  const v = keys.map(k => { const [n, i] = k.split(':').map(Number); return n * 1000 + i; });
  const sorted = [...v].sort((a, b) => a - b);
  return v.map(x => sorted.indexOf(x)).join('');
};

test('Order: over many rounds of one Star the four questions come in a shuffled, not fixed, order', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  const ROUNDS = 8;
  const shapes: string[] = [];
  const firsts: number[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    if (r) await page.locator('#stAgain').click();
    await expect(tag(page)).toHaveText('Question 1 of 4');
    const keys = await lastKeys(page);
    expect(keys).toHaveLength(4);
    const bases = await keyBases(page, keys);
    if (r === 0) {
      // The questions are asked in the order the round dealt them
      for (let i = 1; i <= 4; i++) {
        await expect(tag(page)).toHaveText(`Question ${i} of 4`);
        const n = await base(page);
        expect(n).toBe(bases[i - 1]);
        await page.keyboard.type(String(n * n));
        await page.keyboard.press('Enter');
        await expect(page.locator('#stSay')).toContainText('+10 Sparks');
      }
      await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    } else {
      expect(await base(page)).toBe(bases[0]);
      await page.locator('#stSkip').click();
      await expect(page.locator('.star-end-h')).toBeVisible();
    }
    shapes.push(shape(keys));
    firsts.push(bases[0]);
  }
  // Not a fixed order: the difficulty order of the four differs between rounds, and it is not always easiest first
  expect(new Set(shapes).size, `orders seen: ${shapes.join(', ')}`).toBeGreaterThan(1);
  expect(shapes.some(s => s !== '0123'), `orders seen: ${shapes.join(', ')}`).toBe(true);
  // and the round does not always open on the same question
  expect(new Set(firsts).size, `first questions: ${firsts.join(', ')}`).toBeGreaterThan(1);
});
