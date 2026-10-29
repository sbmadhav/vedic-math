import { test, expect, open } from '../fixtures';
import { slots, partsOf, questionVals } from '../split-kit';

/* split-answer spec, Requirement "One box stays available" (openspec working-memory-scaffolds):
   - Scenario "One box": after "Type it in one box", the next question has one answer box and a "Split into parts"
     control; the choice is saved on this device, and "Split into parts" brings the slots back. */

test('"Type it in one box" switches to the single box for this and later questions; "Split into parts" switches back', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('#practice'), one = box.getByRole('textbox', { name: 'Your answer' });
  await box.getByRole('button', { name: 'Type it in one box' }).click();
  await expect(one).toBeVisible();
  await expect(one).toBeFocused();
  await expect(slots(box).left).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vm.split'))).toBe('one');

  // The whole answer in the one box is checked as before
  const [l, r] = await partsOf(page, 'near-base', await questionVals(box.locator('#prQ')));
  await one.fill(l + r);
  await one.press('Enter');
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  // The next question keeps the one box, with the way back
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
  await expect(one).toBeVisible();
  await expect(box.getByRole('button', { name: 'Split into parts' })).toBeVisible();
  // Saved on this device: a reload keeps it
  await page.reload();
  await expect(page.locator('#practice').getByRole('textbox', { name: 'Your answer' })).toBeVisible();

  await page.locator('#practice').getByRole('button', { name: 'Split into parts' }).click();
  await expect(slots(page.locator('#practice')).left).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('vm.split'))).toBeNull();
});
