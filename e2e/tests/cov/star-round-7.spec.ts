import { test, expect, open } from '../fixtures';

/* openspec star-round, Requirement: Dare. Scenarios "Dare taken and won" and "Dare missed", on Star 1 of
   Square numbers ending in 5 (every question is n², so each answer is worked out from the question on screen). */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const meter = (page: Page) => page.locator('#stMeter');
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }

/** Answers question 1 right and stops on question 2, returning question 2's n */
async function toQuestion2(page: Page) {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  await enter(page, await sq(page));
  await question(page, 2);
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '10');
  await expect(page.locator('#stDare')).toBeVisible();
  return base(page);
}

test('Dare taken and won on question 2 of Star 1: +20 Sparks, then question 2 follows', async ({ page }) => {
  const q2 = await toQuestion2(page);
  await page.locator('#stDare').click();
  await expect(tag(page)).toHaveText('Dare');
  const d = await base(page);
  expect(d).not.toBe(q2);
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('+20 Sparks');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '30');
  await expect(page.locator('#stMeterN')).toHaveText('30/40');
  await question(page, 2);
  expect(await base(page)).toBe(q2);
  await expect(page.locator('#stDare')).toBeHidden(); // at most one Dare a round
  expect((await saved(page)).sparks).toBe(30);
  // The Dare is not one of the 4: question 2 is still unanswered
  await expect(page.locator('#stDots i')).toHaveCount(4);
  await expect(page.locator('#stDots i').nth(1)).toHaveClass(/\bcur\b/);
});

test('Dare missed: the replay plays on the Dare numbers, no rematch, and question 2 follows with Sparks unchanged', async ({ page }) => {
  const q2 = await toQuestion2(page);
  await page.locator('#stDare').click();
  await expect(tag(page)).toHaveText('Dare');
  const d = await base(page);
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('A Dare miss costs nothing');
  // The replay, on the Dare's own numbers
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-replay #stQ')).toHaveText(`${d}2 = ?`);
  await expect(page.locator('.star-step').first()).toContainText(String((d - 5) / 10));
  await expect(page.locator('.star-step').first()).toContainText(String(d));
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '10');
  await page.keyboard.press('Escape');
  // No rematch: straight back to the same main question
  await question(page, 2);
  expect(await base(page)).toBe(q2);
  await expect(page.locator('#stMain .star-tag--rematch')).toHaveCount(0);
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '10');
  await expect(page.locator('#stMeterN')).toHaveText('10/40');
  expect((await saved(page)).sparks).toBe(10);
  await expect(page.locator('#stDots i.miss')).toHaveCount(0);
  // Answering question 2 right now is a plain right answer, not a Comeback
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '20');
  await question(page, 3);
});
