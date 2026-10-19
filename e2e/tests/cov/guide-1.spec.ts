import { test, expect, APP, open, appErrors } from '../fixtures';

/* guide spec, Requirement "A guide page": one test per scenario. e2e/tests/guide.spec.ts has the fuller checks;
   these assert each scenario's own observable. */

test('Reading the guide: a Challenger sees every section with what, how, a tip and a picture', async ({ page, issues }) => {
  await open(page, '#/guide');
  await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
  // the skill map, practice, the Dojo, Stars, Katas, Sutra cards, Games, the Arena, the Challenge tower, Party (the Duel's successor), Boards, Watch, Calm, read-aloud, music, players, offline use and privacy
  for (const id of ['skills', 'practice', 'dojo', 'stars', 'katas', 'sutras', 'games', 'arena', 'tower', 'party', 'boards', 'watch', 'calm', 'voice', 'music', 'players', 'offline', 'parents']) {
    await expect(page.locator(`#gd-${id}`), id).toHaveCount(1);
  }
  for (const s of await page.locator('.gd-sec').all()) {
    await expect(s.locator('.gd-art svg')).toHaveCount(1);
    await expect(s.locator('.gd-what')).not.toBeEmpty();
    expect(await s.locator('.gd-how li').count()).toBeGreaterThanOrEqual(1);
    await expect(s.locator('.gd-tip')).not.toBeEmpty();
  }
  expect(appErrors(issues)).toEqual([]);
});

test('Try it: the Katas section link opens the Katas page of a real Trick', async ({ page }) => {
  await open(page, '#/guide');
  await page.locator('#gd-katas .gd-try').click();
  await expect(page).toHaveURL(/#\/katas\/[\w-]+$/);
  await expect(page.locator('#view h1')).toContainText(/katas/i);
});

test('A new route: every route the menu bar and the section links reach is covered by a guide section', async ({ page }) => {
  // test/guide.test.mjs reads the router's regexes and fails when a route has no section; here the shipped guide module
  // must cover every link the menu bar shows, so a new nav item without a section fails in the browser too
  await open(page, '#/guide');
  const hrefs = await page.locator('.mq-nav a[href^="#/"]').evaluateAll(els => els.map(e => e.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThanOrEqual(6);
  const uncovered = await page.evaluate(async (hrefs: string[]) => {
    const g = await import('/js/guide.js' as string);
    const covers: string[] = g.sections({}).flatMap((s: any) => s.covers || []);
    const base = (h: string) => '#/' + h.replace(/^#\//, '').split('/')[0];
    return hrefs.filter(h => !covers.some(c => c === h || base(c) === base(h)));
  }, hrefs);
  expect(uncovered).toEqual([]);
});
