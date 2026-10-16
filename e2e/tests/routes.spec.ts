import { test, expect, APP, open, cloudLog, heldClock } from './fixtures';

/* The app is a hash router (#/learn, #/dojo, ...). Every top-level route renders, deep links work,
   and Back / Forward move between views. */

const ROUTES = [
  { hash: '#/learn', nav: 'Learn', h1: 'Pick a level', title: /^Skill map: Vedic Math/ },
  { hash: '#/dojo', nav: 'Dojo', h1: 'From white belt to black belt', title: /^Vedic Dojo/ },
  { hash: '#/arena', nav: 'Arena', h1: '60 seconds. Same questions for everyone.', title: /^Arena/ },
  { hash: '#/games', nav: 'Games', h1: 'Games that build number sense', title: /^Games/ },
  { hash: '#/sutras', nav: 'Sutras', h1: 'The 16 sutras and 13 sub-sutras', title: /^The sutras:/ },
  { hash: '#/watch', nav: 'Watch', h1: 'The best math trick videos and sites', title: /^Watch and learn/ },
  { hash: '#/me', nav: null, h1: 'Swift Tiger 42', title: /^Me: Vedic Math/ },
];

for (const r of ROUTES) {
  test(`${r.hash} renders by deep link`, async ({ page, issues }) => {
    await open(page, r.hash);
    await expect(page.locator('#view h1')).toHaveText(r.h1);
    await expect(page).toHaveTitle(r.title);
    if (r.nav) await expect(page.locator('.mq-nav').getByRole('link', { name: r.nav, exact: true })).toHaveAttribute('aria-current', 'true');
    expect(issues.console, 'console errors').toEqual([]);
  });
}

test('route content: learn levels, dojo belts, games, sutra cards, watch shelf, me badges', async ({ page }) => {
  await open(page, '#/learn');
  expect(await page.locator('.mq-grade').count()).toBeGreaterThan(3);
  await open(page, '#/dojo');
  await expect(page.locator('.dojo-belt')).toHaveCount(7);
  await open(page, '#/games');
  await expect(page.locator('a.mq-game')).toHaveCount(14);
  await open(page, '#/sutras');
  await expect(page.locator('.sutra-card')).toHaveCount(29);
  await open(page, '#/watch');
  expect(await page.locator('.watch-card').count()).toBeGreaterThan(3);
  await page.locator('.g-optrow [data-f="all"]').click();
  expect(await page.locator('.watch-card').count()).toBeGreaterThan(10);
  await open(page, '#/me');
  expect(await page.locator('.badge-grid .badge').count()).toBeGreaterThan(10);
});

test('nav links move between views, and Back / Forward follow', async ({ page }) => {
  await open(page);
  const nav = page.locator('.mq-nav');
  await nav.getByRole('link', { name: 'Learn', exact: true }).click();
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await nav.getByRole('link', { name: 'Games', exact: true }).click();
  await expect(page.locator('#view h1')).toHaveText('Games that build number sense');
  await nav.getByRole('link', { name: 'Watch', exact: true }).click();
  await expect(page.locator('#view h1')).toHaveText('The best math trick videos and sites');
  await page.goBack();
  await expect(page).toHaveURL(/#\/games$/);
  await expect(page.locator('#view h1')).toHaveText('Games that build number sense');
  await page.goBack();
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await page.goForward();
  await expect(page.locator('#view h1')).toHaveText('Games that build number sense');
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('h1.home-h')).toBeVisible();
});

