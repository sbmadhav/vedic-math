import { test, expect, open, APP } from '../fixtures';

/* play-experiences spec, Requirements "The Math Lens reader comes from this site", "Camera and microphone only while
   in use", "A removed Player's play progress goes with them" and "Experiences work offline": one test per scenario.
   The camera and microphone are fakes. The reader itself is loaded and run in e2e/tests/play-lens.spec.ts ("Read the
   digits loads the reader from this site only"); here its files are checked to be served from this site and the
   page's policy to allow them. "Tala Lab offline" needs the service worker: e2e/tests/offline.spec.ts opens
   #/games/tala offline; here the page's files are checked to be pinned so the worker can keep them. */
type Page = import('@playwright/test').Page;

async function fakeCamera(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__tracks = []; w.__gum = 0;
    const fake = async () => {
      w.__gum++;
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      const g = c.getContext('2d')!; g.fillStyle = 'rgb(250, 250, 250)'; g.fillRect(0, 0, 320, 180);
      const s = (c as any).captureStream(5) as MediaStream;
      s.getTracks().forEach(t => w.__tracks.push(t));
      return s;
    };
    Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: fake, configurable: true, writable: true });
  });
}
const hide = (page: Page, hidden: boolean) => page.evaluate(h => {
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test('Reading a captured picture on the published site: the reader files are served from /vendor/tesseract/ and the page allows them', async ({ page }) => {
  await open(page, '#/games/lens');
  for (const f of ['tesseract.esm.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'eng.traineddata.gz']) {
    const r = await page.request.head(`/vendor/tesseract/${f}`);
    expect(r.ok(), f).toBeTruthy();
  }
  // The module names only this site's folder for the reader
  const src = await (await page.request.get(`/js/play/exp/lens-cam.js`)).text();
  expect(src).toContain("'/vendor/tesseract/'");
  expect(src).not.toMatch(/jsdelivr|unpkg|cdnjs/);
  // The page's policy allows the reader's compiled code and names no outside script host
  const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || '');
  if (csp) { expect(csp).toContain("'wasm-unsafe-eval'"); expect(csp).not.toMatch(/jsdelivr|unpkg|cdnjs/); }
});

test('Camera left on in a hidden tab: every camera track stops, and one tap turns it on again', async ({ page }) => {
  await fakeCamera(page);
  await page.route(/\/vendor\/tesseract\//, r => r.abort());
  await open(page, '#/games/lens');
  await page.locator('[data-way="camera"]').click();
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  await hide(page, true);
  await expect.poll(() => page.evaluate(() => ((window as any).__tracks as MediaStreamTrack[]).map(t => t.readyState))).toEqual(['ended']);
  await hide(page, false);
  await page.locator('.ln-on').click();
  await expect(page.locator('.ln-snap')).toBeEnabled();
  expect(await page.evaluate(() => ((window as any).__tracks as MediaStreamTrack[]).map(t => t.readyState))).toEqual(['ended', 'live']);
});

test('Microphone and a route change: every microphone track stops when the Player opens another page or hides the tab', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__mic = { calls: 0, streams: [] as MediaStream[] };
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {} });
    const fn = async () => { w.__mic.calls++; const Ctx = w.AudioContext || w.webkitAudioContext, ac = new Ctx(), stream = ac.createMediaStreamDestination().stream; w.__mic.streams.push(stream); return stream; };
    [w.MediaDevices?.prototype, navigator.mediaDevices].forEach(o => o && Object.defineProperty(o, 'getUserMedia', { configurable: true, writable: true, value: fn }));
  });
  const tracks = () => page.evaluate(() => ((window as any).__mic.streams as MediaStream[]).flatMap(s => s.getTracks().map(t => t.readyState)));
  await open(page, '#/games/tala');
  const mic = page.locator('.tl-mic');
  await mic.click();
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  const first = await tracks();
  expect(first.length, 'the fake microphone gave at least one track').toBeGreaterThan(0);
  expect(first.every(r => r === 'live')).toBe(true);
  await hide(page, true);
  await expect(mic).toHaveAttribute('aria-pressed', 'false');
  expect((await tracks()).every(r => r === 'ended')).toBe(true);
  await hide(page, false);
  await mic.click();
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { location.hash = '#/games'; });
  await expect(page.locator('#view h1').first()).not.toHaveText('Tala Lab');
  await expect.poll(async () => (await tracks()).every(r => r === 'ended')).toBe(true);
});

test("Removing a child's Player: their Daily Number, Pattern Wall and other experience progress leaves the device", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('vm.players'); if (!raw) return;
      const v = JSON.parse(raw);
      if (!v.list.some((p: any) => p.id === 'p2')) v.list.push({ id: 'p2', name: 'Calm Otter 7', avatar: 'coral', mode: 'challenger', created: Date.now() });
      localStorage.setItem('vm.players', JSON.stringify(v));
      localStorage.setItem('vm.play.p2.daily', JSON.stringify({ days: { '2026-10-01': { moves: [1, 2] } } }));
      localStorage.setItem('vm.play.p2.wall', JSON.stringify({ cards: [{ name: 'Evens' }] }));
      localStorage.setItem('vm.play.p1.daily', JSON.stringify({ keep: true }));
    } catch (e) { /* storage blocked */ }
  });
  await open(page, '#/me');
  page.once('dialog', d => d.accept());
  await page.locator('[data-del="p2"]').click();
  await expect(page.locator('[data-del="p2"]')).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('vm.play.')).sort());
  expect(keys).toEqual(['vm.play.p1.daily']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list.map((p: any) => p.id))).toEqual(['p1']);
});

test('Tala Lab offline: its module and styles are pinned for the worker, and the page opens from the app shell (offline run in offline.spec.ts)', async ({ page }) => {
  await open(page, '#/games/tala');
  await expect(page.locator('#view h1').first()).toHaveText('Tala Lab');
  // Every file the page loaded for Tala Lab is same-origin (so the worker can keep it); on the
  // published site each one carries its ?v= stamp, so the precache lists it
  const files = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(u => /\/js\/play\/|\/css\/play\//.test(u)));
  expect(files.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  for (const u of files) expect(u.startsWith(`${origin}/`), u).toBe(true);
  const stamped = files.filter(u => /\?v=[0-9a-f]{8,}/.test(u));
  const published = await page.evaluate(() => !!document.querySelector('script[type="importmap"]'));
  if (published) expect(stamped.length, 'published files are stamped').toBe(files.length);
});
