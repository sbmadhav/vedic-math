import { test, expect } from '../fixtures';
import { TRICK_PAGES, INDEX, trickUrl, openTrick } from '../trick-kit';

/* trick-pages spec, Requirements "A static page for each of 15 Tricks" and "An index of the Trick pages": one test per
   scenario. */

test('Square numbers ending in 5: the heading, the Sutra line with its Deep dive link, and Practice this trick', async ({ page }) => {
  await openTrick(page, 'square-numbers-ending-in-5');
  await expect(page.locator('main h1')).toHaveText('Square numbers ending in 5');
  const sutra = page.locator('.tk-sutra');
  await expect(sutra).toContainText('Ekādhikena Pūrveṇa');
  await expect(sutra).toContainText('By one more than the one before');
  await expect(sutra).toContainText("Bharati Krishna Tirtha's 1965 book");
  await expect(sutra.locator('a')).toHaveAttribute('href', '/play/#/sutras/s1');
  await expect(page.getByRole('link', { name: 'Practice this trick' })).toHaveAttribute('href', '/play/#/skill/v-sq5');
  await expect(page.locator('body > header .md-brand')).toBeVisible();
  await expect(page.locator('footer')).toContainText('Privacy');
});

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false, seedMode: null });
  for (const slug of ['square-numbers-ending-in-5', 'multiply-numbers-near-100', 'cube-roots-in-your-head']) {
    test(`${trickUrl(slug)}: the worked example shows every step and no calculator button is shown`, async ({ page }) => {
      await openTrick(page, slug, { js: false });
      const steps = page.locator('.tk-steps li');
      expect(await steps.count()).toBeGreaterThanOrEqual(3);
      for (const li of await steps.all()) await expect(li).toBeVisible();
      await expect(page.locator('.tk-steps li').last().locator('.tk-say')).toContainText(/=|is/);
      await expect(page.locator('#tkShow')).toBeHidden();
      await expect(page.locator('#tkNext')).toBeHidden();
      await expect(page.locator('#tkCalc')).toBeHidden();
      await expect(page.getByRole('link', { name: 'Practice this trick' })).toBeVisible();
    });
  }
});

test('The index: 15 links, one to each Trick page, each named by the Trick\'s title', async ({ page }) => {
  await page.goto(INDEX);
  await expect(page.locator('main h1')).toHaveText('Speed tricks');
  const links = page.locator('main .tk-list a');
  await expect(links).toHaveCount(15);
  for (const t of TRICK_PAGES) await expect(page.locator('main').getByRole('link', { name: t.title, exact: true })).toHaveAttribute('href', trickUrl(t.slug));
});
