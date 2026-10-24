import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* badges spec, Requirements "Belt badges follow Belts", "Badges are earned only by completion or correct use" and
   "Party host": one test per scenario. */
const blank = { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, katasDone: {}, ratings: {}, weekSparks: {} };
const badge = (page: Page, name: string) => page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });
const got = (page: Page) => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').badges || {}));
async function from9Answer(page: Page) {
  const [a, b] = (await page.locator('#stQ').innerText()).match(/[\d,]+/g)!.map(x => Number(x.replace(/,/g, '')));
  return String(a - b);
}

test.describe('eight white belt Stars lit', () => {
  const lit: Record<string, number> = {};
  for (const k of ['from9:2', 'from9:3', 'by11:1', 'by11:2', 'by11:3', 'times5:1', 'times5:2', 'times5:3']) lit[k] = 1;
  test.use({ seedPlayer: { sky: true }, seedProgress: { ...blank, skyMigrated: 1, sky: { lit, skipped: {}, last: {} } } });
  test('White belt: lighting the ninth white belt Star earns the White belt badge', async ({ page }) => {
    await open(page);
    expect(await got(page)).not.toContain('belt-white');
    await page.locator('.sky-star[data-star="from9:1"]').click();
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
      await page.keyboard.type(await from9Answer(page)); await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    await expect.poll(() => got(page)).toContain('belt-white');
    await open(page, '#/me');
    await expect(badge(page, 'White belt')).toHaveClass(/\bgot\b/);
  });
});

test('Description: the White belt badge says to light all 9 white belt Stars, not to master the tricks', async ({ page }) => {
  await open(page, '#/me');
  const b = badge(page, 'White belt');
  await expect(b).toContainText('Light all 9 white belt Stars.');
  await expect(b).not.toContainText(/[Mm]aster/);
});

test('Start a Party game and leave: the Party host badge is not awarded', async ({ page }) => {
  await open(page, '#/arena/party');
  await page.locator('.pt-start').click();
  await expect(page.locator('.pt-start')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/games'; });
  await expect(page.locator('#view h1').first()).not.toHaveText('Party Mode');
  expect(await got(page)).not.toContain('duel');
  await open(page, '#/me');
  await expect(badge(page, 'Party host')).not.toHaveClass(/\bgot\b/);
});

test('Open the Sutras page: opening and leaving awards no Sutra scholar badge', async ({ page }) => {
  await open(page, '#/sutras');
  await expect(page.locator('.sutra-grid').first()).toBeVisible();
  await open(page, '#/me');
  expect(await got(page)).not.toContain('sutras');
  await expect(badge(page, 'Sutra scholar')).not.toHaveClass(/\bgot\b/);
});

test('Click a Watch link: a video closed within a few seconds awards no Video learner badge', async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await open(page, '#/watch');
  const card = page.locator('#view button.watch-card').first();
  await expect(card).toBeVisible();
  await card.click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await dlg.locator('.vp-play').click(); // the facade: the video plays, and its minute counts, from this press
  await page.waitForTimeout(1500);
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  expect(await got(page)).not.toContain('watch');
  await open(page, '#/me');
  await expect(badge(page, 'Video learner')).not.toHaveClass(/\bgot\b/);
});

test('Finish a Party game: the podium (party/finish) earns the active Player the Party host badge', async ({ page }) => {
  await open(page, '#/arena/party');
  expect(await got(page)).not.toContain('duel');
  // The podium phase of a Party game fires track('party/finish') (js/play/exp/party.js); the app turns it into the badge
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'party/finish' } })));
  await expect.poll(() => got(page)).toContain('duel');
  await open(page, '#/me');
  await expect(badge(page, 'Party host')).toHaveClass(/\bgot\b/);
});
