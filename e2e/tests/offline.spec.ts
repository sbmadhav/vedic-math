import type { BrowserContext, Page, Route } from '@playwright/test';
import { test, expect, APP, open, cloudLog, chromiumOnly, FIREBASE_SDK, FIREBASE_AUTH, FIRESTORE, showWorld, needsWorldBoards } from './fixtures';
import { fakeAudio, audioLog } from './audio-fake';

/* Offline: /sw.js (scope /play/) saves the app after one visit, so every route, the
   Dojo and the games keep working without a connection, and the leaderboards fall back to this device.
   These are the only specs that let the service worker run (the config blocks it everywhere else).
   The same rules hold: the Firebase SDK is still the fake, and while "offline" every Google request is
   cut off as a real loss of connection would, so nothing can reach Firestore.

   Not in WebKit: Playwright's WebKit does not route the requests of a page that a service worker
   controls (it hands them to the network even when the worker does not answer them), so the fake SDK
   and the local GoatCounter answer are bypassed there. A worker-controlled page in WebKit loads the
   real Firebase SDK, signs in anonymously and counts a visit, which the suite's rules forbid. The
   chromium and mobile projects run these specs; the tripwire below fails any test whose page reached
   a Google backend anyway. */

test.use({ serviceWorkers: 'allow' });
test.skip(({ browserName }) => browserName === 'webkit', 'Playwright WebKit does not route requests from worker-controlled pages (see above)');

/* Tripwire: the fake SDK never calls these hosts, so a resource entry for one means the real SDK ran. */
const LIVE_BACKENDS = /^https:\/\/(identitytoolkit|securetoken|firestore|content-firebaseappcheck)\.googleapis\.com\/|^https:\/\/www\.google\.com\/recaptcha\//;
test.afterEach(async ({ context }) => {
  for (const p of context.pages()) {
    const hits = await p.evaluate(re => performance.getEntriesByType('resource').map(e => e.name).filter(n => new RegExp(re).test(n)), LIVE_BACKENDS.source).catch(() => []);
    expect(hits, `${p.url()} reached a live Google backend`).toEqual([]);
  }
});

const OWN_PREFIX = 'lvm-';

/** Waits until this app's worker has installed (precache done), activated and controls the page. */
async function workerReady(page: Page) {
  // Polls rather than using navigator.serviceWorker.ready, so a registration still installing is not taken for ready.
  await expect.poll(() => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/play/');
    const ours = reg && new URL(reg.scope).pathname === '/play/' && reg.active?.state === 'activated';
    return !!ours && navigator.serviceWorker.controller?.scriptURL === reg!.active!.scriptURL;
  }), { message: 'the game worker installs and controls the page', timeout: 30_000 }).toBe(true);
  return page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration('/play/'))!;
    return { scope: reg.scope, script: reg.active!.scriptURL, controller: navigator.serviceWorker.controller!.scriptURL, caches: await caches.keys() };
  });
}

/* Cuts the connection. setOffline covers the page and the worker; the extra routes make the Google
   requests fail the way they would offline, instead of being answered by the fixtures' fake SDK. */
const cut = (route: Route) => route.abort('internetdisconnected');
async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
  for (const r of [FIREBASE_SDK, FIREBASE_AUTH, FIRESTORE]) await context.route(r, cut);
}
async function goOnline(context: BrowserContext) {
  for (const r of [FIREBASE_SDK, FIREBASE_AUTH, FIRESTORE]) await context.unroute(r, cut);
  await context.setOffline(false);
}

/** Proves the connection is really gone: a network-first URL the worker never saved cannot load. */
async function expectOffline(page: Page) {
  const got = await page.evaluate(() => fetch(`/play/offline-probe-${Date.now()}.txt`).then(r => `HTTP ${r.status}`, () => 'failed'));
  expect(got, 'a file that was never saved must fail offline').toBe('failed');
}

