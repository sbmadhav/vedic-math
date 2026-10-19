import { test as base, expect, type Page, type BrowserContext, type TestInfo } from '@playwright/test';

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
   - GoatCounter is answered locally so test runs do not count as visits. Its count.js is served from the main
     site (/assets/count.js); gc.zgo.at stays in the pattern for a main site that still loads it from there. */

export const ANALYTICS = /(^https:\/\/[^/]*goatcounter\.com\/)|(^https:\/\/gc\.zgo\.at\/)|(^https?:\/\/[^/]+\/assets\/count\.js(\?|$))/;
export const FIREBASE_SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\//;
export const FIREBASE_AUTH = /^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\//;
export const FIRESTORE = /^https:\/\/firestore\.googleapis\.com\//;

/* GoatCounter's count.js defines window.goatcounter.count, and the shared /assets/analytics.js flushes its
   queue through it once count.js loads. The local answer has to define it too (as a no-op), or that flush
   throws on the live site: as a page error, and inside page.clock.runFor under a fake clock. Nothing is sent. */
const NO_OP_COUNTER = '/* analytics blocked in tests */ window.goatcounter = window.goatcounter || {}; if (typeof window.goatcounter.count !== "function") window.goatcounter.count = function () {};';
export async function blockAnalytics(ctx: BrowserContext | Page) {
  await ctx.route(ANALYTICS, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: NO_OP_COUNTER }));
}

/** True for a request that could change production Firestore data. */
export function isFirestoreWrite(method: string, url: string) {
  if (!FIRESTORE.test(url)) return false;
  if (/\/Write\/channel/.test(url)) return true;
  if (/:(commit|batchWrite|beginTransaction|rollback)(\?|$)/.test(url)) return true;
  if (['PATCH', 'PUT', 'DELETE'].includes(method)) return true;
  if (method === 'POST' && /\/documents(\/|:|\?|$)/.test(url) && !/:(runQuery|runAggregationQuery|batchGet|listCollectionIds)(\?|$)/.test(url)) return true;
  return false;
}

/* Fake Firebase modules served in place of https://www.gstatic.com/firebasejs/<v>/firebase-*.js.
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

  context: async ({ context, seedMode, seedConsent, seedProgress, seedPlayer, tourSeen }, use) => {
    await blockAnalytics(context);
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
    page.on('console', m => { if (m.type() === 'error') issues.console.push(`${m.text()} (${m.location().url || 'inline'})`); });
    page.on('pageerror', e => issues.console.push(`pageerror: ${e.message}`));
    page.on('requestfailed', r => {
      const err = r.failure()?.errorText || '';
      // Navigations away, media cancelled by the browser and requests the fixtures block are not failures
      if (ANALYTICS.test(r.url()) || /ERR_ABORTED|ERR_BLOCKED_BY_CLIENT|cancelled|NS_BINDING_ABORTED/i.test(err)) return;
      issues.failed.push(`${err} ${r.url()}`);
    });
    page.on('response', r => { if (r.status() >= 400 && !ANALYTICS.test(r.url())) issues.failed.push(`${r.status()} ${r.url()}`); });
    await use(issues);
  },
});

export { expect };

export const APP = '/vedic-math/';

/** Opens the app at a hash route (for example '#/dojo') and waits for the view to render. */
/** Serves the app a transformed video list. `transform` is JavaScript source for a function (list) => list, run in
    the page over the real js/videos.js (every other export passes through), so a scenario can hold its premise
    (a Skill with no hand-matched video, exactly one, a planted counting video) whatever the catalog grows into.
    Call before open(); the test's own import('/vedic-math/js/videos.js') in page.evaluate gets the same list. */
export async function withVideos(page: Page, transform: string) {
  const REAL = `${APP}js/videos.js?e2e-real`;
  const body = `export * from '${REAL}';\nimport { VIDEOS as REAL } from '${REAL}';\nexport const VIDEOS = (${transform})(REAL);\n`;
  await page.route(/\/vedic-math\/js\/videos\.js(\?(?!e2e-real).*)?$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body }));
}

export async function open(page: Page, hash = '#/') {
  await page.goto(`${APP}${hash === '#/' ? '' : hash}`);
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

/** Opens the site-wide Explore menu and returns the dialog locator. */
export async function openExplore(page: Page) {
  await page.locator('#exploreBtn').click();
  const dlg = page.locator('dialog.xpm');
  await expect(dlg).toBeVisible();
  return dlg;
}

/** Shows the World board in a Board (only a Player whose Age answer is 13 or over has the button; openspec board-identity,
    change learnvedicmath): taps Show World board, then waits until the World tab is selected. */
export async function showWorld(page: Page, board: string) {
  const wrap = page.locator(board);
  await wrap.locator('[data-show-world]').click();
  await expect(wrap.locator('[data-src="world"]')).toHaveAttribute('aria-selected', 'true');
}

/** Types an answer into the Arena's hidden entry. On touch screens it is read-only (no system keyboard over the
    keypad, openspec game-shell-and-calm), so the answer goes in as physical key presses, as a keyboard would. */
export async function typeAnswer(page: Page, value: string) {
  const typ = page.locator('#arType');
  if (await typ.evaluate(e => (e as HTMLInputElement).readOnly)) await page.keyboard.type(value);
  else await typ.fill(value);
}
