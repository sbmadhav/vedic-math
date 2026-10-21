import { test, expect, open, cloudLog, type Page } from './fixtures';

/* What the read-aloud voice says (openspec voice-wording): a question's optional say is what is heard, the screen
   text stays as it was, and the hint read after a second wrong try is the hint on screen. speechSynthesis.speak is
   replaced by a recorder, so nothing is spoken and every utterance can be read back. The whole engine is a fake (as in
   voice.spec.ts): in WebKit, replacing only speechSynthesis.speak on the real engine records nothing. The studio voice
   (recorded files) is turned off, so every line goes to the device's voice and its words can be read back. */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) {}
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const fake = {
      getVoices: () => [voice], pending: false, speaking: false, paused: false,
      speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  });
}
const said = (page: Page) => page.evaluate(() => ((window as any).__said as string[]).join(' '));
const words = (page: Page, html: string) => page.evaluate(async h => (await e2eMod('voice')).normalize(h) as string, html);

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });

  test('a compare question is read as a sentence with both numbers, and the screen keeps its box', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/skill/1-compare');
    const q = page.locator('#practice #prQ');
    await expect(q).toContainText('□');
    const [a, b] = ((await q.textContent()) || '').split('□').map(s => s.trim());
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(`Compare ${a} and ${b}. Which sign goes in the box: less than, equals, or greater than?`);
    expect(await said(page)).not.toContain('blank');
    expect((await cloudLog(page)).writes).toEqual([]);
  });

  test('after a second wrong try the voice reads the hint that is shown', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/skill/k-sub10');
    const box = page.locator('#practice');
    await expect.poll(() => said(page), { timeout: 5000 }).not.toBe('');
    const [, x, y] = ((await box.locator('#prQ').textContent()) || '').match(/(\d+)\s*−\s*(\d+)/) || [];
    const wrong = box.getByRole('group', { name: 'Choices' }).getByRole('button').filter({ hasNotText: new RegExp(`^${+x - +y}$`) });
    for (let i = 0; i < 2; i++) await wrong.nth(i).click(); // a choice is checked as soon as it is tapped
    const bubble = box.locator('#prSay .md-bubble');
    await expect(bubble).toContainText('Hint:');
    const hint = (await bubble.innerHTML()).replace(/^[\s\S]*?Hint:\s*/, '');
    const want = await words(page, hint);
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(want);
  });
});

test('Hear it reads a picture question with the numbers from the picture', async ({ page }) => {
  await recordSpeech(page);
  await open(page, '#/skill/8-pyth');
  const box = page.locator('#practice');
  await expect(box.locator('#prQ')).toHaveText(/Find the (hypotenuse c|missing leg a)\./);
  await box.locator('#prHear').click();
  await expect.poll(() => said(page), { timeout: 5000 }).toMatch(/A right triangle has (legs \d+ and \d+\. Find the hypotenuse c\.|hypotenuse \d+ and one leg \d+\. Find the missing leg a\.)/);
});
