import { test, expect, open } from '../fixtures';

/* sutra-progress spec (openspec change sutras-first), Requirement "Progress is shown on each Sutra card and in its Deep
   dive": one test per scenario. */

test.describe('a Challenger who lit Star 1 of Square numbers ending in 5', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'sq5:1': 1 }, skipped: {}, last: {} } } });
  test('A Challenger card: the Ekādhikena Pūrveṇa card reads "1 of 9 Stars lit"', async ({ page }) => {
    await open(page, '#/sutras');
    await expect(page.locator('.sutra-card[data-id="s1"] .sutra-face .sutra-prog small')).toHaveText('1 of 9 Stars lit');
  });
});

test('A card with no Trick: the Pūraṇāpūraṇābhyām card says there is no trick for this one yet', async ({ page }) => {
  await open(page, '#/sutras');
  await expect(page.locator('.sutra-card[data-id="s8"] .sutra-face .sutra-prog small')).toHaveText(/^No trick for this one yet/);
});
