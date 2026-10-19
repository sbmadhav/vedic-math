import { test, expect, open, heldClock, cloudLog } from './fixtures';

/* A Star round (openspec star-round) on Square numbers ending in 5: every question is n², so the test works each
   answer out from the question itself. Questions are dealt at random, so nothing here depends on which come. */

type Page = import('@playwright/test').Page;
/** The n of the n² on screen */
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const meter = (page: Page) => page.locator('#stMeter');
const tag = (page: Page) => page.locator('#stMain .star-tag');

/** Types an answer with the keyboard and presses Enter, or with the on-screen keypad */
async function enter(page: Page, v: string, how: 'keys' | 'pad' = 'keys') {
  if (how === 'keys') { await page.keyboard.type(v); await page.keyboard.press('Enter'); return; }
  for (const ch of v) await page.locator(`#stPad [data-k="${ch}"]`).click();
  await page.locator('#stPad [data-k="go"]').click();
}
/** Waits for main question i (1 to 4) to be asked */
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);

test('four right answers light Star 1: +40 Sparks, saved as lit, and the Rating goes up', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await expect(page.locator('#view h1')).toHaveText('Square numbers ending in 5');
  await expect(page.locator('.star-top .md-tag')).toHaveText('Star 1 of 3');
  for (let i = 1; i <= 4; i++) {
    await question(page, i);
    await enter(page, await sq(page), i % 2 ? 'pad' : 'keys');
    await expect(page.locator('#stSay')).toContainText(`+10 Sparks`);
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  await expect(page.locator('.star-end')).toContainText('+40 Sparks');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '40');
  const d = await saved(page);
  expect(d.sky.lit['sq5:1']).toBeGreaterThan(0);
  expect(d.sky.last['sq5:1']).toHaveLength(4);
  expect(d.ratings['skill:v-sq5']).toBeGreaterThan(5); // a new Challenger starts at 5
  expect(d.counts.answers).toBe(4);
  expect(d.sparks).toBe(40); // the Star's own Sparks only, no Practice Sparks on top
  await expect(page.locator('#stBack')).toHaveAttribute('href', '#/dojo');
});

test('a miss replays the trick on the missed number, Escape skips it, and a right rematch is a Comeback worth 15', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  const n = await base(page);
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('Not quite');
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-replay #stQ')).toHaveText(`${n}2 = ?`);
  await expect(page.locator('.star-step').first()).toContainText(String((n - 5) / 10));
  await expect(page.locator('.star-step').first()).toContainText(String(n));
  await expect(page.locator('#vmLive')).toContainText(`The part before the 5 is ${(n - 5) / 10}.`);
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  const m = await base(page);
  expect(m).not.toBe(n);
  expect(String(m).length).toBe(String(n).length); // the same kind of question
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('Comeback');
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '15');
  await expect(page.locator('#vmLive')).toContainText('Comeback');
  await expect(page.locator('#vmLive')).toContainText('15 Sparks');
  await question(page, 2);
  await expect(page.locator('#stDots i').first()).toHaveClass(/\bcb\b/);
});

test('the Dare: absent on question 1, offered on question 2, and a missed Dare costs nothing', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  await expect(page.locator('#stDare')).toBeHidden();
  await enter(page, await sq(page));
  await question(page, 2);
  const q2 = await base(page);
  await expect(page.locator('#stDare')).toBeVisible();
  await expect(page.locator('#stDare')).toContainText('A miss costs nothing');
  await page.locator('#stDare').click();
  await expect(tag(page)).toHaveText('Dare');
  expect(await base(page)).toBeGreaterThanOrEqual(105); // from Katas 18 to 22: 105 to 295, harder than Star 1's 15 to 95
  await enter(page, '1');
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(meter(page)).toHaveAttribute('aria-valuenow', '10');
  await page.keyboard.press('Escape');
  await question(page, 2);
  expect(await base(page)).toBe(q2);
  await expect(page.locator('#stDare')).toBeHidden(); // one Dare a round
  await expect(page.locator('#stDots i.miss')).toHaveCount(0);
});

