import { test, expect, open } from '../fixtures';

/* sky spec, Requirements "Belts are earned by lighting Stars" and "Existing Kata progress lights Stars": one test per
   scenario. The one-time migration (js/sky.js migrateSky) runs on a record without skyMigrated. */
type Page = import('@playwright/test').Page;
const star = (page: Page, k: string) => page.locator(`.sky-star[data-star="${k}"]`);
const blank = { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, katasDone: {}, ratings: {}, weekSparks: {} };
/** The answer to the from9 question on screen: 1,000 − 637 = ? */
async function from9Answer(page: Page) {
  const [a, b] = (await page.locator('#stQ').innerText()).match(/[\d,]+/g)!.map(x => Number(x.replace(/,/g, '')));
  return String(a - b);
}

test.use({ seedPlayer: { sky: true } });

test.describe('eight white belt Stars lit', () => {
  const lit: Record<string, number> = {};
  for (const k of ['from9:2', 'from9:3', 'by11:1', 'by11:2', 'by11:3', 'times5:1', 'times5:2', 'times5:3']) lit[k] = 1;
  test.use({ seedProgress: { ...blank, skyMigrated: 1, sky: { lit, skipped: {}, last: {} } } });
  test('Ninth Star: lighting the last white belt Star earns the white belt', async ({ page }) => {
    await open(page, '#/dojo');
    await expect(page.locator('#view')).toContainText('0 of 7 belts earned');
    await open(page);
    await star(page, 'from9:1').click();
    await expect(page).toHaveURL(/#\/star\/from9\/1$/);
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
      await page.keyboard.type(await from9Answer(page)); await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    await open(page, '#/dojo');
    await expect(page.locator('#view')).toContainText('1 of 7 belts earned');
    await expect(page.locator('.belt-chip.on')).toHaveText(/White belt/);
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mathquest.v1.p1')!).belts || {}))).toEqual(['white']);
  });
});

test.describe('the yellow belt under the old mastery rule, four yellow Stars lit', () => {
  /* The yellow belt is seeded as already kept (belts), with no mastered Tricks, so nothing can earn it again: only
     keeping the Belt the Player held can show it. The record has no skyMigrated, so the one-time migration runs. */
  test.use({ seedProgress: { ...blank, belts: { yellow: 1 }, sky: { lit: { 'sq5:1': 1, 'sq5:2': 1, 'by9s:1': 1, 'ends10:1': 1 }, skipped: {}, last: {} } } });
  test('Earned before: the Player still holds the yellow belt', async ({ page }) => {
    await open(page, '#/dojo');
    await expect(page.locator('.belt-chip.on')).toHaveText(/Yellow belt/);
    await expect(page.locator('#view')).toContainText('1 of 7 belts earned');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(Object.keys(saved.belts || {})).toEqual(['yellow']);
    expect(saved.skills || {}).toEqual({});
  });
});

test.describe('Katas 1 to 9 of from9 done before the update', () => {
  const katasDone: Record<string, number> = {};
  for (let k = 1; k <= 9; k++) katasDone[`k:from9:${k}`] = 1;
  test.use({ seedProgress: { ...blank, katasDone } });
  test('Katas 1 to 9 done: Star 1 starts lit and Stars 2 and 3 do not', async ({ page }) => {
    await open(page);
    await expect(star(page, 'from9:1')).toHaveClass(/sky-star--lit/);
    await expect(star(page, 'from9:2')).not.toHaveClass(/sky-star--lit/);
    await expect(star(page, 'from9:3')).not.toHaveClass(/sky-star--lit/);
  });
});

test.describe('8 of Katas 18 to 34 done', () => {
  const katasDone: Record<string, number> = {};
  for (let k = 18; k <= 25; k++) katasDone[`k:from9:${k}`] = 1;
  test.use({ seedProgress: { ...blank, katasDone } });
  test("Eight of Star 2's Katas: Star 2 is not lit", async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-star')).toHaveCount(63);
    await expect(star(page, 'from9:2')).not.toHaveClass(/sky-star--lit/);
    await expect(star(page, 'from9:2')).toHaveAttribute('aria-label', /not lit yet$/);
  });
});
