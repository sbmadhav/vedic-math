import { test as base, expect, type Page, type BrowserContext, type TestInfo } from '@playwright/test';
import { BASE_URL as BASE } from '../playwright.config';

/* e2eMod(name): a module of the game, inside page.evaluate (see installModules below) */
declare global {
  // eslint-disable-next-line no-var
  var e2eMod: (name: string) => Promise<any>;
}

/* Shared fixtures for the Vedic Math end-to-end suite.

   Live-dependency rules (hard):
   - Production Firestore is never written to. Every request to firestore.googleapis.com goes through
     a guard: anything write-shaped (the Write channel, :commit, :batchWrite, PATCH/PUT/DELETE, a POST to
     /documents that is not a query) is aborted AND recorded, and the test fails at teardown.
   - By default the Firebase SDK itself is replaced with a small in-page fake (see FAKE_SDK below), so
     opening a leaderboard never signs in anonymously and never creates an account. The fake records what
     the app tries to read and write in window.__e2eCloud, so tests can check what WOULD be sent.
     Requests to identitytoolkit / securetoken are aborted and recorded as violations in those tests.
   - Only tests that opt in with test.use({ liveFirebase: true }) load the real SDK (world leaderboard
     read). They still go through the write guard.
   - Analytics is answered locally so test runs never count as visits: GoatCounter's count.js (served from this site,
     /vendor/goatcounter/count.js), its endpoint, and Cloudflare Web Analytics.
   - The Firebase SDK is served from this site (/vendor/firebase/<version>/); FIREBASE_SDK matches it there. */

export const ANALYTICS = /(^https:\/\/[^/]*goatcounter\.com\/)|(^https:\/\/gc\.zgo\.at\/)|(^https?:\/\/[^/]+\/vendor\/goatcounter\/count\.js(\?|$))|(^https:\/\/(static\.)?cloudflareinsights\.com\/)/;
export const FIREBASE_SDK = /^https?:\/\/[^/]+\/vendor\/firebase\/[\d.]+\//;
export const FIREBASE_AUTH = /^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\//;
export const FIRESTORE = /^https:\/\/firestore\.googleapis\.com\//;

/* GoatCounter's count.js defines window.goatcounter.count, and /js/analytics.js flushes its
   queue through it once count.js loads. The local answer has to define it too (as a no-op), or that flush
   throws on the live site: as a page error, and inside page.clock.runFor under a fake clock. Nothing is sent. */
const NO_OP_COUNTER = '/* analytics blocked in tests */ window.goatcounter = window.goatcounter || {}; if (typeof window.goatcounter.count !== "function") window.goatcounter.count = function () {};';
export async function blockAnalytics(ctx: BrowserContext | Page) {
  await ctx.route(ANALYTICS, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: NO_OP_COUNTER }));
}

/* The Studio voice host (R2 on voice.learnvedicmath.com, design D17). Until it serves the files (owner task 7.8), or
   for a run that should not depend on it, E2E_VOICE_ORIGIN names another copy of the same files and the tests are
   answered from there, with the CORS header the host sends. For example, until Phase B replaces the old site:
     E2E_VOICE_ORIGIN=https://sbmadhav.com/vedic-math/voice BASE_URL=http://localhost:8124 npx playwright test
   A spec that routes the voice host itself (voice.spec.ts, listen.spec.ts) takes precedence: page routes come first. */
export const VOICE_HOST = 'https://voice.learnvedicmath.com';
async function voiceFrom(ctx: BrowserContext) {
  const from = (process.env.E2E_VOICE_ORIGIN || '').replace(/\/$/, '');
  if (!from) return;
  await ctx.route(`${VOICE_HOST}/**`, async route => {
    try {
      const res = await route.fetch({ url: from + new URL(route.request().url()).pathname });
      await route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort('failed').catch(() => {}); /* the test ended while the copy was on its way */ }
  });
}

