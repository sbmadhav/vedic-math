import { test, expect, APP, open, appErrors } from './fixtures';

/* The first visit (openspec first-visit, try-trick-in-modes): the Mode picker with a Try a trick under each Mode card
   (the lesson itself is in try-trick.spec.ts), Back home from a Star opened from Home,
   the Sutra door first on Home (openspec change sutras-first) with the rest under More ways to play, Sparks explained
   on the quests card, and the Explorer picture home left alone. Analytics is stubbed so the one fixed event can be checked and nothing counts. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
/* The view's actions in document order, as a visitor meets them */
const actions = (page: Page) => page.evaluate(() => [...document.querySelectorAll('#view a[href], #view button')].filter(e => (e as HTMLElement).offsetWidth > 0).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('the landing', () => {
  test.use({ seedMode: null });

  test('the picker: the short hero, Pick who is playing, three cards each with its Try a trick, and no guess', async ({ page, issues }) => {
    await page.goto(APP);
    await expect(page.locator('#view h1')).toHaveText('Fast, fun math for every brain');
    expect((await page.locator('#view .md-lede').innerText()).split(/\s+/).length).toBeLessThanOrEqual(25);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await expect(page.locator('.mode-pick .mode-try')).toHaveCount(3);
    await expect(page.locator('.pick-h')).toHaveText('Pick who is playing');
    await page.locator('[data-try="challenger"]').click();
    await expect(page).toHaveURL(/#\/try$/);
    await expect(page.locator('#tyStart')).toBeFocused();
    await page.locator('#tyStart').click();
    await expect(page.locator('#tyIn')).toBeFocused();
    expect(await player(page)).toMatchObject({ mode: 'challenger' });
    expect((await player(page)).modeGuess).toBeUndefined();
    expect((await events(page)).filter(e => e.startsWith('math/try/'))).toEqual(['math/try/start', 'math/try/mode/challenger']);
    // A card's Try a trick is a pick: it is counted as one
    expect((await events(page)).filter(e => e.startsWith('math/mode/'))).toEqual(['math/mode/challenger']);
    await expect(page.locator('dialog.vm-tour')).toHaveCount(0);
    expect(appErrors(issues)).toEqual([]);
  });

  test('on a 390 px phone the Explorer card\'s Try a trick is above the fold and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP);
    const b = (await page.locator('[data-try="explorer"]').boundingBox())!;
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

  test('Back from the Star at the end of Try a trick goes Home, where the mode line names no guess', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="challenger"]').click();
    await page.locator('#tyStart').click();
    for (const a of [625, 2025, 4225]) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); await page.locator('#tyNext').click(); }
    await page.locator('#tyGoOn').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stExit')).toBeVisible();
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(new RegExp(`${APP.replace(/\//g, '\\/')}#\\/$`));
    await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Challenger Change$/);
    await expect(page.locator('.home-doors .door')).toHaveCount(3);
  });

  test('the landing links to Find, which opens without a Mode', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.gd-pickhelp a[href="#/find"]').click();
    await expect(page.locator('#findIn')).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
  });
});

/* Home on a phone (openspec change find-and-home-polish): the primary action in the first screen, no card that repeats it */
test.describe('Home on a 390 px phone after Try a trick', () => {
  test.use({ seedMode: null, viewport: { width: 390, height: 844 } });
  for (const scheme of ['light', 'dark'] as const) {
    test(`compact Player strip, no Keep going, Play this Star on screen (${scheme})`, async ({ page, issues }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(APP);
      await page.locator('[data-try="challenger"]').click();
      await page.locator('#tyStart').click();
      for (const a of [625, 2025, 4225]) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); await page.locator('#tyNext').click(); }
      await page.locator('#tyHome').click();
      await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
      await expect(page.locator('.mq-continue')).toHaveCount(0); /* Try a trick is a lesson: it leaves Keep going alone */
      const strip = (await page.locator('.me-strip').boundingBox())!;
      expect(strip.height).toBeLessThanOrEqual(130);
      const play = (await page.locator('#view .md-btn--primary').boundingBox())!;
      expect(play.y + play.height).toBeLessThanOrEqual(844);
      await expect(page.locator('#view .md-btn--primary')).toHaveText('Play this Star');
      // The New here? note: one control, on a solid card so the drawing behind never crosses its words
      await expect(page.locator('.gd-new').locator('a, button')).toHaveCount(1);
      expect(await page.locator('.gd-new').evaluate(e => getComputedStyle(e).backgroundColor)).toBe(await page.locator('.me-strip').evaluate(e => getComputedStyle(e).backgroundColor));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      expect(appErrors(issues)).toEqual([]);
    });
  }
});

test.describe('Keep going for another Skill', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, last: '3-mult' } });
  test('a Challenger who last practiced another Skill is offered it', async ({ page }) => {
    await open(page);
    await expect(page.locator('.mq-continue')).toHaveAttribute('href', '#/skill/3-mult');
  });
});

test.describe('Home: three doors first', () => {
  test('a new Challenger on a phone: Play this Star, Learn the sutra and Open the Dojo, then the Arena door, come first; the Sutra and the Star are explained; the rest is folded', async ({ page, issues }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const acts = await actions(page);
    const first = acts.findIndex(a => a === 'Play this Star');
    expect(first).toBeGreaterThanOrEqual(0);
    expect(acts[first + 1]).toBe('Learn the sutra');
    expect(acts[first + 2]).toBe('Open the Dojo');
    expect(acts[first + 3]).toMatch(/^Race in the Arena/);
    expect(acts[first + 4]).toMatch(/^Learn a skill/);
    await expect(page.locator('.sutra-door .sutra-tag-n')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(page.locator('.dojo-card .door-line')).toContainText('A sutra is a short rule that does a whole sum in a line or two. A Star is a two-minute round of four questions on one of its tricks.');
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
    await expect.poll(() => page.evaluate(() => localStorage.getItem('vm.homeMore'))).toBe('0'); /* the toggle event stores it after the click: wait for it before the reload */
    await page.reload();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(page.locator('#homeMore')).not.toHaveAttribute('open', /.*/);
  });

  test('an unknown Skill falls back to Home with its doors and no error, and the disclosure is still remembered', async ({ page, issues }) => {
    await open(page, '#/katas/sq5');
    await page.goto(`${APP}#/skill/no-such-skill`);
    await expect(page.locator('.home-doors .door')).toHaveCount(3);
    await page.locator('#homeMore summary').click();
    await expect(page.locator('#homeMore')).toHaveAttribute('open', '');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('vm.homeMore'))).toBe('1'); /* the toggle event stores it after the click: wait for it before leaving */
    await open(page, '#/');
    await expect(page.locator('#homeMore')).toHaveAttribute('open', '');
    expect(appErrors(issues)).toEqual([]);
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
    test('the Sutra door with Play this Star, then the Arena and Skill map doors, before the leaderboard card (openspec change sutras-first)', async ({ page }) => {
      await open(page);
      const doors = page.locator('.home-doors .door');
      await expect(doors).toHaveCount(3);
      await expect(doors.nth(0)).toHaveClass(/sutra-door/);
      await expect(doors.nth(0).locator('.md-btn--primary')).toHaveText('Play this Star');
      await expect(doors.nth(0).getByRole('link', { name: 'Open the Dojo' })).toHaveAttribute('href', '#/dojo');
      await expect(doors.nth(0)).toContainText('0 of 7 belts');
      await expect(doors.nth(1)).toHaveAttribute('href', '#/arena');
      await expect(doors.nth(1)).toContainText("Today's Arena round");
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
