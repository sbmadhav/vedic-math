import { test, expect, APP } from './fixtures';

/* Play modes set the wording on this page only. The site-wide `kidmode` setting is never written. */

const MODES = [
  { id: 'explorer', name: 'Explorer', heading: 'What do you want to play?', kid: true },
  { id: 'challenger', name: 'Challenger', heading: 'Learn a sutra, then use it', kid: true },
  { id: 'pro', name: 'Pro', heading: 'Mental math, the sutra way', kid: false },
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
      const shown = await page.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<span class="pro" id="e2eP">pro words</span><span class="kid" id="e2eK">kid words</span>');
        const out = ['e2eP', 'e2eK'].filter(id => getComputedStyle(document.getElementById(id)!).display !== 'none').map(id => document.getElementById(id)!.textContent);
        document.getElementById('e2eP')!.remove(); document.getElementById('e2eK')!.remove();
        return out;
      });
      expect(shown).toEqual([m.kid ? 'kid words' : 'pro words']);
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

/* "Try the new Sky" (sky-home): Challenger and Pro only, per Player, off until turned on */
test.describe('the Sky switch', () => {
  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Explorer has no switch on the Me page and keeps the Explorer home', async ({ page }) => {
      await page.goto(`${APP}#/me`);
      await expect(page.locator('#view h1')).toHaveText('Swift Tiger 42');
      await expect(page.locator('#skySwitch')).toHaveCount(0);
      await expect(page.getByRole('switch', { name: 'Try the new Sky' })).toHaveCount(0);
      await page.goto(APP);
      await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    });
  });
  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('turning it on shows the Sky at #/, a second Player still gets the tile home, and turning it off restores it', async ({ page }) => {
      await page.goto(APP);
      await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
      await page.goto(`${APP}#/me`);
      const sw = page.getByRole('switch', { name: 'Try the new Sky' });
      await expect(sw).toHaveAttribute('aria-checked', 'false');
      await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', 'true');
      await expect(sw).toBeFocused();
      await expect(page.locator('#skyMsg')).toHaveText('The Sky is your home now.');
      expect(JSON.parse((await page.evaluate(() => localStorage.getItem('vm.players')))!).list[0].sky).toBe(true);
      await page.locator('.mq-nav').getByRole('link', { name: 'Home', exact: true }).click();
      await expect(page.locator('#view h1')).toHaveText('Your Sky');
      await expect(page.locator('h1.home-h')).toHaveCount(0);
      // A second Player on this device has not turned it on
      await page.goto(`${APP}#/me`);
      await page.locator('#meAdd').click();
      await page.locator('.mode-card[data-mode="pro"]').click();
      await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
      // Back to the first Player: still the Sky; turning it off brings the tile home back
      await page.goto(`${APP}#/me`);
      await page.locator('[data-switch="p1"]').click();
      await page.goto(APP);
      await expect(page.locator('#view h1')).toHaveText('Your Sky');
      await page.goto(`${APP}#/me`);
      await page.getByRole('switch', { name: 'Try the new Sky' }).click();
      await expect(page.getByRole('switch', { name: 'Try the new Sky' })).toHaveAttribute('aria-checked', 'false');
      await page.goto(APP);
      await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
    });
  });
});
