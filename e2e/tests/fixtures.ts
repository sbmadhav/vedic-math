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
   - GoatCounter is answered locally so test runs do not count as visits. */

export const ANALYTICS = /(^https:\/\/[^/]*goatcounter\.com\/)|(^https:\/\/gc\.zgo\.at\/)/;
export const FIREBASE_SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\//;
export const FIREBASE_AUTH = /^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\//;
export const FIRESTORE = /^https:\/\/firestore\.googleapis\.com\//;

export async function blockAnalytics(ctx: BrowserContext | Page) {
  await ctx.route(ANALYTICS, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* analytics blocked in tests */' }));
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
   They implement exactly the calls js/cloud.js makes. Sign-in succeeds with a fixed fake uid, reads
   return empty boards, and writes are only recorded in window.__e2eCloud.writes. */
const FAKE_HEAD = `const C = (globalThis.__e2eCloud ||= { signIns: 0, authLoaded: false, reads: [], writes: [] });`;
const FAKE_SDK: Record<string, string> = {
  'firebase-app.js': `${FAKE_HEAD}
export const initializeApp = cfg => ({ options: cfg, fake: true });`,
  'firebase-app-check.js': `${FAKE_HEAD}
export class ReCaptchaEnterpriseProvider { constructor(k) { this.k = k; } }
export class ReCaptchaV3Provider { constructor(k) { this.k = k; } }
export const initializeAppCheck = () => ({ fake: true });`,
  'firebase-auth.js': `${FAKE_HEAD}
C.authLoaded = true;
export const getAuth = () => (globalThis.__e2eAuth ||= { currentUser: null, authStateReady: async () => {} });
export async function signInAnonymously(a) { C.signIns++; a.currentUser = { uid: 'e2e-fake-uid', isAnonymous: true }; return { user: a.currentUser }; }`,
  'firebase-firestore.js': `${FAKE_HEAD}
const path = parts => parts.filter(p => typeof p === 'string').join('/');
export const getFirestore = () => ({ fake: true });
export const doc = (db, ...p) => ({ path: path(p) });
export const collection = (db, ...p) => ({ path: path(p) });
export const orderBy = (f, d) => ({ orderBy: [f, d] });
export const limit = n => ({ limit: n });
export const query = (c, ...q) => ({ path: c.path, q });
export async function getDoc(ref) { C.reads.push(ref.path); return { exists: () => false, data: () => undefined }; }
export async function getDocs(q) { C.reads.push(q.path); return { docs: [] }; }
export async function setDoc(ref, data) { C.writes.push({ path: ref.path, data: JSON.parse(JSON.stringify(data)) }); }
export const serverTimestamp = () => ({ serverTimestamp: true });
export const Timestamp = { fromMillis: ms => ({ millis: ms }) };`,
};

export type Issues = { console: string[]; failed: string[] };
export type Mode = 'explorer' | 'challenger' | 'pro';
export type CloudLog = { signIns: number; authLoaded: boolean; reads: string[]; writes: { path: string; data: Record<string, unknown> }[] };
/** The first Player's posting consent: the Age answer and, for under-13s, when the Parent step was given. */
export type Consent = { age: number | 'adult'; parentOk?: number | null };

type Fixtures = {
  /** Load the real Firebase SDK (anonymous sign-in, live Firestore reads). Default false. */
  liveFirebase: boolean;
  /** Play mode stored for the first player before the page loads, or null for a first visit. */
  seedMode: Mode | null;
  /** Age answer (and Parent step) stored for that player. Default null: not answered, so nothing may be posted. */
  seedConsent: Consent | null;
  /** Requests that broke the live-dependency rules. Checked automatically after each test. */
  violations: string[];
  issues: Issues;
};

export const test = base.extend<Fixtures>({
  liveFirebase: [false, { option: true }],
  seedMode: ['challenger', { option: true }],
  seedConsent: [null, { option: true }],

  context: async ({ context, seedMode, seedConsent }, use) => {
    await blockAnalytics(context);
    // A returning player with a mode, sound off. Only on an empty profile, so reloads keep progress.
    await context.addInitScript(([mode, consent]) => {
      try {
        if (!localStorage.getItem('vm.players')) {
          localStorage.setItem('vm.sound', '0');
          if (mode) localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode, created: Date.now(), ...(consent || {}) }] }));
        }
      } catch (e) { /* storage blocked: the app copes */ }
    }, [seedMode, seedConsent] as const);
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
  return page.evaluate(() => (globalThis as any).__e2eCloud || { signIns: 0, authLoaded: false, reads: [], writes: [] });
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
