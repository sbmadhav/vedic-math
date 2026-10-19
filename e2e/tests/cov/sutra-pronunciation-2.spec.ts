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
  await page.addInitScript(() => localStorage.setItem('vm.voice', '1'));
  await fakeAudio(page, { clipSecs: 30 });
  // Count cancel() calls on the fake engine, so a stopped reading is observable
  await page.addInitScript(() => { const s = (window as any).speechSynthesis; (window as any).__cancels = 0; s.cancel = () => { (window as any).__cancels++; }; });
  await open(page, '#/skill/v-div9');
  // Hear it reads the question: a reading the Player started, then the Say it tap must stop it
  const hear = page.locator('#prHear');
  await expect(hear).toBeVisible();
  await hear.click();
  await expect.poll(() => said(page).then(s => s.length)).toBeGreaterThan(0);
  const before = await page.evaluate(() => (window as any).__cancels as number);
  await page.locator('.mq-sutra .say-btn').click();
  await expect.poll(() => page.evaluate(() => (window as any).__cancels as number)).toBeGreaterThan(before);
  await expect.poll(() => started(page)).toBe(1);
});

test('Leaving stops the clip: a route change while a clip plays stops it', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras/s1');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => started(page)).toBe(1);
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect.poll(async () => (await audioLog(page)).nodes.find(n => n.kind === 'source')!.stopped).not.toBeNull();
});
