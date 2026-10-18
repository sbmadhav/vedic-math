import { test, expect, open, APP } from './fixtures';

/* The Sky (openspec sky-home): the opt-in home map for Challenger and Pro, All places, and Back to the Sky.
   Players here have turned on "Try the new Sky" (seedPlayer: { sky: true }). */

type Page = import('@playwright/test').Page;
const star = (page: Page, k: string) => page.locator(`.sky-star[data-star="${k}"]`);
/** The 63 Stars in path order, from the app's own module */
const pathOf = (page: Page): Promise<string[]> => page.evaluate(() => import('/vedic-math/js/sky.js').then(m => m.PATH));
/** The answer to the from9 question on screen: 1,000 − 637 = ? */
async function from9Answer(page: Page) {
  const [a, b] = (await page.locator('#stQ').innerText()).match(/[\d,]+/g)!.map(x => Number(x.replace(/,/g, '')));
  return String(a - b);
}

test.use({ seedPlayer: { sky: true } });

test.describe('the map', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: {}, skipped: { 'sq5:2': 1 }, last: {} } } });
  test('a Challenger with the Sky on sees 17 Constellations and 63 Star links; a skipped Star is dashed, badged and named skipped', async ({ page }) => {
    await open(page);
    await expect(page.locator('#view h1')).toHaveText('Your Sky');
    await expect(page.locator('.sky-names text')).toHaveCount(17);
    await expect(page.locator('.sky-names')).toContainText('Ekādhikena');
    await expect(page.locator('.sky-star')).toHaveCount(63);
    const sk = star(page, 'sq5:2');
    await expect(sk).toHaveClass(/sky-star--skipped/);
    await expect(sk).toHaveAttribute('aria-label', 'Square numbers ending in 5, Star 2, skipped');
    await expect(sk).toHaveAttribute('href', '#/star/sq5/2');
    await expect(sk.locator('.sky-skipb')).toHaveCount(1);
    expect(await sk.locator('.sky-skipring').evaluate(e => getComputedStyle(e).strokeDasharray)).not.toBe('none');
    await expect(star(page, 'sq5:1')).toHaveAttribute('aria-label', 'Square numbers ending in 5, Star 1, not lit yet');
    await expect(page.locator('.sky-wheel line')).toHaveCount(27);
    // Bolt waits at the first white belt Star for a Player with no Star progress
    await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'from9:1');
    await expect(star(page, 'from9:1')).toHaveClass(/sky-star--next/);
    await expect(page.locator('#skyNext a')).toHaveText('Subtract from 100, 1000, 10000, Star 1');
  });
});

test.describe('after some progress', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'from9:1': 1 }, skipped: { 'from9:2': 1 }, last: {} } } });
  test('Bolt waits at the first Star that is neither lit nor skipped, and the path leads on', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'from9:3');
    await expect(star(page, 'from9:1')).toHaveClass(/sky-star--lit/);
    await expect(star(page, 'from9:1')).toHaveAttribute('aria-label', /, Star 1, lit$/);
    await expect(page.locator('.sky-path')).toHaveCount(1);
  });
});

test('every Star is open: a black belt Star 3 opens its round', async ({ page }) => {
  await open(page);
  await star(page, 'zero-sum:3').click();
  await expect(page).toHaveURL(/#\/star\/zero-sum\/3$/);
  await expect(page.locator('.star-top .md-tag')).toHaveText('Star 3 of 3');
});

test('Tab order from the first Star follows the path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'webkit', 'Safari leaves links out of the Tab order by default');
  await open(page);
  const path = await pathOf(page);
  expect(await page.locator('.sky-star').evaluateAll(els => els.map(e => e.getAttribute('data-star')))).toEqual(path);
  await star(page, path[0]).focus();
  for (let i = 1; i < 12; i++) {
    await page.keyboard.press('Tab');
    await expect(star(page, path[i])).toBeFocused();
  }
});

test('the race track Landmark opens the Arena', async ({ page }) => {
  await open(page);
  const marks = page.locator('.sky-mark');
  await expect(marks).toHaveText(['Arena', 'Party', 'Games', 'Watch', 'Skill map']);
  await page.locator('.sky-mark[data-landmark="arena"]').click();
  await expect(page).toHaveURL(/#\/arena$/);
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
});

test.describe('the site-wide motion pause', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('with html.motion-paused set before load, nothing on the Sky animates and every Star is shown', async ({ page }) => {
    await page.route(/\/vedic-math\/(index\.html)?(\?.*)?$/, async route => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace('<html lang="en">', '<html lang="en" class="motion-paused">') });
    });
    await open(page);
    await expect(page.locator('.sky')).toHaveClass(/\bstill\b/);
    await page.mouse.move(300, 500); await page.mouse.move(700, 700);
    await page.waitForTimeout(2000);
    const running = await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target as Element | null; return !!t && !!t.closest('.sky'); }).length);
    expect(running).toBe(0);
    expect(await page.locator('.sky-layer').first().getAttribute('transform')).toBeNull(); // the pointer moved no layer
    const stars = page.locator('.sky-star');
    for (let i = 0; i < 63; i++) await expect(stars.nth(i)).toBeVisible();
    await expect(page.locator('.sky-names text')).toHaveCount(17);
  });
  test('without it, the layers twinkle (the Sky does move when motion is allowed)', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky')).not.toHaveClass(/\bstill\b/);
    expect(await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target as Element | null; return !!t && !!t.closest('.sky'); }).length)).toBeGreaterThan(0);
  });
});

