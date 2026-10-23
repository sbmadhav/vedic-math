import { test, expect, APP, open, chromiumOnly } from './fixtures';
import { UA, RETURNING, offerInstall, asInstalledApp, recordEvents, events, installState, seedInstallState } from './install-helpers';

/* Installing the game as an app (openspec change install-app): the Install nudge on Home, the Install guide, the
   Installed app. The browser's install prompt is a synthetic beforeinstallprompt event (offerInstall), the Installed
   app an init script (asInstalledApp), platforms a user agent. Nothing here installs anything or leaves the page. */

const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test.describe('the Install nudge', () => {
  test.use({ seedProgress: RETURNING, userAgent: UA.androidChrome });

  test('shows on Home once the browser offers to install; Install opens the browser\'s prompt in one tap', async ({ page }) => {
    await recordEvents(page);
    await open(page);
    await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(nudge(page)).toHaveCount(0);
    await offerInstall(page, 'accepted');
    await expect(nudge(page)).toBeVisible();
    await expect(nudge(page)).toContainText('Put Vedic Math on your home screen');
    await expect(nudge(page).getByRole('button', { name: 'Install' })).toBeVisible();
    await nudge(page).getByRole('button', { name: 'Install' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted)).toBe(1);
    await expect(nudge(page)).toHaveCount(0);
    await expect(page.locator('h1.home-h')).toBeFocused();
    await expect.poll(() => events(page)).toEqual(['math/install/nudge_shown', 'math/install/prompt_accepted']);
  });

  test('a dismissed prompt keeps the nudge, which then shows the steps', async ({ page }) => {
    await open(page);
    await offerInstall(page, 'dismissed');
    await nudge(page).getByRole('button', { name: 'Install' }).click();
    await expect(nudge(page).getByRole('button', { name: 'Show me how' })).toBeVisible();
    await nudge(page).getByRole('button', { name: 'Show me how' }).click();
    await expect(guide(page)).toBeVisible();
    await expect(guide(page).locator('[data-in="prompt"]')).toHaveCount(0);
    await expect(guide(page).locator('#inStepsH')).toHaveText('How to install: Android (Chrome)');
  });

  test('no nudge without the browser\'s prompt on Android, and none on a first day of play', async ({ page }) => {
    await open(page);
    await page.waitForTimeout(500);
    await expect(nudge(page)).toHaveCount(0);
    await page.evaluate(() => { const k = 'mathquest.v1.p1', d = JSON.parse(localStorage.getItem(k) || '{}'); d.days = {}; localStorage.setItem(k, JSON.stringify(d)); });
    await page.reload();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await offerInstall(page);
    await page.waitForTimeout(500);
    await expect(nudge(page)).toHaveCount(0);
  });

  test('"Not now" hides it for 7 days and is saved on this device only', async ({ page }) => {
    await recordEvents(page);
    await open(page);
    await offerInstall(page);
    const before = Date.now();
    await nudge(page).getByRole('button', { name: 'Not now' }).click();
    await expect(nudge(page)).toHaveCount(0);
    await expect(page.locator('h1.home-h')).toBeFocused();
    const s = await installState(page);
    expect(s.later).toBe(1);
    expect(s.until).toBeGreaterThanOrEqual(before + 7 * 864e5 - 5000);
    expect(s.until).toBeLessThanOrEqual(Date.now() + 7 * 864e5 + 5000);
    await page.reload();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await offerInstall(page);
    await page.waitForTimeout(500);
    await expect(nudge(page)).toHaveCount(0);
    expect(await events(page)).toEqual([]);
  });

  test('after three "Not now"s it never shows again, and the guide stays on the Me page', async ({ page }) => {
    await seedInstallState(page, { later: 3, until: 0, installed: 0 });
    await open(page);
    await offerInstall(page);
    await page.waitForTimeout(500);
    await expect(nudge(page)).toHaveCount(0);
    await page.goto(`${APP}#/me`);
    await expect(page.locator('#meInstall')).toBeVisible();
  });

  test('a "Not now" from more than 7 days ago lets it come back', async ({ page }) => {
    await seedInstallState(page, { later: 1, until: Date.now() - 1000, installed: 0 });
    await open(page);
    await offerInstall(page);
    await expect(nudge(page)).toBeVisible();
  });

  test('never during a round: a prompt that arrives in a Star shows nothing until Home', async ({ page }) => {
    await open(page, '#/star/from9/1');
    await offerInstall(page);
    await page.waitForTimeout(500);
    await expect(page.locator('.in-nudge')).toHaveCount(0);
    await page.goto(`${APP}#/`);
    await expect(nudge(page)).toBeVisible();
  });

  test('one prompt at a time: it waits while a toast shows or another prompt holds the slot', async ({ page }) => {
    await open(page);
    await page.evaluate(async () => { const fx = await e2eMod('fx'); fx.toast('<b>Quest complete</b>'); });
    await offerInstall(page);
    await page.waitForTimeout(600);
    await expect(nudge(page)).toHaveCount(0);
    await expect(nudge(page)).toBeVisible({ timeout: 8000 }); /* the toast leaves after about 3.6 s; the nudge looks again every 2 s */
    await page.reload();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await page.evaluate(async () => { const slot = await e2eMod('prompt-slot'); slot.claim('family', new AbortController().signal); });
    await offerInstall(page);
    await page.waitForTimeout(2500);
    await expect(nudge(page)).toHaveCount(0);
  });

  test('appinstalled: the nudge goes, and the device remembers', async ({ page }) => {
    await recordEvents(page);
    await open(page);
    await offerInstall(page);
    await expect(nudge(page)).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(nudge(page)).toHaveCount(0);
    expect((await installState(page)).installed).toBeGreaterThan(0);
    await expect.poll(() => events(page)).toContain('math/install/installed');
    await page.goto(`${APP}#/me`);
    await expect(page.locator('#meInstall')).toHaveCount(0);
    await expect(page.locator('#installWrap')).toBeHidden();
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('the nudge speaks to the grown-up', async ({ page }) => {
      await open(page);
      await offerInstall(page);
      await expect(nudge(page)).toContainText('Grown-ups: add Vedic Math to this device');
      /* Explorer Home draws itself again when Read aloud is toggled (on by default for Explorer): the nudge stays, once */
      const vb = page.locator('#voiceBtn'), was = await vb.getAttribute('aria-pressed');
      await vb.click();
      await expect(vb).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true');
      await expect(nudge(page)).toHaveCount(1);
      await expect(nudge(page)).toContainText('Grown-ups: add Vedic Math to this device');
      await nudge(page).getByRole('button', { name: 'Not now' }).click();
      await page.goto(`${APP}#/me`);
      await page.locator('#meInstall').click();
      await expect(guide(page).locator('h2')).toHaveText('For a grown-up: add the app');
    });
  });

  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('Pro words', async ({ page }) => {
      await open(page);
      await offerInstall(page);
      await expect(nudge(page)).toContainText('Install Learn Vedic Math');
    });
  });

  test.describe('the Sky as home', () => {
    test.use({ seedPlayer: { sky: true } });
    test('the nudge has the same one place', async ({ page }) => {
      await open(page);
      await offerInstall(page);
      await expect(nudge(page)).toBeVisible();
    });
  });
});

