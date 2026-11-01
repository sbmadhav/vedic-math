import type { Page } from '@playwright/test';
import { test, expect, APP, pathTo, appErrors } from './fixtures';

/* Old links, forever (openspec change indexable-routes, task 2.2; design D9; game-urls spec, "Old /play/ links reach
   the same screen, forever" and "Old hash links reach the same screen, forever"). The game moved from /play/ to
   /learn/ and from #/ routes to paths. Every old form reaches the screen's one path:
   - /play/#/x: _redirects answers /play/ with a 301 to /learn/ (the browser keeps the fragment), and the page's
     pre-paint script replaces /learn/#/x with /learn/x before anything paints;
   - /learn/#/x: the same script;
   - /play/x: a 301 to /learn/x, query kept;
   - /#/x on the landing page: its pre-paint script goes straight to /learn/x;
   - /vedic-math/#/x (the move's old links): a 301 to /learn/, then the game's script.
   One path of every route kind (deep-links.spec.ts lists the same kinds) in both hash forms. A document that only
   forwards must paint nothing: each document logs its paint timing entries when it is left (pagehide), and every one
   that was not the target has none, so nothing but the target ever reaches the screen. Back after each returns to the
   page before the old link: the forward replaced its history entry rather than adding one. */

const KINDS: [string, string, string?][] = [
  ['Home', ''],
  ['the Skill map, by its old name', 'learn', 'skills'],
  ['a level', 'grade/3'],
  ['a Skill lesson', 'skill/v-sq5'],
  ['Endless practice', 'mix/3'],
  ['Endless run', 'run/3'],
  ['the Arcade', 'arcade'],
  ['the Dojo', 'dojo'],
  ['a second name, tricks', 'tricks', 'dojo'],
  ["a Trick's Katas", 'katas/sq5'],
  ['a Kata', 'kata/sq5/1'],
  ['a Star', 'star/sq5/1'],
  ['Try a trick', 'try'],
  ['the tower', 'tower'],
  ['a chapter', 'tower/1'],
  ['a challenge', 'challenge/1'],
  ['the Sutras', 'sutras'],
  ['a Deep dive', 'sutras/s1'],
  ['the Arena', 'arena'],
  ['Games', 'games'],
  ['a game', 'game/times-sprint'],
  ['a Level', 'game/times-sprint/1'],
  ['Watch', 'watch'],
  ['Places', 'places'],
  ['the tiles', 'tiles'],
  ['Me', 'me'],
  ['the Guide', 'guide'],
  ['a Guide section', 'guide/around'],
  ['Find', 'find'],
  ['a play experience', 'dojo/spells'],
];
const CHUNK = 6;
const chunks: typeof KINDS[] = [];
for (let i = 0; i < KINDS.length; i += CHUNK) chunks.push(KINDS.slice(i, i + CHUNK));

/* Where each test starts, so Back has somewhere to go: a page outside the game, light and never forwarded */
const FROM = '/privacy/';
const PAINTS = 'e2e.paints';

test.use({ seedProgress: { days: { '2026-01-05': 3 } } }); /* a returning Challenger: every screen draws, no Mode picker */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(key => {
    const at = location.href;
    addEventListener('pagehide', () => {
      try {
        const log = JSON.parse(sessionStorage.getItem(key) || '[]');
        log.push({ at, paints: performance.getEntriesByType('paint').map(e => e.name) });
        sessionStorage.setItem(key, JSON.stringify(log));
      } catch { /* storage blocked: the paint check below then finds no log and fails */ }
    });
  }, PAINTS);
});

/** Loads `from` and the old link after it; returns once the target view is drawn */
async function follow(page: Page, link: string) {
  await page.evaluate(key => sessionStorage.removeItem(key), PAINTS);
  await page.goto(link);
  await expect(page.locator('#view h1, #view h2').first(), `${link} draws a view`).toBeVisible();
}

/** Every document left on the way to the target painted nothing; `forwards` is how many there must have been */
async function paintedOnlyTheTarget(page: Page, link: string, forwards: number) {
  const log: { at: string; paints: string[] }[] = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '[]'), PAINTS);
  const passed = log.filter(e => new URL(e.at).pathname !== new URL(FROM, e.at).pathname);
  expect(passed.length, `${link}: the documents that forwarded (${log.map(e => e.at).join(', ')})`).toBe(forwards);
  for (const e of passed) expect(e.paints, `${link}: ${e.at} painted before it forwarded`).toEqual([]);
}