test('deeper routes: grade, skill, katas, tower, chapter, challenge, game, duel', async ({ page }) => {
  await open(page, '#/grade/3');
  await expect(page.locator('.mq-skill').first()).toBeVisible();
  await open(page, '#/skill/v-sq5');
  await expect(page.locator('#practice .pr-q')).toBeVisible();
  await expect(page.locator('#anim')).toBeVisible();
  await open(page, '#/katas/sq5');
  await expect(page.locator('.lv-node')).toHaveCount(50);
  await expect(page.locator('#view')).not.toContainText('★');
  await open(page, '#/tower');
  expect(await page.locator('.tower-ch').count()).toBeGreaterThan(1);
  // Medals, not stars: the counts say cleared and gold
  await expect(page.locator('#view')).not.toContainText('★');
  await expect(page.locator('#view .mq-small').first()).toContainText(/0 of 1000 cleared · 0 gold/);
  await open(page, '#/tower/1');
  await expect(page.locator('.lv-node')).toHaveCount(25);
  await expect(page.locator('#view')).not.toContainText('★');
  await open(page, '#/challenge/1');
  await expect(page.locator('#chGo')).toBeVisible();
  await expect(page.locator('.md-lede')).toContainText(/Medals: Bronze \d+ · Silver \d+ · Gold \d+/);
  await expect(page.locator('.lv-best .medal')).toHaveAttribute('aria-label', 'No Medal yet');
  await expect(page.locator('#view')).not.toContainText('★');
  await open(page, '#/game/times-sprint');
  await expect(page.locator('#gStart')).toBeVisible();
  await open(page, '#/duel');
  await expect(page.locator('#dGo')).toBeVisible();
  await open(page, '#/mix/3');
  await expect(page.locator('#practice .pr-q')).toBeVisible();
});

test('a Star deep link renders its round, and an unknown Star falls back to the Dojo', async ({ page }) => {
  await open(page, '#/star/sq5/3');
  await expect(page.locator('#view h1')).toHaveText('Square numbers ending in 5');
  await expect(page.locator('.star-top .md-tag')).toHaveText('Star 3 of 3');
  await expect(page.locator('#stQ')).toBeVisible();
  await expect(page).toHaveTitle(/^Star 3: Square numbers ending in 5/);
  await page.goto(`${APP}#/star/nope/1`);
  await expect(page.locator('#view h1')).toHaveText('From white belt to black belt');
  await page.goto(`${APP}#/star/sq5/4`);
  await expect(page.locator('#view h1')).toHaveText('From white belt to black belt');
});

test('a sutra deep link opens the deep-dive dialog over the sutras page', async ({ page }) => {
  await page.goto(`${APP}#/sutras/s1`);
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('#sdTitle')).not.toBeEmpty();
  await expect(page.locator('.sutra-grid').first()).toBeAttached();
  await dlg.locator('.sd-x').click();
  await expect(dlg).toBeHidden();
  await expect(page).toHaveURL(/#\/sutras$/);
});

test('a sutra card flips, then Learn more opens the dialog and Back closes it', async ({ page }) => {
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card').first();
  await card.locator('.sutra-face').click();
  await expect(card).toHaveClass(/flipped/);
  await card.locator('.sutra-more').click();
  await expect(page.locator('dialog.sutra-modal')).toBeVisible();
  await page.goBack();
  await expect(page.locator('dialog.sutra-modal')).toBeHidden();
  await expect(page.locator('#view h1')).toHaveText('The 16 sutras and 13 sub-sutras');
});

test('an unknown route falls back to home', async ({ page }) => {
  await page.goto(`${APP}#/no-such-page`);
  await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
});

/* view-lifecycle spec: leaving a page stops everything it started */
test('leaving the Arena during the countdown never starts the round', async ({ page }) => {
  // Record analytics events (the round start is one); the real siteTrack is never installed
  await page.addInitScript(() => {
    const calls: string[] = []; (window as any).__tracked = calls;
    Object.defineProperty(window, 'siteTrack', { configurable: true, get: () => (name: string) => { calls.push(name); }, set: () => {} });
  });
  await heldClock(page);
  await open(page, '#/arena');
  await page.locator('#arGo').click();
  await expect(page.locator('.ar-count')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/learn'; });
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await page.clock.runFor(3000);
  await expect(page.locator('#arQ')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__tracked.filter((n: string) => n.startsWith('math/arena/')))).toEqual([]);
  expect((await cloudLog(page)).writes).toEqual([]);
});
