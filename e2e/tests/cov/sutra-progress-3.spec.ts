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

test.describe('a Challenger who practiced Square numbers ending in 5 (no Star lit) and flipped the Ūrdhva-Tiryagbhyām card', () => {
  /* The started definition of "Progress per Sutra comes from what the device keeps", as Home reads it from
     js/sutra-progress.js (progressOf().begun, the Sutras page's computation): a practiced Trick (a Skill record) starts
     its Sutra; a collected card alone does not. Ūrdhva-Tiryagbhyām comes before Ekādhikena Pūrveṇa on Bolt's path, so a
     collected card that counted would be listed first. */
  test.use({ seedProgress: { v: 3, skills: { 'v-sq5': { n: 2, c: 1, m: 0.5, streak: 1, last: 0 } }, seen: { 'sutra:Ūrdhva-Tiryagbhyām': 1 } } });
  test('A started Sutra is listed, a collected card alone is not: the next Star\'s Sutra, then Ekādhikena Pūrveṇa with "0 of 9 Stars lit", and no Ūrdhva-Tiryagbhyām', async ({ page }) => {
    await open(page);
    const rows = page.locator('.your-sutras a.your-sutra');
    await expect(rows).toHaveCount(2);
    await expect(rows.locator('b[lang="sa-Latn"]')).toHaveText(['Nikhilaṃ Navataścaramaṃ Daśataḥ', 'Ekādhikena Pūrveṇa']);
    await expect(rows.nth(1)).toHaveAttribute('href', '#/sutras/s1');
    await expect(rows.nth(1).locator('.sutra-prog small')).toHaveText('0 of 9 Stars lit');
    /* the card is collected (the seed took), so its absence above is the definition at work */
    await page.evaluate(() => { location.hash = '#/sutras'; });
    await expect(page.locator('.sutra-card[data-id="s3"] .sutra-got')).toHaveText('Collected');
    await expect(page.locator('.sutra-card[data-id="s3"] .sutra-prog small')).toHaveText('0 of 9 Stars lit');
  });
});
