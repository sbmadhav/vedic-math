import { test, expect, open } from '../fixtures';
import { slots } from '../split-kit';

/* split-answer spec, Requirement "The left part locks" (openspec working-memory-scaffolds):
   - Scenario "Lock with Enter": 95 and Enter in the left slot locks it (read only, Lock pressed), focus moves to the
     right slot, and nothing is checked.
   - Scenario "Unlock": pressing the pressed Lock button lets the left slot be typed in again. */

test('Enter locks the left part and moves to the right part without checking; Lock again unlocks it', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('#practice'), s = slots(box);
  await s.left.fill('95');
  await s.left.press('Enter');
  await expect(s.left).not.toBeEditable();
  await expect(s.left).toHaveValue('95');
  await expect(s.lock).toHaveAttribute('aria-pressed', 'true');
  await expect(s.right).toBeFocused();
  // Nothing checked: no feedback, the score has not moved, Check is still Check
  await expect(box.locator('#prSay')).toBeEmpty();
  await expect(box.locator('.pr-score')).toHaveText('0/0');
  await expect(box.locator('#prCheck')).toHaveText('Check');
  // Typing in the locked slot changes nothing
  await s.left.press('9');
  await expect(s.left).toHaveValue('95');

  await s.lock.click();
  await expect(s.lock).toHaveAttribute('aria-pressed', 'false');
  await expect(s.left).toBeEditable();
  await expect(s.left).toBeFocused();
  await s.left.fill('96');
  await expect(s.left).toHaveValue('96');
});

test('the Lock button locks too, with Space', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const s = slots(page.locator('#practice'));
  await s.left.fill('72');
  await s.lock.focus(); // the next stop after the left slot (WebKit on macOS skips buttons on Tab by default)
  await expect(s.lock).toBeFocused();
  await page.keyboard.press('Space');
  await expect(s.lock).toHaveAttribute('aria-pressed', 'true');
  await expect(s.left).not.toBeEditable();
  await expect(s.right).toBeFocused();
});
