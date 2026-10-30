import { test, expect } from '../fixtures';
import { animate, diagram } from '../connector-kit';

/* trick-connectors spec, Requirement "Lines are shown, not animated, without motion" (openspec working-memory-scaffolds):
   - Scenario "Calm": with Calm on, the first step's lines of 97 × 94 are fully drawn and have no animation.
   Also under the device's reduced motion setting; with motion allowed, a line draws in. */

const lineAnim = (page: import('@playwright/test').Page) => page.locator('#animLinks line.cx-line').first().evaluate(l => ({ name: getComputedStyle(l).animationName, offset: getComputedStyle(l).strokeDashoffset }));

test.describe('Calm on', () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.addInitScript(() => localStorage.setItem('vm.calm', '1')); });
  test('the lines are drawn at once, with no animation', async ({ page }) => {
    await animate(page, 'near-base', 97, 94);
    await diagram(page);
    await expect(page.locator('#animLinks line.cx-line')).toHaveCount(2);
    const a = await lineAnim(page); expect(a.name).toBe('none'); expect(parseFloat(a.offset)).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test('the lines are drawn at once, with no animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await animate(page, 'crosswise', 23, 41);
    await diagram(page);
    expect((await lineAnim(page)).name).toBe('none');
  });
});

test('with motion allowed, a line draws in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); /* the suite runs with reduced motion on (playwright.config.ts) */
  await animate(page, 'near-base', 97, 94);
  await diagram(page);
  expect((await lineAnim(page)).name).toBe('cxDraw');
});
