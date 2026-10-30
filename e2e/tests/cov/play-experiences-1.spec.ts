import { test, expect, open } from '../fixtures';

/* play-experiences spec, Requirements "Experiences live inside sections", "Section shelves by Mode", "Party Mode
   replaces the Duel", "Per Player state" and "Sparks from play, capped": one test per scenario. */
type Page = import('@playwright/test').Page;
const today = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const progress = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}').active; return JSON.parse(localStorage.getItem('mathquest.v1.' + p) || '{}'); });

test('Opening Tala Lab: #/games/tala shows Tala Lab, the Arcade (Games\' zone) is current in the nav, and Back returns to #/games', async ({ page }) => {
  await open(page, '#/games/tala');
  await expect(page.locator('#view h1').first()).toHaveText('Tala Lab');
  await expect(page.locator('.mq-nav a[href="#/arcade"]')).toHaveAttribute('aria-current', 'true'); /* Games is in the Arcade (openspec change play-nav-by-mode) */
  await page.locator('.px-back').first().click();
  await expect(page).toHaveURL(/#\/games$/);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer Games page: the shelf lists Tala Lab, Mandala Studio and Math Lens', async ({ page }) => {
    await open(page, '#/games');
    await expect(page.locator('.play-shelf .play-card b')).toHaveText(['Tala Lab', 'Mandala Studio', 'Math Lens']);
  });
  test('A direct link outside the Mode: Pattern Wall, Teach the Apprentice, Estimation Bets, a Dojo experience and a Sutras experience say they are for older players, offer what an Explorer can open, and store nothing', async ({ page }) => {
    for (const [hash, title] of [['#/games/wall', 'Pattern Wall'], ['#/games/apprentice', 'Teach the Apprentice'], ['#/games/bets', 'Estimation Bets'], ['#/dojo/spells', 'Sutra Spellbook'], ['#/sutras/lost-scroll', 'The Lost Śulba Scroll']] as const) {
      await open(page, hash);
      await expect(page.locator('#view h1')).toHaveText(`${title} is for older players`);
      const offered = await page.locator('#view .play-card').evaluateAll(as => as.map(a => a.getAttribute('href')));
      expect(offered.length).toBeGreaterThan(0);
      for (const href of offered) expect(['#/games/tala', '#/games/art', '#/games/lens', '#/arena/party', '#/arena/ghosts', '#/arena/daily-number']).toContain(href);
      expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.')))).toEqual([]);
    }
  });
});

test('An old Duel link: #/duel becomes #/arena/party and Party Mode shows', async ({ page }) => {
  await open(page, '#/duel');
  await expect(page).toHaveURL(/#\/arena\/party$/);
  await expect(page.locator('#view h1').first()).toHaveText('Party Mode');
  await expect(page.locator('.pt-start')).toBeVisible();
});

test('Switching Player: a second Player opens Daily Number and sees their own progress, not the first Player\'s', async ({ page }) => {
  await open(page, '#/arena/daily-number');
  await page.locator('[data-slot]').first().click();
  await page.locator('.dn-ops [data-op]').first().click();
  await page.locator('[data-slot]:not(:disabled)').nth(1).click();
  const p1Keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.p1.')));
  expect(p1Keys.length).toBeGreaterThan(0);
  const movedBoard = await page.locator('#view').innerText();
  /* The second Player joins after the fixture has made the first, so their order is fixed */
  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem('vm.players')!);
    v.list.push({ id: 'p2', name: 'Calm Otter 7', avatar: 'coral', mode: 'challenger', created: Date.now() });
    v.active = 'p2';
    localStorage.setItem('vm.players', JSON.stringify(v));
  });
  await page.reload();
  await expect(page.locator('#view h1').first()).toHaveText('Daily Number');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.p2.')))).toEqual([]);
  expect(await page.locator('#view').innerText()).not.toBe(movedBoard);
  // Player 1's record is untouched
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.p1.')))).toEqual(p1Keys);
});

test.describe('150 Sparks from experiences already today', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 400, days: {}, best: {}, last: null, grade: null, badges: {}, counts: { [`playSparks:${today()}`]: 150 }, seen: {}, katasDone: {}, ratings: {}, weekSparks: {} } });
  test('The daily cap: further play today earns no more Sparks from experiences', async ({ page }) => {
    await open(page, '#/games');
    const before = (await progress(page)).sparks;
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'daily/solve' } })));
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('vmplay', { detail: { action: 'party/finish' } })));
    await page.waitForTimeout(300);
    expect((await progress(page)).sparks).toBe(before);
  });
});

test('Only opening pages: Tala Lab, Mandala Studio and Ghost Races opened with nothing finished is not a practice day', async ({ page }) => {
  await open(page, '#/games');
  const dayBefore = (await progress(page)).days?.[today()] || 0;
  for (const hash of ['#/games/tala', '#/games/art', '#/arena/ghosts']) { await open(page, hash); await expect(page.locator('#view h1').first()).toBeVisible(); }
  await page.locator('.px-back').first().click();
  expect(((await progress(page)).days || {})[today()] || 0).toBe(dayBefore);
});
