import { test, expect, open, type Page } from './fixtures';

/* Built-in voice (openspec better-voice, part A): pitch 1 and a calm rate, never a robotic voice when a better one
   exists, and a one-time note in Me when every voice on the device is robotic. The browser's speech engine is
   replaced by a fake with a chosen voice list, so the test sees exactly what would be spoken. */

type FakeVoice = { name: string; lang: string; voiceURI: string };
const COMPACT: FakeVoice = { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha' };
const ENHANCED: FakeVoice = { name: 'Ava', lang: 'en-US', voiceURI: 'com.apple.voice.enhanced.en-US.Ava' };
const NOVELTY: FakeVoice = { name: 'Albert', lang: 'en-US', voiceURI: 'com.apple.speech.synthesis.voice.Albert' };

async function fakeSpeech(page: Page, voices: FakeVoice[]) {
  await page.addInitScript(list => {
    const w = window as any;
    w.__spoken = [];
    const vs = list.map(v => ({ ...v, localService: true, default: false }));
    const fake = {
      getVoices: () => vs, pending: false, speaking: false, paused: false,
      speak(u: any) { w.__spoken.push({ text: u.text, pitch: u.pitch, rate: u.rate, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 0); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    /* The real utterance only accepts real voices, so the fake engine gets a plain utterance too */
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  }, voices);
}
const spoken = (page: Page) => page.evaluate(() => (window as any).__spoken as { text: string; pitch: number; rate: number; voice: string }[]);

test.describe('built-in voice', () => {
  test.use({ seedMode: 'explorer' });

  test('an Explorer question is read at pitch 1, rate 0.9, with the Enhanced voice', async ({ page }) => {
    await fakeSpeech(page, [COMPACT, ENHANCED, NOVELTY]);
    await open(page, '#/skill/k-add10');
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    const [first] = await spoken(page);
    expect(first.pitch).toBe(1);
    expect(first.rate).toBe(0.9);
    expect(first.voice).toBe('Ava');
    expect(first.text).toMatch(/[a-z]/i);
    expect(first.text).not.toMatch(/[<>&+=]/); // words, not symbols or HTML
  });
});

test.describe('voice settings in Me', () => {
  test('only robotic voices: the note shows once, with the steps, until Got it', async ({ page }) => {
    await fakeSpeech(page, [COMPACT, NOVELTY]);
    await open(page, '#/me');
    const note = page.locator('#vvPoor');
    await expect(note).toBeVisible();
    await expect(note).toContainText('robotic');
    await expect(note).toContainText('iPhone or iPad');
    await expect(note).toContainText('Windows');
    await expect(page.locator('#setVoiceName option', { hasText: '(robotic)' })).toHaveCount(2);
    await note.getByRole('button', { name: 'Got it' }).click();
    await expect(note).toBeHidden();
    await page.reload();
    await expect(page.locator('#vvSet')).toBeVisible();
    await expect(note).toBeHidden();
  });

  test('a good voice on the device: no note, and good voices are listed first', async ({ page }) => {
    await fakeSpeech(page, [COMPACT, NOVELTY, ENHANCED]);
    await open(page, '#/me');
    await expect(page.locator('#vvSet')).toBeVisible();
    await expect(page.locator('#vvPoor')).toBeHidden();
    await expect(page.locator('#setVoiceName option').nth(1)).toHaveText(/^Ava /);
  });

  test('the note fits a 320px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await fakeSpeech(page, [COMPACT, NOVELTY]);
    await open(page, '#/me');
    await expect(page.locator('#vvPoor')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
