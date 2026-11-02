import { test, expect, APP, open, pathTo } from '../fixtures';

/* sutra-tags spec (openspec change sutras-first), Requirement "Tags in a Star round": one test per scenario. */

test('A Star names its Sutra: Star 1 of Multiply by 11 shows "A special case of Ūrdhva-Tiryagbhyām" as text, and the replay after a miss names it', async ({ page }) => {
  await open(page, '#/star/by11/1');
  const head = page.locator('.star-top .star-sutra');
  await expect(head.locator('.sutra-tag-k')).toHaveText('A special case of');
  await expect(head.locator('b[lang="sa-Latn"]')).toHaveText('Ūrdhva-Tiryagbhyām');
  await expect(head.locator('.sutra-tag-m')).toHaveText('Vertically and crosswise');
  await expect(head.locator('a')).toHaveCount(0);
  await page.locator('.star-key[data-k="0"]').click();
  await page.locator('.star-key[data-k="go"]').click();
  await expect(page.locator('.star-replay .star-tag--trick')).toHaveText('The Trick · Ūrdhva-Tiryagbhyām');
});

test('The end screen links: when the round ends, its tag is a link to #/sutras/s3', async ({ page }) => {
  await open(page, '#/star/by11/1');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await page.locator('#stSkip').click();
  await expect(page.locator('.star-end a.sutra-tag-a')).toHaveAttribute('href', pathTo('#/sutras/s3'));
});

test.describe('a new visitor', () => {
  test.use({ seedMode: null });
  test("Try a trick's card: from Pro Home, the card's Sutra block is the tag Sutra Nikhilaṃ with its meaning and Say it, a link to #/sutras/s2", async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    const tag = page.locator('.try-sutra.sutra-tag--full');
    await expect(tag.locator('.sutra-tag-k')).toHaveText('Sutra');
    await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(tag.locator('.sutra-tag-m')).toHaveText('All from 9 and the last from 10');
    await expect(tag.locator('.say-btn')).toBeVisible();
    await expect(tag.locator('a.sutra-tag-a')).toHaveAttribute('href', pathTo('#/sutras/s2'));
  });
});
