import { test, expect, open, chromiumOnly } from '../fixtures';
import { fakeAudio, audioLog, said } from '../audio-fake';
import type { Page, Request } from '@playwright/test';

/* sutra-pronunciation spec, Requirements "Name clips", "Clips load on use and stay for offline" and "Fallback when a
   clip cannot play": one test per scenario. "Offline after first use" needs the service worker and runs in
   e2e/tests/offline.spec.ts ("a Sutra name heard once online lets every other name play offline"); here the cache
   rule it relies on is asserted: the first tap fetches only its clip and the other 28 follow while idle. */
const SOUNDS = /\/vedic-math\/sounds\//;
function soundRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (r: Request) => { if (SOUNDS.test(r.url())) urls.push(new URL(r.url()).pathname); });
  return urls;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
});

test('Size: 29 clips, each under 30 KB and all together under 500 KB', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'fetches the 29 files once');
  await open(page, '#/sutras');
  const urls: string[] = await page.evaluate(async () => { const m: any = await import('/vedic-math/js/say.js' as string); return Object.keys(m.NAMES).map((id: string) => m.clipUrl(id)); });
  expect(urls).toHaveLength(29);
  let total = 0;
  for (const u of urls) {
    const r = await page.request.get(u);
    expect(r.ok(), u).toBeTruthy();
    const bytes = (await r.body()).length;
    expect(bytes, u).toBeLessThan(30 * 1024);
    total += bytes;
  }
  expect(total).toBeLessThan(500 * 1024);
});

test('First tap: only the tapped clip is fetched before it plays, then the other 28 follow while idle', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras/s3');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  expect(urls[0]).toBe('/vedic-math/sounds/sutras/s3.m4a');
  await expect.poll(() => new Set(urls).size, { timeout: 40_000 }).toBe(29);
  expect(urls.filter(u => u.endsWith('/s3.m4a'))).toHaveLength(1);
});

test('Save-Data: with Save-Data on only the tapped clip is fetched', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }); });
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras/s3');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  await page.waitForTimeout(3500);
  expect(new Set(urls)).toEqual(new Set(['/vedic-math/sounds/sutras/s3.m4a']));
});

test('Offline after first use: the clips are served cache first by the worker (asserted end to end in offline.spec.ts); the shipped index pins every clip URL', async ({ page }) => {
  await open(page, '#/sutras');
  const pinned: boolean = await page.evaluate(async () => { const m: any = await import('/vedic-math/js/say.js' as string); return Object.keys(m.NAMES).every((id: string) => /\/sounds\/sutras\/[su]\d+\.m4a\?v=[0-9a-f]{10}$/.test(m.clipUrl(id))); });
  expect(pinned).toBe(true);
});

test('Offline before any clip is cached: the built-in voice reads the Respelling and the status says so', async ({ page }) => {
  await fakeAudio(page);
  await page.route(/\/vedic-math\/sounds\/sutras\//, route => route.abort('failed'));
  await open(page, '#/sutras/s1');
  const btn = page.locator('dialog .say-btn');
  await btn.click();
  await expect.poll(() => said(page)).toEqual(['ay kah dhi kay nuh poor vay nuh']);
  await expect(page.locator('.fx-toasts')).toContainText("Played with this device's voice, which may not be exact.");
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
});

test('No audio at all: without Web Audio or speech the status shows the Respelling to read, and nothing throws', async ({ page, issues }) => {
  await page.addInitScript(() => {
    for (const k of ['AudioContext', 'webkitAudioContext', 'speechSynthesis', 'SpeechSynthesisUtterance']) { try { Object.defineProperty(window, k, { configurable: true, value: undefined }); } catch (e) { /* not present */ } }
  });
  await open(page, '#/sutras/s1');
  await page.locator('dialog .say-btn').click();
  await expect(page.locator('.fx-toasts')).toContainText('Sound is not available here. Say it like this: ay-kah-dhi-KAY-nuh poor-VAY-nuh');
  expect(issues.console.filter(e => /pageerror/.test(e))).toEqual([]);
});
