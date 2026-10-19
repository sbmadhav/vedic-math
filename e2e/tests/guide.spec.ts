import { test, expect, APP, open, appErrors, cloudLog } from './fixtures';

/* The in-app guide and the first-visit tour (openspec in-app-guide). This site's /js/analytics.js is replaced by a
   stub that records window.siteTrack calls, so the tour's events can be checked and nothing is counted. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const tourState = (page: Page) => page.evaluate(() => localStorage.getItem('vm.tour'));
const tour = (page: Page) => page.locator('dialog.vm-tour');

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('the guide page', () => {
  test('a Challenger sees every group and section, each with what, how, a tip and a picture; Guide is the current menu item', async ({ page, issues }) => {
    await open(page, '#/guide');
    await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
    await expect(page.locator('.gd-group')).toHaveCount(5);
    const secs = page.locator('.gd-sec');
    expect(await secs.count()).toBeGreaterThanOrEqual(20);
    for (const id of ['find', 'skills', 'practice', 'dojo', 'stars', 'sky', 'katas', 'sutras', 'games', 'arena', 'tower', 'party', 'playmore', 'boards', 'watch', 'calm', 'voice', 'music', 'players', 'offline', 'parents']) {
      await expect(page.locator(`#gd-${id}`), id).toHaveCount(1);
    }
    for (const s of await secs.all()) {
      await expect(s.locator('.gd-art svg')).toHaveCount(1);
      await expect(s.locator('.gd-what')).not.toBeEmpty();
      expect(await s.locator('.gd-how li').count()).toBeGreaterThanOrEqual(2);
      await expect(s.locator('.gd-tip')).not.toBeEmpty();
    }
    await expect(page.locator('#gd-parents details.pn')).toHaveCount(1); /* the same note as under the Boards */
    await expect(page.locator('.mq-nav a[href="#/guide"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#view')).not.toContainText(/\bXP\b|\u2014/);
    expect(appErrors(issues)).toEqual([]);
  });

  test('a Try it link opens the real place: Katas opens the first trick\'s katas', async ({ page }) => {
    await open(page, '#/guide');
    await page.locator('#gd-katas .gd-try').click();
    await expect(page).toHaveURL(/#\/katas\/from9$/);
    await expect(page.locator('#view h1')).toContainText('katas');
  });

  test('#/guide/arena opens at the Arena section with its heading focused', async ({ page }) => {
    await open(page, '#/guide/arena');
    const h = page.locator('#gdh-arena');
    await expect(h).toBeFocused();
    await expect(h).toBeInViewport();
  });

  test('the footer links the guide', async ({ page }) => {
    await open(page, '#/learn');
    await page.locator('footer a[href="#/guide"]').click();
    await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Explorer wording, no Stars or Sky section, and the Guide link in the menu bar', async ({ page }) => {
      await open(page, '#/guide');
      await expect(page.locator('#view h1')).toHaveText('How to play');
      await expect(page.locator('#gd-stars, #gd-sky')).toHaveCount(0);
      await expect(page.locator('#gdh-around')).toHaveText('Find your way');
      await expect(page.locator('.mq-nav a[href="#/guide"]')).toBeVisible();
    });
  });

  test.describe('no mode yet', () => {
    test.use({ seedMode: null });
    test('#/guide shows the guide, not the mode picker, with a way to pick a mode', async ({ page }) => {
      await page.goto(`${APP}#/guide`);
      await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
      await expect(page.locator('.mode-pick')).toHaveCount(0);
      await page.locator('.gd-nomode a[href="#/"]').click();
      await expect(page.locator('.mode-pick .mode-card').first()).toBeVisible();
      await expect(page.locator('.gd-pickhelp a[href="#/guide"]')).toBeVisible();
    });
  });
});

test.describe('Home: New here?', () => {
  test('a Player with no earlier day sees the note', async ({ page }) => {
    await open(page);
    await expect(page.locator('.gd-new a[href="#/guide"]')).toBeVisible();
  });
  const d = new Date(Date.now() - 864e5), yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  test.describe('played yesterday', () => {
    test.use({ seedProgress: { v: 3, skills: {}, sparks: 30, days: { [yesterday]: 3 } } });
    test('a Player who played yesterday does not', async ({ page }) => {
      await open(page);
      await expect(page.locator('.me-strip')).toBeVisible();
      await expect(page.locator('.gd-new')).toHaveCount(0);
    });
  });
});

test.describe('the first-visit tour', () => {
  test.use({ tourSeen: false, seedMode: null });

  test('after the first mode pick it walks through each step to Done, once per device', async ({ page, issues }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const dlg = tour(page);
    await expect(dlg).toBeVisible();
    const n = Number((await dlg.locator('#tourN').textContent())!.match(/of (\d)/)![1]);
    expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(6);
    await expect(dlg.locator('#tourN')).toHaveText(`1 of ${n}`);
    await expect(dlg.locator('#tourT')).toHaveText('This is you');
    await expect(dlg.locator('#tourT')).toBeFocused();
    await expect(dlg.locator('[data-act="back"]')).toBeHidden();
    expect(await tourState(page)).toBe('shown');
    for (let i = 1; i < n; i++) { await dlg.locator('[data-act="next"]').click(); await expect(dlg.locator('#tourN')).toHaveText(`${i + 1} of ${n}`); }
    await expect(dlg).toHaveAttribute('data-step', 'guide');
    await dlg.locator('[data-act="next"]', { hasText: 'Done' }).click();
    await expect(dlg).toHaveCount(0);
    expect(await tourState(page)).toBe('done');
    expect((await events(page)).filter(e => e.startsWith('math/tour/'))).toEqual(['math/tour/start', 'math/tour/finish']);
    await page.reload();
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues)).toEqual([]);
  });

  test('Escape on the second step skips it, returns focus to the page and it does not come back', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click();
    const dlg = tour(page);
    await expect(dlg).toBeVisible();
    await dlg.locator('[data-act="next"]').click();
    await expect(dlg.locator('#tourN')).toContainText('2 of');
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    expect(await tourState(page)).toBe('skipped');
    expect(await page.evaluate(() => !!document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('dialog'))).toBe(true);
    expect((await events(page)).filter(e => e.startsWith('math/tour/'))).toEqual(['math/tour/start', 'math/tour/skip']);
    await page.goto(`${APP}#/learn`); await page.goto(`${APP}#/`);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
  });

  test('on every screen size the Guide step shows its link and the whole card on screen', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="explorer"]').click();
    const dlg = tour(page);
    await expect(dlg).toBeVisible();
    while (await dlg.getAttribute('data-step') !== 'guide') await dlg.locator('[data-act="next"]').click();
    const vp = page.viewportSize()!;
    for (const box of [await page.locator('.mq-nav a[href="#/guide"]').boundingBox(), await dlg.locator('.tour-card').boundingBox()]) {
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width); expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
  });

  test('with Calm on nothing animates while it is open', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const dlg = tour(page);
    await expect(dlg).toBeVisible();
    await dlg.locator('[data-act="next"]').click();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(dlg).toHaveClass(/still/);
  });
});

test.describe('the tour after the first visit', () => {
  test.use({ tourSeen: false, seedProgress: { v: 3, skills: {}, sparks: 120 } });
  test('a Player who already has Sparks gets no tour, and Take the tour in the guide plays it', async ({ page }) => {
    await open(page);
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
    await page.goto(`${APP}#/guide`);
    await page.locator('.gd-top [data-gd="tour"]').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(tour(page)).toBeVisible();
    await expect(tour(page).locator('#tourN')).toContainText('1 of');
  });
});
