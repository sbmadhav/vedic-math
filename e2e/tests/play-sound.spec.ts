import { test, expect, open } from './fixtures';
import type { Page } from '@playwright/test';

/* Mandala Studio and Tala Lab (openspec play-experiences): the Wallpaper box is usable on any width, sound and
   the microphone stop when the tab is hidden or the page is left, Hear it never gets stuck, and Sparks events
   fire only for new finds. Sound is off in every test (fixtures), which the studio's sound code honours. */

/* Pretend the tab went to the background (or came back): document.hidden and visibilityState, then the event */
async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate(h => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/* Every play event the page sends to the app (kit.track: these pay Sparks in js/app.js onPlay) */
async function recordPlay(page: Page) {
  await page.addInitScript(() => {
    (window as any).__play = [];
    document.addEventListener('vmplay', e => (window as any).__play.push((e as CustomEvent).detail.action));
  });
}
const played = (page: Page, action: string) => page.evaluate(a => (window as any).__play.filter((x: string) => x === a).length, action);

test.describe('Mandala Studio', () => {
  for (const [w, h] of [[320, 700], [1280, 900]] as const) test(`the Wallpaper box at ${w}px: no sideways scroll and Download PNG can be clicked`, async ({ page, issues }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page, '#/games/art');
    await page.locator('.ms-wall summary').click();
    const dl = page.locator('.ms-download');
    await expect(dl).toBeVisible();
    await dl.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    /* nothing paints over the button: the element at its center is the button or inside it */
    const onTop = await dl.evaluate(b => { const r = b.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && b.contains(el); });
    expect(onTop).toBe(true);
    await dl.click();
    await expect(page.locator('.px-toast')).toHaveText('Wallpaper saved');
    expect(issues.console).toEqual([]);
  });

  test('Hear it lets go when a Try chip takes over, and when the tab is hidden', async ({ page }) => {
    await open(page, '#/games/art');
    const hear = page.locator('.ms-hear');
    await hear.click();
    await expect(hear).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.ms-try [data-m="3"]').click();
    await expect(hear).toHaveAttribute('aria-pressed', 'false');
    await expect(hear).toHaveText('Hear it');
    await hear.click();
    await expect(hear).toHaveAttribute('aria-pressed', 'true');
    await setHidden(page, true);
    await expect(hear).toHaveAttribute('aria-pressed', 'false');
  });

  test('a Meru row tap ends Hear it', async ({ page }) => {
    await open(page, '#/games/art/meru');
    const hear = page.locator('.ms-hear');
    await hear.click();
    await expect(hear).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.ms-rowb[data-d="1"]').click();
    await expect(hear).toHaveAttribute('aria-pressed', 'false');
  });

  test('the root 2 drone stops when the tab is hidden', async ({ page }) => {
    await open(page, '#/games/art/rope');
    await page.locator('[data-scene="root2"]').click();
    const beat = page.locator('.ms-beat');
    await beat.click();
    await expect(beat).toHaveAttribute('aria-pressed', 'true');
    await setHidden(page, true);
    await expect(beat).toHaveAttribute('aria-pressed', 'false');
    await expect(beat).toHaveText('Hear the gap');
  });

  test('saving the same piece twice tracks it once', async ({ page }) => {
    await recordPlay(page);
    await open(page, '#/games/art');
    await page.locator('.ms-save').click();
    await expect(page.locator('.px-toast')).toHaveText('Saved to your gallery');
    await page.locator('.ms-save').click();
    await expect(page.locator('.px-toast')).toHaveText('Already in your gallery');
    expect(await played(page, 'art/save')).toBe(1);
  });

  test('the altar can be painted from the keyboard', async ({ page }) => {
    await open(page, '#/games/art/rope');
    await page.locator('[data-scene="altar"]').click();
    const cv = page.locator('.ms-cv');
    await expect(cv).toHaveAttribute('aria-label', /Arrow keys pick a piece/);
    await cv.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.locator('.ms-save').click();
    /* the saved piece carries the painted regions */
    const fills = await page.evaluate(() => {
      const k = Object.keys(localStorage).find(x => x.endsWith('.art'))!, c = JSON.parse(localStorage.getItem(k)!).gallery[0].c;
      return JSON.parse(decodeURIComponent(escape(atob(c.replace(/-/g, '+').replace(/_/g, '/'))))).f;
    });
    expect(fills.filter((x: number) => x > 0).length).toBeGreaterThan(0);
  });
});

