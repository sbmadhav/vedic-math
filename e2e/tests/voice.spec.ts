import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, open, needsStudioVoice, studioVoiceOn, type Page, hrefTo } from './fixtures';

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
    await page.addInitScript(() => { try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) {} }); // the device's voice, not the recordings
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

/* ---------- Studio voice (openspec better-voice, part B) ----------
   The real recordings come from a release archive at deploy time, so these tests serve a fake index and tiny tone
   files (e2e/fixtures/voice/) through page.route. js/voice.js records the voice that said each line in
   window.__voiceLog when a test puts an array there.
   A deploy built with --voice off (no voice host in its published index or its policy) cannot fetch from the voice
   host at all, so the cases where recorded voice plays skip there (needsStudioVoice); the cases where the device voice
   reads keep running, and so does the one below that checks the deploy's own state. */

const FIX = join(__dirname, '..', 'fixtures', 'voice');
const LINE_M4A = readFileSync(join(FIX, 'line.m4a')), PACK_M4A = readFileSync(join(FIX, 'pack.m4a'));
/* lineHash('en-US-Chirp3-HD-Aoede', 'How many dots are there?') and its first 32 bits (test/voice-plan.test.mjs pins the hash) */
const DOTS_HASH = '1ab3f65a83ca5c', DOTS_KEY = 448001626;
const NUMBER_IDS = [...Array.from({ length: 100 }, (_, n) => [`n:${n}`, `n:${n}.`]).flat(), ...['hundred', 'thousand', 'million', 'point', 'negative'].flatMap(w => [`w:${w}`, `w:${w}.`])];
const FRAMES = ['f:plus', 'f:minus', 'f:equals what?', 'f:equals', 'f:How many dots are there?'];
const PROVIDERS = /texttospeech\.googleapis\.com|api\.elevenlabs\.io|api\.openai\.com|tts\.speech\.microsoft\.com|amazonaws\.com\/.*polly/;

async function fakeStudio(page: Page, { lineStatus = 200, lineDelay = 0, indexDelay = 0, mapDrop = [] as string[] } = {}) {
  await page.addInitScript(() => { (window as any).__voiceLog = []; });
  const index = { voice: 'en-US-Chirp3-HD-Aoede', speed: 0.95, base: 'https://voice.learnvedicmath.com/', tag: 'voice-0123456789', sha256: '0'.repeat(64),
    lineSet: 'l/set.test.bin', dir: 'p/dir.test.json', packs: [{ name: 'core', audio: 'p/core.test.m4a', map: 'p/core.test.json', bytes: PACK_M4A.length, clips: 0 }],
    coveredSkills: ['k-count'], counts: { lines: 1, clips: NUMBER_IDS.length + FRAMES.length } };
  const ids = [...NUMBER_IDS, ...FRAMES];
  const requests: string[] = [];
  page.on('request', r => { if (r.url().includes('https://voice.learnvedicmath.com/')) requests.push(r.url()); });
  await page.route('**/js/voice-index.js*', r => r.fulfill({ contentType: 'text/javascript', body: `export const STUDIO = ${JSON.stringify(index)};` }));
  await page.route('https://voice.learnvedicmath.com/**', async r => {
    const u = new URL(r.request().url()).pathname.replace('/', '');
    if (u === 'l/set.test.bin' && indexDelay) await new Promise(res => setTimeout(res, indexDelay));
    if (u === 'l/set.test.bin') return r.fulfill({ contentType: 'application/octet-stream', body: Buffer.from(Uint32Array.from([DOTS_KEY]).buffer) });
    if (u === 'p/dir.test.json') return r.fulfill({ json: Object.fromEntries(ids.map(id => [id, 'core'])) });
    if (u === 'p/core.test.json') return r.fulfill({ json: { rate: 24000, gap: 0.25, clips: Object.fromEntries(ids.filter(id => !mapDrop.includes(id)).map(id => [id, [0.25, 0.4]])) } });
    if (u === 'p/core.test.m4a') return r.fulfill({ contentType: 'audio/mp4', body: PACK_M4A });
    if (u === `l/${DOTS_HASH}.m4a` && lineDelay) await new Promise(res => setTimeout(res, lineDelay));
    if (u === `l/${DOTS_HASH}.m4a`) return lineStatus === 200 ? r.fulfill({ contentType: 'audio/mp4', body: LINE_M4A }) : r.fulfill({ status: lineStatus, body: 'not found' });
    return r.fulfill({ status: 404, body: 'not found' });
  });
  return requests;
}
const vlog = (page: Page) => page.evaluate(() => (window as any).__voiceLog as string[]);

