import { test, expect, open } from '../fixtures';
import { fakeAudio, audioLog, strikes, ambienceBus, hums } from '../audio-fake';
import type { Page } from '@playwright/test';

/* sutra-ambience spec, Requirements "Bowl strike on the Sutra pages", "Optional hum" and "Opt-in Om": one test per
   scenario. Web Audio is a fake that records every node (audio-fake.ts); the fixtures turn Sound effects off, so each
   test turns it back on. */
async function prefs(page: Page, more: Record<string, string> = {}) {
  await page.addInitScript(m => { try { localStorage.setItem('vm.sound', '1'); for (const [k, v] of Object.entries(m)) localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }, more);
}
const log = (page: Page) => audioLog(page);
const tapPage = (page: Page) => page.locator('#view h1').click();
const goSutra = (page: Page, id: string) => page.evaluate(h => { location.hash = h; }, `#/sutras/${id}`);

test('Opening a deep dive: with Sutra ambience on, Learn more plays one bowl strike with a slow fade', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  const before = strikes(await log(page));
  await page.waitForTimeout(4500);
  const card = page.locator('.sutra-card[data-id="s2"]');
  await card.locator('.sutra-face').click(); // flip the card
  await card.locator('a.sutra-more').click(); // its Learn more
  await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect.poll(async () => strikes(await log(page))).toBe(before + 1);
  const l = await log(page);
  const strike = l.nodes.filter(n => n.kind === 'osc' && Math.abs(n.frequency.value - 196.215) < 0.01).at(-1)!;
  expect(strike.started).not.toBeNull();
  // A slow fade: the strike's envelope is a gain ramp that ends well after it starts
  const fades = l.nodes.filter(n => n.kind === 'gain' && n.gain.ramps.some(r => /Ramp|setTarget/.test(r[0])));
  expect(fades.length).toBeGreaterThan(0);
});

test('Paging quickly: two deep dives within 4 seconds strike only on the first opening', async ({ page }) => {
  await page.clock.install();
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  await page.clock.fastForward(4500);
  await goSutra(page, 's3');
  await expect.poll(async () => strikes(await log(page))).toBe(2);
  await goSutra(page, 's4');
  await expect(page.locator('#sdTitle')).toHaveText('Parāvartya Yojayet');
  await page.waitForTimeout(300);
  expect(strikes(await log(page))).toBe(2);
});

test('Fresh load on the page: #/sutras loaded directly plays nothing and starts no AudioContext until a gesture', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await page.waitForTimeout(600);
  const l = await log(page);
  expect(strikes(l)).toBe(0);
  expect(ambienceBus(l)).toHaveLength(0);
  expect(l.nodes.filter(n => n.started !== null)).toHaveLength(0);
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
});

test('Hum on: Low hum turned on on the Me page, then #/sutras: after the first gesture a hum fades in and keeps playing', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/me');
  await page.locator('#setHum').check();
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => hums(await log(page)).length).toBe(1);
  const hum = hums(await log(page))[0];
  expect(hum.started).not.toBeNull();
  expect(hum.stopped).toBeNull();
  expect(ambienceBus(await log(page))[0].gain.ramps.some(r => /Ramp|setTarget/.test(r[0]))).toBe(true);
  await page.waitForTimeout(1500);
  expect(hums(await log(page))[0].stopped, 'still playing while reading').toBeNull();
});

test('Om off by default: a Player who never changed the setting gets no Om request on #/sutras', async ({ page }) => {
  const om: string[] = [];
  page.on('request', r => { if (/\/sounds\/om\.m4a/.test(r.url())) om.push(r.url()); });
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  await goSutra(page, 's1');
  await page.waitForTimeout(500);
  expect(om).toEqual([]);
});

test('Om on: with Chanted Om on, a deep dive plays the Om once instead of the bowl strike', async ({ page }) => {
  const om: string[] = [];
  page.on('request', r => { if (/\/sounds\/om\.m4a/.test(r.url())) om.push(r.url()); });
  await fakeAudio(page); await prefs(page, { 'vm.sutraOm': '1' });
  await open(page, '#/sutras');
  await tapPage(page);
  await goSutra(page, 's1');
  await expect(page.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await expect.poll(() => om.length).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await log(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length).toBe(1);
  expect(strikes(await log(page))).toBe(0);
});
