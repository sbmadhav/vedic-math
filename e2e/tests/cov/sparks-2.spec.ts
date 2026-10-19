import { test, expect, open, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* sparks spec, Requirement "Stored XP carries over 1:1":
   - Scenario "A Player with 2,340 XP opens the app after the update": saved progress with 2,340 XP, 410 of
     them this week, loads as 2,340 Sparks, 410 this week, and the Title they had before (old Level 7 of
     50 * n * (n - 1) XP, one Title per two levels: Times Tamer).
   - Scenario "Restoring an old backup code": a backup code from before the update with 900 XP restores as
     900 Sparks.
   Weekly Sparks are seen where the app uses them: the weekly Sparks Board post, which goes to the fake
   Firebase SDK in fixtures.ts (never production). */

/* This week's id as js/store.js isoWeek computes it, so the seeded weekly XP lands in the current week */
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
const WK = isoWeek();
const v2 = (xp: number, weekXp: Record<string, number>) => ({ v: 2, skills: {}, xp, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, stars: {}, ratings: {}, weekXp, questDay: null });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
const sparksWrites = async (page: Page) => (await cloudLog(page)).writes.filter(w => /^boards\/xp-week-/.test(w.path));

test.describe('a Player with 2,340 XP (410 this week) opens the app after the update', () => {
  test.use({ seedMode: 'challenger', seedConsent: { age: 'adult' }, seedProgress: v2(2340, { [WK]: 410 }) });

  test('they have 2,340 Sparks, 410 this week, and the Title they had before', async ({ page }) => {
    await page.clock.install();
    await open(page, '#/me');
    // 2,340 Sparks and the Title from before (Times Tamer), with no XP shown
    await expect(page.locator('.me-head')).toContainText('Times Tamer · 2340 Sparks');
    await expect(page.locator('.me-head')).toContainText('1260 Sparks to Fraction Fighter');
    await expect(page.locator('.me-head')).not.toContainText(/\bXP\b/);
    await expect(page.locator('#mqChip a.mq-chip')).toHaveAttribute('aria-label', 'Swift Tiger 42, Times Tamer');
    // Stored as the same numbers, not reset or rounded
    const d = await saved(page);
    expect(d.v).toBe(3);
    expect(d.sparks).toBe(2340);
    expect(d.weekSparks).toEqual({ [WK]: 410 });

    // This week's Sparks are 410: earning 5 more (a sutra card) posts 415 to this week's Sparks Board
    await page.goto('/play/#/sutras');
    await page.locator('.sutra-card .sutra-face').first().click();
    await page.clock.runFor(3_500);
    await expect.poll(async () => (await sparksWrites(page)).length).toBe(1);
    const [w] = await sparksWrites(page);
    expect(w.path).toBe(`boards/xp-week-${WK}-challenger/scores/e2e-fake-uid`);
    expect(w.data.score).toBe(415);
    const after = await saved(page);
    expect(after.sparks).toBe(2345);
    expect(after.weekSparks).toEqual({ [WK]: 415 });
  });
});

test.describe('restoring a backup code saved before the update', () => {
  test.use({ seedMode: 'challenger' });

  test('a code with 900 XP restores as 900 Sparks', async ({ page }) => {
    await open(page, '#/me');
    await expect(page.locator('.me-head')).toContainText('Number Rookie · 0 Sparks');
    // The backup code format from before Sparks: base64 of { player, data } with xp and weekXp
    const old = { player: { id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger' }, data: v2(900, {}) };
    const code = Buffer.from(JSON.stringify(old), 'utf8').toString('base64');
    page.once('dialog', d => d.accept(code));
    await page.locator('#pImport').click();
    // (the Me view re-renders right after "Progress restored.", so the restored totals are what is checked)
    await expect(page.locator('.me-head')).toContainText('Digit Dasher · 900 Sparks');
    await expect(page.locator('.me-head')).not.toContainText(/\bXP\b/);
    const d = await saved(page);
    expect(d.sparks).toBe(900);
    // It stays 900 after a reload
    await page.reload();
    await expect(page.locator('.me-head')).toContainText('Digit Dasher · 900 Sparks');
  });
});
