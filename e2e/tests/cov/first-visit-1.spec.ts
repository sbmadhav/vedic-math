import { test, expect, APP, open } from '../fixtures';

/* first-visit spec: one test per scenario. A Mode guess kept from before (openspec try-trick-in-modes: nothing sets one
   now), Back home from a Star opened from Home or from the end of a Try a trick, the three doors, More ways to play, the
   Sparks line and the Explorer home. The Mode picker and Try a trick itself are in first-visit-3.spec.ts. */
type Page = import('@playwright/test').Page;
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const actions = (page: Page) => page.evaluate(() => [...document.querySelectorAll('#view a[href], #view button')].filter(e => (e as HTMLElement).offsetWidth > 0).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));
const STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;

test.describe('a Player whose record holds a Challenger guess from before', () => {
  test.use({ seedPlayer: { modeGuess: true } });

  test('Home after the trial: Home shows the Challenger doors and the mode line says the Mode is a guess, with Change beside it', async ({ page }) => {
    await open(page);
    await expect(page.locator('.home-doors .door')).toHaveCount(3);
    await expect(page.locator('.mode-line')).toContainText('Mode: Challenger, our guess');
    await expect(page.locator('.mode-line a[href="#/me"]')).toHaveText('Change');
  });

  test('Picking clears the guess: after picking Pro on Me, the mode line no longer says the Mode is a guess', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
    await open(page, '#/');
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Pro Change$/);
    expect((await player(page)).modeGuess).toBeUndefined();
  });
});

test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  test('Try a trick sets no guess: the Challenger card, then Try a trick on Home, sets Challenger with no guess and sends math/mode/challenger once', async ({ page }) => {
    await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    await expect(page.locator('#tyStart')).toBeVisible();
    const p = await player(page);
    expect(p.mode).toBe('challenger');
    expect(p.modeGuess).toBeUndefined();
    expect((await page.evaluate(() => (globalThis as any).__events as string[])).filter(e => e.startsWith('math/mode/'))).toEqual(['math/mode/challenger']);
  });

  test('After the trial: Play Star 1 at the end of Try a trick, then the Star round\'s Back control, opens Home', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    await page.locator('#tyStart').click();
    for (const a of [625, 2025, 4225]) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); await page.locator('#tyNext').click(); }
    await page.locator('#tyGoOn').click();
    await expect(page.locator('#stExit')).toBeVisible();
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(new RegExp(`${APP.replace(/\//g, '\\/')}#\\/$`));
    await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
  });
});

test('From the Dojo: a Star opened from the Dojo still goes back to the Dojo', async ({ page }) => {
  await open(page, '#/dojo');
  await page.locator('.dojo-star[href="#/star/from9/1"]').click();
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await page.locator('#stExit').click();
  await expect(page).toHaveURL(/#\/dojo$/);
});

test('A new Challenger: on a 390 px screen the first actions are Play this Star, Learn the sutra and Open the Dojo, then the Arena door; the Sutra door names Nikhilaṃ and its line says what a Sutra and a Star are (openspec change sutras-first)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const acts = await actions(page), i = acts.indexOf('Play this Star');
  expect(i).toBeGreaterThanOrEqual(0);
  expect(acts[i + 1]).toBe('Learn the sutra');
  expect(acts[i + 2]).toBe('Open the Dojo');
  expect(acts[i + 3]).toMatch(/^Race in the Arena/);
  await expect(page.locator('.home-doors .door').first().locator('.sutra-tag-n')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect(page.locator('.sutra-door .door-line')).toHaveText('A sutra is a short rule that does a whole sum in a line or two. A Star is a two-minute round of four questions on one of its tricks.');
  await expect(page.locator('#view .md-btn--primary')).toHaveText(['Play this Star']);
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Pro: the Sutra door with Play this Star comes first, then the Arena door and the Skill map door, all before the leaderboard card (openspec change sutras-first)', async ({ page }) => {
    await open(page);
    const doors = page.locator('.home-doors .door');
    await expect(doors.nth(0)).toHaveClass(/sutra-door/);
    await expect(doors.nth(0).locator('.md-btn--primary')).toHaveText('Play this Star');
    await expect(doors.nth(1)).toHaveAttribute('href', '#/arena');
    await expect(doors.nth(2)).toHaveAttribute('href', '#/learn');
    const board = (await page.locator('.board-card').boundingBox())!, last = (await doors.nth(2).boundingBox())!;
    expect(board.y).toBeGreaterThanOrEqual(last.y + last.height);
  });
});

test('Closed by default: Party Mode, Games, Sutra cards and Watch wait under a closed More ways to play', async ({ page }) => {
  await open(page);
  const more = page.locator('#homeMore');
  await expect(more.locator('summary')).toHaveText('More ways to play');
  await expect(more).not.toHaveAttribute('open', /.*/);
  for (const href of ['#/arena/party', '#/games', '#/sutras', '#/watch']) await expect(more.locator(`.play-tile[href="${href}"]`)).toHaveCount(1);
  await expect(more.locator('.play-tile').first()).toBeHidden();
});

test('Opened once: the disclosure is open when the Player comes back to Home on the same device', async ({ page }) => {
  await open(page);
  await page.locator('#homeMore summary').click();
  await expect(page.locator('#homeMore .play-tile').first()).toBeVisible();
  await open(page, '#/learn');
  await open(page, '#/');
  await expect(page.locator('#homeMore')).toHaveAttribute('open', '');
});

test('Quests card: its last line says Sparks are the points earned for right answers', async ({ page }) => {
  await open(page);
  await expect(page.locator('.quest-card .mq-small')).toContainText('Sparks are the points you earn for right answers');
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: eight picture tiles with nothing folded away, and above them a Sutra card with its name, Say it, an Explorer meaning and a link to its Deep dive (openspec change sutras-first)', async ({ page }) => {
    await open(page);
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
    await expect(page.locator('#homeMore')).toHaveCount(0);
    const card = page.locator('.sutra-say');
    await expect(card.locator('.sutra-say-name b[lang="sa-Latn"]')).not.toBeEmpty();
    await expect(card.getByRole('button', { name: /^Hear how to say / })).toBeVisible();
    await expect(card.locator('.sutra-say-kid')).not.toBeEmpty();
    await expect(card.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', /^#\/sutras\/(s1|s14|s2|u8|u12)$/);
    const c = (await card.boundingBox())!, tiles = (await page.locator('.play-grid--big').boundingBox())!;
    expect(c.y + c.height).toBeLessThanOrEqual(tiles.y);
    /* More places after the tiles (openspec change play-nav-by-mode) */
    expect(await page.locator('nav.home-places a').evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#/games', '#/sutras', '#/guide', '#/find']);
    expect((await page.locator('nav.home-places').boundingBox())!.y).toBeGreaterThanOrEqual(tiles.y + tiles.height);
  });
});
