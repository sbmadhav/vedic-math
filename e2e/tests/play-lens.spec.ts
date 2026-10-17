import { test, expect, open } from './fixtures';

/* Math Lens camera (openspec play-experiences, "Camera and microphone only while in use"): the camera is asked
   for only after a tap next to a line saying what it is for, and every track stops on a hidden tab and on a route
   change. The camera is a fake: a MediaStream from a canvas, so no real device is used and nothing is recorded.
   The digit reader is never downloaded here: cdn.jsdelivr.net is refused, which is also what the published
   Content-Security-Policy does today, and the page must say so instead of blaming the picture. */

async function fakeCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__tracks = []; w.__gum = 0;
    const fake = async () => {
      w.__gum++;
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      const g = c.getContext('2d')!; g.fillStyle = 'rgb(250, 250, 250)'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgb(10, 10, 10)'; g.font = '80px sans-serif'; g.fillText('4721', 60, 120);
      const s = (c as any).captureStream(5) as MediaStream;
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
  await page.route(/^https:\/\/cdn\.jsdelivr\.net\//, r => r.abort());
  // A published build's policy does not list the reader's host, so Math Lens does not offer the camera there (see
  // csp.spec.ts). These tests are about the camera itself, so the page they load has its policy <meta> removed;
  // the reader stays unreachable because its host is refused above.
  await page.route(/\/vedic-math\/(index\.html)?(\?[^#]*)?$/, async r => {
    if (r.request().resourceType() !== 'document') return r.fallback();
    const res = await r.fetch();
    const body = (await res.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, '');
    await r.fulfill({ response: res, body });
  });
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

test('Capture stops the camera; a reader that cannot load says so and offers typing', async ({ page }) => {
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