test.describe('studio voice', () => {
  test.use({ seedMode: 'explorer' });

  test('an Explorer line with a recording plays its whole file, with no call to a speech provider', async ({ page }) => {
    await needsStudioVoice(page);
    const provider: string[] = []; page.on('request', r => { if (PROVIDERS.test(r.url())) provider.push(r.url()); });
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page);
    await open(page, '#/skill/k-count');
    await expect.poll(() => requests.some(u => u.endsWith('/p/core.test.m4a'))).toBe(true); // the index and line set are loaded
    /* The first line may beat the 600 ms limit on a cold page and be read by the device; "Hear it" says it again */
    /* Each try clears the logs and taps Hear it; a slow machine may need a second tap once the file is cached */
    await expect.poll(async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; (window as any).__spoken.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await page.waitForTimeout(900);
      return vlog(page);
    }, { timeout: 15_000 }).toContain('studio:line');
    expect(await spoken(page)).toEqual([]); // the built-in voice said nothing
    expect(requests.some(u => u.endsWith(`/l/${DOTS_HASH}.m4a`))).toBe(true);
    expect(provider).toEqual([]);
  });

  test('a three-digit sum is said from clips once the core pack is loaded', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    await fakeStudio(page);
    const core = page.waitForResponse(r => r.url().endsWith('voice.learnvedicmath.com/p/core.test.m4a'), { timeout: 15_000 });
    await open(page, '#/skill/2-add1000');
    await core;
    await page.waitForTimeout(300); // decode
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(async () => (await vlog(page)).at(-1)).toBe('studio:clips');
  });

  test('a clip missing from its pack: no clip plays and the built-in voice says the whole line', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    await fakeStudio(page, { mapDrop: ['f:plus', 'f:minus'] }); // the directory names these clips, but the pack's map lacks them
    await page.addInitScript(() => {
      const w = window as any; w.__starts = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a: any[]) { w.__starts++; return (start as any).apply(this, a); };
    });
    const core = page.waitForResponse(r => r.url().endsWith('voice.learnvedicmath.com/p/core.test.m4a'), { timeout: 15_000 });
    await open(page, '#/skill/2-add1000');
    await core;
    await page.waitForTimeout(300); // decode
    await page.evaluate(() => { const w = window as any; w.__voiceLog.length = 0; w.__spoken.length = 0; w.__starts = 0; });
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(() => vlog(page)).toEqual(['studio:missing', 'builtin']);
    expect(await page.evaluate(() => (window as any).__starts)).toBe(0); // nothing in the studio voice, not even the first number
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  });

  test('a missing recording falls back to the built-in voice for the whole line', async ({ page }) => {
    await fakeSpeech(page, [ENHANCED]);
    await fakeStudio(page, { lineStatus: 404 });
    await open(page, '#/skill/k-count');
    await expect.poll(() => vlog(page)).toContain('builtin');
    expect(await vlog(page)).not.toContain('studio:line');
    await expect.poll(async () => (await spoken(page)).map(s => s.text)).toContain('How many dots are there?');
  });

  test('with no Studio voice in the build, an Explorer line is read by the device voice and the voice host is never asked', async ({ page }) => {
    await fakeSpeech(page, [ENHANCED]);
    await page.addInitScript(() => { (window as any).__voiceLog = []; });
    /* On a --voice off deploy, the index it publishes; elsewhere the one build.py --voice off writes */
    if (await studioVoiceOn(page)) {
      const off = readFileSync(join(__dirname, '..', '..', 'build.py'), 'utf8').match(/^VOICE_OFF_INDEX = """([\s\S]*?)"""/m)![1];
      await page.route('**/js/voice-index.js*', r => r.fulfill({ contentType: 'text/javascript', body: off }));
    }
    const asked: string[] = [];
    page.on('request', r => { if (r.url().startsWith('https://voice.learnvedicmath.com/')) asked.push(r.url()); });
    await open(page, '#/skill/k-count');
    await expect.poll(async () => (await spoken(page)).map(s => s.text)).toContain('How many dots are there?');
    await page.evaluate(() => { (window as any).__voiceLog.length = 0; (window as any).__spoken.length = 0; });
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(() => vlog(page)).toContain('builtin');
    expect((await vlog(page)).filter(e => e.startsWith('studio:'))).toEqual([]);
    await expect.poll(async () => (await spoken(page)).map(s => s.text)).toContain('How many dots are there?');
    expect(asked).toEqual([]);
  });

  test('a whole line slower than 600 ms is said from clips instead', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page, { lineDelay: 2000 });
    await open(page, '#/skill/k-count');
    await expect.poll(() => requests.some(u => u.endsWith('/p/core.test.m4a'))).toBe(true);
    await page.waitForTimeout(2500); // the first line's slow request is over, and the pack is decoded
    await page.evaluate(() => { (window as any).__voiceLog.length = 0; });
    await page.route('https://voice.learnvedicmath.com/l/*.m4a', async r => { await new Promise(res => setTimeout(res, 2000)); await r.fulfill({ contentType: 'audio/mp4', body: LINE_M4A }); });
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(() => vlog(page)).toContain('studio:clips');
    expect(await vlog(page)).not.toContain('studio:line');
  });

  test('a studio index slower than 1 s: the built-in voice says the line, and the next line uses the studio voice', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page, { indexDelay: 4000 });
    await open(page, '#/skill/k-count');
    await expect.poll(() => vlog(page)).toEqual(expect.arrayContaining(['studio:noindex', 'builtin']));
    expect(await vlog(page)).not.toContain('studio:line');
    await expect.poll(async () => (await spoken(page)).map(s => s.text)).toContain('How many dots are there?');
    await expect.poll(() => requests.some(u => u.endsWith('/p/core.test.m4a')), { timeout: 15_000 }).toBe(true); // the index loaded after all
    await expect.poll(async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await page.waitForTimeout(900);
      return vlog(page);
    }, { timeout: 15_000 }).toContain('studio:line');
  });

  test('choosing the device voice in Me reads the next line with it', async ({ page }) => {
    await fakeSpeech(page, [ENHANCED]);
    await fakeStudio(page);
    await open(page, '#/me');
    const box = page.locator('#setStudio');
    await expect(box).toBeVisible();
    await expect(box).toBeChecked();
    await box.uncheck();
    await open(page, '#/skill/k-count');
    await page.evaluate(() => { (window as any).__voiceLog.length = 0; });
    await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
    await expect.poll(() => vlog(page)).toContain('builtin');
    expect((await vlog(page)).filter(e => e.startsWith('studio:'))).toEqual([]);
  });

  test('the natural voice still loading after 2.5 s: the line goes to the studio voice, not the device voice', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page);
    await page.addInitScript(() => {
      try { localStorage.setItem('vm.naturalVoice', '1'); } catch (e) {}
      /* A natural voice that never gets ready: its worker answers nothing */
      (window as any).Worker = class { onmessage = null; onerror = null; postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} };
    });
    await open(page, '#/skill/k-count');
    await expect.poll(() => requests.some(u => u.endsWith('/p/core.test.m4a'))).toBe(true);
    await expect.poll(async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; (window as any).__spoken.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await page.waitForTimeout(3600); // the 2.5 s wait for the natural voice, then the whole line
      return vlog(page);
    }, { timeout: 30_000 }).toContain('studio:line');
    expect(await spoken(page)).toEqual([]); // the device voice said nothing
  });

  test('the natural voice failing to say a line: the studio voice says it, not the device voice', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page);
    await page.addInitScript(() => {
      try { localStorage.setItem('vm.naturalVoice', '1'); } catch (e) {}
      /* A natural voice that loads, then cannot make any line */
      (window as any).Worker = class {
        onmessage: any = null; onerror = null;
        postMessage(m: any) { setTimeout(() => this.onmessage && this.onmessage({ data: m.type === 'load' ? { type: 'ready' } : { type: 'genError', id: m.id, message: 'no' } }), 0); }
        terminate() {} addEventListener() {} removeEventListener() {}
      };
    });
    await open(page, '#/skill/k-count');
    await expect.poll(() => requests.some(u => u.endsWith('/p/core.test.m4a'))).toBe(true);
    await expect.poll(async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; (window as any).__spoken.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await page.waitForTimeout(900);
      return vlog(page);
    }, { timeout: 15_000 }).toContain('studio:line');
    expect(await spoken(page)).toEqual([]); // the device voice said nothing
  });

  test('leaving the page stops a studio line', async ({ page }) => {
    await needsStudioVoice(page);
    await fakeSpeech(page, [ENHANCED]);
    await fakeStudio(page);
    await open(page, '#/skill/k-count');
    /* As in the first test, the automatic first line may miss the 600 ms limit on a cold page; Hear it says it again */
    await expect.poll(async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await page.waitForTimeout(900);
      return vlog(page);
    }, { timeout: 15_000 }).toContain('studio:line');
    await page.locator(`.mq-nav a${hrefTo('#/learn')}`).first().click();
    await expect.poll(async () => (await vlog(page)).slice((await vlog(page)).indexOf('studio:line'))).toContain('stop');
    const after = await vlog(page);
    expect(after.slice(after.lastIndexOf('stop') + 1).filter(e => e.startsWith('studio:'))).toEqual([]);
  });
});

test.describe('studio voice with read aloud off', () => {
  test.use({ seedMode: 'challenger' });
  test('no audio is fetched', async ({ page }) => {
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page);
    await open(page, '#/skill/3-mult');
    await page.waitForTimeout(2500); // past the idle warm-up
    expect(requests).toEqual([]);
  });

  test('the first tap makes the audio context inside the tap (iOS plays only what a tap started), still fetching nothing', async ({ page }) => {
    await fakeSpeech(page, [ENHANCED]);
    const requests = await fakeStudio(page);
    await page.addInitScript(() => {
      const w = window as any, AC = w.AudioContext; w.__made = [];
      w.AudioContext = class extends AC { constructor(...a: any[]) { super(...a); w.__made.push(w.__inTap ? 'tap' : 'later'); } };
      addEventListener('pointerdown', () => { w.__inTap = true; }, { capture: true }); // first listener of the tap
      addEventListener('pointerdown', () => { w.__inTap = false; }); // last one
    });
    await open(page, '#/skill/3-mult');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as any).__made)).toEqual([]);
    await page.locator('#view h1').first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__made)).toEqual(['tap']);
    expect(requests).toEqual([]);
  });
});
