import { test, expect, APP, open } from '../fixtures';

/* first-visit spec: one test per scenario. Try a trick on the landing, the guessed Mode, Back home from a Star opened
   from Home, the three doors, More ways to play, the Sparks line and the Explorer home. */
type Page = import('@playwright/test').Page;
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const actions = (page: Page) => page.evaluate(() => [...document.querySelectorAll('#view a[href], #view button')].filter(e => (e as HTMLElement).offsetWidth > 0).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));

test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  test('Two taps to a question: Try a trick opens the worked example, Start the Star opens the first question, and a digit enters the first answer', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('.star-h')).toBeVisible();
    await page.locator('#stStart').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.locator('.star-key[data-k="3"]').click();
    await expect(page.locator('#stOut')).toContainText('3');
  });

  test('The cards still work: the Explorer card opens Explorer Home as before, with no guess recorded', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="explorer"]').click();
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    expect((await player(page)).modeGuess).toBeUndefined();
  });

  test('Above the fold on a phone: Try a trick is on screen without scrolling at 390 px, and the lede has at most 25 words', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP);
    const b = (await page.locator('#tryBtn').boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    expect((await page.locator('#view .md-lede').innerText()).split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  test('Home after the trial: the Challenger doors show and the mode line says the Mode is a guess, with Change beside it', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stExit')).toBeVisible();
    await open(page, '#/');
    await expect(page.locator('.home-doors .door')).toHaveCount(3);
    await expect(page.locator('.mode-line')).toContainText('Mode: Challenger, our guess');
    await expect(page.locator('.mode-line a[href="#/me"]')).toHaveText('Change');
  });

  test('Picking clears the guess: after picking Pro on Me, the mode line no longer says the Mode is a guess', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stExit')).toBeVisible();
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
    await open(page, '#/');
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Pro Change$/);
  });

  test('After the trial: leaving the Star round with its Back control opens Home', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stExit')).toBeVisible();
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(new RegExp(`${APP.replace(/\//g, '\\/')}#\\/$`));
    await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
  });
});

test('From the Dojo: a Star opened from the Dojo still goes back to the Dojo', async ({ page }) => {
  await open(page, '#/dojo');
  await page.locator('.dojo-star[href="#/star/from9/1"]').click();
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await page.locator('#stExit').click();
  await expect(page).toHaveURL(/#\/dojo$/);
});

test('A new Challenger: on a 390 px screen the first three actions are Play this Star, Open the Dojo and the Arena door, and the Star is explained', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const acts = await actions(page), i = acts.indexOf('Play this Star');
  expect(i).toBeGreaterThanOrEqual(0);
  expect(acts[i + 1]).toBe('Open the Dojo');
  expect(acts[i + 2]).toMatch(/^Race in the Arena/);
  await expect(page.locator('.dojo-card .door-line')).toContainText('A Star is a two-minute round of four questions on one speed trick');
  await expect(page.locator('#view .md-btn--primary')).toHaveText(['Play this Star']);
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test("Pro: the Arena door with Play today's round, the Dojo door and the Skill map door come before the leaderboard card", async ({ page }) => {
    await open(page);
    const doors = page.locator('.home-doors .door');
    await expect(doors.nth(0).locator('.md-btn--primary')).toHaveText("Play today's round");
    await expect(doors.nth(1)).toHaveAttribute('href', '#/dojo');
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
  test('Explorer: eight picture tiles with nothing folded away', async ({ page }) => {
    await open(page);
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
    await expect(page.locator('#homeMore')).toHaveCount(0);
  });
});
