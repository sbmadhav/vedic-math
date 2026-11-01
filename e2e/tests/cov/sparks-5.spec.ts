import { test, expect, open, type Page } from '../fixtures';

/* sparks spec, Requirement "Titles from total Sparks":
   - Scenario "The eleven Titles": Number Rookie from 0, Digit Dasher from 300, Sum Sprinter from 1000, Times Tamer
     from 2100, Fraction Fighter from 3600, Sutra Scout from 5500, Mental Ninja from 7800, Equation Ace from 10500,
     Pattern Sage from 13600, Calculus Comet from 17100 and Vedic Legend from 21000.
   - Scenario "Same Title as before": a Player who was "Level 6 · Sum Sprinter" (old levels: 50 * n * (n - 1) XP,
     so Level 6 is 1500 to 2099 XP) loads the app after the update and is a Sum Sprinter, with no number shown. */

const TITLES: [number, string][] = [
  [0, 'Number Rookie'], [300, 'Digit Dasher'], [1000, 'Sum Sprinter'], [2100, 'Times Tamer'], [3600, 'Fraction Fighter'],
  [5500, 'Sutra Scout'], [7800, 'Mental Ninja'], [10500, 'Equation Ace'], [13600, 'Pattern Sage'], [17100, 'Calculus Comet'],
  [21000, 'Vedic Legend'],
];

/* Replaces the active Player's saved progress and reloads the Me page */
async function loadWith(page: Page, progress: Record<string, unknown>) {
  await page.evaluate(p => localStorage.setItem('mathquest.v1.p1', JSON.stringify(p)), progress);
  await page.reload();
  await expect(page.locator('.me-head')).toBeVisible();
}
const v3 = (sparks: number) => ({ v: 3, sparks, weekSparks: {} });
const v2 = (xp: number) => ({ v: 2, skills: {}, xp, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, stars: {}, ratings: {}, weekXp: {}, questDay: null });

test('the eleven Titles start at their Sparks thresholds', async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, '#/me');
  const head = page.locator('.me-head');
  const chip = page.locator('#mqChip a.mq-chip');
  for (let i = 0; i < TITLES.length; i++) {
    const [from, title] = TITLES[i];
    // Exactly at the threshold: this Title
    await loadWith(page, v3(from));
    await expect(head.locator('p').first()).toHaveText(`${title} · ${from} Sparks`);
    await expect(chip).toHaveAccessibleName(`Swift Tiger 42, ${title}`);
    // One Spark short: still the Title before
    if (i > 0) {
      await loadWith(page, v3(from - 1));
      await expect(head.locator('p').first()).toHaveText(`${TITLES[i - 1][1]} · ${from - 1} Sparks`);
      await expect(chip).toHaveAccessibleName(`Swift Tiger 42, ${TITLES[i - 1][1]}`);
    }
  }
  // Far past the top threshold: still Vedic Legend, the top Title
  await loadWith(page, v3(99999));
  await expect(head.locator('p').first()).toHaveText('Vedic Legend · 99999 Sparks');
  await expect(head).toContainText('You hold the top Title.');
});

test('the Title table in the app is exactly the eleven Titles', async ({ page }) => {
  await open(page, '#/');
  const got = await page.evaluate(async () => {
    const gm = await e2eMod('gamify');
    return { table: gm.TITLES as [number, string][], at: (gm.TITLES as [number, string][]).map(([n]) => gm.titleInfo(n).title) };
  });
  expect(got.table).toEqual(TITLES);
  expect(got.at).toEqual(TITLES.map(([, t]) => t));
});

test.describe('a Player who was "Level 6 · Sum Sprinter" loads the app after the update', () => {
  test.use({ seedMode: 'challenger', seedProgress: v2(1500) });

  for (const xp of [1500, 1800, 2099]) {
    test(`with ${xp} XP they are a Sum Sprinter and no number is shown`, async ({ page }) => {
      await open(page, '#/me');
      if (xp !== 1500) await loadWith(page, v2(xp));
      const head = page.locator('.me-head');
      await expect(head.locator('p').first()).toHaveText(`Sum Sprinter · ${xp} Sparks`);
      await expect(head).not.toContainText(/\bLevel\b|\bLv\.?\s*\d/i);
      await expect(head).not.toContainText(/\bXP\b/);
      // The nav chip names the Title with no level number, and shows no digits at all
      const chip = page.locator('#mqChip a.mq-chip');
      await expect(chip).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
      expect(await chip.evaluate(e => [...e.children].filter(c => !c.classList.contains('md-sr-only')).map(c => c.textContent).join(''))).not.toMatch(/\d/); // on screen: the avatar and the bar (the name is for screen readers)
      // No "Level 6" anywhere on the Me page or the home page
      await expect(page.locator('body')).not.toContainText(/Level\s*6/i);
      await page.goto('/learn/');
      await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
      await expect(page.locator('#mqChip a.mq-chip')).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
      await expect(page.locator('body')).not.toContainText(/Level\s*6\b/i);
      // The saved record now holds the same total as Sparks
      const d = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
      expect(d.sparks).toBe(xp);
      expect(d.v).toBe(3);
    });
  }
});