test.describe('the nudge on iPhone and iPad Safari', () => {
  test.use({ seedProgress: RETURNING, userAgent: UA.iphoneSafari });
  test('shows with no prompt, and opens the Share steps', async ({ page }) => {
    await recordEvents(page);
    await open(page);
    await expect(nudge(page)).toBeVisible();
    await nudge(page).getByRole('button', { name: 'Show me how' }).click();
    await expect(guide(page)).toBeVisible();
    await expect(guide(page).locator('#inStepsH')).toHaveText('How to install: iPhone or iPad (Safari)');
    await expect(guide(page).locator('.in-steps li')).toHaveCount(3);
    await expect(guide(page).locator('.in-steps li').first()).toContainText('Share');
    await expect(guide(page).locator('.in-steps li').nth(1)).toContainText('Add to Home Screen');
    await expect(guide(page).locator('.in-note')).toContainText('backup code');
    await expect.poll(() => events(page)).toEqual(['math/install/nudge_shown', 'math/install/wizard_open/home']);
  });
});

test.describe('no nudge on iPhone in Chrome or inside another app', () => {
  test.use({ seedProgress: RETURNING });
  for (const ua of ['iphoneChrome', 'instagram'] as const) {
    test.describe(ua, () => {
      test.use({ userAgent: UA[ua] });
      test(`${ua}: no nudge`, async ({ page }) => {
        await open(page);
        await page.waitForTimeout(600);
        await expect(nudge(page)).toHaveCount(0);
      });
    });
  }
});

