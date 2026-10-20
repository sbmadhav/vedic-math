import { test, expect, open } from '../fixtures';

/* analytics spec, Requirement "Listening to a verse is counted", Scenario "Listen": a Listen tap that starts
   speech sends exactly math/sloka/listen once, with nothing else in the path. The shared analytics.js is replaced
   by a stub that records window.siteTrack calls, and a fake speech engine stands in for the device voice. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;

test('Listen sends exactly math/sloka/listen once', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => {
    const voices = [{ name: 'Lekha', lang: 'hi-IN', default: false, localService: true, voiceURI: 'hi' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speaking: false, pending: false, paused: false, onvoiceschanged: null, getVoices: () => voices,
      speak() {}, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    } });
  });
  await open(page, '#/sutras');
  await expect.poll(() => page.evaluate(() => typeof (window as any).siteTrack)).toBe('function');
  await page.locator('#verse-aryabhata-pi .verse-listen').click();
  await expect.poll(() => page.evaluate(() => ((window as any).__events as string[]).filter(e => e.includes('sloka')))).toEqual(['math/sloka/listen']);
});