/* Until the voice host is set up (owner task 7.8), it has no DNS record. A build that names it (build.py's default
   --voice r2: local builds and pull request previews; CI deploys with --voice off until R2 is set up) still warms the
   core pack whenever read aloud is on (Explorer, js/voice.js warmStudio), and the failed lookup is logged as a console
   error the app cannot prevent (the Player hears the device voice instead). Only that lookup failure is ignored: once
   the host is live it never matches, and a 404 or any other failure from the host still counts. */
const VOICE_HOST_UNSET = /ERR_NAME_NOT_RESOLVED|server with the specified hostname could not be found/i;
export const voiceHostUnset = (url: string, text: string) => url.startsWith(`${VOICE_HOST}/`) && VOICE_HOST_UNSET.test(text);

/** True for a request that could change production Firestore data. */
export function isFirestoreWrite(method: string, url: string) {
  if (!FIRESTORE.test(url)) return false;
  if (/\/Write\/channel/.test(url)) return true;
  if (/:(commit|batchWrite|beginTransaction|rollback)(\?|$)/.test(url)) return true;
  if (['PATCH', 'PUT', 'DELETE'].includes(method)) return true;
  if (method === 'POST' && /\/documents(\/|:|\?|$)/.test(url) && !/:(runQuery|runAggregationQuery|batchGet|listCollectionIds)(\?|$)/.test(url)) return true;
  return false;
}

/* Fake Firebase modules served in place of /vendor/firebase/<v>/firebase-*.js.
   They implement exactly the calls js/cloud.js makes. Each Firebase app (one per Player who posts) has its
   own fake Auth session, kept in localStorage under e2e.fakeAuth like the real SDK keeps one per app name,
   so it survives a reload. Sign-in gives the default app (the first Player) the uid 'e2e-fake-uid' and a
   named app 'e2e-fake-<app name>'. Reads return the rows in window.__e2eRows (empty by default), after the
   promise in window.__e2eHold if a test set one, and
   writes are only recorded in window.__e2eCloud.writes. */
const FAKE_HEAD = `const C = (globalThis.__e2eCloud ||= { signIns: 0, signOuts: [], apps: [], authLoaded: false, reads: [], writes: [] });
const SAVED = () => { try { return JSON.parse(localStorage.getItem('e2e.fakeAuth')) || {}; } catch (e) { return {}; } };
const SAVE = m => { try { localStorage.setItem('e2e.fakeAuth', JSON.stringify(m)); } catch (e) {} };`;
const FAKE_SDK: Record<string, string> = {
  'firebase-app.js': `${FAKE_HEAD}
export const initializeApp = (cfg, name = '[DEFAULT]') => { C.apps.push(name); return { options: cfg, name, fake: true }; };
export const deleteApp = async app => { app.deleted = true; };`,
  'firebase-app-check.js': `${FAKE_HEAD}
export class ReCaptchaEnterpriseProvider { constructor(k) { this.k = k; } }
export class ReCaptchaV3Provider { constructor(k) { this.k = k; } }
export const initializeAppCheck = () => ({ fake: true });`,
  'firebase-auth.js': `${FAKE_HEAD}
C.authLoaded = true;
const auths = (globalThis.__e2eAuths ||= {});
export const getAuth = app => (auths[app.name] ||= { app, get currentUser() { const u = SAVED()[app.name]; return u ? { uid: u, isAnonymous: true } : null; }, authStateReady: async () => {} });
export async function signInAnonymously(a) { C.signIns++; const m = SAVED(); m[a.app.name] = a.app.name === '[DEFAULT]' ? 'e2e-fake-uid' : 'e2e-fake-' + a.app.name; SAVE(m); return { user: a.currentUser }; }
export async function signOut(a) { C.signOuts.push(a.app.name); const m = SAVED(); delete m[a.app.name]; SAVE(m); }`,
  'firebase-firestore.js': `${FAKE_HEAD}
const path = parts => parts.filter(p => typeof p === 'string').join('/');
export const getFirestore = app => ({ fake: true, app: app.name });
export const doc = (db, ...p) => ({ path: path(p), app: db.app });
export const collection = (db, ...p) => ({ path: path(p) });
export const orderBy = (f, d) => ({ orderBy: [f, d] });
export const limit = n => ({ limit: n });
export const query = (c, ...q) => ({ path: c.path, q });
export async function getDoc(ref) { C.reads.push(ref.path); return { exists: () => false, data: () => undefined }; }
export async function getDocs(q) { C.reads.push(q.path); if (globalThis.__e2eHold) await globalThis.__e2eHold; return { docs: (globalThis.__e2eRows || []).map(([id, name, score]) => ({ id, data: () => ({ name, avatar: 'teal', score }) })) }; }
export async function setDoc(ref, data) { C.writes.push({ path: ref.path, app: ref.app, data: JSON.parse(JSON.stringify(data)) }); }
export const serverTimestamp = () => ({ serverTimestamp: true });
export const Timestamp = { fromMillis: ms => ({ millis: ms }) };`,
};

