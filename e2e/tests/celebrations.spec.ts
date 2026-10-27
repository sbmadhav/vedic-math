import { test, expect, APP, open } from './fixtures';

/* Celebrations (openspec celebrations): the big confetti is only for true wins, such as a Star lit; everyday moments
   (picking a Mode, a right answer) get a small one, such as a card pop and a few sparkles. Nothing moves under reduced
   motion, Pause motion or Calm, and the screen that follows still comes. */
type Page = import('@playwright/test').Page;

/* Counts every confetti canvas and sparkle layer the page adds, however short-lived, and times each burst inside the
   page (performance.now() when its canvas is added and when it is removed), so Playwright's polling adds no noise */
type Burst = { added: number; removed: number | null };
type Fx = { confetti: number; sparkles: number; bursts: Burst[] };
async function watchFx(page: Page) {
  await page.addInitScript(() => {
    const seen = ((globalThis as any).__fx = { confetti: 0, sparkles: 0, bursts: [] as Burst[] });
    const live = new Map<Node, Burst>();
    new MutationObserver(ms => {
      const now = performance.now();
      ms.forEach(m => {
        m.addedNodes.forEach(n => {
          const c = (n as Element).classList; if (!c) return;
          if (c.contains('fx-confetti')) { seen.confetti++; const b = { added: now, removed: null }; seen.bursts.push(b); live.set(n, b); }
          if (c.contains('fx-sparkles')) seen.sparkles++;
        });
        m.removedNodes.forEach(n => { const b = live.get(n); if (b) { b.removed = now; live.delete(n); } });
      });
    }).observe(document, { childList: true, subtree: true });
  });
}
const fx = (page: Page): Promise<{ confetti: number; sparkles: number }> =>
  page.evaluate(() => { const { confetti, sparkles } = (globalThis as any).__fx as Fx; return { confetti, sparkles }; });
const bursts = (page: Page): Promise<Burst[]> => page.evaluate(() => ((globalThis as any).__fx as Fx).bursts);

/* The big confetti lasts 1,833 ms on every screen (openspec celebrations): burst i removes itself, and its canvas was
   on the page between 1,800 ms (1,833 less the browsers' coarsened clocks) and 3,000 ms */
async function expectTimedBurst(page: Page, i: number) {
  await expect.poll(async () => (await bursts(page))[i]?.removed ?? null, { message: `burst ${i + 1} removes itself`, timeout: 10_000 }).not.toBeNull();
  const b = (await bursts(page))[i];
  const ms = b.removed! - b.added;
  expect(ms, `burst ${i + 1} lasted (ms)`).toBeGreaterThanOrEqual(1800);
  expect(ms, `burst ${i + 1} lasted (ms)`).toBeLessThanOrEqual(3000);
  await expect(page.locator('canvas.fx-confetti')).toHaveCount(0);
}

/* Paces the page's animation frames before the app loads: a frame every `every` ms (48 is about 21 a second, a slow
   browser such as headless WebKit on Linux; 8 is a 120 Hz screen), or none at all (0), which is what a hidden tab
   does to the burst. Playwright's own checks run in their own world and are not paced. */
async function paceFrames(page: Page, every: number) {
  await page.addInitScript((ms: number) => {
    const queue = new Map<number, FrameRequestCallback>();
    let id = 0;
    window.requestAnimationFrame = cb => { queue.set(++id, cb); return id; };
    window.cancelAnimationFrame = n => { queue.delete(n); };
    if (ms > 0) setInterval(() => {
      const now = performance.now(), due = [...queue.values()];
      queue.clear();
      due.forEach(cb => { try { cb(now); } catch (e) { setTimeout(() => { throw e; }); } });
    }, ms);
  }, every);
}

/* Square numbers ending in 5: every question is n² */
const sq = async (page: Page) => { const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]); return String(n * n); };
async function lightStar(page: Page, afterFirst?: () => Promise<void>) {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    if (i === 1 && afterFirst) await afterFirst();
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
}

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test.describe('picking a Mode', () => {
    test.use({ seedMode: null });
    test('is everyday: the card pops, a few sparkles fly, the family cheers, Home opens, and there is no big confetti', async ({ page }) => {
      await watchFx(page);
      await page.goto(APP);
      const card = page.locator('.mode-card[data-mode="challenger"]');
      await card.click();
      await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
      await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
      expect((await fx(page)).confetti).toBe(0);
      await expect(page.locator('.fx-sparkles')).toHaveCount(0); // they clean up after themselves
    });
  });

  test('a right answer in a Star twinkles with a few sparkles; lighting the Star is a true win with the big confetti', async ({ page }) => {
    await watchFx(page);
    await lightStar(page, async () => {
      await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
      expect((await fx(page)).confetti).toBe(0);
    });
    await expect.poll(async () => (await fx(page)).confetti).toBeGreaterThanOrEqual(1);
    // The burst lasts a time, not a number of frames (js/celebrate.js CONFETTI_MS), so it is timed on every browser
    await expectTimedBurst(page, 0);
  });

  /* The same length whatever the frame rate (openspec celebrations, "The big confetti lasts the same time on every screen") */
  for (const [name, every] of [['a slow browser (a frame every 48 ms)', 48], ['a 120 Hz screen (a frame every 8 ms)', 8]] as const) {
    test(`in ${name}, lighting a Star gives a burst of about 1.8 s that removes itself`, async ({ page }) => {
      await paceFrames(page, every);
      await watchFx(page);
      await lightStar(page);
      await expectTimedBurst(page, 0);
      expect((await fx(page)).confetti).toBe(1);
    });
  }

  test('in a tab that draws no frames, the burst still removes itself on time and the next true win draws its own', async ({ page }) => {
    await paceFrames(page, 0);
    await watchFx(page);
    await lightStar(page);
    await expectTimedBurst(page, 0);
    // One burst at a time was freed: the next true win's own confetti call draws a second burst
    await page.evaluate(async () => (await e2eMod('celebrate')).confetti(70));
    await expect.poll(async () => (await fx(page)).confetti).toBe(2);
    await expectTimedBurst(page, 1);
  });

  test('turning on Pause motion stops the big confetti at once', async ({ page }) => {
    await watchFx(page);
    await lightStar(page);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(1);
    // What the Pause motion switch does (fx.setMotionPaused): the class on <html> and the sitemotion event
    await page.evaluate(() => { document.documentElement.classList.add('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } })); });
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 500 });
  });
});

/* No motion: the same three sources (openspec calm "Calm stops motion", accessibility) */
const STILL = [
  ['reduced motion', { reducedMotion: 'reduce' as const }, null],
  ['Pause motion', { reducedMotion: 'no-preference' as const }, 'motion-paused'],
  ['Calm', { reducedMotion: 'no-preference' as const }, 'vm.calm'],
] as const;
for (const [name, use, key] of STILL) {
  test.describe(name, () => {
    test.use(use);
    test.beforeEach(async ({ page }) => {
      if (key) await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await watchFx(page);
    });

    test.describe('picking a Mode', () => {
      test.use({ seedMode: null });
      test('opens Home at once with no sparkles, no confetti and nothing moving', async ({ page }) => {
        await page.goto(APP);
        await page.locator('.mode-card[data-mode="pro"]').click();
        await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
        expect(await fx(page)).toEqual({ confetti: 0, sparkles: 0 });
      });
    });

    test('lighting a Star shows the same end screen with no confetti or sparkles', async ({ page }) => {
      await lightStar(page);
      await expect(page.locator('.star-end')).toContainText('+40 Sparks');
      expect(await fx(page)).toEqual({ confetti: 0, sparkles: 0 });
    });
  });
}
