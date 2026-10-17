import { test, expect, open } from './fixtures';
import type { Page } from '@playwright/test';

/* Arena play experiences, continued (openspec play-experiences): Daily Number page-wide keys leave browser
   shortcuts alone, and Daily Number and Ghost Races read stored records back only as the values they offer.
   Play state lives under vm.play.<player id>.<key>; the fixtures' Player is p1. */

const blur = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
const picked = (page: Page) => page.locator('.dn-board [aria-pressed="true"]');

test('Daily Number: page-wide keys with Ctrl, Meta or Alt are left to the browser', async ({ page, issues }) => {
  await open(page, '#/arena/daily-number');
  await expect(page.locator('.dn-board button')).toHaveCount(6);
  await blur(page);
  for (const k of ['Control+1', 'Alt+1', 'Meta+1']) await page.keyboard.press(k);
  await expect(picked(page)).toHaveCount(0);
  /* the same key alone still picks the first number */
  await page.keyboard.press('1');
  await expect(picked(page)).toHaveCount(1);
  await blur(page);
  await page.keyboard.press('Control+KeyX');
  await expect(page.locator('.dn-op[aria-pressed="true"]')).toHaveCount(0);
  await page.keyboard.press('x');
  await expect(page.locator('.dn-op[data-op="x"]')).toHaveAttribute('aria-pressed', 'true');
  /* finish a move, then Cmd or Ctrl with Backspace does not undo it */
  await blur(page);
  await page.keyboard.press('2');
  await expect(page.locator('.dn-log li')).toHaveCount(1);
  await blur(page);
  for (const k of ['Meta+Backspace', 'Control+Backspace', 'Alt+Backspace']) await page.keyboard.press(k);
  await expect(page.locator('.dn-log li')).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(page.locator('.dn-log li')).toHaveCount(0);
  expect(issues.console).toEqual([]);
});

test('Daily Number: an archived day stored with markup for its stars renders numbers only', async ({ page, issues }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('vm.play.p1.daily')) return;
    const d = new Date(); d.setDate(d.getDate() - 1);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('vm.play.p1.daily', JSON.stringify({ days: { [`${day}:challenger`]: { tiers: [{ moves: [], done: true, stars: '<img id="pwn" src="x">' }, { moves: [], done: true, stars: 2 }, { moves: [], done: false }] } }, played: [] }));
  });
  await open(page, '#/arena/daily-number/archive');
  await expect(page.locator('.dn-arch li').first()).toBeVisible();
  await expect(page.locator('#pwn')).toHaveCount(0);
  await expect(page.locator('.dn-day.is-part .dn-day-s').first()).toHaveText('2/9 ★');
  expect(issues.console).toEqual([]);
});
