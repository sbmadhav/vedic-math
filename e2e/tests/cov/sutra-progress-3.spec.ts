import { test, expect, open } from '../fixtures';

/* sutra-progress spec (openspec change sutras-first), Requirement "Your sutras on Home": one test per scenario. */

test('A new Challenger: "Your sutras" lists Nikhilaṃ Navataścaramaṃ Daśataḥ, the Sutra of the next Star, with "0 of 9 Stars lit" and a link to see all 29 sutras', async ({ page }) => {
  await open(page);
  const yours = page.locator('.your-sutras');
  await expect(yours.locator('h2')).toHaveText('Your sutras');
  const rows = yours.locator('a.your-sutra');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('href', '#/sutras/s2');
  await expect(rows.first().locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect(rows.first().locator('.sutra-prog small')).toHaveText('0 of 9 Stars lit');
  await expect(yours.getByRole('link', { name: 'See all 29 sutras' })).toHaveAttribute('href', '#/sutras');
});
