import { test, expect, APP, open, chromiumOnly, heldClock, type Page } from './fixtures';

/* The background sky (prototype; js/sky-scene.js, js/sky-bg.js): the full scene on the landing page and the app home,
   a quiet one elsewhere, one featured story at a time, a still frame under no motion, a paused loop in a hidden tab,
   a late start that shifts nothing, and text on top that stays as readable as it is without the background. */

const sky = (page: Page) => page.locator('canvas.vm-bg');
const state = (page: Page) => sky(page).evaluate(c => ({ ...(c as HTMLCanvasElement).dataset }) as Record<string, string>);
const frame = (page: Page) => sky(page).evaluate(c => (c as HTMLCanvasElement).toDataURL());
/* Does the canvas change within ms? */
const moving = async (page: Page, ms = 600) => { const a = await frame(page); await page.waitForTimeout(ms); return a !== (await frame(page)); };
/* Hides or shows the tab as far as the page can tell (document.hidden and visibilitychange) */
/* The story list, read from the page's own module (the same one the scene draws) */
const storyIds = (page: Page) => page.evaluate(async () => (await e2eMod('sky-scene')).STORIES.map((s: { id: string }) => s.id) as string[]);
/* Under a held clock: moves on until the first story is complete and held (or found no room, on a full phone screen) */
async function untilHeld(page: Page) {
  for (let i = 0; i < 60; i++) {
    const s = await state(page).catch(() => ({} as Record<string, string>));
    if (s.phase === 'hold' || s.place === 'none') return s;
    await page.clock.runFor(500);
  }
  return state(page);
}
const setHidden = (page: Page, hidden: boolean) => page.evaluate(h => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test.describe('levels', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the landing page has the full scene', async ({ page }) => {
    await page.goto('/?home');
    await expect(sky(page)).toHaveAttribute('data-level', 'full', { timeout: 10_000 });
    await expect(sky(page)).toHaveAttribute('aria-hidden', 'true');
  });

  test('the app home is full, other screens are quiet, and home is full again', async ({ page }) => {
    await open(page);
    await expect(sky(page)).toHaveAttribute('data-level', 'full', { timeout: 10_000 });
    await page.goto(`${APP}#/learn`);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    await expect(sky(page)).toHaveAttribute('data-level', 'quiet', { timeout: 10_000 });
    expect((await state(page)).story, 'no featured story on a quiet screen').toBe('');
    await page.evaluate(() => { location.hash = '#/'; });
    await expect(sky(page)).toHaveAttribute('data-level', 'full');
  });

  test('a story held on home is dropped when a quiet screen opens', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'a fake clock over a story: chromium');
    await page.setViewportSize({ width: 1280, height: 800 });
    await heldClock(page);
    await open(page);
    await page.clock.runFor(2000);
    await expect(sky(page)).toHaveAttribute('data-level', 'full');
    const held = await untilHeld(page);
    expect(held.story, 'a story is up on home first').not.toBe('');
    await page.evaluate(() => { location.hash = '#/learn'; });
    await expect(sky(page)).toHaveAttribute('data-level', 'quiet');
    await page.clock.runFor(1000);
    const s = await state(page);
    expect([s.story, s.phase, s.place]).toEqual(['', 'gap', 'none']);
  });

  test.describe('a first visit', () => {
    test.use({ seedMode: null });
    test('the Mode picker has the full scene', async ({ page }) => {
      await page.goto(APP);
      await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
      await expect(sky(page)).toHaveAttribute('data-level', 'full', { timeout: 10_000 });
    });
  });
});

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('one featured story at a time: drawn in, held with its caption, faded, then an empty sky before the next', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'a fake clock over a minute of scene time: chromium');
    await page.setViewportSize({ width: 1280, height: 800 });
    await heldClock(page);
    await page.goto(APP);
    await page.clock.runFor(2000);
    await expect(sky(page)).toBeAttached();
    const seen: string[] = [];
    let last = '';
    for (let i = 0; i < 130; i++) {
      await page.clock.runFor(500);
      const s = await state(page);
      const key = `${s.story}:${s.phase}`;
      if (key !== last) seen.push(key);
      last = key;
    }
    const ids = await storyIds(page);
    const stories = [...new Set(seen.map(k => k.split(':')[0]).filter(Boolean))];
    expect(stories.slice(0, 2)).toEqual(ids.slice(0, 2));
    const first = seen.filter(k => k.startsWith(`${ids[0]}:`)).map(k => k.split(':')[1]);
    expect(first.slice(0, 3)).toEqual(['in', 'hold', 'out']);
    const second = seen.findIndex(k => k.startsWith(`${ids[1]}:`));
    expect(seen[second - 1], 'an empty sky between two stories').toBe(':gap');
  });

  test('a hidden tab stops the frame loop; showing it again restarts it', async ({ page }) => {
    await open(page);
    await expect(sky(page)).toHaveAttribute('data-running', '1', { timeout: 10_000 });
    await expect.poll(() => moving(page)).toBe(true);
    await setHidden(page, true);
    await expect(sky(page)).toHaveAttribute('data-running', '0');
    expect(await moving(page, 800), 'still while hidden').toBe(false);
    await setHidden(page, false);
    await expect(sky(page)).toHaveAttribute('data-running', '1');
    await expect.poll(() => moving(page)).toBe(true);
  });

  test('starts after the page has loaded and painted, and shifts nothing', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      try { new PerformanceObserver(l => { for (const e of l.getEntries() as any[]) (window as any).__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { (window as any).__cls = -1; }
    });
    await page.goto('/?home');
    await expect(sky(page)).toHaveAttribute('data-running', '1', { timeout: 10_000 });
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => ({
      start: performance.getEntriesByName('sky-bg:start')[0]?.startTime ?? -1,
      load: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).loadEventEnd,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
      cls: (window as any).__cls as number
    }));
    expect(t.start).toBeGreaterThanOrEqual(t.load);
    expect(t.start).toBeGreaterThanOrEqual(t.fcp);
    if (t.cls >= 0) expect(t.cls).toBe(0);
  });
});

