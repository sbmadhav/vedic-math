import { expect, type Page } from '@playwright/test';

/* The projector warm-up at /teachers/warm-up/ (openspec change teacher-warm-up): what its specs share. The polite line
   (#wuAt) names the screen (Today's trick, Problem 2 of 3, Practice at home) and, after a press, carries the words that
   appeared in a hidden span, so a check on it reads its start. */
export const WARM = '/teachers/warm-up/';
export const at = (page: Page) => page.locator('#wuAt');

/** Opens the warm-up, for one Trick (?trick=<id>) or the Trick of the day, and waits until it is filled */
export async function openWarm(page: Page, trick?: string) {
  await page.goto(trick ? `${WARM}?trick=${trick}` : WARM);
  await expect(page.locator('#wuTitle')).not.toHaveText('Loading the trick');
}

/** Presses Next until the polite line says `label` (every reveal and step on the way), at most `max` presses */
export async function nextUntil(page: Page, label: string, max = 40) {
  for (let i = 0; i < max; i++) {
    if ((await at(page).innerText()).startsWith(label)) return;
    await page.locator('#wuNext').click();
  }
  await expect(at(page)).toHaveText(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

/** Presses Back until the warm-up is at its very start (Today's trick with no step shown, Back disabled), at most `max` presses */
export async function backToStart(page: Page, max = 60) {
  const back = page.locator('#wuBack');
  for (let i = 0; i < max && !(await back.isDisabled()); i++) await back.click();
  await expect(back).toBeDisabled();
  await expect(at(page)).toHaveText(/^Today's trick/);
}