/* The game's own modules, reached from a test (openspec change react-typescript, design D10, task 1.2). Specs never
   import a module by its URL: inside page.evaluate they call e2eMod('<name>') for /js/<name>.js ('store',
   'play/kit', 'skills/middle'), and from Node mod(page, '<name>') gives its URL. Today every module is served at
   /js/<name>.js, so the map is the identity. Once the framework build bundles the modules (phase 2), preview and test
   builds publish MODULE_MAP, a JSON object from '/js/<name>.js' to the built file, and both helpers read it; production
   never publishes it, and a server without it (404) means the identity. The map is read once per base URL from Node, so
   a page never requests it (a 404 there would count as a failed request). e2eMod goes through the page's own module
   loader (and its import map), so a test gets the same module instance the app uses; it is plain code, no eval, so the
   pages' Content-Security-Policy is satisfied. */
export const MODULE_MAP = '/learn/assets/modules.json';
type ModuleMap = Record<string, string>;
const moduleMaps = new Map<string, Promise<ModuleMap>>();
function moduleMap(ctx: BrowserContext | Page, baseURL: string): Promise<ModuleMap> {
  const origin = new URL(baseURL).origin;
  let map = moduleMaps.get(origin);
  if (!map) {
    // A 404 means no map (the identity). Any other failure is not cached, so the next call asks again instead of
    // every e2eMod of this worker falling back to /js/<name>.js
    map = ctx.request.get(new URL(MODULE_MAP, origin).href)
      .then(async res => {
        if (res.status() === 404) return {} as ModuleMap;
        if (!res.ok()) throw new Error(`${MODULE_MAP}: HTTP ${res.status()}`);
        return (await res.json()) as ModuleMap;
      })
      .catch((e: unknown) => { moduleMaps.delete(origin); throw e; });
    moduleMaps.set(origin, map);
  }
  return map;
}
const moduleUrl = (map: ModuleMap, name: string) => map[`/js/${name}.js`] || `/js/${name}.js`;

/** The URL a module of the game is served at, for a test that needs it outside page.evaluate. */
export async function mod(page: Page, name: string): Promise<string> {
  return moduleUrl(await moduleMap(page, page.url().startsWith('http') ? page.url() : BASE), name);
}

/** The still frame draws the day's story (js/sky-bg.js: the day number modulo the story list), and on a given screen
    some stories have room for their drawing but not its caption. A test that needs a story with its caption fixes the
    date (timers and frames still run) at noon UTC on a day that draws `id`, so it passes on every day of the week.
    Call it on a page of the game; the next navigation draws that story. */
export async function pinStoryDay(page: Page, id: string) {
  const ids: string[] = await page.evaluate(async () => (await e2eMod('sky-scene')).STORIES.map((s: { id: string }) => s.id));
  const i = ids.indexOf(id);
  expect(i, `the story ${id} is in the list`).toBeGreaterThanOrEqual(0);
  await page.clock.setFixedTime((20000 - (20000 % ids.length) + i) * 864e5 + 432e5);
}

