import { test, expect, open, chromiumOnly, FIRESTORE, isFirestoreWrite } from './fixtures';

/* The ONLY test that talks to production Firebase. It loads the real SDK, which signs in
   anonymously once (one anonymous account per run), and reads the World leaderboards shown in
   the Arena lobby and on a game page. It is read-only: the fixture aborts and fails on any
   write-shaped Firestore request, and the test never plays a round or earns XP.
   Chromium only, serial, no retries (a retry would create another anonymous account). */

test.use({ liveFirebase: true });
test.describe.configure({ mode: 'serial', retries: 0 });

test('World leaderboards load from live Firestore (read-only)', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'one anonymous sign-in per run: chromium only');
  // App Check and Firebase Auth only accept the production origin (localhost would need a debug token)
  test.skip(!/^https:\/\/sbmadhav\.com$/.test(testInfo.project.use.baseURL || ''), 'live Firebase only answers https://sbmadhav.com');
  test.setTimeout(90_000);
  const firestore: string[] = [];
  let signUps = 0;
  page.on('request', r => {
    if (FIRESTORE.test(r.url())) firestore.push(`${r.method()} ${isFirestoreWrite(r.method(), r.url()) ? 'WRITE' : 'read'} ${r.url().split('?')[0]}`);
    if (/identitytoolkit\.googleapis\.com\/.*accounts:signUp/.test(r.url())) signUps++;
  });

  // Every board a visitor can open: Arena today / this week / weekly XP, and a game's today / this week
  const boards: [string, string, string][] = [
    ['#/arena', '#lbDay', 'Arena today'], ['#/arena', '#lbWeek', 'Arena this week'], ['#/arena', '#lbXp', 'Most XP this week'],
    ['#/game/times-sprint', '#gbDay', 'Times sprint today'], ['#/game/times-sprint', '#gbWeek', 'Times sprint this week'],
  ];
  for (const [route, id, label] of boards) {
    if (!page.url().endsWith(route)) await open(page, route);
    const body = page.locator(`${id} .lb-body`);
    await expect(page.locator(`${id} [data-src="world"]`)).toHaveAttribute('aria-selected', 'true');
    await expect(body).not.toContainText('Loading world scores', { timeout: 30_000 });
    // Ranked rows or the empty state, never the fallback for a backend that refused or failed
    await expect.soft(body, `${label} (${id} on ${route}) should load from Firestore`).not.toContainText('not reachable', { timeout: 1000 });
    const rows = body.locator('ol.lb li');
    for (let i = 0; i < await rows.count(); i++) {
      await expect.soft(rows.nth(i).locator('.lb-name')).toHaveText(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
      await expect.soft(rows.nth(i).locator('b')).toHaveText(/^[\d,]+$/);
    }
  }
  expect(signUps, 'at most one anonymous account per run').toBeLessThanOrEqual(1);
  expect(firestore.some(r => r.includes(' read '))).toBe(true);
  expect(firestore.filter(r => r.includes('WRITE'))).toEqual([]);
});
