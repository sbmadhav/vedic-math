import { test, expect, APP, open } from './fixtures';
import { fakeAudio, audioLog, said } from './audio-fake';
import type { Page, Request } from '@playwright/test';

/* Say it (openspec sutra-pronunciation): a speaker button beside each Sutra name plays its Name clip, and the
   Respelling (and in the deep dive the Devanagari) is shown under the name. Web Audio and speechSynthesis are fakes
   (audio-fake.ts), so nothing is heard; the clip files are the real ones from sounds/sutras/. The analytics script is
   a stub that records siteTrack calls, so nothing is counted. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
const events = (page: Page): Promise<[string, string][]> => page.evaluate(() => (globalThis as any).__events || []);
const SOUNDS = /\/sounds\//;

/** Every request for a sound file, from the start of the test */
function soundRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (r: Request) => { if (SOUNDS.test(r.url())) urls.push(new URL(r.url()).pathname); });
  return urls;
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } }); // no ambience here: ambience.spec.ts
});

test('the deep dive shows the name, its Respelling and Devanagari; Say it plays only that clip, pressed until it ends', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras/s1');
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(dlg.locator('.sd-say .say-resp')).toHaveText('Say it like: ay-kah-dhi-KAY-nuh poor-VAY-nuh');
  await expect(dlg.locator('.say-deva')).toHaveText('एकाधिकेन पूर्वेण');
  await expect(dlg.locator('.say-deva')).toHaveAttribute('lang', 'sa');
  const btn = dlg.getByRole('button', { name: 'Hear how to say Ekādhikena Pūrveṇa' });
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect(urls, 'nothing is downloaded before a tap').toEqual([]);
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  expect(urls[0]).toBe('/sounds/sutras/s1.m4a');
  await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 }); // the 1.2 s fake clip ended
  const src = (await audioLog(page)).nodes.filter(n => n.kind === 'source');
  expect(src).toHaveLength(1);
  expect(src[0].started).not.toBeNull();
});

test('a tap on a card\'s Say it plays its clip and the card stays unflipped', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card[data-id="s3"]');
  await expect(card.locator('.say-resp')).toHaveText('Say it like: OOR-dhvuh tir-YUHG-bhyahm');
  await card.getByRole('button', { name: 'Hear how to say Ūrdhva-Tiryagbhyām' }).click();
  await expect.poll(() => urls[0]).toBe('/sounds/sutras/s3.m4a');
  await expect(card).not.toHaveClass(/flipped/);
  await expect(card.locator('.sutra-face')).toHaveAttribute('aria-expanded', 'false');
});

test('the Trick page of div9 (Nikhilaṃ, division by 9) plays the Sutra 2 clip', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/skill/v-div9');
  await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ (division by 9)');
  await page.locator('.mq-sutra').getByRole('button', { name: 'Hear how to say Nikhilaṃ Navataścaramaṃ Daśataḥ' }).click();
  await expect.poll(() => urls[0]).toBe('/sounds/sutras/s2.m4a');
});

test('All places: each of the 17 Constellation headings has one Say it button', async ({ page }) => {
  await open(page, '#/places');
  await expect(page.locator('.places-c')).toHaveCount(17);
  await expect(page.locator('.places-h .say-btn')).toHaveCount(17);
  for (const h of await page.locator('.places-h').all()) await expect(h.locator('.say-btn')).toHaveCount(1);
});

test.describe('read aloud off', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('vm.voice', '0')); });
  test('the button still plays, and nothing is fetched on load', async ({ page }) => {
    await fakeAudio(page);
    const urls = soundRequests(page);
    await open(page, '#/sutras/s3');
    await page.waitForTimeout(500);
    expect(urls).toEqual([]);
    await page.locator('dialog .say-btn').click();
    await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  });
});