/** Installs e2eMod in every page of a context. The context fixture does it for the test's own context; a spec that
    makes another context (browser.newContext) calls it there too. */
export async function installModules(ctx: BrowserContext, baseURL?: string) {
  const map = await moduleMap(ctx, baseURL || BASE);
  await ctx.addInitScript((m: ModuleMap) => {
    // A full URL: WebKit cannot resolve a path from an init script, which has no base URL of its own
    globalThis.e2eMod = (name: string) => import(new URL(m[`/js/${name}.js`] || `/js/${name}.js`, location.href).href);
  }, map);
}

export type Issues = { console: string[]; failed: string[] };
export type Mode = 'explorer' | 'challenger' | 'pro';
export type CloudLog = { signIns: number; signOuts: string[]; apps: string[]; authLoaded: boolean; reads: string[]; writes: { path: string; app: string; data: Record<string, unknown> }[] };
/** The first Player's posting consent: the Age answer. parentOk is the retired Parent step, which an old record or a
    hand-off from sbmadhav.com may still carry; the game ignores it (docs/adr/0006). */
export type Consent = { age: number | 'adult'; parentOk?: number | null };

type Fixtures = {
  /** Load the real Firebase SDK (live Firestore reads, no sign-in). Default false. */
  liveFirebase: boolean;
  /** Play mode stored for the first player before the page loads, or null for a first visit. */
  seedMode: Mode | null;
  /** Age answer stored for that player. Default null: not answered, so nothing may be posted and only the Device board
      is shown (World boards are for an Age answer of 13 or over, after a tap: showWorld). */
  seedConsent: Consent | null;
  /** More fields for that player's record, for example { sky: true } (the Sky switch). Default null. */
  seedPlayer: Record<string, unknown> | null;
  /** Saved progress (mathquest.v1.p1) for that player before the page loads, for example a record from before
      Sparks (v2: xp, weekXp, stars). Default null: a fresh start. */
  seedProgress: Record<string, unknown> | null;
  /** The first-visit tour (openspec in-app-guide) counts as already shown on this device. Default true, so specs that
      open Home for a fresh Player are not covered by it; e2e/tests/guide.spec.ts turns it off. */
  tourSeen: boolean;
  /** Requests that broke the live-dependency rules. Checked automatically after each test. */
  violations: string[];
  issues: Issues;
};

