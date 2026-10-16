import { test, expect, APP } from './fixtures';

/* Play modes set the wording on this page only. The site-wide `kidmode` setting is never written. */

const MODES = [
  { id: 'explorer', name: 'Explorer', heading: 'What do you want to play?', kid: true, explore: 'Star map' },
  { id: 'challenger', name: 'Challenger', heading: 'Ready to get faster?', kid: true, explore: 'Star map' },
  { id: 'pro', name: 'Pro', heading: 'Train your mental math', kid: false, explore: 'Explore' },
] as const;

test.describe('mode picker', () => {
  test.use({ seedMode: null });

  for (const m of MODES) {
    test(`picking ${m.name} sets the wording and leaves the site-wide kidmode alone`, async ({ page }) => {
      // A value the main site might have stored: it must survive untouched
      await page.addInitScript(() => { if (localStorage.getItem('kidmode') === null) localStorage.setItem('kidmode', 'e2e-sentinel'); });
      await page.goto(APP);
      await expect(page.locator('h1')).toHaveText('Fast, fun math for every brain');
      await expect(page.locator('body')).toHaveClass(/mode-none/);
      await page.locator(`.mode-card[data-mode="${m.id}"]`).click();

      await expect(page.locator('h1.home-h')).toHaveText(m.heading);
      await expect(page.locator('.mode-line b')).toHaveText(m.name);
      await expect(page.locator('body')).toHaveClass(new RegExp(`mode-${m.id}`));
      if (m.kid) await expect(page.locator('body')).toHaveClass(/kidmode/);
      else await expect(page.locator('body')).not.toHaveClass(/kidmode/);
      // .pro / .kid wording from the shared components.css follows the mode
      // (checked by computed style: the label itself is hidden on narrow screens)
      const shown = await page.locator('#exploreBtn .xp-lbl > span').evaluateAll(els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent));
      expect(shown).toEqual([m.explore]);
      // Explorer hides the Dojo and Sutras tabs
      const dojo = page.locator('.mq-nav a[href="#/dojo"]');
      if (m.id === 'explorer') await expect(dojo).toBeHidden(); else await expect(dojo).toBeVisible();

      expect(await page.evaluate(() => localStorage.getItem('kidmode'))).toBe('e2e-sentinel');
      const players = JSON.parse((await page.evaluate(() => localStorage.getItem('vm.players')))!);
      expect(players.list[0].mode).toBe(m.id);
      // Survives a reload
      await page.reload();
      await expect(page.locator('h1.home-h')).toHaveText(m.heading);
    });
  }

  test('a first visit never writes the kidmode key', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await page.goto(`${APP}#/me`);
    await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
    await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
    expect(await page.evaluate(() => localStorage.getItem('kidmode'))).toBeNull();
  });

  test('every route asks for a mode first, except Watch and Sutras', async ({ page }) => {
    await page.goto(`${APP}#/games`);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.goto(`${APP}#/watch`);
    await expect(page.locator('h1')).toHaveText('Short videos that show how');
    await page.goto(`${APP}#/sutras`);
    await expect(page.locator('h1')).toHaveText('The 16 sutras and 13 sub-sutras');
  });
});

test('Me page switches the mode, and "Reset play mode" brings the picker back', async ({ page }) => {
  await page.goto(`${APP}#/me`);
  await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
  await expect(page.locator('.mode-pick--sm .mode-card[data-mode="pro"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).not.toHaveClass(/kidmode/);
  await page.locator('#resetMode').click();
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  await expect(page.locator('body')).toHaveClass(/mode-none/);
  expect(await page.evaluate(() => localStorage.getItem('kidmode'))).toBeNull();
});

test.describe('the home greeting', () => {
  for (const mode of ['challenger', 'pro'] as const) {
    test.describe(mode, () => {
      test.use({ seedMode: mode });
      test(`${mode}: no "Welcome back" on the first day, "Welcome back" after playing yesterday`, async ({ page }) => {
        await page.goto(APP);
        const hello = page.locator('.me-strip-t small');
        await expect(hello).toHaveText('Welcome,');
        // A day of play yesterday in this Player's progress record
        await page.evaluate(() => {
          const d = new Date(); d.setDate(d.getDate() - 1);
          const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const k = 'mathquest.v1.p1', rec = JSON.parse(localStorage.getItem(k) || '{}');
          rec.days = { ...(rec.days || {}), [y]: 3 }; localStorage.setItem(k, JSON.stringify(rec));
        });
        await page.reload();
        await expect(hello).toHaveText('Welcome back,');
      });
    });
  }
});
