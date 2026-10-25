import { test, expect, APP, open } from '../fixtures';
import { UA, RETURNING, offerInstall } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "The Install nudge on Home": one test per scenario. The
   browser's offer is a synthetic beforeinstallprompt event. */
const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test.use({ seedProgress: RETURNING });

test.describe('Chrome on Android', () => {
  test.use({ userAgent: UA.androidChrome });
  test('A returning Player on Android: Install and Not now, and Install shows Chrome\'s install dialog in one tap', async ({ page }) => {
    await open(page);
    await offerInstall(page);
    await expect(nudge(page).getByRole('button', { name: 'Install' })).toBeVisible();
    await expect(nudge(page).getByRole('button', { name: 'Not now' })).toBeVisible();
    await expect(nudge(page).locator('img.in-nudge-ic')).toHaveAttribute('src', '/icons/icon-192.png');
    expect(await nudge(page).evaluate(e => e.tagName)).toBe('ASIDE');
    await nudge(page).getByRole('button', { name: 'Install' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted)).toBe(1);
    await expect(guide(page)).toHaveCount(0);
  });

  test('Never during a round: nothing in the Star, and the nudge on Home afterwards', async ({ page }) => {
    await open(page, '#/star/from9/1');
    await offerInstall(page);
    await page.waitForTimeout(800);
    await expect(page.locator('.in-nudge')).toHaveCount(0);
    await page.goto(`${APP}#/`);
    await expect(nudge(page)).toBeVisible();
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Explorer: "Grown-ups: add Vedic Math to this device"', async ({ page }) => {
      await open(page);
      await offerInstall(page);
      await expect(nudge(page).locator('.in-nudge-t')).toHaveText('Grown-ups: add Vedic Math to this device');
    });
  });
});

test.describe('Safari on an iPhone', () => {
  test.use({ userAgent: UA.iphoneSafari });
  test('Safari on iPhone: Show me how opens the Install guide at the Share steps', async ({ page }) => {
    await open(page);
    await nudge(page).getByRole('button', { name: 'Show me how' }).click();
    await expect(guide(page)).toBeVisible();
    await expect(guide(page).locator('.in-steps li').first()).toContainText('Share');
  });

  test.describe('motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('Calm: with Calm or Pause motion on, the nudge appears in place with no animation', async ({ page }) => {
      await page.addInitScript(() => { if (!sessionStorage.getItem('e2e-step')) { localStorage.setItem('vm.calm', '1'); sessionStorage.setItem('e2e-step', '1'); } });
      await open(page);
      await expect(nudge(page)).toBeVisible();
      expect(await nudge(page).evaluate(e => getComputedStyle(e).animationName)).toBe('none');
      await page.evaluate(() => { localStorage.removeItem('vm.calm'); localStorage.setItem('motion-paused', '1'); });
      await page.reload();
      await expect(nudge(page)).toBeVisible();
      expect(await nudge(page).evaluate(e => getComputedStyle(e).animationName)).toBe('none');
    });
  });
});