export const test = base.extend<Fixtures>({
  liveFirebase: [false, { option: true }],
  seedMode: ['challenger', { option: true }],
  seedConsent: [null, { option: true }],
  seedProgress: [null, { option: true }],
  seedPlayer: [null, { option: true }],
  tourSeen: [true, { option: true }],

  context: async ({ context, baseURL, seedMode, seedConsent, seedProgress, seedPlayer, tourSeen }, use) => {
    await blockAnalytics(context);
    await installModules(context, baseURL);
    await voiceFrom(context);
    // Policy reports from test runs never reach a /_csp endpoint (production's monthly review would count them)
    await context.route(/^https?:\/\/[^/]+\/_csp(\?|$)/, route => route.fulfill({ status: 204 }));
    // The same no-op counter from the start, for pages whose queue flushes before the local count.js answer runs
    await context.addInitScript(() => { const w = window as any; w.goatcounter ||= {}; if (typeof w.goatcounter.count !== 'function') w.goatcounter.count = () => {}; });
    // A returning player with a mode, sound off. Only on an empty profile, so reloads keep progress.
    // Sound is off only when nothing set it yet: Playwright does not order this context script against a test's own
    // page.addInitScript, so a test that turns sound on (vm.sound '1') keeps it whichever script runs first.
    await context.addInitScript(([mode, consent, progress, more]) => {
      try {
        if (!localStorage.getItem('vm.players')) {
          if (localStorage.getItem('vm.sound') === null) localStorage.setItem('vm.sound', '0');
          if (mode) localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode, created: Date.now(), ...(consent || {}), ...(more || {}) }] }));
          if (mode && progress) localStorage.setItem('mathquest.v1.p1', JSON.stringify(progress));
        }
      } catch (e) { /* storage blocked: the app copes */ }
    }, [seedMode, seedConsent, seedProgress, seedPlayer] as const);
    if (tourSeen) await context.addInitScript(() => { try { if (!localStorage.getItem('vm.tour')) localStorage.setItem('vm.tour', 'done'); } catch (e) { /* storage blocked */ } });
    await use(context);
  },

  violations: [async ({ context, liveFirebase }, use, testInfo: TestInfo) => {
    const violations: string[] = [];
    await context.route(FIRESTORE, route => {
      const r = route.request();
      if (isFirestoreWrite(r.method(), r.url())) {
        violations.push(`Firestore write attempted: ${r.method()} ${r.url()}`);
        return route.abort('blockedbyclient');
      }
      if (!liveFirebase) {
        violations.push(`Firestore request in a test without liveFirebase: ${r.method()} ${r.url()}`);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    if (!liveFirebase) {
      await context.route(FIREBASE_SDK, route => {
        const file = new URL(route.request().url()).pathname.split('/').pop() || '';
        const body = FAKE_SDK[file];
        if (!body) { violations.push(`Unexpected Firebase SDK file: ${route.request().url()}`); return route.abort('blockedbyclient'); }
        return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body });
      });
      await context.route(FIREBASE_AUTH, route => {
        violations.push(`Firebase Auth request (would create an anonymous account): ${route.request().url()}`);
        return route.abort('blockedbyclient');
      });
    }
    await use(violations);
    expect(violations, `live-dependency rules broken in "${testInfo.title}"`).toEqual([]);
  }, { auto: true }],

  issues: async ({ page }, use) => {
    const issues: Issues = { console: [], failed: [] };
    // WebKit logs the stricter Report-Only policy's reports (style="" and Trusted Types) as console errors; they block nothing
    page.on('console', m => { if (m.type() === 'error' && !/^\[Report Only\]/.test(m.text()) && !voiceHostUnset(m.location().url || '', m.text())) issues.console.push(`${m.text()} (${m.location().url || 'inline'})`); });
    page.on('pageerror', e => issues.console.push(`pageerror: ${e.message}`));
    page.on('requestfailed', r => {
      const err = r.failure()?.errorText || '';
      // Navigations away, media cancelled by the browser and requests the fixtures block are not failures
      if (ANALYTICS.test(r.url()) || voiceHostUnset(r.url(), err) || /ERR_ABORTED|ERR_BLOCKED_BY_CLIENT|cancelled|NS_BINDING_ABORTED/i.test(err)) return;
      issues.failed.push(`${err} ${r.url()}`);
    });
    page.on('response', r => { if (r.status() >= 400 && !ANALYTICS.test(r.url())) issues.failed.push(`${r.status()} ${r.url()}`); });
    await use(issues);
  },
});

export { expect };

export const APP = '/play/';

/* Route addresses (openspec change indexable-routes, design D2 and D3): every screen is a path under APP, its route
   key without the '#' ('#/arena' is at '/play/arena'; Home is APP), lowercase, with the Skill map at skills and the
   second names (tricks, progress, duel, learn) answering with their screen's one path. js/paths.js is the one table
   (BASE there is APP without its slash; task 2.2 moves both to /learn); this mirror is what a spec expects to see in
   the address bar and in a drawn link's href. */
