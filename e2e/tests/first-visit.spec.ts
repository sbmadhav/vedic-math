import { test, expect, APP, open, appErrors } from './fixtures';

/* The first visit (openspec first-visit): Try a trick on the landing with a guessed Mode, Back home from that Star,
   three doors first on Home with the rest under More ways to play, Sparks explained on the quests card, and the
   Explorer picture home left alone. Analytics is stubbed so the one fixed event can be checked and nothing counts. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
/* The view's actions in document order, as a visitor meets them */
const actions = (page: Page) => page.evaluate(() => [...document.querySelectorAll('#view a[href], #view button')].filter(e => (e as HTMLElement).offsetWidth > 0).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('the landing', () => {
  test.use({ seedMode: null });

  test('Try a trick: two taps from the landing to a first answer, Challenger as a guess, one math/try/start', async ({ page, issues }) => {
    await page.goto(APP);
    await expect(page.locator('#view h1')).toHaveText('Fast, fun math for every brain');
    expect((await page.locator('#view .md-lede').innerText()).split(/\s+/).length).toBeLessThanOrEqual(25);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await expect(page.locator('.pick-h')).toHaveText('Or pick who is playing');
    await page.locator('#tryBtn').click(); // tap 1
    await expect(page).toHaveURL(/#\/star\/[\w-]+\/1$/);
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('.star-key[data-k="7"]')).toBeVisible();
    await page.locator('.star-key[data-k="7"]').click(); // tap 2: the first answer digit
    await expect(page.locator('#stOut')).toContainText('7');
    expect(await player(page)).toMatchObject({ mode: 'challenger', modeGuess: true });
    expect((await events(page)).filter(e => e.startsWith('math/try/'))).toEqual(['math/try/start']);
    await expect(page.locator('dialog.vm-tour')).toHaveCount(0);
    expect(appErrors(issues)).toEqual([]);
  });

  test('on a 390 px phone Try a trick is above the fold and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP);
    const b = (await page.locator('#tryBtn').boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('the cards still work: Explorer opens the Explorer Home with no guess recorded', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="explorer"]').click();
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
    await expect(page.locator('#homeMore')).toHaveCount(0);
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Explorer Change$/);
    const p = await player(page);
    expect(p.mode).toBe('explorer');
    expect(p.modeGuess).toBeUndefined();
    expect((await events(page)).filter(e => e.startsWith('math/try/'))).toEqual([]);
  });

  test('Back from the trial Star goes Home, where the mode line names the guess; picking on Me clears it', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stExit')).toBeVisible();
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(new RegExp(`${APP.replace(/\//g, '\\/')}#\\/$`));
    await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
    await expect(page.locator('.mode-line')).toContainText('Mode: Challenger, our guess for a first try');
    await expect(page.locator('.mode-line a[href="#/me"]')).toHaveText('Change');
    await expect(page.locator('.home-doors .door')).toHaveCount(3);
    await page.locator('.mode-line a[href="#/me"]').click();
    await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
    await open(page, '#/');
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Pro Change$/);
    expect((await player(page)).modeGuess).toBeUndefined();
  });

  test('the landing links to Find, which opens without a Mode', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.gd-pickhelp a[href="#/find"]').click();
    await expect(page.locator('#findIn')).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
  });
});

test.describe('Home: three doors first', () => {
  test('a new Challenger on a phone: Play this Star, Open the Dojo and the Arena door come first, the Star is explained, the rest is folded', async ({ page, issues }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const acts = await actions(page);
    const first = acts.findIndex(a => a === 'Play this Star');
    expect(first).toBeGreaterThanOrEqual(0);
    expect(acts[first + 1]).toBe('Open the Dojo');
    expect(acts[first + 2]).toMatch(/^Race in the Arena/);
    expect(acts[first + 3]).toMatch(/^Learn a skill/);
    await expect(page.locator('.dojo-card .door-line')).toContainText('A Star is a two-minute round of four questions on one speed trick');
    await expect(page.locator('#view .md-btn--primary')).toHaveCount(1);
    await expect(page.locator('#view .md-btn--primary')).toHaveText('Play this Star');
    // The rest waits under More ways to play, closed by default
    const more = page.locator('#homeMore');
    await expect(more).not.toHaveAttribute('open', /.*/);
    for (const href of ['#/arena/party', '#/games', '#/sutras', '#/watch']) await expect(more.locator(`.play-tile[href="${href}"]`)).toHaveCount(1);
    await expect(more.locator('.play-tile').first()).toBeHidden();
    await expect(page.locator('.quest-card .mq-small')).toContainText('Sparks are the points you earn for right answers');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(appErrors(issues)).toEqual([]);
  });

  test('More ways to play stays open once opened on this device', async ({ page }) => {
    await open(page);
    await page.locator('#homeMore summary').click();
    await expect(page.locator('#homeMore .play-tile').first()).toBeVisible();
    await open(page, '#/learn');
    await open(page, '#/');
    await expect(page.locator('#homeMore')).toHaveAttribute('open', '');
    await page.locator('#homeMore summary').click();
    await page.reload();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(page.locator('#homeMore')).not.toHaveAttribute('open', /.*/);
  });

  test('Play this Star from Home: the Star\'s Back goes home; from the Dojo it goes back to the Dojo', async ({ page }) => {
    await open(page);
    await page.locator('.dojo-card a.md-btn--primary').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stBack, #stExit').first()).toBeVisible();
    await page.locator('#stExit').click();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await open(page, '#/dojo');
    await page.locator('.dojo-star[href="#/star/from9/1"]').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(/#\/dojo$/);
  });

  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('the Arena door with Play today\'s round, then the Dojo and Skill map doors, before the leaderboard card', async ({ page }) => {
      await open(page);
      const doors = page.locator('.home-doors .door');
      await expect(doors).toHaveCount(3);
      await expect(doors.nth(0).locator('.md-btn--primary')).toHaveText("Play today's round");
      await expect(doors.nth(1)).toHaveAttribute('href', '#/dojo');
      await expect(doors.nth(1)).toContainText('0 of 7 belts');
      await expect(doors.nth(2)).toHaveAttribute('href', '#/learn');
      await expect(page.locator('#view .md-btn--primary')).toHaveCount(1);
      const board = (await page.locator('.board-card').boundingBox())!, last = (await doors.nth(2).boundingBox())!;
      expect(board.y).toBeGreaterThanOrEqual(last.y + last.height);
      await expect(page.locator('#homeBoard')).toBeVisible();
      for (const href of ['#/sutras', '#/arena/party', '#/games', '#/watch']) await expect(page.locator(`#homeMore .play-tile[href="${href}"]`)).toHaveCount(1);
    });
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('keeps its eight picture tiles, the read-aloud switch and Watch and sing, with nothing folded', async ({ page }) => {
      await open(page);
      await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
      await expect(page.locator('#voiceBtn')).toBeVisible();
      await expect(page.locator('a.md-btn[href="#/watch"]')).toBeVisible();
      await expect(page.locator('#homeMore, .home-doors')).toHaveCount(0);
    });
  });
});
