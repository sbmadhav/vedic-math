import { test, expect, APP } from '../fixtures';
import { openTrick, showSteps } from '../trick-kit';

/* trick-pages spec, Requirements "Trick pages stay light and leave the game alone" and "Trick pages store nothing and
   load no Firebase": one test per scenario. The byte budgets themselves are the build's gates (tools/budget.ts); here
   the game's first-load set is checked for anything of the Trick pages. */

test("The game's first load: no /tricks/ file in the worker's precache list or the game's import map", async ({ request }) => {
  const sw = await (await request.get('/sw.js')).text();
  const block = sw.match(/const PRECACHE = (\[[\s\S]*?\]);/);
  test.skip(!block || block[1] === '[]', 'a dev build has no precache list');
  const urls = (JSON.parse(block![1]!) as [string, string][]).map(([u]) => u);
  expect(urls.length).toBeGreaterThan(50);
  expect(urls.filter(u => u.startsWith('/tricks/') || u.includes('calculator'))).toEqual([]);
  const game = await (await request.get(APP)).text();
  const map = game.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  expect(map, 'the game page has its import map').toBeTruthy();
  expect(Object.keys((JSON.parse(map![1]!) as { imports: Record<string, string> }).imports).filter(k => k.startsWith('/tricks/'))).toEqual([]);
  expect(game).not.toContain('/tricks/calculator.js');
});

test.describe('a visitor with nothing stored', () => {
  test.use({ seedMode: null, tourSeen: false });
  test('Nothing stored: using the calculator leaves localStorage and sessionStorage unchanged and reaches no Google host', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch { /* data: URLs */ } });
    await openTrick(page, 'multiply-by-11');
    // What is stored after the page loads (the fixtures seed sound off on an empty profile); using the calculator changes none of it
    const snapshot = () => page.evaluate(() => JSON.stringify([Object.entries(localStorage).sort(), Object.entries(sessionStorage).sort()]));
    const before = await snapshot();
    expect(before).not.toContain('tk');
    await showSteps(page, 234);
    await page.locator('#tkNext').click();
    await page.locator('#tkBack').click();
    await page.locator('#tkAll').click();
    await page.locator('#tkRand').click();
    await showSteps(page, 7);
    await expect(page.locator('#tkErr')).toHaveText('Pick a number from 10 to 99999.');
    expect(await snapshot()).toBe(before);
    expect([...hosts].filter(h => /(^|\.)(google\.com|gstatic\.com|googleapis\.com|firebaseapp\.com|youtube\.com)$/.test(h))).toEqual([]);
    expect([...hosts].filter(h => h !== new URL(page.url()).host)).toEqual([]);
  });
});
