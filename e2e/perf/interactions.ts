import { test, expect, open, type Page } from '../tests/fixtures';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/* Interaction timings of the game (openspec change react-typescript, performance-budget spec, task 0.4; the preview
   perf job of task 1.8 runs it too). Run from e2e/:
     npx playwright test -c perf/playwright.config.ts            (BASE_URL as for the suite; the live site by default)
   Chromium with 4x CPU slowdown through the DevTools protocol, each interaction 5 times in a fresh context (the
   config's repeatEach), the median printed and written to perf/results/interactions.json by perf/report.ts (which
   refuses a run missing an interaction or a repeat; PERF_PARTIAL=1 allows one picked with -g).

   Two numbers per interaction, both in ms:
   - inp: the Event Timing API's duration of the tap (pointerdown to the next paint after its handlers), the longest
     entry of that interaction, as INP counts it. An interaction under the API's 16 ms threshold has no entry and
     counts as 16.
   - visible: from the tap's event time to the first animation frame in which the result is on screen (the Arena
     lobby, the answer's pop, the Deep dive's first example, "Star 1 is lit!"). Hash routes render after the click's
     paint, so this is the number that sees a view's own work.

   The fixtures' returning Challenger Player, analytics answered locally and the Firestore guards apply, as in the
   suite. Nothing is ranked: the Arena answer is a Practice round. */

const OUT = join(__dirname, 'results');

async function slowCpu(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

/* Every Event Timing entry that belongs to an interaction, from the start of the page */
async function watchEvents(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __et: { start: number; dur: number; id: number }[] };
    w.__et = [];
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries() as PerformanceEventTiming[]) if (e.interactionId) w.__et.push({ start: e.startTime, dur: e.duration, id: e.interactionId });
      }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    } catch { /* no Event Timing: the test fails on the missing numbers */ }
  });
}

type Done = { sel: string; text?: string };

/** Arms the page for one tap: the next pointerdown's time, then the first frame in which `done` is visible. First it
    waits for the network to be idle, an idle moment on the main thread and every finite animation to finish (a card
    flip, a view's entrance), so the tap never shares its frames with the step before it; endless animations (the
    background) keep running, as they do for a Player. */
async function arm(page: Page, done: Done) {
  // Nothing loading and an idle main thread: the screen's own idle work (prefetching sounds, decoding pictures) is done,
  // so it never lands inside the measured tap
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => new Promise<void>(r => requestIdleCallback(() => r(), { timeout: 3000 })));
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity), undefined, { timeout: 10_000 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(({ sel, text }) => {
    const w = window as unknown as { __tap: { t0: number | null; t1: number | null; since: number } };
    w.__tap = { t0: null, t1: null, since: performance.now() };
    const shown = () => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return !!el && el.checkVisibility() && (!text || new RegExp(text).test(el.textContent || ''));
    };
    addEventListener('pointerdown', e => {
      w.__tap.t0 = e.timeStamp;
      const frame = (t: number) => { if (shown()) w.__tap.t1 = t; else requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    }, { once: true, capture: true });
  }, done);
}

/** The two numbers of the armed tap, once its result is on screen and its Event Timing entries are delivered */
async function read(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __tap: { t1: number | null } }).__tap.t1 !== null, undefined, { timeout: 30_000 });
  // Event Timing entries arrive after the paint they measure; give the observer a few frames
  await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
  return page.evaluate(() => {
    const w = window as unknown as { __tap: { t0: number; t1: number; since: number }; __et: { start: number; dur: number; id: number }[] };
    const mine = w.__et.filter(e => e.start >= w.__tap.since);
    const inp = mine.length ? Math.max(...mine.map(e => e.dur)) : 16;
    return { inp, visible: Math.round(w.__tap.t1 - w.__tap.t0) };
  });
}

function record(name: string, sample: { inp: number; visible: number }) {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(join(OUT, 'interactions.jsonl'), JSON.stringify({ name, ...sample }) + '\n');
}

test.beforeEach(async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'CPU throttling through the DevTools protocol is chromium only');
  await watchEvents(page);
  await slowCpu(page);
});

test('open the Arena', async ({ page }) => {
  await open(page, '#/');
  const link = page.locator('a[href="#/arena"]:visible').first();
  await expect(link).toBeVisible();
  await arm(page, { sel: '#arGo' });
  await link.click();
  record('arena-open', await read(page));
});

test('answer an Arena question', async ({ page }) => {
  await open(page, '#/arena');
  await page.locator('[data-t="practice"]').click();
  await expect(page.locator('[data-t="practice"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 15_000 });
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  await arm(page, { sel: '#arPop', text: '^(\\+\\d+|-?\\d+)$' });
  await page.locator('#arForm button').click();
  record('arena-answer', await read(page));
});

test('open a Deep dive', async ({ page }) => {
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card').first();
  await card.locator('.sutra-face').click();
  await expect(card).toHaveClass(/flipped/);
  await expect(card.locator('.sutra-more')).toBeVisible();
  await arm(page, { sel: 'dialog.sutra-modal .sd-ex > li' });
  await card.locator('.sutra-more').click();
  record('deep-dive-open', await read(page));
});

test('light a Star', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  const tag = page.locator('#stMain .star-tag');
  const square = async () => String(Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]) ** 2);
  for (let i = 1; i <= 3; i++) {
    await expect(tag).toHaveText(`Question ${i} of 4`);
    await page.keyboard.type(await square());
    await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(tag).toHaveText('Question 4 of 4');
  for (const ch of await square()) await page.locator(`#stPad [data-k="${ch}"]`).click();
  await arm(page, { sel: '.star-end-h', text: 'is lit' });
  await page.locator('#stPad [data-k="go"]').click();
  record('star-light', await read(page));
});
