import { test, expect, open } from './fixtures';

/* Mathematics in Sanskrit verse (openspec sanskrit-verses): a section at the end of the Sutras page with the verses
   grouped by era, a Listen button, word-by-word notes, and the related verse inside a sutra deep dive. */

/* A fake speech engine: one Hindi voice (or none), and every utterance recorded on window.__said */
async function fakeSpeech(page: import('@playwright/test').Page, withHindi: boolean, lateMs = 0) {
  await page.addInitScript(({ withHindi, lateMs }) => {
    const said: { text: string; lang: string }[] = [];
    (window as any).__said = said;
    const voices = withHindi ? [{ name: 'Lekha', lang: 'hi-IN', default: false, localService: true, voiceURI: 'hi' }] : [{ name: 'Sam', lang: 'en-US', default: true, localService: true, voiceURI: 'en' }];
    /* lateMs: the list is empty until then, like Chrome before voiceschanged */
    let ready = !lateMs; const heard: Function[] = [];
    const synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: () => (ready ? voices : []),
      speak(u: any) { said.push({ text: u.text, lang: u.lang }); },
      cancel() {}, pause() {}, resume() {},
      addEventListener(type: string, fn: Function) { if (type === 'voiceschanged') heard.push(fn); }, removeEventListener() {}
    };
    if (lateMs) setTimeout(() => { ready = true; heard.splice(0).forEach(f => f()); }, lateMs);
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  }, { withHindi, lateMs });
}

test('the Sutras page ends with the verses, grouped by era, each with Devanagari, IAST and a respelling', async ({ page, issues }) => {
  await open(page, '#/sutras');
  await expect(page.locator('#versesH')).toHaveText('Mathematics in Sanskrit verse');
  await expect(page.locator('.verse-group h3')).toHaveText(['From the Vedic texts', "From India's great mathematicians", 'Numbers hidden in words']);
  await expect(page.locator('.verse')).toHaveCount(18);
  const pi = page.locator('#verse-aryabhata-pi');
  await expect(pi.locator('.verse-deva')).toHaveAttribute('lang', 'sa');
  await expect(pi.locator('.verse-iast')).toHaveAttribute('lang', 'sa-Latn');
  await expect(pi.locator('.verse-iast')).toContainText('caturadhikaṃ');
  await expect(pi.locator('.verse-say')).toContainText('Say it');
  await expect(pi.locator('.verse-math')).toContainText('3.1416');
  await pi.locator('summary').click();
  await expect(pi.locator('.verse-words dt').first()).toHaveText('caturadhikaṃ');
  await expect(pi.locator('.verse-more')).toContainText('Gaṇitapāda 10');
  // The one verse in the 1965 book is labelled as the Swami's own
  await expect(page.locator('#verse-tirtha-gopi-pi')).toContainText('Tirtha');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(issues.console).toEqual([]);
});

test('at 320 px wide the verses wrap their long words and the Sutras page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, '#/sutras');
  await expect(page.locator('.verse').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('Listen reads the Devanagari with a Hindi voice, and a second tap stops', async ({ page }) => {
  await fakeSpeech(page, true);
  await open(page, '#/sutras');
  const btn = page.locator('#verse-aryabhata-pi .verse-listen');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  const said = await page.evaluate(() => (window as any).__said);
  expect(said.at(-1).lang).toBe('hi-IN');
  expect(said.at(-1).text).toContain('चतुरधिकं');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
});

test('when the voice list arrives late (Chrome), Listen waits for it and still uses the Hindi voice', async ({ page }) => {
  await fakeSpeech(page, true, 400);
  await open(page, '#/sutras');
  await page.evaluate(() => { (window as any).__said.length = 0; });
  await page.locator('#verse-aryabhata-pi .verse-listen').click();
  await expect.poll(() => page.evaluate(() => (window as any).__said.length)).toBe(1);
  const said = await page.evaluate(() => (window as any).__said);
  expect(said[0].lang).toBe('hi-IN');
  expect(said[0].text).toContain('चतुरधिकं');
});

test('with no Hindi voice, Listen reads the respelling in English', async ({ page }) => {
  await fakeSpeech(page, false);
  await open(page, '#/sutras');
  await page.locator('#verse-aryabhata-pi .verse-listen').click();
  const said = await page.evaluate(() => (window as any).__said);
  expect(said.at(-1).lang).toBe('en-US');
  expect(said.at(-1).text).toMatch(/^chatu|^cha/);
  expect(said.at(-1).text).not.toMatch(/[ऀ-ॿ]/);
});

test('the Yāvadūnam deep dive shows its verse from the Līlāvatī', async ({ page }) => {
  await open(page, '#/sutras/s10');
  await expect(page.locator('.sd-verse')).toContainText('In Sanskrit verse');
  await expect(page.locator('.sd-verse .verse-deva')).toHaveAttribute('lang', 'sa');
});