test('the worker registers with scope /play/, caches under lvm-, and every precached file is this site\'s', async ({ page, baseURL }) => {
  await open(page);
  const sw = await workerReady(page);
  expect(sw.scope).toBe(`${baseURL}/play/`);
  expect(sw.script).toBe(`${baseURL}/sw.js`);
  expect(sw.controller).toBe(`${baseURL}/sw.js`);
  expect(sw.caches.length).toBeGreaterThanOrEqual(1);
  for (const name of sw.caches) {
    expect(name).toMatch(/^lvm-[\w]+$/);
  }
  // The precache holds the shell, every module at its import-map URL, the styles, the design system, fonts and icons
  const saved = await page.evaluate(async prefix => {
    const name = (await caches.keys()).filter(k => k.startsWith(prefix) && k !== prefix + 'voice').pop()!;
    return (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search);
  }, OWN_PREFIX);
  expect(saved).toContain('/play/');
  expect(saved).toContain('/manifest.webmanifest');
  expect(saved.some(u => /^\/math\.css\?v=\w+$/.test(u))).toBe(true);
  for (const re of [/^\/ds\/2\.1\.0\/tokens\.css\?v=\w+$/, /^\/ds\/2\.1\.0\/components\.css\?v=\w+$/, /^\/theme\/learnvedicmath\.css\?v=\w+$/, /^\/js\/analytics\.js\?v=\w+$/,
    /^\/fonts\/nunito-sans-latin-wght-normal\.woff2$/, /^\/icons\/icon-192\.png$/]) expect(saved.some(u => re.test(u)), String(re)).toBe(true);
  expect(saved.filter(u => /^\/(assets|design-system)\//.test(u)), 'nothing from another site').toEqual([]);
  const map = await page.evaluate(() => JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports as Record<string, string>);
  const modules = Object.values(map);
  expect(modules.length).toBeGreaterThan(20);
  for (const u of modules) expect(saved, `${u} is saved for offline use`).toContain(u);
});

test.describe('first visit', () => {
  test.use({ seedMode: null });

  test('every route renders offline after one visit', async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click();
    await expect(page.locator('h1.home-h')).toHaveText('Train your mental math');
    await workerReady(page);
    await goOffline(context);
    await expectOffline(page);

    const ROUTES: [string, RegExp][] = [
      ['#/', /^Learn Vedic Math/], ['#/learn', /^Skill map/], ['#/dojo', /^Vedic Dojo/], ['#/arena', /^Arena/],
      ['#/games', /^Games/], ['#/sutras', /^The sutras · Learn Vedic Math/], ['#/watch', /^Watch and learn/], ['#/me', /^Me · /],
      ['#/grade/3', /./], ['#/skill/v-sq5', /./], ['#/katas/sq5', /./], ['#/kata/sq5/1', /./], ['#/tower', /./], ['#/tower/1', /./],
      ['#/challenge/1', /./], ['#/game/times-sprint', /^Times sprint/], ['#/game/times-sprint/1', /^Times sprint level 1/],
      ['#/arena/party', /^Party Mode/], ['#/games/tala', /^Tala Lab/], ['#/mix/3', /./], ['#/sutras/s1', / · Learn Vedic Math$/],
    ];
    for (const [hash, title] of ROUTES) {
      // A fresh tab per route: a real page load, answered by the worker
      const tab = await context.newPage();
      const res = await tab.goto(`${APP}${hash === '#/' ? '' : hash}`);
      expect(res?.fromServiceWorker(), `${hash}: the page came from the worker`).toBe(true);
      await expect(tab.locator('#view h1, #view h2').first(), `${hash} renders offline`).toBeVisible();
      await expect(tab).toHaveTitle(title);
      await expect(tab.locator('body')).toHaveClass(/mode-pro/);
      if (hash === '#/watch') {
        // The saved list is shown; the videos themselves need a connection (watch-shelf spec)
        await expect(tab.locator('#view button.watch-card').first()).toBeVisible();
        await expect(tab.locator('#view button.watch-card').first()).toBeDisabled();
        await expect(tab.locator('.watch-offline')).toContainText('Videos need a connection');
      }
      await tab.close();
    }

    // The Sky home and All places (sky-home 5.1): the Player turns the Sky on, and both render offline
    await page.evaluate(() => { const k = 'vm.players', P = JSON.parse(localStorage.getItem(k)!); P.list[0].sky = true; localStorage.setItem(k, JSON.stringify(P)); });
    for (const [hash, title, sel] of [['#/', /^Learn Vedic Math/, '.sky-star'], ['#/places', /^All places/, 'a.places-star']] as const) {
      const tab = await context.newPage();
      const res = await tab.goto(`${APP}${hash === '#/' ? '' : hash}`);
      expect(res?.fromServiceWorker(), `${hash}: the page came from the worker`).toBe(true);
      await expect(tab.locator('#view h1')).toHaveText(hash === '#/' ? 'Your Sky' : 'All places');
      await expect(tab).toHaveTitle(title);
      await expect(tab.locator(sel)).toHaveCount(63);
      await tab.close();
    }
  });
});

test('a Dojo kata and a game play offline, and the progress persists', async ({ page, context }) => {
  test.setTimeout(90_000);
  await open(page);
  await workerReady(page);
  await goOffline(context);
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await expectOffline(page);

  // Kata 1 of the squares-ending-in-5 trick, all right (answers from the app's own seeded module)
  await page.goto(`${APP}#/kata/sq5/1`);
  await expect(page.locator('#view h1')).toContainText('Kata 1');
  const answers = await page.evaluate(async () => (await import('/js/levels.js' as string)).kata('sq5', 1).problems.map((p: { answer: unknown }) => String(p.answer)));
  for (const a of answers) {
    await page.locator('#kata .ans-in').fill(a);
    await page.locator('#kGo').click();
    await expect(page.locator('#kSay')).toHaveClass(/\bok\b/);
    await page.locator('#kGo').click();
  }
  await expect(page.locator('.lv-result h2')).toHaveText('Kata done!');
  await expect(page.locator('.lv-result')).toContainText('+35 Sparks');

  // A game: one right answer in Endless practice
  await page.goto(`${APP}#/game/times-sprint`);
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  const q = (await page.locator('#gArea .g-q').textContent())!.replace(/,/g, '');
  const [x, y] = q.split('×').map(s => Number(s.trim()));
  await page.locator('#gArea .ans-in').fill(String(x * y));
  await page.locator('#gArea .ans-in').press('Enter');
  await expect(page.locator('#gPts')).toHaveText(/^[1-9]/);
  await page.locator('#gQuit').click();
  await expect(page.locator('.g-result .md-kicker')).toHaveText('Practice score');

  // Still offline: reload, and everything is still there
  const sparks = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).sparks);
  expect(sparks).toBeGreaterThan(30);
  await page.reload();
  await page.goto(`${APP}#/katas/sq5`);
  await expect(page.locator('a.lv-node[href="#/kata/sq5/2"]')).toBeVisible();
  await expect(page.locator('a.lv-node[href="#/kata/sq5/1"]')).toHaveAttribute('aria-label', 'Kata 1, done');
  await page.goto(`${APP}#/me`);
  await expect(page.locator('.me-head')).toContainText(`${sparks} Sparks`);
  await page.goto(`${APP}#/game/times-sprint`);
  await expect(page.locator('#gShell')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).seen['game:times-sprint'])).toBeTruthy();
  expect((await cloudLog(page)).writes).toEqual([]);
});

