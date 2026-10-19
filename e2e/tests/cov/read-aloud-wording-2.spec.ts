import { test, expect, open, type Page } from '../fixtures';

/* read-aloud-wording spec, Requirements "A question can say what its picture shows" and "The hint read is the hint
   shown": one test per scenario. speechSynthesis is a recorder, so nothing is spoken. The studio voice (recorded files)
   is turned off, as in read-aloud.spec.ts: with it on, a recorded line plays as audio and never reaches the recorder,
   so the words could not be read back. Which words are said does not depend on the voice that says them. */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) { /* storage blocked */ }
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
const words = (page: Page, html: string) => page.evaluate(async h => (await import('/js/voice.js' as string)).normalize(h) as string, html);

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });

  test('Compare two numbers: the screen shows "89 □ 57" and the voice says the compare sentence', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/skill/1-compare');
    const q = page.locator('#practice #prQ');
    await expect(q).toContainText('□');
    const [a, b] = ((await q.textContent()) || '').split('□').map(s => s.trim());
    expect(a).toMatch(/^\d+$/); expect(b).toMatch(/^\d+$/);
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(`Compare ${a} and ${b}. Which sign goes in the box: less than, equals, or greater than?`);
    await expect(q).toContainText('□');
  });

  test('Second wrong try: the hint shown starts "Hint: Think: 1 + ? = 6" style and the voice reads that hint', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/skill/k-sub10');
    const box = page.locator('#practice');
    await expect.poll(() => said(page), { timeout: 5000 }).not.toBe('');
    const [, x, y] = ((await box.locator('#prQ').textContent()) || '').match(/(\d+)\s*−\s*(\d+)/) || [];
    const wrong = box.getByRole('group', { name: 'Choices' }).getByRole('button').filter({ hasNotText: new RegExp(`^${+x - +y}$`) });
    await wrong.nth(0).click();
    await expect(box.locator('#prSay .md-bubble')).not.toContainText('Hint:');
    // Only what the second wrong try makes the voice say
    await page.evaluate(() => { (window as any).__said.length = 0; });
    await wrong.nth(1).click();
    const bubble = box.locator('#prSay .md-bubble');
    await expect(bubble).toContainText(/^Hint: Think: \d+ \+ \? = \d+/);
    const hint = (await bubble.innerHTML()).replace(/^[\s\S]*?Hint:\s*/, '');
    const want = await words(page, hint);
    expect(want).toMatch(/^Think: \d+ plus what equals \d+/);
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(want);
  });
});

test.describe('Explorer in Calm', () => {
  test.use({ seedMode: 'explorer' });

  test('A right triangle in a tower: the tap round says the legs from the picture, as Practice does', async ({ page }) => {
    // Challenge 576 (Grade 8 mix) is open from the start, and its second question is a right triangle (a seeded set)
    await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* storage blocked */ } });
    await recordSpeech(page);
    await open(page, '#/challenge/576');
    const want = await page.evaluate(async () => {
      const L: any = await import('/js/levels.js' as string), V: any = await import('/js/voice.js' as string);
      const p = L.challengeSet(L.challenge(576))[1];
      return { skill: p.skill as string, q: V.normalize(p.q) as string, say: p.say ? V.normalize(p.say) as string : '' };
    });
    expect(want.skill).toBe('8-pyth');
    expect(want.say).toMatch(/^A right triangle has (legs \d+ and \d+\. Find the hypotenuse c\.|hypotenuse \d+ and one leg \d+\. Find the missing leg a\.)$/);
    await page.locator('#chGo').click();
    const choices = page.locator('.play-shell .ar-choice');
    await expect(choices.first()).toBeVisible({ timeout: 6000 });
    await page.evaluate(() => { (window as any).__said.length = 0; });
    await choices.first().click();
    await expect(page.locator('.play-shell #arQ')).toContainText(/Find the (hypotenuse c|missing leg a)\./);
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(want.say);
  });
});

test('Hear it on a right triangle: the voice says the legs from the picture and the question', async ({ page }) => {
  await recordSpeech(page);
  await open(page, '#/skill/8-pyth');
  const box = page.locator('#practice');
  await expect(box.locator('#prQ')).toHaveText(/Find the (hypotenuse c|missing leg a)\./);
  // Only what Hear it makes the voice say, not the question read when the page opened
  await page.evaluate(() => { (window as any).__said.length = 0; });
  await box.locator('#prHear').click();
  await expect.poll(() => said(page), { timeout: 5000 }).toMatch(/A right triangle has (legs \d+ and \d+\. Find the hypotenuse c\.|hypotenuse \d+ and one leg \d+\. Find the missing leg a\.)/);
});
