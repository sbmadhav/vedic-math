import { test, expect } from '../fixtures';
import { animate, diagram } from '../connector-kit';

/* trick-connectors spec, Requirement "Stepping by keyboard" (openspec working-memory-scaffolds):
   - Scenario "Space": with focus on the steps of 97 × 94, Space shows the second step and the page does not scroll;
     the right arrow is Next step and the left arrow Back. */

test('Space and the arrows step through 97 × 94 with focus on the steps, without scrolling the page', async ({ page }) => {
  await animate(page, 'near-base', 97, 94);
  const board = page.locator('#animBoard');
  await board.focus();
  await expect(board).toBeFocused();
  const y = await page.evaluate(() => scrollY);
  await page.keyboard.press('Space');
  await expect(page.locator('#animPos')).toHaveText('2 / 4');
  expect(await page.evaluate(() => scrollY)).toBe(y);
  expect((await diagram(page)).colors).toEqual(['sky', 'sky']);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#animPos')).toHaveText('3 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#animPos')).toHaveText('2 / 4');
  await expect(board).toBeFocused();
  // Space on the Next step button steps too
  await page.locator('#animNext').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#animPos')).toHaveText('3 / 4');
});

test('the steps are reached by Tab and named, with how to step', async ({ page }) => {
  await animate(page, 'crosswise', 23, 41);
  const board = page.locator('#animBoard');
  await expect(board).toHaveAttribute('tabindex', '0');
  await expect(board).toHaveAccessibleName('Steps');
  await expect(board).toHaveAccessibleDescription('Space or the right arrow shows the next step, the left arrow the one before.');
});
