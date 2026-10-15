import { test, expect, APP, open } from './fixtures';

/* Progress lives in localStorage (vm.players, mathquest.v1.<player>) and survives a reload. */

test('XP, collected sutra cards, answers and the nickname survive a reload', async ({ page }) => {
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card').first();
  await card.locator('.sutra-face').click();
  await expect(card).toHaveClass(/got/);
  // One practice answer (Show me counts as answered)
  await page.goto(`${APP}#/skill/v-sq5`);
  await page.locator('#prShow').click();
  await expect(page.locator('#practice .pr-score')).toHaveText('0/1');

  await page.reload();
  await open(page, '#/me');
  await expect(page.locator('#view h1')).toHaveText('Swift Tiger 42');
  await expect(page.locator('.me-head')).toContainText('5 XP');
  await page.goto(`${APP}#/sutras`);
  await expect(page.locator('.sutra-card').first()).toHaveClass(/got/);
  await expect(page.locator('.sutra-card').first()).toContainText('Collected');
  await expect(page.locator('.md-lede')).toContainText('You have collected 1 of 29');
  // The skill shows as started on the Dojo map
  await page.goto(`${APP}#/dojo`);
  await expect(page.locator('a.dojo-node[href="#/skill/v-sq5"]')).toHaveClass(/mq-going/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || 'null'));
  expect(saved.xp).toBe(5);
  expect(saved.skills['v-sq5'].n).toBe(1);
});

test('a new nickname, avatar color and a second player persist', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meName').click();
  const name = (await page.locator('#view h1').textContent())!;
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
  await page.locator('.av-pick[data-c="plum"]').click();
  await expect(page.locator('.av-pick[data-c="plum"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#meAdd').click();
  // A new player starts with the mode picker
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  await page.locator('.mode-card[data-mode="pro"]').click();
  await page.reload();
  await open(page, '#/me');
  await expect(page.locator('.players .player')).toHaveCount(2);
  await page.locator('.players [data-switch]').click();
  await expect(page.locator('#view h1')).toHaveText(name);
  await expect(page.locator('.av-pick[data-c="plum"]')).toHaveAttribute('aria-pressed', 'true');
});

test('the sound setting persists', async ({ page }) => {
  await open(page, '#/me');
  const sound = page.locator('#setSound');
  await expect(sound).not.toBeChecked(); // the fixture turns sound off
  await sound.check();
  await page.reload();
  await expect(page.locator('#setSound')).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('vm.sound'))).toBe('1');
});

/* Daily quests and badges (quests and badges specs) */
const badge = (page: import('@playwright/test').Page, name: string) => page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });

test('day-1 quests: one right answer shows whole-number progress like 1/15', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
  await page.goto(`${APP}#/`);
  const nums = page.locator('.quest-card .q-n');
  await expect(nums).toHaveCount(3);
  const texts = await nums.allTextContents();
  texts.forEach(t => { expect(t).toMatch(/^\d+\/\d+$/); expect(t).not.toContain('.'); });
  // The first quest is always an answer quest: one right answer counts once
  expect(texts[0]).toMatch(/^1\/\d+$/);
});

test('Sutra scholar: opening the Sutras page earns nothing, collecting 10 cards earns it', async ({ page }) => {
  await open(page, '#/sutras');
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Sutra scholar')).not.toHaveClass(/\bgot\b/);
  await expect(badge(page, 'Sutra scholar')).toContainText('Collect 10 Sutra cards.');
  await page.goto(`${APP}#/sutras`);
  const cards = page.locator('.sutra-card');
  for (let i = 0; i < 10; i++) { await cards.nth(i).locator('.sutra-face').click(); await expect(cards.nth(i)).toHaveClass(/got/); }
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Sutra scholar')).toHaveClass(/\bgot\b/);
});

test('Video learner: closing a video after 5 seconds earns nothing, a minute in the player earns it', async ({ page }) => {
  // The player's YouTube frame gets an empty page: no third-party load in the test
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
  await page.clock.install();
  await open(page, '#/watch');
  const card = page.locator('a.watch-card.plays').first();
  const dlg = page.locator('dialog.vm-player');
  await card.click();
  await expect(dlg).toBeVisible();
  await page.clock.runFor(5_000);
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await page.clock.runFor(70_000);
  const badges = () => page.evaluate(async () => (await import('/vedic-math/js/store.js' as string)).badges());
  expect((await badges()).watch).toBeUndefined();
  await card.click();
  await expect(dlg).toBeVisible();
  await page.clock.runFor(61_000);
  expect((await badges()).watch).toBeTruthy();
  await dlg.locator('.vp-x').click();
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Video learner')).toHaveClass(/\bgot\b/);
});
