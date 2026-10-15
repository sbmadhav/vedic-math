import { test, expect, open, chromiumOnly, cloudLog, type Mode } from './fixtures';
import type { Page, Locator } from '@playwright/test';

/* Every game launches (Endless practice, so no round ends and nothing is posted) and accepts an answer.
   The step for each game plays one move and checks the feedback that proves it was scored. */

type Step = (area: Locator, page: Page) => Promise<void>;
const say = (page: Page) => page.locator('#gSay');
const GAMES: Record<string, { mode?: Mode; step: Step }> = {
  balloons: { mode: 'explorer', step: async (a, p) => {
    await a.locator('.g-balloon').first().click();
    await a.getByRole('button', { name: 'Done' }).click();
    await expect(say(p)).toHaveText(/Yes!|You popped 1\./);
  } },
  'more-less': { step: async (a, p) => { await a.locator('.g-more').first().click(); await expect(say(p)).toHaveText(/bigger/); } },
  'make-ten': { step: async (a, p) => {
    await a.locator('.g-tile').nth(0).click();
    await a.locator('.g-tile').nth(1).click();
    await expect(say(p)).toHaveText(/=/);
  } },
  'quick-look': { step: async (a, p) => { await a.locator('.g-opts .md-chip').first().click(); await expect(say(p)).toHaveText(/Yes, \d+!|It was \d+\./); } },
  bonds: { step: async (a, p) => { await a.locator('.g-opts .md-chip').first().click(); await expect(say(p)).toHaveText(/\+.*=/); } },
  'times-sprint': { step: async (a, p) => {
    const q = (await a.locator('.g-q').textContent())!.replace(/,/g, '');
    const [x, y] = q.split('×').map(s => Number(s.trim()));
    await a.locator('.ans-in').fill(String(x * y));
    await a.locator('.ans-in').press('Enter');
    await expect(p.locator('#gPts')).toHaveText(/^[1-9]/);
  } },
  target: { step: async a => {
    await a.locator('.ans-in').fill('1 + 1');
    await a.locator('.ans-in').press('Enter');
    await expect(a.locator('.g-tip')).toContainText(/Use each of|That makes/);
    await a.getByRole('button', { name: /Show an answer/ }).click();
    await expect(a.locator('.g-tip')).toHaveText(/One answer:/);
  } },
  'frac-faceoff': { step: async (a, p) => { await a.locator('.g-frac').first().click(); await expect(say(p)).toHaveText(/Right!|The other one was bigger/); } },
  'line-snipe': { step: async (a, p) => {
    await a.locator('input[type="range"]').fill('300');
    await a.getByRole('button', { name: 'Place it' }).click();
    await expect(say(p)).toHaveText(/% away/);
  } },
  pairs: { step: async a => {
    const cards = a.locator('.g-card');
    await cards.nth(0).click();
    await expect(cards.nth(0)).toHaveClass(/\bup\b/);
    await expect(cards.nth(0)).not.toHaveAttribute('aria-label', 'Hidden card');
    await cards.nth(1).click();
    await expect(cards.nth(1)).toHaveClass(/\b(up|got)\b/);
  } },
  'check-it': { step: async a => { await a.getByRole('button', { name: 'Right', exact: true }).click(); await expect(a.locator('.g-tip')).toHaveText(/Digit sums:.*It was (right|wrong)\./); } },
  rain: { step: async (a, p) => {
    const drop = a.locator('.g-drop').first();
    await expect(drop).toBeAttached({ timeout: 5000 });
    await drop.dispatchEvent('click'); // drops keep falling, so they never become "stable" for a normal click
    await expect(say(p)).toHaveText(/multiple of|=/);
  } },
  sequence: { step: async a => { await a.locator('.g-opts .md-chip').first().click(); await expect(a.locator('.g-tip')).toHaveText(/^-?[\d,]+: /); } },
  balance: { step: async a => { await a.locator('.g-opts .md-chip').first().click(); await expect(a.locator('.g-tip')).toHaveText(/^x = /); } },
};

test('the games page lists all 14 games with a leaderboard each', async ({ page }) => {
  await open(page, '#/games');
  const ids = await page.locator('a.mq-game').evaluateAll(as => as.map(a => a.getAttribute('href')!.replace('#/game/', '')));
  expect(ids.sort()).toEqual(Object.keys(GAMES).sort());
});

for (const [id, g] of Object.entries(GAMES)) {
  test.describe(`game ${id}`, () => {
    test.use({ seedMode: g.mode || 'challenger' });

    test(`${id} launches and accepts an answer`, async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, `#/game/${id}`);
      await page.locator('#gShell [data-m="endless"]').click();
      await expect(page.locator('#gStart')).toHaveText(/Practice/);
      await page.locator('#gStart').click();
      const area = page.locator('#gArea');
      await expect(area).not.toBeEmpty();
      await g.step(area, page);
      // Endless practice never posts a score
      await page.locator('#gQuit').click();
      await expect(page.locator('.g-result .md-kicker')).toHaveText('Practice score');
      expect((await cloudLog(page)).writes.filter(w => w.path.startsWith('boards/g_'))).toEqual([]);
    });
  });
}

test('a ranked round shows the game leaderboards and starts the clock', async ({ page }) => {
  await open(page, '#/game/times-sprint');
  await expect(page.locator('#gbDay .lb-tabs [data-src="world"]')).toBeVisible();
  await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#gStart').click();
  await expect(page.locator('#gArea .g-timer')).toBeAttached();
  await expect(page.locator('#gArea .g-q')).toContainText('×');
  // Stop before the round ends: nothing is posted
  await page.locator('#gQuit').click();
  await expect(page.locator('#gStart')).toBeVisible();
  expect((await cloudLog(page)).writes).toEqual([]);
});
