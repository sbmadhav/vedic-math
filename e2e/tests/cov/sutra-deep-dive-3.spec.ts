import { test, expect, APP } from '../fixtures';

/* sutra-deep-dive spec (openspec change sutras-first), Requirement "A Deep dive opens without a Mode": one test per
   scenario. */

test.describe('a new visitor', () => {
  test.use({ seedMode: null });
  test('A link from the landing page: /play/#/sutras/s2 opens the Nikhilaṃ Deep dive over the Sutras page, and no Mode is stored', async ({ page }) => {
    await page.goto(`${APP}#/sutras/s2`);
    await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(page.locator('.sutra-grid').first()).toBeAttached();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    const mode = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || 'null'); return p && p.list && p.list[0] ? p.list[0].mode : null; });
    expect(mode ?? null).toBeNull();
  });
});
