import { test, expect, open } from '../fixtures';

/* sanskrit-verses spec: one test per scenario. The Listen scenario uses a fake speech engine with one Hindi
   voice that records what it is asked to say. */

async function hindiVoice(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const said: { text: string; lang: string }[] = [];
    (window as any).__said = said;
    const voices = [{ name: 'Lekha', lang: 'hi-IN', default: false, localService: true, voiceURI: 'hi' }];
    const synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: () => voices,
      speak(u: any) { said.push({ text: u.text, lang: u.lang }); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
}

test('Opening the Sutras page: the verses section ends the page with its honest introduction and three subsections', async ({ page }) => {
  await open(page, '#/sutras');
  const section = page.locator('#versesH').locator('xpath=ancestor::section[1]');
  await section.scrollIntoViewIfNeeded();
  await expect(page.locator('#versesH')).toHaveText('Mathematics in Sanskrit verse');
  await expect(section.locator('.history').first()).toContainText('not verses');
  await expect(section.locator('.history').first()).toContainText('no older text contains them');
  await expect(section.locator('.verse-group h3')).toHaveText(['From the Vedic texts', "From India's great mathematicians", 'Numbers hidden in words']);
  for (const g of await section.locator('.verse-group').all()) expect(await g.locator('.verse').count()).toBeGreaterThan(0);
  // It is the last section of the page
  expect(await page.evaluate(() => { const s = document.getElementById('versesH')!.closest('section')!; return !s.nextElementSibling || !s.nextElementSibling.matches('section'); })).toBe(true);
});

test("Āryabhaṭa's value of π: the details show each word with its gloss and the source Gaṇitapāda 10", async ({ page }) => {
  await open(page, '#/sutras');
  const pi = page.locator('#verse-aryabhata-pi');
  await pi.locator('summary').click();
  await expect(pi.locator('.verse-words dt').first()).toHaveText('caturadhikaṃ');
  await expect(pi.locator('.verse-words dd').first()).not.toBeEmpty();
  expect(await pi.locator('.verse-words dt').count()).toBe(await pi.locator('.verse-words dd').count());
  await expect(pi.locator('.verse-more')).toContainText('Āryabhaṭīya');
  await expect(pi.locator('.verse-more')).toContainText('Gaṇitapāda 10');
});

test('A device with a Hindi voice: Listen speaks the Devanagari with it and the button shows Stop', async ({ page }) => {
  await hindiVoice(page);
  await open(page, '#/sutras');
  const btn = page.locator('#verse-aryabhata-pi .verse-listen');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveText(/Stop/);
  const said = await page.evaluate(() => (window as any).__said);
  expect(said.at(-1).lang).toBe('hi-IN');
  expect(said.at(-1).text).toContain('चतुरधिकं');
});

test("The gopī bhāgya verse: labelled as from Tirtha's 1965 book, not ancient, with a wrong last digit", async ({ page }) => {
  await open(page, '#/sutras');
  const card = page.locator('#verse-tirtha-gopi-pi');
  await expect(card).toContainText('Tirtha');
  await expect(card).toContainText('the true 32nd decimal is 5');
  await card.locator('summary').click();
  await expect(card).toContainText('not ancient');
  await expect(card).toContainText('1965');
});

test('Yāvadūnam: the deep dive shows the Līlāvatī verse on squaring', async ({ page }) => {
  await open(page, '#/sutras/s10');
  const v = page.locator('.sutra-modal[open] .sd-verse');
  await expect(v).toContainText('In Sanskrit verse');
  await expect(v.locator('.verse-deva')).toHaveAttribute('lang', 'sa');
  await expect(v).toContainText('Līlāvatī');
});
