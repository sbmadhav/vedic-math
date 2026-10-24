import { test, expect, open } from '../fixtures';

/* star-round spec, Requirement "Explorer's Dojo offers no Stars", Scenario "Dojo in Explorer": an Explorer Player opens the
   Dojo and sees the Tricks in their seven belt groups, no Star count or "belts earned" line, the line that belts and
   Stars come with Challenger and Pro, and no link to the Sutras page. */
test.describe('Dojo in Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('tricks in seven belt groups, no Star or belt counts, belts and Stars come with Challenger and Pro, no Sutras link', async ({ page }) => {
    await open(page, '#/dojo');
    await expect(page.locator('.dojo-belt')).toHaveCount(7);
    await expect(page.locator('.dojo-belt .dojo-node')).toHaveCount(21);
    await expect(page.locator('.dojo-star')).toHaveCount(0);
    await expect(page.locator('#view')).not.toContainText(/\d+\/9 Stars/);
    await expect(page.locator('#view')).not.toContainText(/belts earned/);
    await expect(page.locator('#view')).toContainText('Belts and Stars come with Challenger and Pro.');
    await expect(page.locator('#view a[href="#/sutras"]')).toHaveCount(0);
  });
});