test('leaving the page while a clip plays stops it', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras/s1');
  await page.locator('dialog .say-btn').click();
  await expect.poll(async () => (await audioLog(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length).toBe(1);
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect.poll(async () => (await audioLog(page)).nodes.find(n => n.kind === 'source')!.stopped).not.toBeNull();
});

test('when the clip cannot load, the device voice reads the Respelling and the status says so', async ({ page }) => {
  await fakeAudio(page);
  await page.route(/\/sounds\/sutras\//, route => route.abort('failed'));
  await open(page, '#/sutras/s1');
  const btn = page.locator('dialog .say-btn');
  await btn.click();
  await expect.poll(() => said(page)).toEqual(['ay kah dhi kay nuh poor vay nuh']);
  await expect(page.locator('.fx-toasts')).toContainText("Played with this device's voice, which may not be exact.");
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect((await events(page)).filter(([p]) => p.startsWith('math/say')), 'a clip that never started is not counted').toEqual([]);
});

test('two taps that start a clip send two identical math/say/sutra events; a stopping tap sends none', async ({ page }) => {
  await fakeAudio(page, { clipSecs: 30 });
  await open(page, '#/sutras');
  const started = async () => (await audioLog(page)).nodes.filter(n => n.kind === 'source' && n.started !== null).length;
  await page.locator('.sutra-card[data-id="s1"] .say-btn').click();
  await expect.poll(started).toBe(1); // the first clip has really started before the second tap
  await page.locator('.sutra-card[data-id="s3"] .say-btn').click();
  await expect.poll(started).toBe(2);
  await page.locator('.sutra-card[data-id="s3"] .say-btn').click(); // stops it
  await expect(page.locator('.sutra-card[data-id="s3"] .say-btn')).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  const say = (await events(page)).filter(([p]) => p.startsWith('math/say'));
  expect(say).toEqual([['math/say/sutra', 'Say a Sutra name'], ['math/say/sutra', 'Say a Sutra name']]);
});

test('names say their language, and every Say it button is at least 44 by 44', async ({ page }) => {
  for (const hash of ['#/sutras', '#/sutras/s3', '#/places', '#/skill/v-sq5']) {
    await open(page, hash);
    const scope = hash === '#/sutras/s3' ? page.locator('dialog.sutra-modal') : page.locator('#view');
    for (const b of await scope.locator('.say-btn').all()) {
      const box = (await b.boundingBox())!;
      if (!box) continue; // a flipped card hides its button
      expect(box.width, hash).toBeGreaterThanOrEqual(44);
      expect(box.height, hash).toBeGreaterThanOrEqual(44);
    }
    expect(await scope.locator('.say-deva:not([lang="sa"])').count()).toBe(0);
  }
  await open(page, '#/sutras/s3');
  await expect(page.locator('#sdTitle')).toHaveAttribute('lang', 'sa-Latn');
  await expect(page.locator('dialog .say-deva')).toHaveAttribute('lang', 'sa');
  await expect(page.locator('.sutra-card .sutra-face b').first()).toHaveAttribute('lang', 'sa-Latn');
  await open(page, '#/places');
  await expect(page.locator('.places-h > span').first()).toHaveAttribute('lang', 'sa-Latn');
  await open(page, '#/katas/sq5');
  await expect(page.locator('#view .md-tag--plum').first()).toHaveAttribute('lang', 'sa-Latn');
});

test('at 320 px wide the deep dive with its Say it button does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, '#/sutras/u7'); // the longest name
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg.locator('.say-btn')).toBeVisible();
  const [sw, cw] = await dlg.evaluate(d => [d.scrollWidth, d.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('the Sutra fixes: the Trick spells Pūrveṇa', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Ekādhikena Pūrveṇa');
  await page.goto(`${APP}#/sutras/u10`);
  await expect(page.locator('dialog .sd-mean')).toHaveText('The product of the sums');
});

/* With the sticky close bar and footer of the deep dive (sutra-examples): the Ambience toggle is pinned beside Close,
   the name's Say it button and Respelling sit clear of both, and everything works together at every width and in
   both schemes */
const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 768, 375, 320]) {
    test(`deep dive at ${width}px (${scheme}): pinned Close and Ambience, Say it clear of them, examples and footer work`, async ({ page }, testInfo) => {
      // Only Playwright's Linux WebKit (CI), only Deep Space: the pinned bar leaves the viewport after scrolling and pointer
      // clicks never settle. macOS WebKit (closest to Safari) and every other project pass. Owner checks a real iPhone in
      // Deep Space; remove this once that check or a Linux WebKit update clears it.
      await fakeAudio(page, { clipSecs: 30 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: width >= 768 ? 800 : 700 });
      await open(page, '#/sutras/s2');
      const d = page.locator('dialog.sutra-modal');
      const close = d.locator('.sd-bar .sd-x'), amb = d.locator('.sd-bar').getByRole('button', { name: 'Ambience' });
      const say = d.getByRole('button', { name: 'Hear how to say Nikhilaṃ Navataścaramaṃ Daśataḥ' });
      for (const el of [close, amb, say, d.locator('.sd-say .say-resp'), d.locator('#sdTitle')]) await expect(el).toBeVisible();
      const [cb, ab, sb, tb] = await Promise.all([close, amb, say, d.locator('#sdTitle')].map(x => x.boundingBox()));
      for (const b of [sb!, tb!]) { expect(overlap(b, cb!)).toBe(false); expect(overlap(b, ab!)).toBe(false); }
      expect(overlap(ab!, cb!)).toBe(false);
      expect(ab!.width).toBeGreaterThanOrEqual(44);
      // No glass blur inside the deep dive (math.css): in Deep Space the blurred buttons starved Linux WebKit of frames,
      // so clicks never settled and the pinned bar never reported in view
      expect(await d.evaluate(el => [...el.querySelectorAll('.md-btn, .md-card')].map(b => { const cs: any = getComputedStyle(b); return cs.backdropFilter || cs.webkitBackdropFilter || 'none'; }).filter(f => f !== 'none'))).toEqual([]);
      // Say it plays, and the worked examples still open below
      await say.click();
      await expect(say).toHaveAttribute('aria-pressed', 'true');
      const second = d.locator('.sd-ex > li').nth(1).locator('details');
      await second.locator('summary').click();
      await expect(second).toHaveAttribute('open', '');
      // Scrolled to the bottom: Close, Ambience and the footer stay in view; nothing scrolls sideways
      await d.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(close).toBeInViewport();
      await expect(amb).toBeInViewport();
      await expect(d.locator('.sd-foot a').first()).toBeInViewport();
      expect(await d.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      // The pinned toggle still works from there
      await amb.click();
      await expect(amb).toHaveAttribute('aria-pressed', 'true'); // the spec's beforeEach turns the ambience off
      // Paging with the footer stops the clip and swaps the name
      await d.locator('.sd-foot a.sd-next').click();
      await expect(d.locator('#sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
      await expect.poll(async () => (await audioLog(page)).nodes.find(n => n.kind === 'source')?.stopped ?? null).not.toBeNull();
    });
  }
}
