import { test, expect, open } from '../fixtures';
import { slots } from '../split-kit';

/* split-answer spec, Requirement "Two answer slots for a Trick built in parts" (openspec working-memory-scaffolds):
   - Scenario "A near-base question in Practice": two slots side by side, no single answer box.
   - Scenario "A Kata": a Pro Player's Kata 1 of squares ending in 5 has the two slots.
   - Scenario "A Trick not built in parts": crosswise Practice has one box.
   - Scenario "The parts after a carry": 112 × 112 is 125 and 44. */

test('Challenger Practice on near-base: a Left part and a Right part slot side by side, no single box', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('#practice'), s = slots(box);
  await expect(s.group).toBeVisible();
  await expect(s.left).toBeVisible();
  await expect(s.right).toBeVisible();
  await expect(box.getByRole('textbox', { name: 'Your answer' })).toHaveCount(0);
  await expect(box.locator('.ans-in')).toHaveCount(2);
  const [l, r] = [await s.left.boundingBox(), await s.right.boundingBox()];
  expect(Math.abs(l!.y - r!.y)).toBeLessThan(4); // one row
  expect(r!.x).toBeGreaterThan(l!.x + l!.width); // the right part on the right
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Kata 1 of squares ending in 5 has the two slots', async ({ page }) => {
    await open(page, '#/kata/sq5/1');
    const s = slots(page.locator('#kata'));
    await expect(s.left).toBeVisible();
    await expect(s.right).toBeVisible();
  });
});

test('Practice on crosswise multiplying has one answer box', async ({ page }) => {
  await open(page, '#/skill/v-crosswise');
  const box = page.locator('#practice');
  await expect(box.getByRole('textbox', { name: 'Your answer' })).toBeVisible();
  await expect(slots(box).left).toHaveCount(0);
  await expect(box.getByRole('button', { name: 'Split into parts' })).toHaveCount(0);
});

test('the parts of 112 × 112 after the carry are 125 and 44', async ({ page }) => {
  await open(page, '#/dojo');
  const parts = await page.evaluate(async () => {
    const V = await e2eMod('vedic');
    const t = V.TRICKS.find((x: { id: string }) => x.id === 'near-base');
    return [t.parts([112, 112]), V.problemFor(t, [112, 112]).parts];
  });
  expect(parts).toEqual([['125', '44'], ['125', '44']]);
});
