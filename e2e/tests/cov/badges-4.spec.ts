import { test, expect, open } from '../fixtures';

/* badges spec: "Earned badges are kept" and "Title badges / Earned before the update".
   Each test seeds a saved record holding a badge earned under an old rule, without the progress the
   current rule asks for, so the badge can only show as earned because it was kept. */

const badge = (page: import('@playwright/test').Page, name: string) =>
  page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });

test.describe('Duelist earned under the old rule', () => {
  // Earned by pressing Start (old rule): the badge is held, but no duel was ever finished (duelsDone 0).
  // The Duelist badge became Party host (same id, openspec play-experiences), so it shows under its new name.
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: { duel: 1700000000000 }, counts: {}, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null } });

  test('the Me page still shows it as earned, as Party host', async ({ page }) => {
    await open(page, '#/me');
    const duelist = badge(page, 'Party host');
    await expect(duelist).toHaveCount(1);
    await expect(duelist).toHaveClass(/\bgot\b/);
    // The saved record keeps it (the app does not drop it when it re-checks badges)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').badges?.duel)).toBe(1700000000000);
  });
});

test.describe('Level 10 badge earned before the update', () => {
  // A record from before Sparks (v2) that earned the old "Level 10" badge (id level10) with fewer than 3600 XP,
  // so the new Sparks rule alone would not award it
  test.use({ seedProgress: { v: 2, skills: {}, xp: 1500, days: {}, best: {}, last: null, grade: null, badges: { level10: 1700000000000 }, counts: {}, seen: {}, stars: {}, ratings: {}, weekXp: {}, questDay: null } });

  test('the Me page shows it as "Fraction Fighter", earned', async ({ page }) => {
    await open(page, '#/me');
    const ff = badge(page, 'Fraction Fighter');
    await expect(ff).toHaveCount(1);
    await expect(ff).toHaveClass(/\bgot\b/);
    // Named after the Title, never a level number
    await expect(page.locator('.badge-grid')).not.toContainText(/Level\s*\d/);
    await expect(ff).not.toContainText(/level/i);
    await expect(ff).toContainText('Fraction Fighter');
  });
});