const ONE_PATH: Record<string, string> = { '#/learn': 'skills', '#/tricks': 'dojo', '#/progress': 'me', '#/duel': 'arena/party' };
/** The address of a route: pathTo('#/arena') is '/play/arena', pathTo('#/') is APP; a path is given back as it is. */
export function pathTo(route: string): string {
  if (route.startsWith('/')) return route;
  if (route === '#/' || route === '#' || route === '') return APP;
  const rest = ONE_PATH[route] ?? route.replace(/^#\//, '');
  const code = /^(dojo|arena|games|sutras)\/[a-z-]+\//.test(rest); // a play experience's parameters (a share code) keep their case
  return APP + (code ? rest : rest.toLowerCase());
}
const reEscape = (s: string) => s.replace(/[/.?+*^$()[\]{}|\\]/g, '\\$&');
/** For toHaveURL: the page is at that route's address (and nothing follows it). */
export const atRoute = (route: string) => new RegExp(`${reEscape(pathTo(route))}$`);
/** The attribute selector of a link to a route, as the game draws it: a${hrefTo('#/arena')} is a[href="/play/arena"]. */
export const hrefTo = (route: string) => `[href="${pathTo(route)}"]`;

/** Serves the app a transformed video list. `transform` is JavaScript source for a function (list) => list, run in
    the page over the real js/videos.js (every other export passes through), so a scenario can hold its premise
    (a Skill with no hand-matched video, exactly one, a planted counting video) whatever the catalog grows into.
    Call before open(); the test's own e2eMod('videos') in page.evaluate gets the same list. */
export async function withVideos(page: Page, transform: string) {
  const REAL = `/js/videos.js?e2e-real`;
  const body = `export * from '${REAL}';\nimport { VIDEOS as REAL } from '${REAL}';\nexport const VIDEOS = (${transform})(REAL);\n`;
  await page.route(/\/js\/videos\.js(\?(?!e2e-real).*)?$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body }));
}

/** Opens the app at a route and waits for its view. open(page, '#/dojo') loads the page with that fragment (an old
    link: the router turns it into its path before the view draws); open(page, '/play/dojo') loads that path cold. */
export async function open(page: Page, route = '#/') {
  await page.goto(route.startsWith('/') ? route : `${APP}${route === '#/' ? '' : route}`);
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
}

/** A fake clock that moves only when the test moves it (page.clock.runFor / fastForward). page.clock.install()
    alone lets time keep flowing, so on a slow CI machine a 1.2 second wait can end before the test looks.
    Call before opening the page. */
export async function heldClock(page: Page) {
  // On the live site analytics.js loads GoatCounter after an idle timer, then flushes its queue through
  // window.goatcounter.count. The script is stubbed (blockAnalytics), so that throws, and under a fake clock it
  // throws inside runFor / fastForward. A no-op counter keeps it quiet; nothing is sent either way.
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
}

/** Console errors from the app itself. On the live site GoatCounter's script is stubbed by blockAnalytics, so the
    shared analytics.js can throw when it flushes its queue through window.goatcounter.count (WebKit names
    goatcounter in the message, Chromium only says "reading 'count'"); that is not the app's error. */
export const appErrors = (issues: Issues) => issues.console.filter(e => !/goatcounter|\(reading 'count'\)/i.test(e));

/** What the fake Firebase SDK saw (signs-ins, reads and writes the app attempted). */
export async function cloudLog(page: Page): Promise<CloudLog> {
  return page.evaluate(() => (globalThis as any).__e2eCloud || { signIns: 0, signOuts: [], apps: [], authLoaded: false, reads: [], writes: [] });
}

/** Skips the current test outside the chromium project (for checks other engines add nothing to). */
export function chromiumOnly(testInfo: TestInfo, why = 'chromium only: other engines add nothing here') {
  base.skip(testInfo.project.name !== 'chromium', why);
}

/** The Content-Security-Policy a page is served with (its response header; build.py writes it into _headers). Skips
    the test on a plain http server that sends none; on https the policy must be there. */
