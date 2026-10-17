import { test, expect, open, APP, type Page } from '../fixtures';

/* badges spec, Requirement "Title badges", Scenario "Reaching Fraction Fighter":
   WHEN a Player's Sparks reach 3600 THEN they earn the Fraction Fighter badge. */

const badge = (page: Page, name: string) => page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));

/* One right first-try times-table answer on a fresh Skill: 10 + streak 1 = 11 Sparks */
async function answerRight(page: Page) {
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
}

test.describe('Sparks reaching exactly 3600', () => {
  test.use({ seedProgress: { v: 3, sparks: 3589, weekSparks: {}, badges: {} } });

  test('earns the Fraction Fighter badge, shown earned on the Me page', async ({ page }) => {
    await open(page, '#/me');
    await expect(badge(page, 'Fraction Fighter')).not.toHaveClass(/\bgot\b/);
    await expect(badge(page, 'Fraction Fighter')).toContainText('Reach the Fraction Fighter Title (3600 Sparks).');

    await page.goto(`${APP}#/skill/3-mult`);
    await expect(page.locator('#practice #prQ')).toBeVisible();
    await answerRight(page);
    await expect(page.getByText(/Badge earned:\s*Fraction Fighter/)).toBeVisible();

    const d = await saved(page);
    expect(d.sparks).toBe(3600);
    expect(d.badges.level10).toBeTruthy();

    await page.goto(`${APP}#/me`);
    await expect(badge(page, 'Fraction Fighter')).toHaveClass(/\bgot\b/);
  });
});

test.describe('Sparks just short of 3600', () => {
  test.use({ seedProgress: { v: 3, sparks: 3588, weekSparks: {}, badges: {} } });

  test('3599 Sparks does not earn Fraction Fighter', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    await answerRight(page);
    const d = await saved(page);
    expect(d.sparks).toBe(3599);
    expect(d.badges.level10).toBeUndefined();
    await page.goto(`${APP}#/me`);
    await expect(badge(page, 'Fraction Fighter')).not.toHaveClass(/\bgot\b/);
  });
});