test.describe('Tala Lab', () => {
  /* A fake microphone: getUserMedia hands out a real MediaStream from a Web Audio destination, and the test can
     see every stream it gave and whether its tracks were stopped. */
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any;
      w.__mic = { calls: 0, constraints: [] as unknown[], streams: [] as MediaStream[] };
      if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {} });
      /* on the prototype and the instance, with defineProperty: WebKit ignores a plain assignment to getUserMedia */
      w.__setGum = (fn: (c?: MediaStreamConstraints) => Promise<MediaStream>) => [w.MediaDevices?.prototype, navigator.mediaDevices].forEach(o => o && Object.defineProperty(o, 'getUserMedia', { configurable: true, writable: true, value: fn }));
      w.__setGum(async (c?: MediaStreamConstraints) => {
        w.__mic.calls++; w.__mic.constraints.push(c);
        const Ctx = w.AudioContext || w.webkitAudioContext, ac = new Ctx(), stream = ac.createMediaStreamDestination().stream;
        w.__mic.streams.push(stream);
        return stream;
      });
    });
  });
  const micState = (page: Page) => page.evaluate(() => { const m = (window as any).__mic; return { calls: m.calls, constraints: m.constraints, tracks: m.streams.flatMap((s: MediaStream) => s.getTracks().map(t => t.readyState)) }; });

  test('the mic is explained first, asks for audio only, and stops when the tab is hidden or the page is left', async ({ page, issues }) => {
    await open(page, '#/games/tala');
    const mic = page.locator('.tl-mic');
    await expect(page.locator('#tlMicNote')).toHaveText('Listens for your claps on this device only. Nothing is recorded or sent.');
    await expect(mic).toHaveAttribute('aria-describedby', 'tlMicNote');
    expect((await micState(page)).calls).toBe(0);

    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    let s = await micState(page);
    expect(s.calls).toBe(1);
    expect(s.constraints[0]).toMatchObject({ video: false });
    expect(s.constraints[0]).toHaveProperty('audio');
    expect(s.tracks.length).toBeGreaterThan(0);
    expect(s.tracks.every(r => r === 'live')).toBe(true);

    await setHidden(page, true);
    await expect(mic).toHaveAttribute('aria-pressed', 'false');
    s = await micState(page);
    expect(s.tracks.every(r => r === 'ended')).toBe(true);

    await setHidden(page, false);
    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    expect((await micState(page)).tracks.filter(r => r === 'live').length).toBeGreaterThan(0);
    await page.evaluate(() => { location.hash = '#/games'; });
    await expect(page.locator('#view h1').first()).not.toHaveText('Tala Lab');
    await expect.poll(async () => (await micState(page)).tracks.every(r => r === 'ended')).toBe(true);
    expect(issues.console).toEqual([]);
  });

  test('a second click while the mic is being asked for opens no second stream', async ({ page }) => {
    /* hold the permission answer until both clicks are in */
    await page.addInitScript(() => {
      const w = window as any, real = navigator.mediaDevices.getUserMedia;
      w.__release = null;
      w.__setGum((c?: MediaStreamConstraints) => new Promise(res => { w.__release = () => res(real(c)); }));
    });
    await open(page, '#/games/tala');
    const mic = page.locator('.tl-mic');
    await mic.click();
    await expect.poll(() => page.evaluate(() => typeof (window as any).__release)).toBe('function');
    await mic.click();
    await page.evaluate(() => (window as any).__release());
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    expect((await micState(page)).calls).toBe(1);
  });

  test('a hidden tab during "Play the next phrase" leaves the Cycle scene playable', async ({ page }) => {
    await open(page, '#/games/tala/cycle');
    await page.locator('.tl-next').click();
    await expect(page.locator('.tl-csub')).toContainText('phrase 1');
    await setHidden(page, true);
    await setHidden(page, false);
    /* a guess is refused while the scene is busy */
    await page.locator('.tl-cb[data-b="6"]').click();
    await expect(page.locator('.tl-cb[data-b="6"]')).toHaveClass(/is-guess/);
  });

  test('tihai puzzle 2 does not open already solved', async ({ page }) => {
    await open(page, '#/games/tala/tihai');
    await page.locator('.tl-pzb[data-z="1"]').click();
    await expect(page.locator('.tl-pv')).toHaveText('5');
    await expect(page.locator('.tl-tl')).not.toHaveClass(/is-lands/);
  });
});
