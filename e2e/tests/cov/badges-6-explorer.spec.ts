import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* badges spec, Requirement "Badges listed per Mode":
   - Scenario "Explorer Me page": an Explorer with no belt sees no belt badge and no Sutra scholar, and the count's
     total is the number of badges listed.
   - Scenario "A belt kept from Challenger": the White belt earned in Challenger is listed as earned in Explorer; the
     Green and Black belt badges are not listed. */
const badge = (page: Page, name: string) => page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });
const total = (page: Page) => page.locator('.mq-strand', { hasText: 'Badges' }).locator('small');

test.describe('Explorer Me page', () => {
  test.use({ seedMode: 'explorer' });
  test('no belt badge and no Sutra scholar; the total is the listed count', async ({ page }) => {
    await open(page, '#/me');
    for (const name of ['White belt', 'Green belt', 'Black belt', 'Sutra scholar']) await expect(badge(page, name)).toHaveCount(0);
    const n = await page.locator('.badge-grid .badge').count();
    expect(n).toBeGreaterThan(10);
    await expect(total(page)).toHaveText(`0 of ${n}`);
  });
});

test.describe('A belt kept from Challenger', () => {
  test.use({ seedMode: 'explorer', seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: { 'belt-white': 1700000000000 }, counts: {}, seen: {}, belts: { white: 1700000000000 } } });
  test('the White belt is listed as earned, Green and Black are not listed', async ({ page }) => {
    await open(page, '#/me');
    await expect(badge(page, 'White belt')).toHaveCount(1);
    await expect(badge(page, 'White belt')).toHaveClass(/\bgot\b/);
    await expect(badge(page, 'Green belt')).toHaveCount(0);
    await expect(badge(page, 'Black belt')).toHaveCount(0);
    const n = await page.locator('.badge-grid .badge').count();
    await expect(total(page)).toHaveText(`1 of ${n}`);
  });
});