/** The address is the screen's one path, with no fragment */
async function atPath(page: Page, link: string, path: string) {
  const u = new URL(page.url());
  expect(u.hash, `${link} left a fragment`).toBe('');
  expect(u.pathname, link).toBe(path);
}

for (const [i, group] of chunks.entries()) {
  test(`/play/#/x and /learn/#/x reach the screen's path: ${group.map(k => k[0]).join(', ')} (${i + 1} of ${chunks.length})`, async ({ page, issues }) => {
    await page.goto(FROM);
    for (const [what, rest, endsAt] of group) {
      const path = pathTo('#/' + (endsAt ?? rest));
      for (const link of [`/play/#/${rest}`, `${APP}#/${rest}`]) {
        await test.step(`${what}: ${link}`, async () => {
          const errorsBefore = appErrors(issues).length;
          await follow(page, link);
          await atPath(page, link, path);
          await paintedOnlyTheTarget(page, link, 1); /* /learn/#/x, whichever form: the 301 has no document */
          expect(appErrors(issues).slice(errorsBefore), `${link}: console errors`).toEqual([]);
          await page.goBack();
          await expect(page, `${link}: Back returns to the page before it`).toHaveURL(new RegExp(`${FROM}$`));
        });
      }
    }
  });
}

test('/play/x answers 301 with /learn/x, query kept, and the old Mode link sets the Mode', async ({ page, request }) => {
  for (const [from, to] of [['/play/arena', '/learn/arena'], ['/play/kata/sq5/1?problem=2', '/learn/kata/sq5/1?problem=2'], ['/play/', '/learn/'], ['/play', '/learn/'],
    ['/play/?mode=explorer', '/learn/?mode=explorer']]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(new URL(res.headers()['location'], 'http://x').pathname + new URL(res.headers()['location'], 'http://x').search, from).toBe(to);
  }
  await page.goto(FROM);
  await follow(page, '/play/arena');
  await atPath(page, '/play/arena', '/learn/arena');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${FROM}$`));
  /* The landing page's Mode cards linked /play/?mode=<id>: the Mode is set, and mode leaves the address */
  await follow(page, '/play/?mode=explorer');
  await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(APP);
  expect(await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: { id: string }) => x.id === p.active)?.mode; })).toBe('explorer');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${FROM}$`));
});

test('the landing page sends /#/games straight to /learn/games, painting nothing first', async ({ page }) => {
  await page.goto(FROM);
  await follow(page, '/#/games');
  await atPath(page, '/#/games', pathTo('#/games'));
  await paintedOnlyTheTarget(page, '/#/games', 1); /* the landing page */
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${FROM}$`));
});

test('an old /vedic-math/#/arena link reaches /learn/arena, painting nothing first', async ({ page }) => {
  await page.goto(FROM);
  await follow(page, '/vedic-math/#/arena');
  await atPath(page, '/vedic-math/#/arena', pathTo('#/arena'));
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  await paintedOnlyTheTarget(page, '/vedic-math/#/arena', 1); /* /learn/#/arena, after the 301 */
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${FROM}$`));
});

test('a Legacy location.hash write becomes the path without a reload, and Back returns', async ({ page }) => {
  await page.goto(pathTo('#/arena'));
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  await page.evaluate(() => { (window as unknown as { stayed: boolean }).stayed = true; location.hash = '#/games'; });
  await expect(page).toHaveURL(new RegExp(`${pathTo('#/games')}$`));
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed), 'the same document').toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${pathTo('#/arena')}$`));
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed), 'Back stays in the document').toBe(true);
});

test('the skip link #view stays a fragment: no forward, the path stays, and Back drops it', async ({ page }) => {
  await page.goto(pathTo('#/arena'));
  await expect(page.locator('#view h1')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { stayed: boolean }).stayed = true; });
  await page.locator('a.md-skip').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${pathTo('#/arena')}#view$`));
  expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${pathTo('#/arena')}$`));
  /* Loaded cold with #view, the page keeps it too */
  await page.goto(pathTo('#/arena') + '#view');
  await expect(page.locator('#view h1')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#view');
  expect(new URL(page.url()).pathname).toBe(pathTo('#/arena'));
});
