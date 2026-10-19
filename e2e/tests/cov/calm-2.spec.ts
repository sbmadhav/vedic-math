import { test, expect, open, chromiumOnly } from '../fixtures';
import type { Page } from '@playwright/test';

/* calm spec, Requirements "Calm stops motion", "The moving background with Calm and Pause motion" and "Calm is
   announced and labelled": one test per scenario. */
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const stageAnimations = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return !!t && !!t.closest('.star-stage') && a.playState === 'running';
}).length);

test.describe('Calm on', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('Comeback in Calm: the Comeback message and Sparks appear with no burst or movement', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* blocked */ } });
    await open(page, '#/star/sq5/1');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.keyboard.type('1'); await page.keyboard.press('Enter');
    await expect(page.locator('.star-step').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Rematch');
    await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('Comeback');
    await expect(page.locator('#stSay')).toContainText('Sparks');
    expect(await stageAnimations(page)).toBe(0);
    expect(await page.locator('.star-burst').count()).toBe(0);
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('Pause motion from the Explore menu: motion stops at once, the clock keeps running, and Calm stays off', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'canvas frames: chromium');
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    const running = () => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest('dialog.xpm')).length);
    // The Explore menu's own Pause motion control. A round's shell makes the site header inert (js/shell.js),
    // so the menu is reached on the game page, before the round starts.
    await page.locator('#exploreBtn').click();
    const pause = page.locator('dialog.xpm #xpMotion');
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveClass(/\bmotion-paused\b/);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.xpm')).toBeHidden();
    await page.waitForTimeout(150);
    expect(await running(), 'motion stops at once on the game page').toBe(0);
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    const t1 = Number(await page.locator('#arTime').textContent());
    await page.waitForTimeout(150);
    expect(await running(), 'no motion in the round').toBe(0);
    await page.waitForTimeout(1600);
    const t2 = Number(await page.locator('#arTime').textContent());
    expect(t1).toBeGreaterThan(0);
    expect(t2, 'the numeric clock counts down').toBeLessThan(t1);
    expect(await running(), 'no motion in the round, the timer bar included').toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('vm.calm') === '1')).toBe(false);
    await expect(page.locator('.play-shell .play-calm')).toHaveAttribute('aria-checked', 'false');
    await page.locator('#arStop').click();
  });

  test('Calm on, background on: the moving background stays visible and stops moving', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'canvas frames: chromium');
    await open(page, '#/me');
    const canvas = page.locator('canvas.vm-bg');
    await expect(canvas).toHaveCount(1, { timeout: 5000 });
    const frame = () => canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
    const a0 = await frame(); await page.waitForTimeout(800);
    expect(await frame(), 'moves before Calm').not.toBe(a0);
    await page.locator('#setCalm').click();
    await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
    await page.waitForTimeout(100);
    const a = await frame();
    await page.waitForTimeout(1000);
    expect(await frame()).toBe(a);
    await expect(canvas).toBeVisible();
  });
});

test('Screen reader toggles Calm: the switch is labelled Calm and announces on, with no clocks in Practice and no motion', async ({ page }) => {
  await open(page, '#/me');
  const sw = page.locator('#setCalm');
  await expect(sw).toHaveAttribute('role', 'switch');
  await expect(sw).toHaveAccessibleName(/Calm/);
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#vmLive')).toHaveText('Calm on. No clocks in Practice, no motion.');
  await expect(page.locator('#vmLive')).toHaveAttribute('aria-live', /polite|assertive/);
});