test.describe('a Player who may post', () => {
// A grown-up's Sparks would post when online, so this checks that nothing earned offline is saved up to send later
test.use({ seedConsent: { age: 'adult' } });
test('offline, the leaderboards fall back to this device, and nothing is queued or written', async ({ page, context }) => {
  await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
  test.setTimeout(90_000);
  await open(page);
  await workerReady(page);
  await goOffline(context);
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();

  const FALLBACK = 'World scores are not reachable right now. Showing this device.';
  await page.goto(`${APP}#/arena`);
  for (const id of ['#lbDay', '#lbWeek', '#lbSparks']) { await page.locator(`${id} [data-show-world]`).click(); await expect(page.locator(`${id} .lb-body`)).toContainText(FALLBACK); }
  await page.goto(`${APP}#/game/times-sprint`);
  for (const id of ['#gbDay', '#gbWeek']) { await page.locator(`${id} [data-show-world]`).click(); await expect(page.locator(`${id} .lb-body`)).toContainText(FALLBACK); }

  // Earn 10 Sparks offline (two sutra cards), past the 3 second wait of the weekly Sparks post
  await page.goto(`${APP}#/sutras`);
  for (const i of [0, 1]) await page.locator('.sutra-card .sutra-face').nth(i).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).sparks)).toBe(10);
  await page.waitForTimeout(4_500);
  let log = await cloudLog(page);
  expect(log.signIns).toBe(0);
  expect(log.writes).toEqual([]);

  // Back online, the offline Sparks are not saved up to send later: not by this page (in memory) ...
  await goOnline(context);
  await page.waitForTimeout(4_500);
  expect((await cloudLog(page)).writes).toEqual([]);
  // ... nor after a reload (nothing stored to retry). The world boards load again, so sending would work.
  // (A reload also clears WebKit's memory of the failed SDK import, which it does not retry in one page.)
  await page.reload();
  await page.goto(`${APP}#/arena`);
  await showWorld(page, '#lbDay');
  await expect(page.locator('#lbDay .lb-body')).toContainText('No scores yet');
  await expect(page.locator('#lbDay .lb-body')).not.toContainText('not reachable');
  await page.waitForTimeout(4_500);
  log = await cloudLog(page);
  expect(log.signIns).toBe(0); // viewing World boards never signs in (docs/adr/0002)
  expect(log.reads.length).toBeGreaterThan(0);
  expect(log.writes).toEqual([]);
});
});

