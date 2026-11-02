import { expect, type Page } from '@playwright/test';

/* The projector warm-up at /teachers/warm-up/ (openspec change teacher-warm-up): what its specs share. The polite line
   (#wuAt) names the screen (Today's trick, Problem 2 of 3, Practice at home) and, after a press, carries the words that
   appeared in a hidden span, so a check on it reads its start. */
export const WARM = '/teachers/warm-up/';
export const at = (page: Page) => page.locator('#wuAt');
const starts = (label: string) => new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** Opens the warm-up, for one Trick (?trick=<id>) or the Trick of the day, and waits until it is filled */
export async function openWarm(page: Page, trick?: string) {
  await page.goto(trick ? `${WARM}?trick=${trick}` : WARM);
  await expect(page.locator('#wuTitle')).not.toHaveText('Loading the trick');
}

/** Presses Next (every reveal and step on the way) until the polite line says `label`, at most `max` presses. The
    presses run inside the page, so a whole warm-up is one round trip, not sixty. */
export async function nextUntil(page: Page, label: string, max = 40) {
  await page.evaluate(([label, max]) => {
    const at = document.getElementById('wuAt'), next = document.getElementById('wuNext');
    for (let i = 0; i < max && !(at?.textContent ?? '').startsWith(label); i++) next?.click();
  }, [label, max] as const);
  await expect(at(page)).toHaveText(starts(label));
}

/** Presses Back until the warm-up is at its very start (Today's trick with no step shown, Back disabled) */
export async function backToStart(page: Page, max = 80) {
  await page.evaluate(max => {
    const back = document.getElementById('wuBack') as HTMLButtonElement | null;
    for (let i = 0; i < max && back && !back.disabled; i++) back.click();
  }, max);
  await expect(page.locator('#wuBack')).toBeDisabled();
  await expect(at(page)).toHaveText(starts("Today's trick"));
}
