import { test, expect } from '../fixtures';

/* landing-pages, Requirement "The Mode cards are links" (openspec change landing-modes-and-return):
   one test per scenario. */
test.use({ seedMode: null });

test('A card is a link: three links named by their call to action, to /learn/?mode=<id>', async ({ page }) => {
  await page.goto('/');
  for (const [id, name] of [['explorer', 'Explorer'], ['challenger', 'Challenger'], ['pro', 'Pro']]) {
    const card = page.getByRole('link', { name: `Start as ${name}` });
    await expect(card).toHaveAttribute('href', `/learn/?mode=${id}`);
    await expect(card.locator('.lv-mode-cta')).toBeVisible();
    await expect(card.locator('.lv-mode-cta')).toHaveText(`Start as ${name}`);
  }
});

test('Tapping a card: the Explorer card opens the Explorer Home, not the picker, with no query left', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start as Explorer' }).click();
  await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
  await expect(page.locator('.mode-pick')).toHaveCount(0);
  expect(new URL(page.url()).search).toBe('');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0].mode)).toBe('explorer');
});