test('the design system, theme, fonts, icons and analytics script are served offline', async ({ page, context }) => {
  await open(page);
  await workerReady(page);
  await goOffline(context);
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await expectOffline(page);

  // Design system CSS
  const coral = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--coral').trim());
  expect(coral).not.toBe('');
  expect(await page.locator('.md-btn').first().evaluate(e => getComputedStyle(e).borderRadius)).not.toBe('0px');
  // Fonts
  const faces = await page.evaluate(async () => {
    await Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka'), document.fonts.load('400 16px "Nunito Sans"'), document.fonts.load('400 16px "Space Grotesk"'), document.fonts.load('500 16px "JetBrains Mono"')]);
    return [...document.fonts].map(f => `${f.family.replace(/"/g, '')} ${f.weight} ${f.status}`);
  });
  for (const fam of ['Fredoka 600', 'Fredoka 700', 'Nunito Sans', 'Space Grotesk', 'JetBrains Mono'])
    expect(faces.find(f => f.startsWith(fam)), `${fam}: ${faces.join(', ')}`).toMatch(/loaded$/);
  // The theme switch (the design system's header.js), the manifest and its icons
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
  const files = await page.evaluate(async () => {
    const urls = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/favicon.svg', '/fonts/fredoka-latin-600-normal.woff2'];
    return Promise.all(urls.map(u => fetch(u).then(r => `${u} ${r.status}`, () => `${u} failed`)));
  });
  for (const f of files) expect(f).toMatch(/ 200$/);
});

test('the landing and grown-up pages are never controlled by the game worker', async ({ page, baseURL }) => {
  await open(page);
  await workerReady(page);
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope));
  expect(regs).toEqual([`${baseURL}/play/`]);
  for (const url of ['/?home', '/parents/']) {
    const res = await page.goto(url);
    expect(res?.fromServiceWorker(), `${url} comes from the network`).toBe(false);
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller), `${url} is not controlled`).toBe(false);
  }
});

/* Studio voice (openspec better-voice; design D17): audio from the voice host (https://voice.learnvedicmath.com/) is
   cache first in lvm-voice, a cache every deploy keeps, so a line heard once plays offline. Needs the recordings on
   the voice host (the CI voice-upload job puts them there). Skipped when the host does not have them. The built-in voice is replaced by a recorder, so "builtin" in the log means the device would speak. */
