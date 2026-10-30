import { test, expect, open } from '../fixtures';

/* site-header spec, Requirement "Explorer's tabs say their names" (openspec change play-nav-by-mode): one test per
   scenario. speechSynthesis is replaced by a recorder (the try-trick and verses specs' pattern). */
type Page = import('@playwright/test').Page;
async function recordSpeech(page: Page, voiceOn: boolean) {
  await page.addInitScript(on => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); if (!on) localStorage.setItem('vm.voice', '0'); } catch (e) { /* storage blocked */ }
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const fake = { getVoices: () => [voice], pending: false, speaking: false, paused: false, speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  }, voiceOn);
}
const said = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).__said || []);

test.use({ seedMode: 'explorer' });

test('Read aloud on: tapping Learn opens the Learn page and "Learn" is spoken once', async ({ page }) => {
  await recordSpeech(page, true);
  await open(page);
  await page.locator('header .mq-nav a[href="#/learn"]').click();
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await expect.poll(() => said(page)).toEqual(['Learn']);
  await page.waitForTimeout(300);
  expect(await said(page)).toEqual(['Learn']);
});

test('Read aloud off: tapping Me opens the Me page and nothing is spoken', async ({ page }) => {
  await recordSpeech(page, false);
  await open(page);
  await page.locator('header .mq-nav a[href="#/me"]').click();
  await expect(page.locator('#view h1')).toHaveText('Swift Tiger 42');
  await page.waitForTimeout(300);
  expect(await said(page)).toEqual([]);
});
