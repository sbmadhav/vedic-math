import { test, expect, open } from '../fixtures';

/* find spec, Requirements "A Find page" and "The browse list" as modified by openspec change play-nav-by-mode (the Find
   trigger, Ctrl K or Cmd K, Find's help card): one test per new scenario. */

test('Ctrl K: typing in a Practice answer box, Ctrl K (Cmd K on a Mac) opens Find with the box focused', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  await page.locator('#practice .ans-in').first().focus();
  await page.keyboard.press('Control+k');
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#findIn')).toBeFocused();
  await open(page, '#/skill/3-mult');
  await page.locator('#practice .ans-in').first().focus();
  await page.keyboard.press('Meta+k');
  await expect(page).toHaveURL(/#\/find$/);
});

test('Not during a round: Ctrl K in a Star round leaves the round open', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await expect(page.locator('.play-shell')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/#\/star\/sq5\/1$/);
  await expect(page.locator('.play-shell')).toBeVisible();
});

test('Empty box: Read the guide and Take the tour come first, then every section in zone order', async ({ page }) => {
  await open(page, '#/find');
  const help = page.locator('#findOut .find-help');
  await expect(help.locator('a[href="#/guide"]')).toHaveText('Read the guide');
  await expect(help.locator('[data-find-tour]')).toHaveText('Take the tour');
  expect(await page.evaluate(() => { const h = document.querySelector('#findOut .find-help')!, l = document.querySelector('#findOut .find-list')!; return !!(h.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
  await expect(page.locator('#findOut .find-list .find-hit b')).toHaveText(['Home', 'Sutras', 'Learn', 'Arcade', 'Dojo', 'Arena', 'Games', 'Watch', 'Me', 'Guide']);
});

test('The tour from Find: Take the tour opens Home with the tour\'s first step', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('[data-find-tour]').click();
  const dlg = page.locator('dialog.vm-tour');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('#tourN')).toContainText('1 of');
});
