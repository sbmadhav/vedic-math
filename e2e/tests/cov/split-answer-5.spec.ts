import { test, expect, open } from '../fixtures';
import { slots } from '../split-kit';

/* split-answer spec, Requirement "Explorer keeps its answers" (openspec working-memory-scaffolds):
   - Scenario "Explorer Practice of a Trick in parts": no Left part slot. */

test.use({ seedMode: 'explorer' });

test('an Explorer Player practicing squares ending in 5 gets no slots', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const box = page.locator('#practice');
  await expect(box.locator('#prQ')).toBeVisible();
  await expect(slots(box).left).toHaveCount(0);
  await expect(box.locator('.pr-split')).toHaveCount(0);
  await expect(box.getByRole('button', { name: /one box|Split into parts/ })).toHaveCount(0);
  // Tap answers where the answer is small, else the one box
  await expect(box.locator('.pr-choice, .ans-in').first()).toBeVisible();
});
