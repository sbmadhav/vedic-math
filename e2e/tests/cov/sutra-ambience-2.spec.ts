import { test, expect, open } from '../fixtures';
import { fakeAudio, audioLog, strikes, ambienceBus, rampedToZero, hums } from '../audio-fake';
import type { Page } from '@playwright/test';

/* sutra-ambience spec, Requirements "Ambience can always be turned off", "Ambience stays silent when sound is not
   wanted" and "Ambience stops on leaving": one test per scenario. */
async function prefs(page: Page, more: Record<string, string> = {}) {
  await page.addInitScript(m => { try { localStorage.setItem('vm.sound', '1'); for (const [k, v] of Object.entries(m)) localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }, more);
}
const log = (page: Page) => audioLog(page);
const tapPage = (page: Page) => page.locator('#view h1').click();
const goSutra = (page: Page, id: string) => page.evaluate(h => { location.hash = h; }, `#/sutras/${id}`);
const setHidden = (page: Page, hidden: boolean) => page.evaluate(h => {
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test('Turning it off on the page: the hum fades out, the button shows off, and it stays off on the next visit', async ({ page }) => {
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
  await page.waitForTimeout(300);
  expect(ambienceBus(await log(page))).toHaveLength(0);
});

test('Calm music already playing: no bowl strike or hum starts and the music keeps playing', async ({ page }) => {
  await fakeAudio(page); await prefs(page, { 'vm.sutraHum': '1' });
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
  expect(ambienceBus(l), 'no ambience nodes: no strike, no hum').toHaveLength(0);
  expect(strikes(l)).toBe(0);
  const master = l.nodes.find(n => n.kind === 'gain' && n.to.includes('destination'))!;
  expect(master.gain.ramps.filter(r => r[0] === 'setTargetAtTime' && r[1] === 0)).toHaveLength(0);
});

test('Sound effects off: a deep dive plays no ambience', async ({ page }) => {
  await fakeAudio(page); await prefs(page);
  await open(page, '#/me');
  await page.locator('#setSound').uncheck();
  await page.locator('.mq-nav a[href="#/sutras"]').first().click();
  await tapPage(page);
  await goSutra(page, 's5');
  await expect(page.locator('#sdTitle')).toBeVisible();
  await page.waitForTimeout(300);
  expect(ambienceBus(await log(page))).toHaveLength(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Reduced motion: the bowl strike still plays after a gesture', async ({ page }) => {
    await fakeAudio(page); await prefs(page);
    await open(page, '#/sutras');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await tapPage(page);
    await expect.poll(async () => strikes(await log(page))).toBe(1);
  });
});

test('Route change: leaving for #/dojo fades the hum out within 2 seconds and no ambience timer remains', async ({ page }) => {
  await page.clock.install();
  await fakeAudio(page); await prefs(page, { 'vm.sutraHum': '1' });
  await open(page, '#/sutras');
  await tapPage(page);
  await expect.poll(async () => hums(await log(page)).length).toBe(1);
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect(page.locator('#view .dojo-nodes').first()).toBeVisible();
  await expect.poll(async () => rampedToZero(ambienceBus(await log(page))[0])).toBe(true);
  const after = await log(page);
  const hum = hums(after)[0];
  expect(hum.stopAt).not.toBeUndefined();
  expect(hum.stopAt! - hum.started!).toBeLessThanOrEqual(2.5);
  await page.clock.fastForward(60_000);
  const later = await log(page);
  expect(later.nodes.filter(x => x.kind === 'osc').length, 'no ambience timer fires later').toBe(after.nodes.filter(x => x.kind === 'osc').length);
});

test('Tab hidden: the hum fades out, and shown again on a Sutra page it fades back in without a strike', async ({ page }) => {
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
  expect(strikes(back)).toBe(1);
});
