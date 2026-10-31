import { test, expect, open, APP, atRoute } from '../fixtures';

/* sky spec, Requirements "Landmarks", "All places", "Back to the Sky" and "The Sky's art and Calm": one test per
   scenario. */
type Page = import('@playwright/test').Page;
const star = (page: Page, k: string) => page.locator(`.sky-star[data-star="${k}"]`);
async function from9Answer(page: Page) {
  const [a, b] = (await page.locator('#stQ').innerText()).match(/[\d,]+/g)!.map(x => Number(x.replace(/,/g, '')));
  return String(a - b);
}

test.use({ seedPlayer: { sky: true } });

test('Arena Landmark: the race track Landmark opens the Arena', async ({ page }) => {
  await open(page);
  await page.locator('.sky-mark[data-landmark="arena"]').click();
  await expect(page).toHaveURL(atRoute('#/arena'));
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
});

test.describe('Star 2 of sq5 skipped', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: {}, skipped: { 'sq5:2': 1 }, last: {} } } });
  test('Reaching a Star from the list: All places, then Enter on "Square numbers ending in 5, Star 2, skipped" opens its round', async ({ page }) => {
    await open(page);
    await page.locator('#skyPlaces').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(atRoute('#/places'));
    await expect(page.locator('#view h1')).toHaveText('All places');
    const sk = page.getByRole('link', { name: 'Square numbers ending in 5, Star 2, skipped' });
    await sk.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(atRoute('#/star/sq5/2'));
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  });
});

test('After lighting a Star: Back to the Sky shows that Star lit, with focus on it', async ({ page }) => {
  await open(page);
  await star(page, 'from9:1').click();
  await expect(page).toHaveURL(atRoute('#/star/from9/1'));
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await from9Answer(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  await page.locator('#stBack').click();
  await expect(page).toHaveURL(atRoute('#/'));
  await expect(star(page, 'from9:1')).toHaveClass(/sky-star--lit/);
  await expect(star(page, 'from9:1')).toBeFocused();
});

test.describe('motion paused site-wide', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('Motion paused: no layer moves and every Star and label is shown', async ({ page }) => {
    await page.route(/\/play\/(index\.html)?(\?.*)?$/, async route => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace('<html lang="en">', '<html lang="en" class="motion-paused">') });
    });
    await open(page);
    await expect(page.locator('.sky')).toHaveClass(/\bstill\b/);
    await page.mouse.move(300, 500); await page.mouse.move(700, 700);
    await page.waitForTimeout(1500);
    const running = await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target as Element | null; return !!t && !!t.closest('.sky'); }).length);
    expect(running).toBe(0);
    expect(await page.locator('.sky-layer').first().getAttribute('transform')).toBeNull();
    const stars = page.locator('.sky-star');
    await expect(stars).toHaveCount(63);
    for (let i = 0; i < 63; i++) await expect(stars.nth(i)).toBeVisible();
    await expect(page.locator('.sky-names text')).toHaveCount(17);
  });
});
