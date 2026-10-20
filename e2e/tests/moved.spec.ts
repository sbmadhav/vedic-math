import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

/* The moved page (openspec change learnvedicmath, design D9, progress-handoff spec; task 10.4): what
   https://sbmadhav.com/vedic-math/ serves in Phase B. Runs only with MOVED_URL, against a local build:
     python3 build.py --target moved && node e2e/local-server.mjs 8125 _moved /vedic-math/
     MOVED_URL=http://localhost:8125/vedic-math/ npx playwright test tests/moved.spec.ts
   learnvedicmath.com is answered locally (the address and its fragment are what is checked; e2e/tests/import.spec.ts
   covers the import page), and so is the one GoatCounter count. */
const MOVED = process.env.MOVED_URL || '';
const test = base.extend<{ log: { counts: string[]; asked: string[] } }>({
  log: async ({ context }, use) => {
    const log = { counts: [] as string[], asked: [] as string[] };
    await answerLocally(context, log);
    await use(log);
  },
});
test.skip(!MOVED, 'MOVED_URL is not set (the moved page is tested against a local _moved build)');

async function answerLocally(context: BrowserContext, log: { counts: string[]; asked: string[] }) {
  context.on('request', r => log.asked.push(r.url()));
  await context.route('https://learnvedicmath.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>new site</title><h1>new site</h1>' }));
  await context.route(/^https:\/\/sbmadhav\.goatcounter\.com\//, r => { log.counts.push(new URL(r.request().url()).searchParams.get('p') || ''); return r.fulfill({ status: 204 }); });
  // The main site's design system, which only styles the page
  await context.route(/\/design-system\//, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  // A blank page on the old origin to set up storage from, before the moved page runs
  await context.route(/\/vedic-math\/__seed$/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }));
}
async function seed(page: Page, items: Record<string, unknown>, caches: string[] = []) {
  await page.goto(MOVED + '__seed');
  await page.evaluate(async ([items, names]) => {
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    for (const n of names) await (await self.caches.open(n)).put('/vedic-math/x', new Response('x'));
  }, [items, caches] as const);
}
const payloadOf = (url: string) => {
  const q = new URLSearchParams(new URL(url).hash.slice(1));
  return { v: q.get('v'), r: q.get('r'), data: JSON.parse(gunzipSync(Buffer.from(q.get('d') || '', 'base64url')).toString()) };
};
const T = 1_760_000_000_000;
const PLAYERS = { active: 'p1', list: [{ id: 'p1', name: 'Brave Otter 17', avatar: 'plum', mode: 'explorer', created: T, age: 10, parentOk: T }] };
const REC = { v: 3, sparks: 1234, skills: { 'v-sq5': { n: 9, c: 8, m: 0.9, streak: 3, last: T } }, counts: { answers: 9 } };