test('at 390 px wide the page does not scroll sideways, the Sky frame does', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator('.sky-star')).toHaveCount(63);
  const [doc, win] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(doc).toBeLessThanOrEqual(win);
  const frame = page.locator('#skyFrame');
  const [sw, cw] = await frame.evaluate(e => [e.scrollWidth, e.clientWidth]);
  expect(sw).toBeGreaterThan(cw);
  expect(sw).toBeGreaterThanOrEqual(720);
  // Bolt's Star starts inside the visible part of the frame
  const box = (await star(page, 'from9:1').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test.describe('All places', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'by11:1': 1 }, skipped: { 'sq5:2': 1 }, last: {} } } });
  test('lists every Constellation, Star, Landmark and place; a Star link opens its round by keyboard', async ({ page }) => {
    await open(page);
    await page.locator('#skyPlaces').click();
    await expect(page).toHaveURL(/#\/places$/);
    await expect(page.locator('#view h1')).toHaveText('All places');
    await expect(page).toHaveTitle(/^All places: Vedic Math/);
    await expect(page.locator('.places-c h2')).toHaveCount(17);
    const links = page.locator('a.places-star');
    await expect(links).toHaveCount(63);
    for (const t of await links.allInnerTexts()) expect(t).toMatch(/^Star [123], (lit|skipped|not lit yet)$/);
    await expect(page.locator('a.places-star--lit')).toHaveCount(1);
    for (const name of ['Arena', 'Party', 'Games', 'Watch', 'Skill map', 'Dojo', 'Sutra cards', 'Challenge tower', 'Me', 'The tile home']) {
      await expect(page.locator('.places-list').getByRole('link', { name, exact: true })).toHaveCount(1);
    }
    const sk = page.getByRole('link', { name: 'Square numbers ending in 5, Star 2, skipped' });
    await sk.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/star\/sq5\/2$/);
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  });
  test('the tile home is still there', async ({ page }) => {
    await open(page, '#/places');
    await page.locator('.places-list').getByRole('link', { name: 'The tile home' }).click();
    await expect(page).toHaveURL(/#\/tiles$/);
    await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
  });
});

test('Back to the Sky: light Star 1 of from9 from the Sky, go back, and that Star is lit and focused; the end screen never leaves by itself', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await star(page, 'from9:1').click();
  await expect(page).toHaveURL(/#\/star\/from9\/1$/);
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await from9Answer(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  await expect(page.locator('#stBack')).toHaveText('Back to the Sky');
  await page.clock.fastForward(60_000);
  await expect(page).toHaveURL(/#\/star\/from9\/1$/);
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  await page.locator('#stBack').click();
  await expect(page).toHaveURL(new RegExp(`${APP.replace(/\//g, '\\/')}#\\/$`));
  await expect(star(page, 'from9:1')).toHaveClass(/sky-star--lit/);
  await expect(star(page, 'from9:1')).toHaveAttribute('aria-label', /Star 1, lit$/);
  await expect(star(page, 'from9:1')).toBeFocused();
  await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'from9:2');
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer keeps the Explorer home even with sky set on the record', async ({ page }) => {
    await open(page);
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page.locator('.sky')).toHaveCount(0);
  });
});

/* The new Belt rule in the homes and on the Me page (sky-home 3.3), with the Sky off */
test.describe('Belt copy with the Sky off', () => {
  test.use({ seedPlayer: { sky: false }, seedProgress: { v: 3, skills: {}, sky: { lit: { 'from9:1': 1, 'from9:2': 1, 'from9:3': 1, 'by11:1': 1 }, skipped: {}, last: {} } } });
  test('the Challenger Dojo card names the next Star; the Me page counts lit Stars', async ({ page }) => {
    await open(page);
    await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
    const card = page.locator('.dojo-card');
    await expect(card).toContainText('White belt: 4 of 9 Stars lit');
    await expect(card).toContainText('Next Star: Multiply by 11, Star 2');
    await expect(card.getByRole('link', { name: 'Play this Star' })).toHaveAttribute('href', '#/star/by11/2');
    await open(page, '#/me');
    await expect(page.locator('.me-stats')).toContainText('4 of 63 Stars lit');
    await expect(page.locator('.badge-grid')).toContainText('Light all 9 white belt Stars.');
    await expect(page.locator('.badge-grid')).not.toContainText('Master the 3');
  });
  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('the Pro Dojo door counts lit Stars', async ({ page }) => {
      await open(page);
      await expect(page.locator('.door[href="#/dojo"]')).toContainText('0 of 7 belts · 4 of 63 Stars lit');
    });
  });
});
