import { test, expect, open } from '../fixtures';

/* site-header spec (openspec change sutras-first), Requirement "Sutras come first in the menu": one test per scenario. */
const tabs = async (page: import('@playwright/test').Page) => (await page.locator('header .mq-nav a:visible').allInnerTexts()).map(t => t.trim());

test('Challenger menu: Home, Sutras, Learn, Dojo, Arena, Games, Watch, Guide, Find', async ({ page }) => {
  await open(page, '#/');
  expect(await tabs(page)).toEqual(['Home', 'Sutras', 'Learn', 'Dojo', 'Arena', 'Games', 'Watch', 'Guide', 'Find']);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer menu: Home, Sutras, Learn, Arena, Games, Watch, Guide, Find, and Sutras opens the cards with Explorer meanings', async ({ page }) => {
    await open(page, '#/');
    expect(await tabs(page)).toEqual(['Home', 'Sutras', 'Learn', 'Arena', 'Games', 'Watch', 'Guide', 'Find']);
    await page.locator('header .mq-nav a[href="#/sutras"]').click();
    await expect(page.locator('.sutra-card[data-id="s1"] .sutra-kid')).toHaveText('One more than the number before');
  });
});
