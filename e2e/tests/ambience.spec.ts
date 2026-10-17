import { test, expect, APP, open } from './fixtures';
import { fakeAudio, audioLog, strikes, ambienceBus, rampedToZero, hums } from './audio-fake';
import type { Page } from '@playwright/test';

/* Sutra ambience (openspec sutra-ambience): a very mild singing bowl on the Sutra pages by default, an opt-in chanted
   Om, an off switch, silent with Sound effects off, Calm, Pause motion or the Calm music already playing, and it
   stops when the Player leaves the Sutra pages or hides the tab. Web Audio is a fake that records every node
   (audio-fake.ts), so nothing is heard. The config emulates reduced motion for every test, which must not silence it. */

/** Sound effects on (the fixtures turn it off), plus any other device settings, before the page loads */
async function prefs(page: Page, more: Record<string, string> = {}) {
  await page.addInitScript(m => { try { localStorage.setItem('vm.sound', '1'); for (const [k, v] of Object.entries(m)) localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }, more);
}
const log = (page: Page) => audioLog(page);
/** A tap on the page that is not a control: the first gesture */
const tapPage = (page: Page) => page.locator('#view h1').click();
const goSutra = (page: Page, id: string) => page.evaluate(h => { location.hash = h; }, `#/sutras/${id}`);
const setHidden = (page: Page, hidden: boolean) => page.evaluate(h => {
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test('defaults: nothing before a gesture, one strike after it, deep dives strike at most once every 4 seconds', async ({ page }) => {
  await page.clock.install();
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await page.waitForTimeout(300);
  expect(strikes(await log(page)), 'no sound before a tap').toBe(0);
  expect(ambienceBus(await log(page))).toHaveLength(0);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced motion does not silence it').toBe(true);
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  await goSutra(page, 's1'); await goSutra(page, 's2'); // within 4 seconds of the first strike
  await expect(page.locator('#sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  expect(strikes(await log(page))).toBe(1);
  await page.clock.fastForward(4500);
  await goSutra(page, 's3');
  await expect.poll(async () => strikes(await log(page))).toBe(2);
  await goSutra(page, 's4');
  await expect(page.locator('#sdTitle')).toHaveText('Parāvartya Yojayet');
  expect(strikes(await log(page)), 'paging quickly strikes once').toBe(2);
  expect(hums(await log(page)), 'the hum is off by default').toHaveLength(0);
});

test('Low hum on: it plays; leaving for the Dojo fades the ambience out, stops the hum, and nothing starts later', async ({ page }) => {
  await page.clock.install();
  await fakeAudio(page); await prefs(page, { 'vm.sutraHum': '1' });
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => hums(await log(page)).length).toBe(1);
  await page.locator('.mq-nav a[href="#/dojo"]').first().click();
  await expect(page.locator('#view .dojo-nodes').first()).toBeVisible();
  await expect.poll(async () => rampedToZero(ambienceBus(await log(page))[0])).toBe(true);
  const after = await log(page);
  const hum = hums(after)[0];
  expect(hum.stopAt).not.toBeUndefined();
  const n = after.nodes.length;
  await page.clock.fastForward(60_000);
  const later = await log(page);
  expect(later.nodes.filter(x => x.kind === 'osc').length, 'no ambience timer fires later').toBe(after.nodes.filter(x => x.kind === 'osc').length);
  expect(later.nodes.length).toBeGreaterThanOrEqual(n);
});

test('tab hidden with no music playing: the ambience fades out; back on a Sutra page the hum returns with no strike', async ({ page }) => {
  await fakeAudio(page); await prefs(page, { 'vm.sutraHum': '1' });
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => hums(await log(page)).length).toBe(1);
  await setHidden(page, true);
  const hidden = await log(page);
  expect(rampedToZero(ambienceBus(hidden)[0])).toBe(true);
  expect(hums(hidden)[0].stopAt).not.toBeUndefined();
  await setHidden(page, false);
  const back = await log(page);
  expect(hums(back)).toHaveLength(2);
  expect(strikes(back), 'no strike on return').toBe(1);
});

test('Calm music already playing: the ambience never starts and the music keeps playing', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/dojo');
  await page.locator('#vmMBtn').click();
  await page.locator('.vm-track[data-t="tanpura"]').click();
  await page.locator('#vmMBtn').click();
  await page.locator('.mq-nav a[href="#/sutras"]').first().click();
  await expect(page.locator('.sutra-grid').first()).toBeVisible();
  await tapPage(page);
  await goSutra(page, 's1');
  await page.waitForTimeout(300);
  const l = await log(page);
  expect(ambienceBus(l), 'no ambience nodes').toHaveLength(0);
  const master = l.nodes.find(n => n.kind === 'gain' && n.to.includes('destination'))!; // the music's master gain
  expect(master.gain.ramps.filter(r => r[0] === 'setTargetAtTime' && r[1] === 0), 'the music is not faded').toHaveLength(0);
});

test('the ambience playing, then Calm music starts: the ambience fades out', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  await page.locator('#vmMBtn').click();
  await page.locator('.vm-track[data-t="bowls"]').click();
  await expect.poll(async () => rampedToZero(ambienceBus(await log(page))[0])).toBe(true);
});

test('Sound effects off on the Me page: no ambience', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/me');
  await page.locator('#setSound').uncheck();
  await page.locator('.mq-nav a[href="#/sutras"]').first().click();
  await tapPage(page);
  await goSutra(page, 's5');
  await page.waitForTimeout(300);
  expect(ambienceBus(await log(page))).toHaveLength(0);
});

