import { test, expect, open, type Page } from '../fixtures';
import { slots, answerInParts, partsOf, questionVals } from '../split-kit';

/* split-answer spec, Requirement "Checking compares the whole answer" (openspec working-memory-scaffolds):
   - Scenario "Right in parts": 95 and 06 for 98 × 97 is right.
   - Scenario "A short right part": 95 and 6 is checked as 956 and is not right.
   - Scenario "Only the left part": "Now the right part." and no try counted (and the other way round). */

/* The next question is 98 × 97: Show me, then Next with Math.random giving the near-base generator base 100
   (pick of [10, 100, 100, 1000] at 0.4), then 100 − 2 and 100 − 3 (ri(−12, 12) at 0.41 and 0.37) */
async function to98x97(page: Page) {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await page.evaluate(() => { const seq = [0.4, 0.41, 0.37]; let i = 0; Math.random = () => (i < seq.length ? seq[i++] : 0.5); });
  await box.locator('#prCheck').click();
  await expect(box.locator('#prQ')).toHaveText(/^\s*98\s*×\s*97\s*=\s*\?\s*$/);
  return box;
}
const sparks = (page: Page) => page.evaluate(async () => (await e2eMod('store')).sparks() as number);

test('95 and 06 for 98 × 97 is right, and earns Sparks like the one box', async ({ page }) => {
  const box = await to98x97(page), s = slots(box);
  const before = await sparks(page);
  await s.left.fill('95'); await s.left.press('Enter');
  await s.right.fill('06'); await s.right.press('Enter');
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prSay')).toContainText('Sparks');
  await expect(box.locator('.pr-score')).toHaveText('1/2'); // the Show me before it counted as a miss
  expect(await sparks(page)).toBeGreaterThan(before);
});

test('95 and 6 is checked as 956: not right', async ({ page }) => {
  const box = await to98x97(page), s = slots(box);
  await s.left.fill('95'); await s.right.fill('6');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bno\b/);
  await expect(box.locator('#prSay')).toContainText('Not quite');
});

test('only the left part: "Now the right part." and no try; only the right part: "Type the left part too."', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('#practice'), s = slots(box);
  await s.left.fill('95');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveText('Now the right part.');
  await expect(box.locator('#prSay')).not.toHaveClass(/\b(no|ok)\b/);
  await expect(box.locator('.pr-score')).toHaveText('0/0');
  await s.left.fill(''); await s.right.fill('06');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveText('Type the left part too.');
  await expect(box.locator('.pr-score')).toHaveText('0/0');
  // The right parts afterwards are still a first try
  const [l, r] = await partsOf(page, 'near-base', await questionVals(box.locator('#prQ')));
  await s.left.fill(l); await s.right.fill(r);
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('.pr-score')).toHaveText('1/1');
});

test('a Kata checks the joined parts', async ({ page }) => {
  await open(page, '#/kata/sq5/1');
  const box = page.locator('#kata');
  await answerInParts(page, box, 'sq5', box.locator('.pr-q'));
  await expect(box.locator('#kSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('.pr-score')).toContainText('1/');
  // Only a left part is not a try in a Kata either
  await box.locator('#kGo').click();
  await slots(box).left.fill('1');
  await box.locator('#kGo').click();
  await expect(box.locator('#kSay')).toHaveText('Now the right part.');
  await expect(box.locator('#kGo')).toHaveText('Check');
});
