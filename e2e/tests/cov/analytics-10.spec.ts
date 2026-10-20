import { test, expect, open } from '../fixtures';
import { fakeAudio, audioLog, said } from '../audio-fake';
import type { Page } from '@playwright/test';

/* analytics spec, Requirement "Say it is counted": one test per scenario. The stub records path and title; Web
   Audio and speech are fakes. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
const says = (page: Page): Promise<[string, string][]> => page.evaluate(() => ((globalThis as any).__events || []).filter((e: [string, string]) => e[0].startsWith('math/say')));
const started = async (page: Page) => (await audioLog(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length;

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
});

test('Two taps: Sutra 1 then Sutra 3, each clip started, send two identical math/say/sutra events with no Sutra id', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras');
  await page.locator('.sutra-card[data-id="s1"] .say-btn').click();
  await expect.poll(() => started(page)).toBe(1);
  await page.locator('.sutra-card[data-id="s3"] .say-btn').click();
  await expect.poll(() => started(page)).toBe(2);
  await expect.poll(() => says(page).then(s => s.length)).toBe(2);
  const ev = await says(page);
  expect(ev).toEqual([['math/say/sutra', 'Say a Sutra name'], ['math/say/sutra', 'Say a Sutra name']]);
  for (const [p, t] of ev) expect(`${p} ${t}`).not.toMatch(/\bs[13]\b|Ekādhikena|Ūrdhva/);
});

test('Stopping is not counted: a tap on the playing button sends nothing', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras');
  const btn = page.locator('.sutra-card[data-id="s3"] .say-btn');
  await btn.click();
  await expect.poll(() => started(page)).toBe(1);
  await expect.poll(() => says(page).then(s => s.length)).toBe(1);
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  expect(await says(page)).toHaveLength(1);
});

test('A clip that never plays is not counted: the device voice reads the respelling and no event is sent', async ({ page }) => {
  await fakeAudio(page);
  await page.route(/\/sounds\/sutras\//, route => route.abort('failed'));
  await open(page, '#/sutras/s1');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => said(page)).toEqual(['ay kah dhi kay nuh poor vay nuh']);
  await page.waitForTimeout(300);
  expect(await says(page)).toEqual([]);
});