test('Challenger shows one box per digit of the answer', async ({ page }) => {
  await open(page, '#/star/sq5/2');
  await question(page, 1);
  await expect(page.locator('#stBoxes span')).toHaveCount((await sq(page)).length);
  await expect(page.locator('.star-plain')).toHaveCount(0);
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Pro shows a plain entry with no digit count', async ({ page }) => {
    await open(page, '#/star/sq5/2');
    await question(page, 1);
    await expect(page.locator('#stBoxes')).toHaveCount(0);
    await expect(page.locator('.star-plain')).toBeVisible();
    await page.keyboard.type('12');
    await expect(page.locator('.star-plain')).toHaveText('12');
  });
});

/** Misses question 1 and its rematch, then misses question 2 and skips its replay (the offer's moment) */
async function twoMisses(page: Page) {
  await question(page, 1);
  await enter(page, '1');
  await page.locator('#stRSkip').click();
  // In the play shell the Next button can appear under the spot just tapped; its hover lift then jitters at the edge
  await page.mouse.move(0, 0);
  await expect(tag(page)).toHaveText('Rematch');
  await enter(page, '1'); // a missed rematch: the answer, then on
  await expect(page.locator('#stSay')).toContainText('Close! It is');
  await page.locator('#stNext').click();
  await question(page, 2);
  await enter(page, '1');
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
}
const noYouTube = (page: Page) => page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));

test('two misses offer the hand-matched video once; it plays in the in-page player and closing it returns to the rematch', async ({ page }) => {
  await noYouTube(page);
  await open(page, '#/star/sq5/1');
  await twoMisses(page);
  await expect(page.locator('.star-offer')).toBeVisible();
  await expect(page.locator('#stSay')).toContainText('short video');
  await page.locator('#stWatch').click();
  const player = page.locator('dialog.vm-player');
  await expect(player).toBeVisible();
  await expect(player.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await player.locator('.vp-x').click();
  await expect(player).toBeHidden();
  await expect(tag(page)).toHaveText('Rematch');
  // A third miss: the replay, then the rematch, and no second offer
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('Close! It is');
  await page.locator('#stNext').click();
  await question(page, 3);
  await enter(page, '1');
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  await expect(page.locator('.star-offer')).toHaveCount(0);
});

test('No thanks skips the video and the rematch follows', async ({ page }) => {
  await noYouTube(page);
  await open(page, '#/star/sq5/1');
  await twoMisses(page);
  await page.locator('#stNoVid').click();
  await expect(tag(page)).toHaveText('Rematch');
  await expect(page.locator('dialog.vm-player')).toHaveCount(0);
});

test('offline, two misses show no video offer and the rematch follows the replay', async ({ page, context }) => {
  await open(page, '#/');
  await context.setOffline(true);
  await page.evaluate(() => { location.hash = '#/star/sq5/1'; });
  await twoMisses(page);
  await expect(tag(page)).toHaveText('Rematch');
  await expect(page.locator('.star-offer')).toHaveCount(0);
  await context.setOffline(false);
});

test.describe('skip', () => {
  test('Skip this Star marks it skipped, earns nothing, and the end screen waits', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/sq5/2');
    await question(page, 1);
    await page.locator('#stSkip').click();
    await expect(page.locator('.star-end-h')).toHaveText('Star 2 skipped');
    await expect(page.locator('.star-end')).toContainText('+0 Sparks');
    const d = await saved(page);
    expect(d.sky.skipped['sq5:2']).toBeGreaterThan(0);
    expect(d.sparks || 0).toBe(0);
    await page.clock.fastForward(120_000);
    await expect(page).toHaveURL(/#\/star\/sq5\/2$/);
    await expect(page.locator('.star-end-h')).toHaveText('Star 2 skipped');
    await expect(page.locator('#stAgain')).toBeVisible();
  });
});

/* No motion: through a miss, the replay and a Comeback, nothing in the stage moves */
const stageAnimations = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return !!t && !!t.closest('.star-stage') && a.playState === 'running';
}).length);
async function missAndComeback(page: Page) {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  expect(await stageAnimations(page)).toBe(0);
  await enter(page, '1');
  await expect(page.locator('.star-step').first()).toBeVisible();
  expect(await stageAnimations(page)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('Comeback');
  expect(await stageAnimations(page)).toBe(0);
  expect(await page.locator('.star-burst').count()).toBe(0);
}
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing in the stage moves through a miss and a Comeback', async ({ page }) => { await missAndComeback(page); });
});
test.describe('the site-wide motion pause', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('html.motion-paused: nothing in the stage moves through a miss and a Comeback', async ({ page }) => {
    // The page as it loads with Pause motion on: the class is on <html> before any script runs
    await page.route(/\/play\/(index\.html)?(\?.*)?$/, async route => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace('<html lang="en">', '<html lang="en" class="motion-paused">') });
    });
    await missAndComeback(page);
    expect(await page.evaluate(() => document.documentElement.classList.contains('motion-paused'))).toBe(true);
  });
});