test.describe('the Install guide', () => {
  test('opens from the Me page, the footer and the Guide; Escape closes it and focus goes back', async ({ page }) => {
    await recordEvents(page);
    await open(page, '#/me');
    const btn = page.locator('#meInstall');
    await btn.focus(); /* by keyboard: WebKit does not focus a button on a mouse click */
    await page.keyboard.press('Enter');
    await expect(guide(page)).toBeVisible();
    await expect(guide(page)).toHaveAttribute('aria-labelledby', 'inTitle');
    await expect(guide(page).locator('ol.in-steps')).toHaveAttribute('aria-labelledby', 'inStepsH');
    await expect(guide(page).locator('ol.in-steps')).toBeFocused();
    await expect(guide(page).locator('.in-steps li').first().locator('.md-sr-only')).toHaveText(/^Step 1 of \d: $/);
    await page.keyboard.press('Escape');
    await expect(guide(page)).toBeHidden();
    await expect(btn).toBeFocused();
    await page.locator('#installLink').click();
    await expect(guide(page)).toBeVisible();
    await guide(page).locator('.vs-foot [data-close]').click();
    await open(page, '#/guide/offline');
    await page.locator('#gd-offline [data-gd="install"]').click();
    await expect(guide(page)).toBeVisible();
    await expect.poll(() => events(page)).toEqual(['math/install/wizard_open/me', 'math/install/wizard_open/footer', 'math/install/wizard_open/guide']);
  });

  test('keeps keyboard focus inside while open', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement && (document.activeElement.closest('dialog#installGuide') !== null || document.activeElement === document.body))).toBe(true);
    }
  });

  test('with the browser\'s prompt: Install now first, the menu steps after', async ({ page }) => {
    await open(page, '#/me');
    await offerInstall(page, 'accepted');
    await page.locator('#meInstall').click();
    await expect(guide(page).locator('[data-in="prompt"]')).toBeFocused();
    await expect(guide(page).locator('#inStepsH')).toHaveText('Or use the browser\'s menu');
    await guide(page).locator('[data-in="prompt"]').click();
    await expect(guide(page).locator('#inStatus')).toContainText('Installing');
    await expect(guide(page).locator('[data-in="prompt"]')).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(guide(page).locator('#inStatus')).toContainText('Installed');
  });

  test('another device: the picker swaps the steps and keeps focus', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    await guide(page).locator('.in-other summary').click();
    const mac = guide(page).locator('.in-pick [data-kind="mac-safari"]');
    await mac.focus();
    await page.keyboard.press('Enter');
    await expect(mac).toHaveAttribute('aria-pressed', 'true');
    await expect(mac).toBeFocused();
    await expect(guide(page).locator('#inStepsH')).toHaveText('How to install: Mac (Safari)');
    await expect(guide(page).locator('.in-steps')).toContainText('Add to Dock');
    await expect(guide(page).locator('#inStatus')).toHaveText('Showing the steps for Mac (Safari).');
  });

  const STEPS: [keyof typeof UA, string, RegExp][] = [
    ['iphoneChrome', 'iPhone or iPad (Chrome, Edge or Firefox)', /Add to Home Screen/],
    ['instagram', 'Inside another app', /Open in browser/],
    ['androidChrome', 'Android (Chrome)', /Add to Home screen/],
    ['samsung', 'Android (Samsung Internet)', /Home screen/],
    ['firefoxAndroid', 'Android (Firefox)', /Add app to Home screen/],
    ['chromeDesktop', 'Computer or Chromebook (Chrome)', /install icon/],
    ['edgeDesktop', 'Computer (Edge)', /App available/],
    ['safariMac', 'Mac (Safari)', /Add to Dock/],
    ['firefoxDesktop', 'Computer (Firefox)', /cannot install web apps/],
  ];
  for (const [ua, name, text] of STEPS) {
    test.describe(ua, () => {
      test.use({ userAgent: UA[ua] });
      test(`the steps for ${name}`, async ({ page }) => {
        await open(page, '#/me');
        await page.locator('#meInstall').click();
        await expect(guide(page).locator('#inStepsH')).toHaveText(`How to install: ${name}`);
        await expect(guide(page).locator('.in-steps')).toContainText(text);
        if (ua === 'instagram') await expect(guide(page).locator('[data-in="copy"]')).toBeVisible();
      });
    });
  }

  test.describe('iPad asking for desktop pages', () => {
    test.use({ userAgent: UA.ipadDesktop, hasTouch: true });
    test('is told apart from a Mac by its touch screen', async ({ page }, testInfo) => {
      chromiumOnly(testInfo, 'maxTouchPoints follows hasTouch in Chromium');
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5, configurable: true }));
      await open(page, '#/me');
      await page.locator('#meInstall').click();
      await expect(guide(page).locator('#inStepsH')).toHaveText('How to install: iPhone or iPad (Safari)');
    });
  });

  test.describe('at 320 px', () => {
    test.use({ viewport: { width: 320, height: 640 } });
    for (const scheme of ['light', 'dark'] as const) {
      test(`fits with no sideways scroll (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await open(page, '#/me');
        await page.locator('#meInstall').click();
        await guide(page).locator('.in-other summary').click();
        const box = await guide(page).boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(320);
        expect(await guide(page).evaluate(d => d.scrollWidth <= d.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      });
    }
  });
});

test.describe('the Installed app', () => {
  test.use({ seedProgress: RETURNING, userAgent: UA.androidChrome });
  for (const ios of [false, true]) {
    test.describe(ios ? 'iOS (navigator.standalone)' : 'display-mode standalone', () => {
      test('no nudge, no install entry points, the brand goes to the game\'s Home', async ({ page }) => {
        await recordEvents(page);
        await asInstalledApp(page, { ios });
        await open(page);
        await offerInstall(page);
        await page.waitForTimeout(500);
        await expect(nudge(page)).toHaveCount(0);
        await expect(page.locator('#installWrap')).toBeHidden();
        await expect(page.locator('header .md-brand')).toHaveAttribute('href', '#/');
        await expect(page.locator('html')).toHaveClass(/\blv-installed\b/);
        await page.goto(`${APP}#/me`);
        await expect(page.locator('#meInstall')).toHaveCount(0);
        await page.goto(`${APP}#/guide/offline`);
        await expect(page.locator('#gd-offline [data-gd="install"]')).toHaveCount(0);
        await expect.poll(() => events(page)).toContain('math/install/opened');
      });
    });
  }

  test('a link that leaves the app opens in the browser; links inside the app stay', async ({ page, context }) => {
    await asInstalledApp(page);
    await open(page);
    await expect(page.locator('html')).toHaveClass(/\blv-installed\b/); /* the install module is here (it loads after the first paint) */
    const grownUps = page.locator('footer a.mq-grownups');
    const popup = context.waitForEvent('page');
    await grownUps.click();
    const other = await popup;
    await expect(grownUps).toHaveAttribute('target', '_blank');
    await expect(grownUps).toHaveAttribute('rel', /noopener/);
    expect(new URL(other.url()).pathname).toBe('/parents/');
    await other.close();
    await expect(page).toHaveURL(new RegExp(`${APP}`));
    await page.locator('footer a.mq-guide').click();
    await expect(page).toHaveURL(/#\/guide$/);
    await expect(page.locator('footer a.mq-guide')).not.toHaveAttribute('target', /.+/);
  });
});

