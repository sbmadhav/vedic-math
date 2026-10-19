import { test, expect, APP, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* calm spec, Requirements "A Calm switch", "Calm removes clocks from Practice" and "Ranked rounds keep their clock":
   one test per scenario. Nothing here finishes a Ranked round, so nothing is posted. */
const seedCalm = (page: Page) => page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* blocked */ } });

test('Turning Calm on in a game: the Me page shows Calm on, and it is still on after a reload', async ({ page }) => {
  await open(page, '#/game/times-sprint');
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  const sw = page.locator('.play-shell .play-calm');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await page.goto(`${APP}#/me`);
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
});

test('Tower Sprint in Calm: no clock, the result shows right answers and Sparks and says Medals for Sprint need the clock', async ({ page }) => {
  await seedCalm(page);
  await open(page, '#/challenge/1');
  await page.locator('#chGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('.ar-bar')).toHaveCount(0);
  await expect(page.locator('#arTime')).toHaveText('1/20');
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('#arForm button').click();
  await page.locator('#arFinish').click();
  await expect(page.locator('.lv-result h2')).toHaveText('Round done');
  await expect(page.locator('.lv-result')).toContainText(/\d+ right/);
  await expect(page.locator('.lv-result')).toContainText('Sparks');
  await expect(page.locator('.lv-result')).toContainText('Medals for Sprint need the clock.');
});

test('Game Level in Calm: Level 4 of Times sprint has no timer bar and ends after its questions', async ({ page }) => {
  await seedCalm(page);
  await open(page, '#/game/times-sprint/4');
  await page.locator('#gStart').click();
  const area = page.locator('#gArea');
  await expect(area.locator('.g-q')).toContainText('×');
  await expect(page.locator('.play-shell .g-bar, .play-shell .ar-bar, .play-shell [role="timer"]')).toHaveCount(0);
  await expect(page.locator('.play-shell')).not.toContainText(/\b\d\d:\d\d\b/);
  // Without the clock the Level ends after its 12 questions (times-sprint perQ): answer each one, right or wrong
  for (let i = 0; i < 12; i++) {
    const q = (await area.locator('.g-q').textContent())!.replace(/,/g, '');
    const [x, y] = q.split('×').map(s => Number(s.trim()));
    await area.locator('.ans-in').fill(String(x * y));
    await area.locator('.ans-in').press('Enter');
    if (i < 11) await expect(area.locator('.g-q')).not.toHaveText(q);
  }
  await expect(page.locator('.play-shell .lv-result')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.play-shell .lv-result')).toContainText('Sparks');
});

test('Daily challenge with Calm on: the lobby says the daily challenge is timed and points to the untimed Practice option', async ({ page }) => {
  await seedCalm(page);
  await open(page, '#/arena');
  await expect(page.locator('[data-t="untimed"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-t="daily"]').click();
  await expect(page.locator('#arCalmNote')).toBeVisible();
  await expect(page.locator('#arCalmNote')).toHaveText('The daily challenge is a timed race for everyone. Practice has no clock in Calm.');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('#arTime')).toHaveText(/^([1-9]|[1-5]\d|60)$/);
  // The clock really runs while Calm stays on
  const t1 = Number(await page.locator('#arTime').textContent());
  await expect.poll(async () => Number(await page.locator('#arTime').textContent()), { timeout: 5000 }).toBeLessThan(t1);
  await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
  expect(await page.evaluate(() => localStorage.getItem('vm.calm'))).toBe('1');
  await page.locator('#arStop').click();
});