test('the Ambience button turns it off at once, and it stays off after a reload', async ({ page }) => {
  await fakeAudio(page); await prefs(page, { 'vm.sutraHum': '1' });
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => hums(await log(page)).length).toBe(1);
  const btn = page.locator('#view').getByRole('button', { name: 'Ambience' });
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect(rampedToZero(ambienceBus(await log(page))[0])).toBe(true);
  await page.reload();
  await expect(page.locator('.sutra-grid').first()).toBeVisible();
  await expect(page.locator('#view').getByRole('button', { name: 'Ambience' })).toHaveAttribute('aria-pressed', 'false');
  await tapPage(page); await goSutra(page, 's2');
  await expect(page.locator('dialog').getByRole('button', { name: 'Ambience' })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  expect(ambienceBus(await log(page))).toHaveLength(0);
});

for (const [name, setup] of [
  ['Calm', { 'vm.calm': '1' }],
  ['Pause motion', {}],
] as const) {
  test(`${name} silences it`, async ({ page }) => {
    await fakeAudio(page); await prefs(page, setup);
    if (name === 'Pause motion') await page.addInitScript(() => { document.documentElement.classList.add('motion-paused'); });
    await open(page, '#/sutras');
    if (name === 'Pause motion') await page.evaluate(() => document.documentElement.classList.add('motion-paused'));
    await tapPage(page); await goSutra(page, 's1');
    await page.waitForTimeout(300);
    expect(ambienceBus(await log(page))).toHaveLength(0);
  });
}

test('Chanted Om: off by default (never requested); on, it plays instead of the bowl; the Me page shows the note', async ({ page }) => {
  const om: string[] = [];
  page.on('request', r => { if (/\/sounds\/om\.m4a/.test(r.url())) om.push(r.url()); });
  await fakeAudio(page); await prefs(page);
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => strikes(await log(page))).toBe(1);
  expect(om).toEqual([]);
  await open(page, '#/me');
  await expect(page.locator('#omNote')).toHaveText('Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book.');
  await expect(page.locator('#setOm')).toHaveAttribute('aria-describedby', 'omNote');
  await page.locator('#setOm').check();
  await page.goto(`${APP}#/sutras`);
  await page.reload(); // a fresh page, so the fake's log starts empty
  await expect(page.locator('.sutra-grid').first()).toBeVisible();
  await tapPage(page);
  await expect.poll(() => om.length).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await log(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length).toBe(1);
  expect(strikes(await log(page)), 'no bowl with the Om on').toBe(0);
});
