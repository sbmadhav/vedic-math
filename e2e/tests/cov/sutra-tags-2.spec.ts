import { test, expect, open, APP } from '../fixtures';

/* sutra-tags spec (openspec change sutras-first), Requirement "Tags where a Trick is learned": one test per scenario. */

test('A Kata: Kata 1 of Subtract from 100, 1000, 10000 shows the Nikhilaṃ tag with its meaning under the heading', async ({ page }) => {
  await open(page, '#/kata/from9/1');
  const tag = page.locator('#view h1 + .sutra-tag');
  await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect(tag.locator('.sutra-tag-m')).toHaveText('All from 9 and the last from 10');
});

test("The Dojo: each of the 21 Trick cells has a tag link to its Sutra's Deep dive", async ({ page }) => {
  await open(page, '#/dojo');
  const cells = page.locator('.dojo-cell');
  await expect(cells).toHaveCount(21);
  for (const c of await cells.all()) await expect(c.locator('a.sutra-tag-a')).toHaveAttribute('href', new RegExp(`^${APP}sutras/[su]\\d+$`));
});
