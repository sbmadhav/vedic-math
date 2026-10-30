import { test, expect, open } from '../fixtures';

/* trophy-case spec, Requirement "The Player chip shows Sparks and the Belt only" (openspec working-memory-scaffolds):
   - Scenario "A Challenger with the green belt": a green belt knot and the Sparks bar; the name ends with "Green belt".
   - Scenario "No Belt yet": no knot.
   - Scenario "Explorer": an Explorer Player who earned the white belt in Challenger: no knot. */

const chip = (page: import('@playwright/test').Page) => page.locator('#mqChip a.mq-chip');
const BELTS = { v: 3, sparks: 1200, weekSparks: {}, belts: { white: 1, green: 2 } };

test.describe('a Challenger who holds the white and green belts', () => {
  test.use({ seedProgress: BELTS });
  test('the chip shows the green belt and the Sparks bar, and nothing else, on any page', async ({ page }) => {
    for (const h of ['#/', '#/dojo', '#/me', '#/games']) {
      await open(page, h);
      await expect(chip(page), h).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter, Green belt');
      const knot = chip(page).locator('.mq-chip-belt');
      await expect(knot, h).toBeVisible();
      await expect(knot, h).toHaveAttribute('data-belt', 'green');
      await expect(knot, h).toHaveAttribute('style', /--belt:\s*var\(--teal\)/);
      await expect(chip(page).locator('.mq-sparkbar'), h).toBeVisible();
      // No Stars, Medals or Badges, and no number
      await expect(chip(page).locator('.medal, .star-link, .badge, .dojo-star'), h).toHaveCount(0);
      expect(await chip(page).evaluate(e => [...e.children].filter(c => !c.classList.contains('md-sr-only')).map(c => c.textContent).join('')), h).toBe('ST');
    }
  });
});

test.describe('a Challenger with no Belt', () => {
  test.use({ seedProgress: { v: 3, sparks: 1200, weekSparks: {} } });
  test('the chip shows no belt knot', async ({ page }) => {
    await open(page, '#/dojo');
    await expect(chip(page).locator('.mq-chip-belt')).toHaveCount(0);
    await expect(chip(page)).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
  });
});

test.describe('an Explorer who earned the white belt in Challenger', () => {
  test.use({ seedMode: 'explorer', seedProgress: { v: 3, sparks: 1200, weekSparks: {}, belts: { white: 1 } } });
  test('the chip shows no belt knot', async ({ page }) => {
    await open(page);
    await expect(chip(page).locator('.mq-chip-belt')).toHaveCount(0);
    await expect(chip(page)).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
  });
});

test.describe('a Belt earned during play', () => {
  test.use({ seedProgress: { v: 3, sparks: 1200, weekSparks: {} } });
  test('appears in the chip at once', async ({ page }) => {
    await open(page, '#/dojo');
    await page.evaluate(async () => (await e2eMod('store')).keepBelt('white'));
    await expect(chip(page)).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter, White belt');
  });
});
