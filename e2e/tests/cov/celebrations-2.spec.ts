import { test, expect, APP, open } from '../fixtures';

/* celebrations spec, Requirements "The big confetti lasts the same time on every screen" and "The big confetti moves
   at the same speed on every screen" (openspec change confetti-by-time): one test per scenario. The frame rate is set
   by pacing the page's animation frames, so each scenario holds on every browser, whatever it draws at. */
type Page = import('@playwright/test').Page;

/* Times each burst inside the page: performance.now() when its confetti canvas is added and when it is removed */
type Burst = { added: number; removed: number | null };
async function watchBursts(page: Page) {
  await page.addInitScript(() => {
    const seen = ((globalThis as any).__bursts = [] as Burst[]);
    const live = new Map<Node, Burst>();
    new MutationObserver(ms => {
      const now = performance.now();
      ms.forEach(m => {
        m.addedNodes.forEach(n => {
          if (!(n as Element).classList?.contains('fx-confetti')) return;
          const b = { added: now, removed: null }; seen.push(b); live.set(n, b);
        });
        m.removedNodes.forEach(n => { const b = live.get(n); if (b) { b.removed = now; live.delete(n); } });
      });
    }).observe(document, { childList: true, subtree: true });
  });
}
const bursts = (page: Page): Promise<Burst[]> => page.evaluate(() => (globalThis as any).__bursts);

/* Burst i removes itself, and lasted between 1,800 ms (1,833 less the browsers' coarsened clocks) and 3,000 ms */
async function expectTimedBurst(page: Page, i: number) {
  await expect.poll(async () => (await bursts(page))[i]?.removed ?? null, { message: `burst ${i + 1} removes itself`, timeout: 10_000 }).not.toBeNull();
  const b = (await bursts(page))[i];
  const ms = b.removed! - b.added;
  expect(ms, `burst ${i + 1} lasted (ms)`).toBeGreaterThanOrEqual(1800);
  expect(ms, `burst ${i + 1} lasted (ms)`).toBeLessThanOrEqual(3000);
  await expect(page.locator('canvas.fx-confetti')).toHaveCount(0);
}

/* A frame every `every` ms before the app loads (1000/60 a 60 Hz screen, 48 about 21 a second, 8 a 120 Hz screen),
   or none at all (0) */
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
async function lightStar(page: Page) {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
}

test.use({ reducedMotion: 'no-preference' });

for (const [name, every, rate] of [
  ['A 60 Hz screen', 1000 / 60, '60 frames a second'],
  ['A slow browser', 48, 'about 21 frames a second'],
  ['A 120 Hz screen', 8, '120 frames a second'],
] as const) {
  test(`${name}: lighting a Star at ${rate}, the big confetti falls for about 1.8 s and removes itself`, async ({ page }) => {
    await paceFrames(page, every);
    await watchBursts(page);
    await lightStar(page);
    await expectTimedBurst(page, 0);
    expect(await bursts(page)).toHaveLength(1);
  });
}

test('A tab that draws no frames: the burst is removed between 1,833 and 3,000 ms after it started, and the next true win draws its own', async ({ page }) => {
  await paceFrames(page, 0);
  await watchBursts(page);
  await lightStar(page);
  await expectTimedBurst(page, 0);
  // The next true win's own confetti call
  await page.evaluate(async () => (await e2eMod('celebrate')).confetti(70));
  await expect.poll(async () => (await bursts(page)).length).toBe(2);
  await expectTimedBurst(page, 1);
});

/* A suspended tab runs no code: the burst's removal timer is held back (never fires) and no frame is drawn, as
   while the browser had the hidden tab stopped; the tab shown again ends the burst at once */
test('A hidden tab the browser suspends: the burst is removed as soon as the tab runs again or becomes visible', async ({ page }) => {
  await paceFrames(page, 0);
  await watchBursts(page);
  await page.goto(APP);
  await page.evaluate(async () => {
    const C = await e2eMod('celebrate');
    const st = window.setTimeout;
    (window as any).setTimeout = (fn: TimerHandler, ms?: number, ...a: unknown[]) => (ms ?? 0) >= 1000 ? 0 : st(fn, ms, ...a);
    try { C.confetti(30); } finally { window.setTimeout = st; }
  });
  await expect.poll(async () => (await bursts(page)).length).toBe(1);
  await page.waitForTimeout(2200);
  expect((await bursts(page))[0].removed, 'still there while the tab runs no code').toBeNull();
  // Gone in the same task as the event, not later
  expect(await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); return document.querySelectorAll('canvas.fx-confetti').length; }), 'canvases right after the tab is shown').toBe(0);
  await expect.poll(async () => (await bursts(page))[0].removed).not.toBeNull();
});

/* The same pieces (Math.random fixed while the burst starts) drawn by the real loop with frames delivered at exact
   times from the burst's start, every 1000/60 ms and every 48 ms: each piece's place at 1,000 ms, read from the
   canvas's translate calls */
test('The same path at any frame rate: the same pieces after 1 s are at the same places at 60 and at 21 frames a second', async ({ page }) => {
  await page.goto(APP);
  const at1s = async (every: number) => {
    const drawn = await page.evaluate(async (ms: number) => {
      const C = await e2eMod('celebrate');
      const raf = window.requestAnimationFrame, now = performance.now, random = Math.random;
      const queue: FrameRequestCallback[] = [];
      let seed = 7;
      const T = now.call(performance);
      window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
      Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      performance.now = () => T;
      try { C.confetti(30); } finally { Math.random = random; performance.now = now; }
      const g = document.querySelector<HTMLCanvasElement>('canvas.fx-confetti')!.getContext('2d')!;
      let frame: number[][] = [], first: number[][] = [];
      const translate = g.translate.bind(g);
      g.translate = (x: number, y: number) => { frame.push([x, y]); translate(x, y); };
      for (let t = 0; ; t = Math.min(1000, t + ms)) {
        frame = [];
        queue.splice(0).forEach(cb => cb(T + t));
        if (t === 0) first = frame;
        if (t >= 1000) break;
      }
      window.requestAnimationFrame = raf;
      return { first, last: frame };
    }, every);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 5000 }); // the burst ends on its own timer
    return drawn;
  };
  const sixty = await at1s(1000 / 60), slow = await at1s(48);
  for (const { first, last } of [sixty, slow]) {
    expect(first).toHaveLength(30);
    expect(last).toHaveLength(30);
    // Each piece moved from where the first frame drew it, so a loop stuck at one time fails
    last.forEach(([x, y], i) => expect(Math.hypot(x - first[i][0], y - first[i][1]), `piece ${i} moved (px)`).toBeGreaterThan(20));
  }
  slow.last.forEach(([x, y], i) => {
    expect(Math.abs(x - sixty.last[i][0]), `piece ${i} x`).toBeLessThan(0.01);
    expect(Math.abs(y - sixty.last[i][1]), `piece ${i} y`).toBeLessThan(0.01);
  });
});
