import { test, expect, open } from '../fixtures';

/* sutra-tags spec (openspec change sutras-first), Requirement "Tags on Arena results, Watch and games": one test per
   scenario. */

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('The Arena round review: Nikhilaṃ is listed when near-base products were asked, with right of asked, and percents and divisions are not counted', async ({ page }) => {
    await open(page, '#/arena');
    await page.locator('[data-t="untimed"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    const qs: string[] = [];
    for (let k = 0; k < 20; k++) {
      if (k < 19) await expect(page.locator('#arNum')).toHaveText(`${k + 1}/20`);
      qs.push((await page.locator('#arQ').innerHTML()).trim());
      await page.locator('.ar-key[data-k="1"]').click();
      await page.locator('#arForm button').click();
    }
    await expect(page.locator('.play-shell .ar-result')).toBeVisible();
    const tagged = qs.filter(q => /×|&times;|<sup>2<\/sup>/.test(q) && !/÷|&divide;|%/.test(q)).length;
    /* near-base: both factors over 80 (a new Pro's Rating never reaches the 2-digit products that big) */
    const near = qs.some(q => { const n = (q.match(/\d+/g) || []).map(Number); return /×|&times;/.test(q) && n[0] >= 80 && n[1] >= 80; });
    const review = page.locator('.play-shell .ar-sutras');
    if (!tagged) { await expect(review).toHaveCount(0); return; }
    await expect(review.locator('h3')).toHaveText('Sutras in this round');
    const counts = await review.locator('.sutra-tag-x').allInnerTexts();
    expect(counts.map(c => Number(c.match(/^(\d+) of (\d+) right$/)![2])).reduce((a, b) => a + b, 0)).toBe(tagged);
    expect((await review.locator('b[lang="sa-Latn"]').allInnerTexts()).includes('Nikhilaṃ Navataścaramaṃ Daśataḥ')).toBe(near);
  });
});

test('Watch: the player for a Square numbers ending in 5 video shows the Ekādhikena Pūrveṇa tag as a link, and its card names it', async ({ page }) => {
  await open(page, '#/watch');
  await page.locator('[data-k="tricks"][data-v="true"]').click();
  const card = page.locator('.watch-card[data-tricks~="sq5"]').first();
  await expect(card.locator('.tagv--sutra')).toHaveText('Ekādhikena Pūrveṇa');
  await card.click();
  await expect(page.locator('dialog.vm-player .vp-foot a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s1');
});

test('A game: the Answer checker page shows "Uses the idea of Guṇitasamuccayaḥ" with its meaning', async ({ page }) => {
  await open(page, '#/game/check-it');
  const tag = page.locator('#view h1 + .sutra-tag');
  await expect(tag.locator('.sutra-tag-k')).toHaveText('Uses the idea of');
  await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Guṇitasamuccayaḥ');
  await expect(tag.locator('.sutra-tag-m')).toHaveText('The product of the sums is the sum of the product');
});
