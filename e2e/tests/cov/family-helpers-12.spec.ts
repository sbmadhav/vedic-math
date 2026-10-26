import { test, expect, open } from '../fixtures';
import { SKILL, ON, who, askFriend } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Screen readers hear the friends", Scenario "A visit with a
   screen reader": the polite live region says the friend's name and words; the art is hidden. */
test.use({ seedPlayer: ON });

test('A visit with a screen reader: the live region names the friend and says the words; the art is aria-hidden', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page);
  const name = (await who(page).textContent()) || '';
  expect(['Shunya', 'Nava', 'Eka']).toContain(name);
  await expect(page.locator('#vmLive')).toContainText(`${name} says:`);
  await expect(page.locator('#vmLive')).toHaveAttribute('aria-live', 'polite');
  const art = page.locator('.fh-visit svg.fh-art');
  expect(await art.count()).toBeGreaterThan(0);
  for (const s of await art.all()) await expect(s).toHaveAttribute('aria-hidden', 'true');
  for (const b of await page.locator('.fh-visit button').all()) expect(((await b.textContent()) || (await b.getAttribute('aria-label')) || '').trim()).not.toBe('');
});
