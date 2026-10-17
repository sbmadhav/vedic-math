import type { BrowserContext, Page, Route } from '@playwright/test';
import { test, expect, APP, open, cloudLog, openExplore, chromiumOnly, FIREBASE_SDK, FIREBASE_AUTH, FIRESTORE } from './fixtures';
import { fakeAudio, audioLog } from './audio-fake';

/* Offline: /vedic-math/sw.js (scope /vedic-math/) saves the app after one visit, so every route, the
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

const OWN_PREFIX = 'vedic-math-';

/** Waits until this app's worker has installed (precache done), activated and controls the page. */
async function workerReady(page: Page) {
  // Polls rather than using navigator.serviceWorker.ready: a page first controlled by the root worker
  // (scope /) would resolve that with the root registration.
  await expect.poll(() => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/vedic-math/');
    const ours = reg && new URL(reg.scope).pathname === '/vedic-math/' && reg.active?.state === 'activated';
    return !!ours && navigator.serviceWorker.controller?.scriptURL === reg!.active!.scriptURL;
  }), { message: 'the Vedic Math worker installs and controls the page', timeout: 30_000 }).toBe(true);
  return page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration('/vedic-math/'))!;
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
  const got = await page.evaluate(() => fetch(`/vedic-math/offline-probe-${Date.now()}.txt`).then(r => `HTTP ${r.status}`, () => 'failed'));
  expect(got, 'a file that was never saved must fail offline').toBe('failed');
}

test('the worker registers with scope /vedic-math/ and caches under vedic-math-, never madhav-', async ({ page, baseURL }) => {
  await open(page);
  const sw = await workerReady(page);
  expect(sw.scope).toBe(`${baseURL}/vedic-math/`);
  expect(sw.script).toBe(`${baseURL}/vedic-math/sw.js`);
  expect(sw.controller).toBe(`${baseURL}/vedic-math/sw.js`);
  expect(sw.caches.length).toBeGreaterThanOrEqual(1);
  for (const name of sw.caches) {
    expect(name).toMatch(/^vedic-math-[\w]+$/);
    expect(name.startsWith('madhav-')).toBe(false);
  }
  // The precache holds the shell, every module at its import-map URL, the styles and the shared files
  const saved = await page.evaluate(async prefix => {
    const name = (await caches.keys()).filter(k => k.startsWith(prefix)).pop()!;
    return (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search);
  }, OWN_PREFIX);
  expect(saved).toContain('/vedic-math/');
  expect(saved).toContain('/vedic-math/manifest.webmanifest');
  expect(saved.some(u => /^\/vedic-math\/math\.css\?v=\w+$/.test(u))).toBe(true);
  const map = await page.evaluate(() => JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports as Record<string, string>);
  const modules = Object.values(map);
  expect(modules.length).toBeGreaterThan(20);
  for (const u of modules) expect(saved, `${u} is saved for offline use`).toContain(u);
  for (const u of ['/assets/explore.js', '/assets/analytics.js', '/design-system/tokens.css', '/design-system/components.css'])
    expect(saved, `${u} is saved for offline use`).toContain(u);
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
      ['#/', /^Vedic Math for Everyone/], ['#/learn', /^Skill map/], ['#/dojo', /^Vedic Dojo/], ['#/arena', /^Arena/],
      ['#/games', /^Games/], ['#/sutras', /^The sutras:/], ['#/watch', /^Watch and learn/], ['#/me', /^Me:/],
      ['#/grade/3', /./], ['#/skill/v-sq5', /./], ['#/katas/sq5', /./], ['#/kata/sq5/1', /./], ['#/tower', /./], ['#/tower/1', /./],
      ['#/challenge/1', /./], ['#/game/times-sprint', /^Times sprint/], ['#/game/times-sprint/1', /^Times sprint level 1/],
      ['#/duel', /^Duel/], ['#/mix/3', /./], ['#/sutras/s1', /: Vedic Math · Madhav$/],
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
    for (const [hash, title, sel] of [['#/', /^Vedic Math for Everyone/, '.sky-star'], ['#/places', /^All places/, 'a.places-star']] as const) {
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
  const answers = await page.evaluate(async () => (await import('/vedic-math/js/levels.js' as string)).kata('sq5', 1).problems.map((p: { answer: unknown }) => String(p.answer)));
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
  test.setTimeout(90_000);
  await open(page);
  await workerReady(page);
  await goOffline(context);
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();

  const FALLBACK = 'World scores are not reachable right now. Showing this device.';
  await page.goto(`${APP}#/arena`);
  for (const id of ['#lbDay', '#lbWeek', '#lbSparks']) await expect(page.locator(`${id} .lb-body`)).toContainText(FALLBACK);
  await page.goto(`${APP}#/game/times-sprint`);
  for (const id of ['#gbDay', '#gbWeek']) await expect(page.locator(`${id} .lb-body`)).toContainText(FALLBACK);

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
  await expect(page.locator('#lbDay .lb-body')).toContainText('No scores yet');
  await expect(page.locator('#lbDay .lb-body')).not.toContainText('not reachable');
  await page.waitForTimeout(4_500);
  log = await cloudLog(page);
  expect(log.signIns).toBe(0); // viewing World boards never signs in (docs/adr/0002)
  expect(log.reads.length).toBeGreaterThan(0);
  expect(log.writes).toEqual([]);
});
});

