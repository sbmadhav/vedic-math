import { test, expect, open, atRoute, hrefTo, pathTo } from './fixtures';

/* Play experiences (openspec play-experiences): twelve pages inside the Dojo, Arena, Games and Sutras sections,
   listed on each section's shelf. Party Mode replaces the Duel. */

const PAGES = [
  { hash: '#/dojo/spells', h1: 'Sutra Spellbook', back: 'Dojo' },
  { hash: '#/dojo/locks', h1: 'Discovery Locks', back: 'Dojo' },
  { hash: '#/arena/party', h1: 'Party Mode', back: 'Arena' },
  { hash: '#/arena/ghosts', h1: 'Ghost Races', back: 'Arena' },
  { hash: '#/arena/daily-number', h1: 'Daily Number', back: 'Arena' },
  { hash: '#/games/tala', h1: 'Tala Lab', back: 'Games' },
  { hash: '#/games/art', h1: 'Mandala Studio', back: 'Games' },
  { hash: '#/games/wall', h1: 'Pattern Wall', back: 'Games' },
  { hash: '#/games/apprentice', h1: 'Teach the Apprentice', back: 'Games' },
  { hash: '#/games/bets', h1: 'Estimation Bets', back: 'Games' },
  { hash: '#/games/lens', h1: 'Math Lens', back: 'Games' },
  { hash: '#/sutras/lost-scroll', h1: 'The Lost Śulba Scroll', back: 'Sutras' }
];

for (const p of PAGES) test(`${p.hash} opens ${p.h1} inside ${p.back}, with no errors and no sideways scroll`, async ({ page, issues }) => {
  await open(page, p.hash);
  await expect(page.locator('#view h1').first()).toHaveText(p.h1);
  await expect(page.locator('.px-back').first()).toHaveText(new RegExp(p.back));
  await expect(page).toHaveTitle(new RegExp(`^${p.h1} · Learn Vedic Math`));
  // Its section's zone is the current nav item (spec: "Experiences live inside sections"; the Sutras are in Learn, the
  // Dojo, the Arena and Games in the Arcade: openspec change play-nav-by-mode)
  await expect(page.locator(`.mq-nav a${hrefTo(`#/${p.back === 'Sutras' ? 'learn' : 'arcade'}`)}`)).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('.px-back').first().click();
  await expect(page).toHaveURL(atRoute(`#/${p.back.toLowerCase()}`));
  expect(issues.console).toEqual([]);
});

test('section shelves list the experiences for the Mode', async ({ page }) => {
  for (const [hash, n] of [['#/dojo', 2], ['#/arena', 3], ['#/games', 6], ['#/sutras', 1]] as const) {
    await open(page, hash);
    await expect(page.locator('.play-shelf .play-card')).toHaveCount(n);
  }
  await page.locator('.play-card', { hasText: 'The Lost Śulba Scroll' }).click();
  await expect(page).toHaveURL(atRoute('#/sutras/lost-scroll'));
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Games and Arena shelves show, and nothing from the hidden Dojo and Sutras', async ({ page }) => {
    await open(page, '#/games');
    // Pattern Wall, Teach the Apprentice and Estimation Bets are Challenger and Pro only for now
    await expect(page.locator('.play-shelf .play-card b')).toHaveText(['Tala Lab', 'Mandala Studio', 'Math Lens']);
    await open(page, '#/arena');
    await expect(page.locator('.play-shelf .play-card')).toHaveCount(3);
    await open(page, '#/dojo');
    await expect(page.locator('.play-shelf')).toHaveCount(0);
  });
  for (const [hash, title] of [['#/games/wall', 'Pattern Wall'], ['#/games/bets', 'Estimation Bets'], ['#/games/apprentice', 'Teach the Apprentice'], ['#/dojo/spells', 'Sutra Spellbook']] as const) {
    test(`a direct link to ${title} says it is for older players and offers what an Explorer can play`, async ({ page, issues }) => {
      await open(page, hash);
      await expect(page.locator('#view h1')).toHaveText(`${title} is for older players`);
      await expect(page.locator('#view .play-card').first()).toBeVisible();
      for (const href of await page.locator('#view .play-card').evaluateAll(as => as.map(a => a.getAttribute('href')))) expect(['#/games/tala', '#/games/art', '#/games/lens', '#/arena/party', '#/arena/ghosts', '#/arena/daily-number'].map(pathTo)).toContain(href);
      expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.')))).toEqual([]);
      expect(issues.console).toEqual([]);
    });
  }
});

