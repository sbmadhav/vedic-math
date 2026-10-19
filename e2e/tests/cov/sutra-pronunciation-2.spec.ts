import { test, expect, open } from '../fixtures';
import { fakeAudio, audioLog, said } from '../audio-fake';
import type { Page, Request } from '@playwright/test';

/* sutra-pronunciation spec, Requirement "Speech only follows a tap": one test per scenario. */
const SOUNDS = /\/vedic-math\/sounds\//;
function soundRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (r: Request) => { if (SOUNDS.test(r.url())) urls.push(new URL(r.url()).pathname); });
  return urls;
}
const started = async (page: Page) => (await audioLog(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
});

test('Read aloud off: Say it still plays the clip', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vm.voice', '0'));
  await fakeAudio(page);
  await open(page, '#/sutras/s3');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  await expect.poll(() => started(page)).toBe(1);
});

test('No speech on load: opening #/sutras/s3 plays nothing and downloads no clip', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras/s3');
  await expect(page.locator('dialog .say-btn')).toBeVisible();
  await page.waitForTimeout(800);
  expect(urls).toEqual([]);
  expect((await audioLog(page)).decoded).toBe(0);
  expect(await said(page)).toEqual([]);
});

test('Tap while read aloud speaks: Say it on the Trick page stops the reading and plays the clip', async ({ page }) => {
  /* The device's voice reads (studio voice off): with the studio voice on, a recorded line plays as Web Audio sources of
     its own, so the reading could not be held open and told apart from the clip */
  await page.addInitScript(() => { localStorage.setItem('vm.voice', '1'); localStorage.setItem('vm.studioVoice', '0'); });
  await fakeAudio(page, { clipSecs: 30 });
  /* Hold each utterance open until cancel(), so the reading is still going when Say it is tapped. window.__reading is
     the text being spoken (null when nothing is), window.__cancels counts cancel() calls. */
  await page.addInitScript(() => {
    const w = window as any, s = w.speechSynthesis;
    w.__cancels = 0; w.__reading = null;
    let cur: any = null;
    s.speak = (u: any) => { w.__said.push(u.text); cur = u; w.__reading = u.text; s.speaking = true; };
    s.cancel = () => {
      w.__cancels++;
      const u = cur; cur = null; w.__reading = null; s.speaking = false;
      if (u && u.onerror) setTimeout(() => u.onerror({ error: 'interrupted' }), 0);
    };
  });
  await open(page, '#/skill/v-div9');
  const hear = page.locator('#prHear');
  await expect(hear).toBeVisible();
  // Hear it reads the question: a reading the Player started, and it is still going
  await page.evaluate(() => { (window as any).__said.length = 0; });
  await hear.click();
  await expect.poll(() => page.evaluate(() => (window as any).__reading as string | null)).not.toBeNull();
  expect((await said(page)).length).toBeGreaterThan(0);
  const before = await page.evaluate(() => (window as any).__cancels as number);
  const startedBefore = await started(page);
  // The Say it tap stops the reading and plays the clip
  await page.locator('.mq-sutra .say-btn').click();
  await expect.poll(() => page.evaluate(() => (window as any).__cancels as number)).toBeGreaterThan(before);
  await expect.poll(() => page.evaluate(() => (window as any).__reading as string | null)).toBeNull();
  await expect.poll(() => started(page)).toBe(startedBefore + 1);
  // Nothing more is read while the clip plays
  const saidAtTap = (await said(page)).length;
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).__reading as string | null)).toBeNull();
  expect((await said(page)).length).toBe(saidAtTap);
});

test('Tap while read aloud speaks, in the voice that reads: Say it stops a studio or device reading and plays the clip', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vm.voice', '1'); (window as any).__voiceLog = []; });
  await fakeAudio(page, { clipSecs: 30 });
  // Count cancel() calls on the fake engine, so a stopped device-voice reading is observable
  await page.addInitScript(() => { const s = (window as any).speechSynthesis; (window as any).__cancels = 0; s.cancel = () => { (window as any).__cancels++; }; });
  await open(page, '#/skill/v-div9');
  // Hear it reads the question: a reading the Player started, then the Say it tap must stop it. The line goes to the
  // studio voice (recorded files on the fake Web Audio) when its sounds are loaded, else to the device's voice.
  const hear = page.locator('#prHear');
  await expect(hear).toBeVisible();
  await hear.click();
  await expect.poll(() => page.evaluate(() => ((window as any).__voiceLog as string[]).some(e => ['builtin', 'studio:line', 'studio:clips'].includes(e)))).toBe(true);
  const sources = async () => (await audioLog(page)).nodes.filter(n => n.kind === 'source');
  const before = { cancels: await page.evaluate(() => (window as any).__cancels as number), sources: (await sources()).length };
  await page.locator('.mq-sutra .say-btn').click();
  await expect.poll(() => page.evaluate(() => (window as any).__cancels as number)).toBeGreaterThan(before.cancels);
  // Every studio sound of the reading is stopped, and exactly one new sound starts: the clip
  await expect.poll(async () => {
    const all = await sources();
    return { reading: all.slice(0, before.sources).filter(n => n.stopped === null).length, clip: all.slice(before.sources).filter(n => n.started !== null).length };
  }).toEqual({ reading: 0, clip: 1 });
});

test('Leaving stops the clip: a route change while a clip plays stops it', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras/s1');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => started(page)).toBe(1);
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect.poll(async () => (await audioLog(page)).nodes.find(n => n.kind === 'source')!.stopped).not.toBeNull();
});