test('a Player with progress: old caches go, madhav-* stays, and the progress rides in the fragment to /import/', async ({ page, log }) => {
  await seed(page, { 'vm.players': PLAYERS, 'mathquest.v1.p1': REC, 'vm.cloudUids': { p1: 'secret-uid' }, 'vm.board': [{ pid: 'p1', score: 3 }], theme: 'dark' },
    ['vedic-math-abc', 'vedic-math-sounds', 'madhav-test']);
  await page.goto(MOVED + '#/arena');
  await page.waitForURL(/^https:\/\/learnvedicmath\.com\/import\/#/);
  const url = page.url();
  expect(url).not.toContain('?');
  const { v, r, data } = payloadOf(url);
  expect(v).toBe('1');
  expect(r).toBe('#/arena');
  expect(data.players.list.map((p: any) => p.name)).toEqual(['Brave Otter 17']);
  expect(data.players.list[0].age).toBe(10);
  expect(data.records.p1.sparks).toBe(1234);
  expect(data.settings).toEqual({ theme: 'dark' });
  const all = JSON.stringify(data);
  for (const gone of ['parentOk', 'secret-uid', 'board']) expect(all).not.toContain(gone);
  // Back on the old origin: the caches and the migration mark
  await page.goto(MOVED + '__seed');
  expect((await page.evaluate(() => caches.keys())).sort()).toEqual(['madhav-test']);
  expect(await page.evaluate(() => localStorage.getItem('vm.migratedAt'))).toMatch(/^\d+$/);
  expect(log.counts).toEqual(['move/handoff/sent']);
  const own = log.asked.filter(u => u.startsWith(new URL(MOVED).origin) && !u.endsWith('__seed') && !u.includes('/design-system/'));
  expect(own.every(u => /\/vedic-math\/(#\/arena|js\/handoff-(pack|schema)\.js\?v=\w+)?$/.test(u)), own.join('\n')).toBe(true);
  expect(log.asked.filter(u => /firebase|gstatic|googleapis|\/js\/app\.js/.test(u))).toEqual([]);
});

test('an empty device goes straight to the game on the same route', async ({ page, log }) => {
  await page.goto(MOVED + '#/dojo');
  await page.waitForURL('https://learnvedicmath.com/play/#/dojo');
  expect(log.counts).toEqual(['move/handoff/empty']);
});

test('a deep old path gets the moved page too (404.html)', async ({ page }) => {
  await page.goto(MOVED + 'some/old/file.html#/sutras');
  await page.waitForURL('https://learnvedicmath.com/play/#/sutras');
});

test('a device on the oldest format (a bare mathquest.v1 record) is handed off as p1', async ({ page }) => {
  await seed(page, { 'mathquest.v1': { skills: { a: { n: 1, c: 1, m: 0.35, streak: 1, last: T } }, xp: 40 } });
  await page.goto(MOVED);
  await page.waitForURL(/^https:\/\/learnvedicmath\.com\/import\/#/);
  const { data, r } = payloadOf(page.url());
  expect(r).toBeNull();
  expect(data.players.list.map((p: any) => [p.id, p.avatar, p.mode])).toEqual([['p1', 'teal', null]]);
  expect(data.records.p1.xp).toBe(40);
});

test('progress too big for a link stays here, and the page says so with a link to the new site', async ({ page, log }) => {
  await seed(page, {});
  await page.evaluate(() => {
    const rnd = () => Math.random().toString(36).slice(2);
    const list = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + (i + 1), name: 'Swift Tiger 42', avatar: 'teal', mode: null, created: 1 }));
    localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list }));
    for (const p of list) {
      const skills: Record<string, unknown> = {};
      for (let i = 0; i < 4000; i++) skills[rnd() + i] = { n: i, c: i, m: Math.random(), streak: 1, last: Date.now() - i };
      localStorage.setItem('mathquest.v1.' + p.id, JSON.stringify({ skills }));
    }
  });
  await page.goto(MOVED);
  await expect(page.locator('#stay')).toBeVisible();
  await expect(page.locator('#moving')).toBeHidden();
  await expect(page.locator('#go')).toHaveAttribute('href', 'https://learnvedicmath.com/');
  expect(page.url()).toMatch(/\/vedic-math\/$/);
  expect(log.counts).toEqual(['move/handoff/too-big']);
});

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });
  test('the page sends the visitor to learnvedicmath.com at once, and shows a link', async ({ page }) => {
    await page.goto(MOVED, { waitUntil: 'commit' });
    await page.waitForURL('https://learnvedicmath.com/');
  });
});

test.describe('the old service worker', () => {
  test.use({ serviceWorkers: 'allow' });
  test('is unregistered by the moved page', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Playwright routes worker requests in Chromium only');
    // A stand-in for the old app's worker (the published KILL worker would retire itself)
    await page.context().route(/\/vedic-math\/old-sw\.js$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'self.addEventListener("fetch", () => {});' }));
    await page.goto(MOVED + '__seed');
    await page.evaluate(async () => { await navigator.serviceWorker.register('/vedic-math/old-sw.js', { scope: '/vedic-math/' }); await navigator.serviceWorker.ready; });
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(1);
    await page.goto(MOVED);
    await page.waitForURL(/^https:\/\/learnvedicmath\.com\//);
    await page.goto(MOVED + '__seed');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  });
});
