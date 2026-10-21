import { test, expect, open } from '../fixtures';

/* sutra-tags spec (openspec change sutras-first), Requirement "A Sutra tag names the Sutra and what it means": one test
   per scenario. */

test('A Trick page in Challenger: the tag reads Sutra, Ekādhikena Pūrveṇa and its meaning, with Say it, linking to #/sutras/s1', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const tag = page.locator('.mq-sutra.sutra-tag--full');
  await expect(tag.locator('.sutra-tag-k')).toHaveText('Sutra');
  await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(tag.locator('.sutra-tag-m')).toHaveText('By one more than the one before');
  await expect(tag.getByRole('button', { name: 'Hear how to say Ekādhikena Pūrveṇa' })).toBeVisible();
  await expect(tag.getByRole('link', { name: /^Sutra Ekādhikena Pūrveṇa.*By one more than the one before.*open its deep dive$/ })).toHaveAttribute('href', '#/sutras/s1');
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer words: the meaning reads "One more than the number before"', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    await expect(page.locator('.mq-sutra .sutra-tag-m')).toHaveText('One more than the number before');
  });
});