test('computed colours of every form count: color-mix() boxes show, transparent ones do not', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const m = await e2eMod('sky-bg');
    const el = document.createElement('div'); document.body.append(el);
    const computed = (bg: string) => { el.style.background = bg; return getComputedStyle(el).backgroundColor; };
    const mixed = computed('color-mix(in srgb, red 40%, transparent)');
    const out = { mixed, mixedShows: m.shows(mixed), clear: m.shows('rgba(0, 0, 0, 0)'), none: m.shows(''), srgb: m.shows('color(srgb 0 0.5 1 / 0.5)'), parsed: m.parseColor('color(srgb 1 0 0)'), fallback: m.parseColor('') };
    el.remove(); return out;
  });
  expect(r.mixedShows, `a box with ${r.mixed} shows`).toBe(true);
  expect(r.srgb).toBe(true);
  expect(r.clear).toBe(false);
  expect(r.none).toBe(false);
  expect(r.parsed).toEqual([255, 0, 0, 1]);
  expect(r.fallback).toEqual([128, 128, 128, 1]);
});

test.describe('still frame', () => {
  /* The suite's default is reduced motion */
  test('reduced motion: one composed frame on the landing page and home, with the day\'s story complete on a wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const url of ['/?home', APP]) {
      await page.goto(url);
      await expect(sky(page)).toHaveAttribute('data-still', '1', { timeout: 10_000 });
      await expect(sky(page)).toHaveAttribute('data-running', '0');
      await page.waitForTimeout(300);
      expect(await moving(page, 1500), url).toBe(false);
      const s = await state(page);
      expect(s.phase, url).toBe('still');
      expect(s.story, url).not.toBe('');
    }
  });

  test('after a scroll the still frame is clear behind the text where it is now', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await open(page, '#/learn');
    await expect(sky(page)).toHaveAttribute('data-level', 'quiet', { timeout: 10_000 });
    await expect(sky(page)).toHaveAttribute('data-still', '1');
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollBy(0, 260));
    await page.waitForTimeout(800);
    const under = await sky(page).evaluate(cv => {
      const c = cv as HTMLCanvasElement, g = c.getContext('2d')!, k = c.width / innerWidth, range = document.createRange();
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let worst = 0, runs = 0;
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.nodeValue!.trim() || /SCRIPT|STYLE/.test(n.parentNode!.nodeName)) continue;
        range.selectNodeContents(n); const r = range.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
        const d = g.getImageData(Math.round(r.left * k), Math.round(r.top * k), Math.max(1, Math.floor(r.width * k)), Math.max(1, Math.floor(r.height * k))).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > worst) worst = d[i];
        runs++;
      }
      return { worst, runs };
    });
    expect(under.runs).toBeGreaterThan(3);
    expect(under.worst, 'no sky pixel is left under text after the scroll').toBe(0);
  });

  test.describe('motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('Calm: still on the landing page too (it reads the same setting)', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
      await page.goto('/?home');
      await expect(sky(page)).toHaveAttribute('data-still', '1', { timeout: 10_000 });
      expect(await moving(page, 1200)).toBe(false);
    });

    test('Pause motion stills it and turning it off starts it again', async ({ page }) => {
      await page.goto('/?home');
      await expect(sky(page)).toHaveAttribute('data-running', '1', { timeout: 10_000 });
      await page.evaluate(() => { document.documentElement.classList.add('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } })); });
      await expect(sky(page)).toHaveAttribute('data-still', '1');
      expect(await moving(page, 1000)).toBe(false);
      await page.evaluate(() => { document.documentElement.classList.remove('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: false } })); });
      await expect(sky(page)).toHaveAttribute('data-running', '1');
      await expect.poll(() => moving(page)).toBe(true);
    });
  });
});

/* ---------- Readable on top ----------
   Every piece of text on screen is measured twice from screenshots with the text made transparent: once over the
   background sky and once with the sky hidden. The worst background pixel under each run of text gives its contrast.
   Text that meets WCAG AA without the sky (4.5:1, or 3:1 when large) must still meet it with the sky. */
type Run = { x: number; y: number; w: number; h: number; color: [number, number, number]; large: boolean; text: string };
async function textRuns(page: Page): Promise<Run[]> {
  return page.evaluate(() => {
    const out: any[] = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!; if (!n.textContent!.trim() || el.closest('script, style, canvas, [aria-hidden="true"], .md-sr-only')) continue;
      const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || +cs.opacity < 0.5 || cs.backgroundClip === 'text' || (cs as any).webkitBackgroundClip === 'text') continue;
      const m = cs.color.match(/[\d.]+/g)!.map(Number); if ((m[3] ?? 1) < 0.5) continue;
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 4 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        out.push({ x: r.left, y: r.top, w: r.width, h: r.height, color: [m[0], m[1], m[2]], large: size >= 24 || (bold && size >= 18.66), text: n.textContent!.trim().slice(0, 40) });
      }
    }
    return out;
  });
}
async function worstContrast(page: Page, shot: Buffer, runs: Run[]) {
  return page.evaluate(async ({ b64, runs }) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const img = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const cv = new OffscreenCanvas(img.width, img.height), g = cv.getContext('2d')!; g.drawImage(img, 0, 0);
    const k = img.width / innerWidth, lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r: number, gg: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
    return runs.map(run => {
      const x = Math.max(0, Math.floor(run.x * k)), y = Math.max(0, Math.floor(run.y * k)), w = Math.max(1, Math.min(img.width - x, Math.ceil(run.w * k))), h = Math.max(1, Math.min(img.height - y, Math.ceil(run.h * k)));
      const d = g.getImageData(x, y, w, h).data, lt = L(...run.color);
      let worst = 99;
      for (let i = 0; i < d.length; i += 8) { const lb = L(d[i], d[i + 1], d[i + 2]); const c = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); if (c < worst) worst = c; }
      return worst;
    });
  }, { b64: shot.toString('base64'), runs });
}
const HIDE_TEXT = '* { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; }';

