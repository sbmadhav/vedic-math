import { test, expect, APP, open, cloudLog, policyOf, showWorld, needsWorldBoards } from '../fixtures';
import type { Page } from '@playwright/test';

/* content-security spec (change learnvedicmath), Requirements "Only the origins the app uses are allowed" and
   "Leaderboard hosts follow the configuration": one test per scenario. Skips against a server that sends no policy.
   YouTube is answered with an empty page and the Firebase SDK is the fixtures' fake, served at its /vendor/firebase/
   URL on this site, so script-src is checked. */

type Violation = { directive: string; blocked: string; source: string };
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
      if (e.disposition === 'report') return; // the stricter Report-Only policy only reports
      w.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}` });
    });
  });
  const console: string[] = [];
  page.on('console', m => { if (/Content.Security.Policy|Refused to/i.test(m.text()) && !/report.only/i.test(m.text())) console.push(m.text()); });
  return { console, list: () => page.evaluate(() => ((window as any).__csp || []) as Violation[]) };
}
async function none(page: Page, v: Awaited<ReturnType<typeof watchViolations>>, where: string) {
  expect(await v.list(), `securitypolicyviolation events on ${where}`).toEqual([]);
  expect(v.console, `CSP console messages on ${where}`).toEqual([]);
}
const policy = policyOf;
async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
}
test.beforeEach(async ({ page }) => { await noYouTube(page); });

test('Every main route: home, Learn, a Grade, a Skill, the Dojo, the Arena, Games, a game, the Sutras, Watch, Me and a Star round fire no violation', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await none(page, v, 'home');
  for (const hash of ['#/learn', '#/grade/3', '#/skill/3-mult', '#/dojo', '#/arena', '#/games', '#/game/times-sprint', '#/sutras', '#/watch', '#/me', '#/star/sq5/1']) {
    await page.goto(`${APP}${hash}`);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    // Each goto is a new document with a fresh recorder: check this route before leaving it
    await none(page, v, hash);
  }
});

test('A video plays in the page: the thumbnails show, the YouTube player frame loads, and no violation fires', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page, '#/watch');
  await policy(page, baseURL);
  const card = page.locator('#view button.watch-card').first();
  await expect(card).toBeVisible();
  await expect.poll(() => card.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await card.click();
  await expect(page.locator('dialog.vm-player iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await expect.poll(() => page.frames().some(f => /youtube-nocookie\.com/.test(f.url()))).toBe(true);
  await none(page, v, '#/watch');
});

test('The natural voice worker: started from its import map URL it runs with no violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  const started = await page.evaluate(() => new Promise<string>(resolve => {
    const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports;
    const url = map['/js/voice-worker.js'] || '/js/voice-worker.js';
    try {
      const w = new Worker(url, { type: 'module' });
      w.onerror = e => resolve('error: ' + (e.message || 'worker failed'));
      // An unloaded worker answers a gen with genError 'not loaded': that reply proves it started
      w.onmessage = e => { if (e.data?.type === 'genError' && e.data.id === 'csp-probe') { w.terminate(); resolve('ok'); } };
      w.postMessage({ type: 'gen', id: 'csp-probe', text: '' });
      setTimeout(() => { w.terminate(); resolve('no reply from the worker'); }, 10_000);
    } catch (e) { resolve('threw: ' + e); }
  }));
  expect(started).toBe('ok');
  await none(page, v, 'the voice worker');
});

test.describe('a Player 13 or over', () => {
  test.use({ seedConsent: { age: 'adult' } });
test('World boards: the Arena World board loads through the Firebase SDK with no violation', async ({ page, baseURL }) => {
  await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
  const v = await watchViolations(page);
  await open(page, '#/arena');
  await policy(page, baseURL);
  await showWorld(page, '#lbDay');
  await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThan(0);
  await none(page, v, '#/arena');
});
});

test('Leaderboards off: the policy lists the Firebase hosts only while js/cloud-config.js configures them', async ({ page, baseURL }) => {
  await open(page);
  const csp = await policy(page, baseURL);
  const configured = await page.evaluate(async () => { const m: any = await import('/js/cloud-config.js' as string); return !!m.FIREBASE; });
  const names = /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/;
  // test/build.test.mjs builds with FIREBASE = null and checks the policy then lists no Firebase or Google host
  expect(names.test(csp)).toBe(configured);
});

test('The landing page: its policy lists no Firebase, Google or YouTube host', async ({ page, baseURL }) => {
  const csp = await policy(page, baseURL, '/');
  expect(csp).not.toMatch(/google|gstatic|firebase|youtube/);
  for (const gone of ['i.ytimg.com', 'gc.zgo.at', 'sbmadhav.com']) expect(csp).not.toContain(gone);
});
