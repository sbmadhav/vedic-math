import { test, expect, open } from './fixtures';

/* Arena play experiences (openspec play-experiences): Party Mode setup, Daily Number keyboard play and rewards,
   Ghost Races links. Play state lives under vm.play.<player id>.<key>; the fixtures' Player is p1. */

const seats = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem('vm.play.p1.party') || '{}').seats || []).length);

test('Party setup: changing a level then adding a player adds exactly one seat, and a reload still works', async ({ page, issues }) => {
  await open(page, '#/arena/party');
  await expect(page.locator('.pt-seat')).toHaveCount(2);
  await page.locator('.pt-seat[data-i="0"] [data-lvl="challenger"]').click();
  await page.locator('.pt-seat[data-i="1"] [data-lvl="explorer"]').click();
  await page.locator('.pt-seat[data-i="0"] [data-color="sun"]').click();
  await page.locator('.pt-add').click();
  await expect(page.locator('.pt-seat')).toHaveCount(3);
  expect(await seats(page)).toBe(3);
  await expect(page.locator('.pt-seat[data-i="0"] [data-lvl="challenger"]')).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.locator('.pt-seat')).toHaveCount(3);
  await page.locator('.pt-add').click();
  await expect(page.locator('.pt-seat')).toHaveCount(4);
  await expect(page.locator('.pt-add')).toHaveCount(0);
  expect(await seats(page)).toBe(4);
  expect(issues.console).toEqual([]);
});

test('Party setup: a broken saved record (six seats, unknown colors) still opens, with four seats', async ({ page, issues }) => {
  await open(page, '#/arena/party');
  await page.evaluate(() => localStorage.setItem('vm.play.p1.party', JSON.stringify({ seats: Array.from({ length: 6 }, (_, i) => ({ adj: i, noun: i, color: i % 2 ? 'pink' : 'coral', level: 'wizard' })), length: 7, games: 'x' })));
  await page.reload();
  await expect(page.locator('.pt-seat')).toHaveCount(4);
  await expect(page.locator('.pt-start')).toBeVisible();
  await page.locator('.pt-start').click();
  await expect(page.locator('.pt-zone')).toHaveCount(4);
  expect(issues.console).toEqual([]);
});

test('Party: each buzzer is described by its question and status; no full screen button where full screen is missing', async ({ page }) => {
  await page.addInitScript(() => { try { Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false, configurable: true }); Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false, configurable: true }); } catch (e) { /* not redefinable */ } });
  await open(page, '#/arena/party');
  await page.locator('.pt-start').click();
  await expect(page.locator('.pt-fs')).toHaveCount(0);
  const zone = page.locator('.pt-zone').first();
  await expect(zone).toHaveAttribute('aria-describedby', 'ptZq0 ptZst0');
  await page.locator('.pt-go').click();
  await expect(page.locator('#ptZq0')).not.toBeEmpty();
});

test('Daily Number: keyboard play keeps focus on the board and the operations', async ({ page, issues }) => {
  await open(page, '#/arena/daily-number');
  const first = page.locator('.dn-board [data-slot="0"]');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toBeFocused();
  const plus = page.locator('.dn-op[data-op="+"]');
  await plus.focus();
  await page.keyboard.press('Enter');
  await expect(plus).toHaveAttribute('aria-pressed', 'true');
  await expect(plus).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(plus).toHaveAttribute('aria-pressed', 'false');
  await expect(plus).toBeFocused();
  /* an operation key while a tile has focus leaves focus on that tile */
  await first.focus();
  await page.keyboard.press('+');
  await expect(plus).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toBeFocused();
  /* finishing the move puts focus on the new number */
  const second = page.locator('.dn-board [data-slot="1"]');
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dn-log li')).toHaveCount(1);
  await expect(page.locator('.dn-board [data-slot="1"]')).toBeFocused();
  /* Undo with the keyboard keeps focus on a control that is still there */
  await page.locator('.dn-undo').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dn-log li')).toHaveCount(0);
  await expect(page.locator('.dn-board button').first()).toBeFocused();
  expect(issues.console).toEqual([]);
});

test('Daily Number: an early finish reports Sparks only with a star, and focus moves to the next target', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__plays = []; document.addEventListener('vmplay', (e: any) => (window as any).__plays.push(e.detail.action)); });
  await open(page, '#/arena/daily-number');
  await page.locator('.dn-board [data-slot="0"]').click();
  await page.locator('.dn-op[data-op="+"]').click();
  await page.locator('.dn-board [data-slot="1"]').click();
  const submit = page.locator('.dn-submit');
  if (await submit.isHidden()) test.skip(true, 'the first move hit the target');
  const stars = Number(((await submit.getAttribute('aria-label')) || '').match(/(\d) stars/)?.[1]);
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dn-done')).toBeVisible();
  await expect(page.locator('.dn-next')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__plays)).toEqual([stars >= 1 ? 'daily/solve' : 'daily/finish']);
  const paid = await page.evaluate(() => JSON.parse(localStorage.getItem('vm.play.p1.daily') || '{}').paid || []);
  expect(paid.length).toBe(stars >= 1 ? 1 : 0);
});

test('Daily Number: a corrupt saved move resets that target instead of failing to open', async ({ page, issues }) => {
  await open(page, '#/arena/daily-number');
  await page.evaluate(() => {
    const t = new Date(), day = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const fresh = () => ({ moves: [], done: false });
    localStorage.setItem('vm.play.p1.daily', JSON.stringify({ days: { [`${day}:challenger`]: { tiers: [{ moves: [[0, '/', 0], [9, '+', 2]], done: false }, fresh(), fresh()], practice: false } }, played: [] }));
  });
  await page.reload();
  await expect(page.locator('#view h1')).toHaveText('Daily Number');
  await expect(page.locator('.dn-board button')).toHaveCount(6);
  await expect(page.locator('.dn-log li')).toHaveCount(0);
  expect(issues.console).toEqual([]);
});

test('Ghost Races: a link with impossible times shows the torn-link message, with no errors', async ({ page, issues }) => {
  const huge = Buffer.from('1.4.1.a..zzzzzzzz,1').toString('base64url');
  await open(page, `#/arena/ghosts/r/${huge}`);
  await expect(page.locator('.gh-msg')).toContainText('That ghost link looks torn');
  const misses = Buffer.from(`1.4.1.a..2s,2s.${Array(201).fill('0:1').join(',')}`).toString('base64url');
  await open(page, `#/arena/ghosts/r/${misses}`);
  await expect(page.locator('.gh-msg')).toContainText('That ghost link looks torn');
  const fine = Buffer.from('1.4.1.a..2s,2s').toString('base64url');
  await open(page, `#/arena/ghosts/r/${fine}`);
  await expect(page.locator('.gh-invite')).toBeVisible();
  expect(issues.console).toEqual([]);
});

test.describe('320 px wide', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  test('Party setup with four players, Daily Number and Ghost Races fit without sideways scroll', async ({ page }) => {
    await open(page, '#/arena/party');
    await page.locator('.pt-add').click();
    await page.locator('.pt-add').click();
    await expect(page.locator('.pt-seat')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    for (const hash of ['#/arena/daily-number', '#/arena/ghosts']) {
      await open(page, hash);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), hash).toBe(true);
    }
  });
});
