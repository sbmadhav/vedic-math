import { test, expect, APP, pickMode } from '../fixtures';

/* guide spec, Requirement "The tour is accessible": one test per scenario. */
type Page = import('@playwright/test').Page;
const tour = (page: Page) => page.locator('dialog.vm-tour');

test.use({ tourSeen: false, seedMode: null });

test('Keyboard: Escape on any step closes the tour and records it as skipped', async ({ page }) => {
  await page.goto(APP);
  await pickMode(page, 'pro');
  const dlg = tour(page);
  await expect(dlg).toBeVisible();
  await dlg.locator('[data-act="next"]').click();
  await expect(dlg.locator('#tourN')).toContainText('2 of');
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vm.tour'))).toBe('skipped');
});

test('Phone: on a 390px screen the Guide step points at the Find trigger, and the trigger and the whole card are on screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(APP);
  await pickMode(page, 'challenger'); /* the Find trigger is the menu's help (openspec change play-nav-by-mode) */
  const dlg = tour(page);
  await expect(dlg).toBeVisible();
  // Next through the steps to the Guide step; a tour with more than 8 steps or no guide step fails here, not at the timeout
  for (let i = 0; await dlg.getAttribute('data-step') !== 'guide'; i++) {
    expect(i, 'the tour has a guide step within 8 steps').toBeLessThan(8);
    await dlg.locator('[data-act="next"]').click();
  }
  for (const box of [await page.locator('.mq-nav .nav-find').boundingBox(), await dlg.locator('.tour-card').boundingBox()]) {
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390); expect(box!.y + box!.height).toBeLessThanOrEqual(780);
  }
});

test('Calm: with Calm on the spotlight moves between steps without animation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
  await page.goto(APP);
  await pickMode(page, 'challenger');
  const dlg = tour(page);
  await expect(dlg).toBeVisible();
  await dlg.locator('[data-act="next"]').click();
  await expect(dlg.locator('#tourN')).toContainText('2 of');
  await expect(dlg).toHaveClass(/still/);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});
