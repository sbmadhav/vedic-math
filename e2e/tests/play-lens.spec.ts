import { test, expect, open } from './fixtures';

/* Math Lens camera (openspec play-experiences, "Camera and microphone only while in use"): the camera is asked
   for only after a tap next to a line saying what it is for, and every track stops on a hidden tab and on a route
   change. The camera is a fake: a MediaStream from a canvas, so no real device is used and nothing is recorded.
   The digit reader (Tesseract.js) is served from this site, /vendor/tesseract/ (owner decision P1). The
   camera tests refuse it so nothing large downloads; one test lets it load and read a frame, and checks that every
   reader file came from that folder and the page's policy blocked nothing. */

async function fakeCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__tracks = []; w.__gum = 0;
    const fake = async () => {
      w.__gum++;
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      // The stream first, then the paint: the canvas-capture spec promises a frame only for a paint made after the
      // track exists. And no frame rate: with one (captureStream(5)) WebKit sends a frame only when the canvas is
      // repainted, so a still canvas never gave the <video> a frame and videoWidth stayed 0 (Chromium sent one anyway)
      const s = (c as any).captureStream() as MediaStream;
      const g = c.getContext('2d')!; g.fillStyle = 'rgb(250, 250, 250)'; g.fillRect(0, 0, 320, 180);
      // Bold monospace digits: WebKit's default sans-serif "1" (a flag and a base) read as "7" in the OCR
      g.fillStyle = 'rgb(10, 10, 10)'; g.font = 'bold 84px "DejaVu Sans Mono", monospace'; g.fillText('4721', 40, 124);
      s.getTracks().forEach(t => w.__tracks.push(t));
      return s;
    };
    // On the prototype: on a first page load WebKit hands the page a fresh navigator.mediaDevices, so an
    // instance property set this early is lost and the real (denied) camera would be asked for
    Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: fake, configurable: true, writable: true });
  });
}
const states = (page: import('@playwright/test').Page) => page.evaluate(() => ((window as any).__tracks as MediaStreamTrack[]).map(t => t.readyState));
async function hide(page: import('@playwright/test').Page, hidden: boolean) {
  await page.evaluate(h => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  await fakeCamera(page);
  // The reader is refused unless a test lets it load (see the last tests)
  await page.route(/\/vendor\/tesseract\//, r => r.abort());
});

test('the camera is asked for only after Turn on the camera, next to what it is for', async ({ page, issues }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="camera"]').click();
  await expect(page.locator('.ln-cam-intro')).toContainText('Nothing leaves your phone.');
  expect(await page.evaluate(() => (window as any).__gum)).toBe(0);
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__gum)).toBe(1);
  expect(await states(page)).toEqual(['live']);
  expect(issues.console).toEqual([]);
});

test('hiding the tab stops the camera, and one tap turns it on again', async ({ page }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="camera"]').click();
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  await hide(page, true);
  await expect.poll(() => states(page)).toEqual(['ended']);
  await expect(page.locator('.ln-cam-intro')).toContainText('turned off while you were away');
  await hide(page, false);
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  expect(await states(page)).toEqual(['ended', 'live']);
});

test('leaving the page stops the camera', async ({ page }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="camera"]').click();
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  await page.locator('.px-back').first().click();
  await expect(page).toHaveURL(/#\/games$/);
  await expect.poll(() => states(page)).toEqual(['ended']);
});

test('Capture stops the camera; a reader that cannot load (refused here) says so and offers typing', async ({ page }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="camera"]').click();
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  await expect.poll(() => page.locator('video.ln-video').evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  await page.locator('.ln-snap').click();
  await expect.poll(() => states(page)).toEqual(['ended']);
  await page.locator('.ln-read').click();
  await expect(page.locator('#view')).toContainText('The digit reader could not start here');
  await expect(page.locator('#lnDigits')).toBeFocused();
});

test('a typed plate with other words is shared as its digits only', async ({ page }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="type"]').click();
  await page.locator('#lnDigits').fill('KA 05 call me 4721 <b>');
  await page.locator('#lnDigits').press('Enter');
  await page.evaluate(() => { (window as any).__shared = []; (navigator as any).share = async (d: any) => { (window as any).__shared.push(d); }; });
  const send = page.locator('.ln-send').first();
  await send.click();
  const shared = await page.evaluate(() => (window as any).__shared as { url: string; text: string }[]);
  expect(shared).toHaveLength(1);
  const tail = decodeURIComponent(shared[0].url.split('/').pop()!);
  expect(tail).toBe('054721');
  expect(shared[0].text).not.toMatch(/call|<b>|KA/i);
});

test('a typed plate shows in full, and its digits are the ones the challenges use', async ({ page }) => {
  await open(page, '#/games/lens');
  await page.locator('[data-way="type"]').click();
  await page.locator('#lnDigits').fill('ka 05 mh 1234');
  await page.locator('#lnDigits').press('Enter');
  await expect(page.locator('.ln-big')).toHaveText('KA 05 MH 1234');
  await page.evaluate(() => { (window as any).__shared = []; (navigator as any).share = async (d: any) => { (window as any).__shared.push(d); }; });
  await page.locator('.ln-send').first().click();
  const shared = await page.evaluate(() => (window as any).__shared as { url: string }[]);
  expect(decodeURIComponent(shared[0].url.split('/').pop()!)).toBe('051234');
});

test('a sent link with a kind that is not one of Math Lens\'s (constructor) plays as a plate', async ({ page, issues }) => {
  await open(page, '#/games/lens/d/constructor/4721');
  await expect(page.locator('.ln-big')).toHaveText('4721');
  await expect(page.locator('.ln-kicker')).toHaveText('Plate or sign');
  expect(issues.console).toEqual([]);
});

test('Read the digits loads the reader from this site only and reads the frozen frame', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await page.unroute(/\/vendor\/tesseract\//);
  const asked: string[] = [];
  page.on('request', r => { if (/tesseract|traineddata/i.test(r.url())) asked.push(r.url()); });
  await page.addInitScript(() => {
    const w = window as any; w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => { if (e.disposition === 'report') return; w.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`); });
  });
  await open(page, '#/games/lens');
  await expect(page.locator('[data-way="camera"]')).toBeEnabled();
  await page.locator('[data-way="camera"]').click();
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  await expect.poll(() => page.locator('video.ln-video').evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  await page.locator('.ln-snap').click();
  await expect(page.locator('.ln-dl')).toContainText('from this site');
  await page.locator('.ln-read').click();
  await expect(page.locator('#lnDigits')).toBeFocused({ timeout: 90_000 });
  await expect(page.locator('#view')).not.toContainText('could not start');
  await expect(page.locator('#lnDigits')).toHaveValue(/4721/);
  const origin = new URL(baseURL!).origin;
  expect(asked.length).toBeGreaterThan(0);
  for (const u of asked) expect(u.startsWith(`${origin}/vendor/tesseract/`), u).toBe(true);
  expect(await page.evaluate(() => (window as any).__csp)).toEqual([]);
});