test.describe('in the browser', () => {
  test('the brand still goes to the landing page and the footer offers the guide', async ({ page }) => {
    await open(page);
    await expect(page.locator('header .md-brand')).toHaveAttribute('href', '/?home');
    await expect(page.locator('#installWrap')).toBeVisible();
    await expect(page.locator('footer a.mq-grownups')).not.toHaveAttribute('target', /.+/);
  });
});

test.describe('Calm and Pause motion', () => {
  test.use({ seedProgress: RETURNING, userAgent: UA.iphoneSafari, reducedMotion: 'no-preference' });
  test('the nudge holds still with Calm on, and slides in without it', async ({ page }) => {
    await open(page);
    await expect(nudge(page)).toBeVisible();
    expect(await nudge(page).evaluate(e => getComputedStyle(e).animationName)).toBe('toastIn');
    await page.evaluate(() => localStorage.setItem('vm.calm', '1'));
    await page.reload();
    await expect(nudge(page)).toBeVisible();
    expect(await nudge(page).evaluate(e => getComputedStyle(e).animationName)).toBe('none');
    await page.evaluate(() => { localStorage.removeItem('vm.calm'); localStorage.setItem('motion-paused', '1'); });
    await page.reload();
    await expect(nudge(page)).toBeVisible();
    expect(await nudge(page).evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  });
});
