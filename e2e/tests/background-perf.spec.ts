import { test, expect, APP, chromiumOnly, type Page } from './fixtures';

/* The background sky's frame cost (prototype budget: under about 2 ms a frame on a mid phone), measured with the CPU
   slowed 4x. Every requestAnimationFrame callback is timed; a callback that drew (it called clearRect on the scene's
   canvas) is a frame. The main thread's total task time over the same seconds, with the sky and without it, gives the
   cost per frame that includes the browser's own work for the canvas. The numbers go to the report as annotations. */

test.use({ reducedMotion: 'no-preference' });

async function measure(page: Page, url: string, width: number, height: number, sky: boolean) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(on => {
    if (!on) localStorage.setItem('vm.bg', '0');
    const w = window as any, raf = window.requestAnimationFrame.bind(window), clear = CanvasRenderingContext2D.prototype.clearRect;
    w.__frames = []; w.__drew = false;
    CanvasRenderingContext2D.prototype.clearRect = function (...a: [number, number, number, number]) { if (this.canvas.classList.contains('vm-bg')) w.__drew = true; return clear.apply(this, a); };
    window.requestAnimationFrame = cb => raf(ts => { w.__drew = false; const t0 = performance.now(); cb(ts); const d = performance.now() - t0; if (w.__drew) w.__frames.push(d); });
  }, sky);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  await page.goto(url);
  if (sky) await expect(page.locator('canvas.vm-bg')).toHaveAttribute('data-running', '1', { timeout: 15_000 });
  await page.waitForTimeout(3000); /* past the first story's start */
  const task = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration')!.value;
  await page.evaluate(() => { (window as any).__frames = []; });
  const t0 = await task(), SECONDS = 8;
  await page.waitForTimeout(SECONDS * 1000);
  const t1 = await task();
  const frames: number[] = await page.evaluate(() => (window as any).__frames);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { frames, taskMs: (t1 - t0) * 1000, seconds: SECONDS };
}
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

for (const [name, url, width, height] of [['landing 375', '/?home', 375, 812], ['landing 1280', '/?home', 1280, 800], ['home 375', APP, 375, 812], ['home 1280', APP, 1280, 800]] as const) {
  test(`${name}: frame cost with the CPU slowed 4x`, async ({ browser }, testInfo) => {
    chromiumOnly(testInfo, 'CPU throttling and Performance metrics: chromium');
    test.setTimeout(90_000);
    const run = async (sky: boolean) => { const ctx = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'no-preference' }); const page = await ctx.newPage(); try { return await measure(page, `${testInfo.project.use.baseURL}${url}`, width, height, sky); } finally { await ctx.close(); } };
    const on = await run(true), off = await run(false);
    const f = on.frames, perFrame = f.length ? (on.taskMs - off.taskMs) / f.length : 0;
    const line = `${name}: ${f.length} frames in ${on.seconds} s; draw p50 ${pct(f, 0.5).toFixed(2)} ms, p95 ${pct(f, 0.95).toFixed(2)} ms, max ${Math.max(0, ...f).toFixed(2)} ms; main thread per frame (with minus without the sky) ${perFrame.toFixed(2)} ms`;
    console.log(line);
    testInfo.annotations.push({ type: 'background frame cost (CPU 4x)', description: line });
    expect(f.length, 'the scene drew frames').toBeGreaterThan(on.seconds * 10);
    /* The budget is 2 ms; a shared CI runner gets twice that before this fails, so a slow machine is not a regression */
    expect(pct(f, 0.95), 'p95 draw time').toBeLessThan(process.env.CI ? 4 : 2);
  });
}