export async function policyOf(page: Page, baseURL?: string, path?: string) {
  const res = await page.request.get(path || new URL(page.url()).pathname);
  const csp = res.headers()['content-security-policy'];
  if (!csp && !/^https:/.test(baseURL || '')) base.skip(true, 'This server sends no policy: serve a build with its _headers (node e2e/local-server.mjs 8124 _site)');
  expect(csp, `${path || page.url()} is sent with a Content-Security-Policy header`).toBeTruthy();
  return csp!;
}

/** Whether the served js/cloud-config.js configures Firebase (World boards on). The launch ships with FIREBASE = null
    (Device boards only, change learnvedicmath tasks 1.8 and 8.5); task 8.5 pastes the new project's config. */
export async function worldBoardsOn(page: Page) {
  const res = await page.request.get('/js/cloud-config.js');
  expect(res.ok(), '/js/cloud-config.js is served').toBe(true);
  return !/export const FIREBASE\s*=\s*null\s*;/.test(await res.text());
}

/** Skips a test that is about the World board while the served config has none (the device-only launch). Each such
    spec keeps a device-only counterpart (boards-off.spec.ts) that runs in that state instead. */
export async function needsWorldBoards(page: Page) {
  base.skip(!(await worldBoardsOn(page)), 'World boards are off: js/cloud-config.js has FIREBASE = null until task 8.5 (device-only launch)');
}

/** Whether this deploy has a Studio voice: its published js/voice-index.js names a voice host. A build with
    build.py --voice off (CI deploys this way until the R2 voice host is set up, PR #96) publishes an index with no host
    and no recording, so read aloud and every Listen button use the device voice, and the policy leaves the voice host
    out. Read from the server, not through the page, so a spec's own route for the index does not change the answer. */
export async function studioVoiceOn(page: Page) {
  const res = await page.request.get('/js/voice-index.js');
  expect(res.ok(), '/js/voice-index.js is served').toBe(true);
  const m = (await res.text()).match(/export const STUDIO\s*=\s*(\{[\s\S]*\})\s*;/);
  expect(m, '/js/voice-index.js exports STUDIO').toBeTruthy();
  return !!JSON.parse(m![1]).base;
}

/** Skips a test that only means something with recorded voice (a recording or clip plays, the studio voice takes over)
    while the deploy has none. The device-voice cases keep running, and these switch back on once a build with a voice
    host is deployed. */
export async function needsStudioVoice(page: Page) {
  base.skip(!(await studioVoiceOn(page)), 'No Studio voice in this deploy: the published js/voice-index.js names no voice host (build.py --voice off until R2 is set up), so the device voice reads');
}

/** Shows the World board in a Board (only a Player whose Age answer is 13 or over has the button; openspec board-identity,
    change learnvedicmath): taps Show World board, then waits until the World tab is selected. */
export async function showWorld(page: Page, board: string) {
  const wrap = page.locator(board);
  await wrap.locator('[data-show-world]').click();
  await expect(wrap.locator('[data-src="world"]')).toHaveAttribute('aria-selected', 'true');
}

/** Turns Pause motion on or off from the music panel in the header (openspec accessibility: the switch is on the Me
    page and in the music panel; the site has no Explore menu). Returns the switch's new aria-checked value. */
export async function togglePauseMotion(page: Page) {
  await page.locator('#vmMBtn').click();
  const sw = page.locator('#vmMotion');
  await expect(sw).toBeVisible();
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  const after = (await sw.getAttribute('aria-checked')) === 'true';
  await page.keyboard.press('Escape');
  await expect(page.locator('#vmMPanel')).toBeHidden();
  return after;
}

/** Types an answer into the Arena's hidden entry. On touch screens it is read-only (no system keyboard over the
    keypad, openspec game-shell-and-calm), so the answer goes in as physical key presses, as a keyboard would. */
export async function typeAnswer(page: Page, value: string) {
  const typ = page.locator('#arType');
  if (await typ.evaluate(e => (e as HTMLInputElement).readOnly)) await page.keyboard.type(value);
  else await typ.fill(value);
}