test('#/duel opens Party Mode, and the Home tile and Sky place point there', async ({ page }) => {
  await open(page, '#/duel');
  await expect(page).toHaveURL(atRoute('#/arena/party'));
  await expect(page.locator('#view h1').first()).toHaveText('Party Mode');
  await expect(page.locator('.pt-start')).toBeVisible();
  await open(page, '#/tiles');
  await expect(page.locator(`#view a.play-tile${hrefTo('#/arena/party')}`)).toHaveCount(1);
  await expect(page.locator('#view a[href="#/duel"], #view a[href$="/duel"]')).toHaveCount(0); /* the old route's name is drawn nowhere, in either form */
  await open(page, '#/places');
  await expect(page.locator('.places-list').getByRole('link', { name: 'Party', exact: true })).toHaveAttribute('href', pathTo('#/arena/party'));
});

test("a shelf does not restyle Home's tile grid (its own grid class)", async ({ page }) => {
  await open(page, '#/games');
  await expect(page.locator('.play-shelf .play-shelf-grid')).toHaveCount(1);
  await open(page, '#/tiles');
  const grid = page.locator('#view .play-grid').first();
  await expect(grid).toHaveCSS('margin-top', '18px');
  expect(await grid.evaluate(el => getComputedStyle(el).listStyleType)).not.toBe('none');
});

test.describe('motion allowed by the device', () => {
  // The suite runs with reduced motion; here the device allows motion, so only Calm or Pause motion can stop it
  test.use({ reducedMotion: 'no-preference' });
  const moving = (page: import('@playwright/test').Page) => page.evaluate(() => [...document.querySelectorAll('#view *')].filter(el => getComputedStyle(el).animationName !== 'none').length);
  test('an experience page animates, and Calm stops every animation on it', async ({ page }) => {
    await open(page, '#/games/apprentice');
    await expect(page.locator('#view h1').first()).toBeVisible();
    await expect.poll(() => moving(page)).toBeGreaterThan(0);
    await page.evaluate(() => document.body.classList.add('calm'));
    expect(await moving(page)).toBe(0);
  });
  test('Pause motion (html.motion-paused) stops them too', async ({ page }) => {
    await open(page, '#/games/apprentice');
    await expect.poll(() => moving(page)).toBeGreaterThan(0);
    await page.evaluate(() => document.documentElement.classList.add('motion-paused'));
    expect(await moving(page)).toBe(0);
  });
});

test('a malformed escape in a play link opens the page instead of breaking it', async ({ page, issues }) => {
  await open(page, '#/arena/ghosts/r/%E0%A4');
  await expect(page.locator('#view h1').first()).toHaveText('Ghost Races');
  expect(issues.console.filter(m => /URIError/.test(m))).toEqual([]);
});

test('Party Mode: Start the party begins the first round', async ({ page, issues }) => {
  await open(page, '#/arena/party');
  await page.locator('.pt-start').click();
  await expect(page.locator('.pt-start')).toHaveCount(0);
  await expect(page.locator('#view')).toContainText(/round|Round|buzz|Buzz/);
  expect(issues.console).toEqual([]);
});

test('play state is kept per Player, under vm.play.<player id>', async ({ page }) => {
  await open(page, '#/arena/daily-number');
  // One move, so Daily Number has something to keep
  await page.locator('[data-slot]').first().click();
  await page.locator('.dn-ops [data-op]').first().click();
  await page.locator('[data-slot]:not(:disabled)').nth(1).click();
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players') || '{}').active);
  expect(active).toBeTruthy();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.') || k.startsWith('vp.')));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith(`vm.play.${active}.`), k).toBe(true);
});

test('opening play pages and pressing around is not a practice day; a finish is', async ({ page }) => {
  const day = () => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}').active; const d = JSON.parse(localStorage.getItem('mathquest.v1.' + p) || '{}').days || {}; const t = new Date(); const k = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; return d[k] || 0; });
  await open(page, '#/games');
  const before = await day();
  for (const hash of ['#/games/tala', '#/games/art', '#/arena/ghosts', '#/games/lens']) { await open(page, hash); await expect(page.locator('#view h1').first()).toBeVisible(); }
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'art/try' } })); document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'tala/compose-open' } })); });
  expect(await day()).toBe(before);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'daily/solve' } })));
  await expect.poll(day).toBe(before + 1);
});

test('the badge for Party Mode is listed on Me', async ({ page }) => {
  await open(page, '#/me');
  await expect(page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: /^Party host$/ }) })).toContainText('Finish a Party Mode game');
});

test('leaving an experience page suspends the shared audio context', async ({ page }) => {
  await open(page, '#/games/tala');
  await page.locator('#view h1').first().click(); // a user gesture, so the context may run
  const state = () => page.evaluate(async () => { const k = await e2eMod('play/kit'); return k.audio()?.state; });
  await expect.poll(state).toBe('running');
  await page.locator('.px-back').first().click();
  await expect(page).toHaveURL(atRoute('#/games'));
  await expect.poll(() => page.evaluate(async () => { const k = await e2eMod('play/kit'); return (k as any).audioState?.(); })).toBe('suspended');
});