test.describe('entry points', () => {
  test.describe('Pro', () => {
    test.use({ seedMode: 'pro', seedProgress: { sky: { lit: { 'sq5:1': 1 }, skipped: { 'sq5:2': 1 }, last: {} } } });
    test('the Trick page shows its three Stars: lit, skipped, open; each opens its round and Back returns there', async ({ page }) => {
      await open(page, '#/skill/v-sq5');
      const links = page.locator('.star-links .star-link');
      await expect(links).toHaveCount(3);
      await expect(links.nth(0)).toHaveClass(/star-link--lit/);
      await expect(links.nth(0)).toContainText('Lit');
      await expect(links.nth(1)).toHaveClass(/star-link--skipped/);
      await expect(links.nth(1)).toContainText('Skipped');
      await expect(links.nth(2)).toContainText('Open');
      await links.nth(2).click();
      await expect(page).toHaveURL(/#\/star\/sq5\/3$/);
      await expect(page.locator('.star-top .md-tag')).toHaveText('Star 3 of 3');
      await page.locator('#stSkip').click();
      await expect(page.locator('#stBack')).toHaveText('Back to Square numbers ending in 5');
      await page.locator('#stBack').click();
      await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
      await expect(page.locator('.star-links .star-link').nth(2)).toContainText('Skipped');
    });
    test('the Dojo shows three Stars per Trick', async ({ page }) => {
      await open(page, '#/dojo');
      await expect(page.locator('.dojo-star')).toHaveCount(63);
      await expect(page.locator('.dojo-star[href="#/star/sq5/1"]')).toHaveAttribute('aria-label', 'Square numbers ending in 5: Star 1, lit');
    });
  });
  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Explorer is not offered Stars, and a Star link gets the Challenger layout', async ({ page }) => {
      await open(page, '#/skill/v-sq5');
      await expect(page.locator('.star-link')).toHaveCount(0);
      await open(page, '#/star/sq5/1');
      await question(page, 1);
      await expect(page.locator('#stBoxes span')).toHaveCount((await sq(page)).length);
    });
  });
});

test('Play again deals a fresh round of different questions', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sky.last['sq5:1']);
  await page.locator('#stSkip').click();
  await page.locator('#stAgain').click();
  await question(page, 1);
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sky.last['sq5:1']);
  expect(second).toHaveLength(4);
  expect(second.filter((k: string) => first.includes(k))).toEqual([]);
  expect((await cloudLog(page)).writes).toEqual([]);
  await expect(page).toHaveURL(/#\/star\/sq5\/1$/);
});

/* Calm (openspec game-shell-and-calm): with motion allowed on the device, Calm alone stops every animation */
test.describe('Calm', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('vm.calm: nothing moves through a miss and a Comeback, anywhere on the page', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
    await missAndComeback(page);
    await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => String((a.effect as KeyframeEffect | null)?.target && ((a.effect as KeyframeEffect).target as Element).className)))).toEqual([]);
  });
});