test('the shared main-site files are served offline', async ({ page, context }) => {
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
  // Explore menu (explore.js)
  const dlg = await openExplore(page);
  await expect(dlg.locator('a.xp-page[aria-current="page"]')).toHaveAttribute('href', '/vedic-math/');
  await page.keyboard.press('Escape');
  // Analytics script, the manifest and its icons
  const files = await page.evaluate(async () => {
    const urls = ['/assets/analytics.js', '/assets/explore.js', '/design-system/tokens.css', '/design-system/components.css', '/vedic-math/manifest.webmanifest', '/assets/icons/apple-touch-icon.png', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/icons/maskable-512.png'];
    return Promise.all(urls.map(u => fetch(u).then(r => `${u} ${r.status}`, () => `${u} failed`)));
  });
  for (const f of files) expect(f).toMatch(/ 200$/);
});

test('the main site\'s root worker leaves /vedic-math/ alone', async ({ page, baseURL }) => {
  test.skip(!baseURL!.startsWith('https:'), 'the main site registers its worker over https only');
  // Visit the home page first so the root worker (scope /) is installed and active
  await page.goto('/');
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.state || 'none'), { timeout: 30_000 }).toBe('activated');
  const root = await page.evaluate(async () => { const r = (await navigator.serviceWorker.getRegistration('/'))!; return { scope: r.scope, script: r.active!.scriptURL }; });
  expect(root).toEqual({ scope: `${baseURL}/`, script: `${baseURL}/sw.js` });

  // The first Vedic Math page load falls under the root worker, which must pass it to the network
  const res = await page.goto(APP);
  expect(res?.fromServiceWorker(), 'the root worker did not answer the /vedic-math/ page').toBe(false);
  await expect(page.locator('h1.home-h')).toBeVisible();
  const sw = await workerReady(page);
  expect(sw.controller).toBe(`${baseURL}/vedic-math/sw.js`);
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope).sort());
  expect(regs).toEqual([`${baseURL}/`, `${baseURL}/vedic-math/`]);

  // Neither worker keeps the other's files: madhav-* holds nothing of /vedic-math/, and both cache families exist
  const caches_ = await page.evaluate(async () => {
    const out: Record<string, string[]> = {};
    for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname);
    return out;
  });
  const names = Object.keys(caches_);
  expect(names.some(n => n.startsWith('madhav-')), names.join(', ')).toBe(true);
  expect(names.some(n => n.startsWith(OWN_PREFIX)), names.join(', ')).toBe(true);
  for (const [name, paths] of Object.entries(caches_))
    if (name.startsWith('madhav-')) expect(paths.filter(p => p.startsWith('/vedic-math')), `${name} holds Vedic Math files`).toEqual([]);
});

/* Say it (openspec sutra-pronunciation 2.3): after one tap online, the other name clips are saved while the browser
   is idle (sounds/ is cache first in vedic-math-sounds), so another name plays offline from the cache. */
test('a Sutra name heard once online lets every other name play offline', async ({ page, context }, testInfo) => {
  chromiumOnly(testInfo, 'one engine is enough for the cache rule');
  await page.addInitScript(() => { try { localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
  await fakeAudio(page, { clipSecs: 0.3 });
  await open(page, '#/sutras/s1');
  await workerReady(page);
  await page.reload(); // now the worker controls the page
  await expect(page.locator('dialog .say-btn')).toBeVisible();
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('vedic-math-sounds')).keys()).length), { message: 'the idle prefetch saves all 29 clips', timeout: 30_000 }).toBe(29);
  await goOffline(context);
  await expectOffline(page);
  await page.evaluate(() => { location.hash = '#/sutras/s3'; });
  await expect(page.locator('#sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
  await page.locator('dialog .say-btn').click();
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(2);
  await expect(page.locator('.fx-toasts')).toHaveCount(0);
  await goOnline(context);
});
