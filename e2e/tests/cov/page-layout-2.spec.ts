import { test, expect, open } from '../fixtures';
import type { Page, Locator } from '@playwright/test';

/* page-layout spec, Requirements "Play fills the screen with the keypad in view" and "Text size A and A+": one test
   per scenario. The Arena Practice round here is a timed Practice round, never posted. */
async function onScreen(page: Page, loc: Locator) {
  const b = await loc.boundingBox(), v = page.viewportSize()!;
  return !!b && b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v.width + 0.5 && b.y + b.height <= v.height + 0.5;
}
async function allOnScreen(page: Page, loc: Locator) {
  const n = await loc.count(), out: number[] = [];
  for (let i = 0; i < n; i++) if (!(await onScreen(page, loc.nth(i)))) out.push(i);
  return { n, off: out };
}
const scrollTop = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollTop);
async function arenaPractice(page: Page) {
  await open(page, '#/arena');
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
}

test('Arena on a phone: on 390 by 844 the question, entry and every key are on screen and the page does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await arenaPractice(page);
  await expect(page.locator('.ar-key')).toHaveCount(12);
  for (let k = 0; k < 6; k++) {
    expect(await onScreen(page, page.locator('#arQ')), `question, answer ${k + 1}`).toBe(true);
    expect(await onScreen(page, page.locator('#arEntry')), 'entry').toBe(true);
    expect((await allOnScreen(page, page.locator('.ar-key'))).off, 'keys off screen').toEqual([]);
    expect(await scrollTop(page)).toBe(0);
    await page.locator('.ar-key[data-k="1"]').click();
    await page.locator('#arForm button').click();
  }
  await page.locator('#arStop').click();
});

test.describe('a touch laptop', () => {
  test.use({ viewport: { width: 1366, height: 768 }, hasTouch: true });
  test('Chromebook with a touch screen: tapping the answer area in a Star round keeps the on-screen keypad and opens no system keyboard', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    const pad = page.locator('#stPad');
    await expect(pad).toBeVisible();
    // The answer area is an <output> (or the digit boxes) with no text field: a tap can open no system keyboard
    const entry = page.locator('#stBoxes, #stOut').first();
    await entry.tap();
    expect(await page.locator('#stMain input:not([type="hidden"]), #stMain textarea').count()).toBe(0);
    await expect(pad).toBeVisible();
    const focused = await page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return !a || a === document.body ? null : { tag: a.tagName, inputmode: a.getAttribute('inputmode'), readonly: (a as HTMLInputElement).readOnly }; });
    if (focused && /^(INPUT|TEXTAREA)$/.test(focused.tag)) expect(focused.inputmode === 'none' || focused.readonly).toBe(true);
    expect((await allOnScreen(page, pad.locator('.star-key'))).off).toEqual([]);
  });
});

test('Round over: the result shows in the play screen, and leaving it returns to the page with focus on Start', async ({ page }) => {
  await arenaPractice(page);
  await page.locator('#arStop').click();
  await expect(page.locator('.play-shell')).toHaveCount(0);
  await expect(page.locator('#arGo')).toBeFocused();
  // A finished untimed round: its result is shown inside the play screen, and Done returns focus to Start
  await page.locator('[data-t="untimed"]').click();
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await page.locator('.ar-key[data-k="4"]').click();
  await page.locator('#arForm button').click();
  await page.locator('#arFinish').click();
  await expect(page.locator('.play-shell .ar-result')).toBeVisible();
  await page.locator('#arDone').click();
  await expect(page.locator('.play-shell')).toHaveCount(0);
  await expect(page.locator('#arGo')).toBeFocused();
});

test('A+ on a phone: the question and keypad grow and everything still fits without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '#/star/sq5/1');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  const size = (sel: string) => page.locator(sel).first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  const q0 = await size('#stQ'), k0 = await size('#stPad .star-key');
  await page.locator('.play-shell [data-size="a+"]').click();
  await expect(page.locator('body')).toHaveClass(/\btext-plus\b/);
  expect(await size('#stQ')).toBeGreaterThan(q0);
  expect(await size('#stPad .star-key')).toBeGreaterThanOrEqual(k0);
  const keys = await allOnScreen(page, page.locator('#stPad .star-key'));
  expect(keys.n).toBe(13);
  expect(keys.off).toEqual([]);
  expect(await onScreen(page, page.locator('#stQ'))).toBe(true);
  expect(await scrollTop(page)).toBe(0);
});