test.describe('studio voice offline', () => {
  test.use({ seedMode: 'explorer' });

  test('a line heard once plays from its saved file offline, and a new line still gets a voice', async ({ page, context }) => {
    await page.addInitScript(() => {
      (window as any).__voiceLog = [];
      const fake = { getVoices: () => [], speaking: false, pending: false, paused: false, speak(u: any) { setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    });
    await open(page, '#/skill/k-count');
    await workerReady(page);
    await page.reload(); // the first load was not controlled by the worker; from here every voice file goes through it
    await expect(page.locator('#practice')).toBeVisible();
    const studio = await page.evaluate(async () => (await import('/js/voice-index.js')).STUDIO);
    const probe = await page.evaluate(u => fetch(u, { method: 'HEAD' }).then(r => r.status, () => 0), studio.base + (studio.lineSet || 'none'));
    test.skip(!studio.tag || probe !== 200, 'no studio voice recordings on the voice host yet (the CI voice-upload job fills it)');
    const log = () => page.evaluate(() => (window as any).__voiceLog as string[]);
    const hear = async () => {
      await page.evaluate(() => { (window as any).__voiceLog.length = 0; });
      await page.locator('#practice').getByRole('button', { name: 'Hear it' }).click();
      await expect.poll(async () => (await log()).filter(e => e !== 'stop').length).toBeGreaterThan(0);
      return (await log()).filter(e => e !== 'stop');
    };
    await expect.poll(async () => (await hear())[0], { timeout: 15_000 }).toBe('studio:line'); // online, the whole line plays (and is saved)
    const heardQ = await page.locator('#practice').innerText();
    expect(await page.evaluate(() => caches.keys())).toContain('lvm-voice');
    await goOffline(context);
    await expectOffline(page);
    await page.reload();
    await expect(page.locator('#practice')).toBeVisible();
    /* The question after a reload is a new draw; Hear it on a line never fetched gets clips or the built-in voice */
    const next = (await hear())[0];
    expect(['studio:line', 'studio:clips', 'builtin']).toContain(next);
    if ((await page.locator('#practice').innerText()) === heardQ) expect(next).toBe('studio:line');
    /* The line set, clip directory and core pack were saved, so the app knows what it has offline */
    const saved = await page.evaluate(async () => (await (await caches.open('lvm-voice')).keys()).map(r => new URL(r.url).pathname));
    expect(saved.some(p => /\/l\/set\.[0-9a-f]{10}\.bin$/.test(p))).toBe(true);
    expect(saved.some(p => /\/l\/[0-9a-f]{14}\.m4a$/.test(p))).toBe(true);
    await goOnline(context);
  });
});

/* Say it (openspec sutra-pronunciation 2.3): after one tap online, the other name clips are saved while the browser
   is idle (sounds/ is cache first in lvm-sounds), so another name plays offline from the cache. */
test('a Sutra name heard once online lets every other name play offline', async ({ page, context }, testInfo) => {
  chromiumOnly(testInfo, 'one engine is enough for the cache rule');
  await page.addInitScript(() => { try { localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
  /* The browser counts as idle at once. The prefetch takes one clip per idle callback, and on a busy machine Chromium
     gave none until each callback's 3 second timeout: 28 clips then needed up to 84 s, so the 30 s check below saw 13
     or 28 now and then. When idle time comes is the browser's business (the queue order is covered in
     test/say.test.mjs); this test is about the cache rule */
  await page.addInitScript(() => {
    window.requestIdleCallback = (fn: IdleRequestCallback) => window.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 50 }), 0);
    window.cancelIdleCallback = (h: number) => window.clearTimeout(h);
  });
  await fakeAudio(page, { clipSecs: 0.3 });
  await open(page, '#/sutras/s1');
  await workerReady(page);
  await page.reload(); // now the worker controls the page
  await expect(page.locator('dialog .say-btn')).toBeVisible();
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('lvm-sounds')).keys()).length), { message: 'the idle prefetch saves all 29 clips', timeout: 30_000 }).toBe(29);
  await goOffline(context);
  try {
    await expectOffline(page);
    await page.evaluate(() => { location.hash = '#/sutras/s3'; });
    await expect(page.locator('#sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
    await page.locator('dialog .say-btn').click();
    await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(2);
    await expect(page.locator('.fx-toasts')).toHaveCount(0);
  } finally {
    await goOnline(context); // back online even when an assertion above fails
  }
});
