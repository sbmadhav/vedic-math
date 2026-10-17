import { test, expect, open, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* accessibility spec, "Focus stays in the game after an answer" / "Two keyboard answers in Number bonds".
   The existing loop in wcag.spec.ts presses Enter on whatever option has focus, so whether a miss (and its
   1.2 second hold) happens is random. Here the first answer is forced to be a miss and the second a right
   answer, both chosen and given from the keyboard, and focus must be on an option button after each. */

const num = (s: string | null) => Number((s || '').replace(/,/g, '').trim());

/** The focused element is an enabled option button inside the play area. */
const focusOnOption = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLButtonElement | null;
  return !!a && !!a.closest('#gArea') && a.matches('.g-opts .md-chip') && !a.disabled;
});

/** The missing part of the current bond. */
async function rightPart(page: Page) {
  const W = num(await page.locator('#gArea .bond-w').textContent());
  const a = num(await page.locator('#gArea .bond-a').textContent());
  return Math.round((W - a) * 100) / 100;
}
const focusedValue = (page: Page) => page.evaluate(() => (document.activeElement?.textContent || '').replace(/,/g, '').trim()).then(Number);

/** Moves focus with Tab through the options until pred(value) holds. */
async function tabTo(page: Page, browserName: string, pred: (v: number) => boolean) {
  // WebKit (like Safari) only moves Tab to buttons with Option held
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let i = 0; i < 6 && !pred(await focusedValue(page)); i++) await page.keyboard.press(tab);
  expect(pred(await focusedValue(page))).toBe(true);
  expect(await focusOnOption(page)).toBe(true);
}

test('Number bonds: focus is on an option after a keyboard miss (with its hold) and after a right answer', async ({ page, browserName }) => {
  await open(page, '#/game/bonds');
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focusOnOption(page)).toBe(true);

  // Answer 1: a miss, from the keyboard
  const b1 = await rightPart(page);
  await tabTo(page, browserName, v => v !== b1);
  await page.keyboard.press('Enter');
  // The hold keeps the question with its options disabled
  await expect(page.locator('#gArea .g-opts .md-chip').first()).toBeDisabled();
  // After the 1.2 second hold the next question comes and focus is on one of its options
  // (a missed question can come back, so wait for the options to be enabled again rather than a new question)
  await expect(page.locator('#gArea .g-opts .md-chip').first()).toBeEnabled({ timeout: 5000 });
  await expect(page.locator('#gSay')).toHaveText('');
  await expect.poll(() => focusOnOption(page), { timeout: 5000 }).toBe(true);

  // Answer 2: right, from the keyboard
  const b2 = await rightPart(page);
  await tabTo(page, browserName, v => v === b2);
  await page.keyboard.press('Enter');
  await expect(page.locator('#gArea .g-opts .md-chip').first()).toBeEnabled();
  await expect.poll(() => focusOnOption(page), { timeout: 5000 }).toBe(true);

  expect((await cloudLog(page)).writes).toEqual([]);
});
