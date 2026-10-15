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
