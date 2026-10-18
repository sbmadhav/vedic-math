import { test, expect, open, cloudLog } from '../fixtures';

/* arena spec, Requirement "Untimed Arena Practice": one test per scenario. Practice is never posted. */

test('An untimed round: no clock, it ends after 20 questions or on Finish, and nothing goes to a World board', async ({ page }) => {
  await open(page, '#/arena');
  await page.locator('[data-t="untimed"]').click();
  await expect(page.locator('[data-t="untimed"]')).toHaveText('Practice, no clock');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('#arTime')).toHaveCount(0);
  await expect(page.locator('.ar-bar')).toHaveCount(0);
  await expect(page.locator('#arNum')).toHaveText('1/20');
  for (let k = 0; k < 3; k++) {
    await page.locator('.ar-key[data-k="1"]').click();
    await page.locator('#arForm button').click();
  }
  await expect(page.locator('#arNum')).toHaveText('4/20');
  await page.locator('#arFinish').click();
  await expect(page.locator('.play-shell .ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
  expect((await cloudLog(page)).writes.filter(w => /^boards\//.test(w.path))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
});

test.describe('Calm on', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('vm.calm', '1')); });
  test('Calm default: with Calm on the Arena opens with the untimed Practice round selected', async ({ page }) => {
    await open(page, '#/arena');
    await expect(page.locator('[data-t="untimed"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'false');
  });
});