test.describe('readable on top', () => {
  test.use({ reducedMotion: 'no-preference' });
  for (const scheme of ['light', 'dark'] as const) for (const width of [375, 1280]) for (const [name, url] of [['landing', '/?home'], ['home', APP]]) {
    test(`${name}, ${scheme}, ${width}px: the sky never takes text below AA`, async ({ page }, testInfo) => {
      chromiumOnly(testInfo, 'pixel contrast: chromium');
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: width < 500 ? 812 : 800 });
      await heldClock(page);
      await page.goto(url);
      /* The first story complete and held with its caption, where the screen has room for it */
      await page.clock.runFor(4000);
      const held = await untilHeld(page);
      testInfo.annotations.push({ type: 'story', description: `${held.story || 'none'} (${held.place})` });
      await page.evaluate(() => document.fonts.ready);
      const runs = await textRuns(page);
      expect(runs.length).toBeGreaterThan(5);
      await page.addStyleTag({ content: HIDE_TEXT });
      const withSky = await worstContrast(page, await page.screenshot(), runs);
      await sky(page).evaluate(c => { (c as HTMLElement).style.visibility = 'hidden'; });
      const without = await worstContrast(page, await page.screenshot(), runs);
      const bad = runs.map((r, i) => ({ text: r.text, need: r.large ? 3 : 4.5, with: +withSky[i].toFixed(2), without: +without[i].toFixed(2) }))
        .filter(r => r.without >= r.need && r.with < r.need);
      const min = Math.min(...withSky);
      testInfo.annotations.push({ type: 'lowest contrast with the sky', description: min.toFixed(2) });
      expect(bad).toEqual([]);
    });
  }
});
