import { test, expect } from '../fixtures';
import { at, openWarm, nextUntil } from '../warm-up-kit';

/* teacher-warm-up spec (change teacher-warm-up), Requirement "Made for a projector and a clicker", Scenarios "A presenter
   clicker", "Big enough for the back row", "Nothing moves by itself" and "Full screen". */
test.use({ seedMode: null });

test('A presenter clicker: Page Down steps the worked example of Multiply by 11 and then reaches Problem 1; Page Up goes back; Right, Space, Left and R', async ({ page }) => {
  await openWarm(page, 'by11');
  for (let i = 0; i < 3; i++) await page.keyboard.press('PageDown');
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(3);
  await expect(at(page)).toHaveText(/^Today's trick/);
  await page.keyboard.press('PageDown');
  await expect(at(page)).toHaveText(/^Problem 1 of 3/);
  await expect(page.locator('#wuQ')).toHaveText('23 × 11');
  await page.keyboard.press('PageUp');
  await expect(at(page)).toHaveText(/^Today's trick/);
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(3); // back to the example fully built
  await page.keyboard.press('ArrowRight');
  await expect(at(page)).toHaveText(/^Problem 1 of 3/);
  await page.keyboard.press('r');
  await expect(page.locator('#wuA')).toHaveText('253');
  await expect(page.locator('#wuBoard')).toBeHidden();
  await page.keyboard.press('R');
  await expect(page.locator('#wuBoard .sb-step')).toHaveCount(1);
  await expect(at(page)).toHaveText(/^Problem 1 of 3/); // R never leaves the problem
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#wuBoard')).toBeHidden();
  await expect(page.locator('#wuA')).toHaveText('253');
  await page.keyboard.press(' ');
  await expect(page.locator('#wuBoard .sb-step')).toHaveCount(1);
  // a key with a modifier is left to the browser
  await page.keyboard.press('Control+ArrowRight');
  await expect(page.locator('#wuBoard .sb-step')).toHaveCount(1);
});

test.describe('Big enough for the back row', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  for (const scheme of ['light', 'dark'] as const) {
    test(`on a 1280 × 720 screen in ${scheme}, the numbers of the longest problem are at least 144 px tall and fit the width`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openWarm(page, 'from9');
      await nextUntil(page, 'Problem 3 of 3');
      await expect(page.locator('#wuQ')).toHaveText('10000 − 4729');
      const q = page.locator('#wuQ');
      expect(await q.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(144);
      const box = await q.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(144);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator('#wuReveal').click();
      await expect(page.locator('#wuA')).toHaveText('5271');
      expect(await page.locator('#wuA').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(96);
    });
  }
});

test('Nothing moves by itself: left open for a minute, nothing on the page changes and no animation runs', async ({ page }) => {
  await page.clock.install();
  await openWarm(page, 'sq5');
  await nextUntil(page, 'Problem 1 of 3');
  const main = page.locator('#main');
  const before = await main.evaluate(e => e.outerHTML);
  await page.clock.fastForward(60_000);
  expect(await main.evaluate(e => e.outerHTML)).toBe(before);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  // a step shown after a press appears without motion under reduced motion (the suite's default)
  await page.locator('#wuReveal').click();
  await page.locator('#wuReveal').click();
  await expect(page.locator('#wuBoard .sb-step')).toHaveCount(1);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const after = await main.evaluate(e => e.outerHTML);
  await page.clock.fastForward(60_000);
  expect(await main.evaluate(e => e.outerHTML)).toBe(after);
  await expect(page.locator('audio, video, [role="timer"]')).toHaveCount(0);
});

test('Full screen: the button is shown where the browser offers the Fullscreen API and hidden where document.fullscreenEnabled is false', async ({ page }) => {
  await openWarm(page);
  const offered = await page.evaluate(() => document.fullscreenEnabled === true);
  await expect(page.locator('#wuFull')).toBeVisible({ visible: offered });
  if (offered) await expect(page.locator('#wuFull')).toHaveText('Full screen');
  await page.addInitScript(() => { Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false, configurable: true }); });
  await openWarm(page);
  await expect(page.locator('#wuFull')).toBeHidden();
  await expect(page.locator('#wuNext')).toBeVisible(); // the rest of the page works the same
});
