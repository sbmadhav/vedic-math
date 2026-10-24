import { gzipSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, chromiumOnly } from './fixtures';

/* The hand-off import page, /import/ (openspec change learnvedicmath, design D9, progress-handoff spec; task 10.2).
   The moved page on sbmadhav.com sends a Player here with their progress in the fragment. The page takes the fragment
   out of the address bar first, checks it strictly, asks once, and writes only after a choice. e2e/tests/moved.spec.ts
   covers the other side. */

const T = 1_760_000_000_000;
const OTTER = { id: 'p1', name: 'Brave Otter 17', avatar: 'plum', mode: 'explorer', created: T, age: 10 };
const COMET = { id: 'pk2', name: 'Cosmic Comet 33', avatar: 'sky', mode: 'pro', created: T, age: 'adult' };
const rec = (sparks: number) => ({ v: 3, sparks, skills: { 'v-sq5': { n: 9, c: 8, m: 0.9, streak: 3, last: T } }, days: {}, best: {}, last: 'v-sq5', grade: null,
  badges: {}, counts: { answers: 9 }, seen: {}, medals: { 'g:bolt:1': 2 }, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null });
const payload = (edit: (p: any) => void = () => {}) => {
  const p: any = { v: 1, from: 'sbmadhav.com', at: T, players: { active: 'p1', list: [{ ...OTTER }, { ...COMET }] }, records: { p1: rec(1234), pk2: rec(7) }, settings: { theme: 'dark', 'vm.calm': '1' } };
  edit(p);
  return gzipSync(Buffer.from(JSON.stringify(p))).toString('base64url');
};
const link = (d: string, route = '#/arena') => `/import/#v=1&d=${d}&r=${encodeURIComponent(route)}`;
const stored = (page: Page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
const names = async (page: Page) => JSON.parse((await stored(page))['vm.players'] || '{"list":[]}').list.map((p: any) => p.name);

/* Every request leaving the page, to check the payload never rides along */
function watch(page: Page) {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url() + ' ' + (r.postData() || '')));
  return urls;
}

test.describe('a device with no progress here', () => {
  test.use({ seedMode: null });

  test('the fragment is gone at once, the Players are offered, and Bring it writes them and opens the game on the route', async ({ page, issues }) => {
    const d = payload(), sent = watch(page);
    await page.goto(link(d));
    await expect(page.locator('#ho-title')).toHaveText('Bring your progress from the old site?');
    expect(page.url()).toMatch(/\/import\/$/);
    expect(await page.evaluate(() => location.hash)).toBe('');
    // Each Player is a row: an avatar tile by Mode with the first letter (decoration), the Nickname, the Mode word and Sparks
    await expect(page.locator('#ho-list li.ho-player .ho-name')).toHaveText(['Brave Otter 17', 'Cosmic Comet 33']);
    await expect(page.locator('#ho-list .ho-meta')).toHaveText(['Explorer, 1,234 Sparks', 'Pro, 7 Sparks']);
    await expect(page.locator('#ho-list .ho-avatar')).toHaveText(['B', 'C']);
    await expect(page.locator('#ho-list .ho-avatar--sun[aria-hidden="true"]')).toHaveCount(1);
    await expect(page.locator('#ho-list .ho-avatar--plum[aria-hidden="true"]')).toHaveCount(1);
    await expect(page.locator('#ho-conflict')).toBeHidden();
    expect((await stored(page))['vm.players']).toBeUndefined();
    expect(issues.console, 'the import page logs no error').toEqual([]);
    await page.locator('#ho-bring').click();
    await expect(page).toHaveURL(new RegExp(`${APP}#/arena$`));
    const s = await stored(page);
    expect(await names(page)).toEqual(['Brave Otter 17', 'Cosmic Comet 33']);
    expect(JSON.parse(s['mathquest.v1.p1']).sparks).toBe(1234);
    expect(JSON.parse(s['vm.players']).list[0].parentOk).toBeUndefined();
    expect(s.theme).toBe('dark');
    expect(s['vm.migratedAt']).toMatch(/^\d+$/);
    expect(sent.filter(u => u.includes(d.slice(0, 40)))).toEqual([]);
  });

  test('Not now writes nothing and opens the game', async ({ page }) => {
    await page.goto(link(payload(), '#/dojo'));
    await page.locator('#ho-not-now').click();
    await expect(page).toHaveURL(new RegExp(`${APP}#/dojo$`));
    // The game makes its own blank first Player; nothing from the link is in it
    const s = await stored(page);
    expect(JSON.parse(s['mathquest.v1.p1'] || '{}').sparks || 0).toBe(0);
    expect(s['vm.migratedAt'] ?? null).toBeNull();
    expect(await names(page)).not.toContain('Brave Otter 17');
  });

  test('a crafted link imports nothing, runs nothing and says so', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', dl => { dialogs++; dl.dismiss(); });
    await page.goto(link(payload(p => { p.players.list[0].name = '<img src=x onerror=alert(1)>'; })));
    await expect(page.locator('#ho-bad')).toContainText('This link did not carry progress we can use.');
    expect(page.url()).toMatch(/\/import\/$/);
    await expect(page.locator('#ho-offer')).toBeHidden();
    await expect(page.locator('main img')).toHaveCount(0);
    expect(dialogs).toBe(0);
    expect(Object.keys(await stored(page)).filter(k => !['vm.sound', 'vm.tour'].includes(k))).toEqual([]);
    const go = page.locator('#ho-bad').getByRole('link', { name: 'Go to Learn Vedic Math' });
    await expect(go).toBeVisible();
    await go.click();
    await expect(page).toHaveURL(new RegExp(`${APP}$`));
  });

  test('storage refuses every write: nothing is saved, the heading says so and takes focus, and the error shows', async ({ page }) => {
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (/^(vm\.|mathquest\.|theme$)/.test(k)) throw new DOMException('full', 'QuotaExceededError');
        return set.call(this, k, v);
      };
    });
    const d = payload();
    await page.goto(link(d));
    await expect(page.locator('#ho-title')).toHaveText('Bring your progress from the old site?');
    await page.locator('#ho-bring').click();
    await expect(page.locator('#ho-title')).toHaveText('Progress not saved');
    await expect(page.locator('#ho-title')).toBeFocused();
    await expect(page.locator('#ho-error')).toBeVisible();
    await expect(page.locator('#ho-offer')).toBeHidden();
    expect((await stored(page))['vm.players']).toBeUndefined();
    expect(page.url()).toContain('/import/#v=1&d=' + d);
    await expect(page.locator('#ho-error').getByRole('link', { name: 'Go to Learn Vedic Math' })).toBeVisible();
  });

  test('a link that is not a payload, or no fragment at all, imports nothing', async ({ page }) => {
    await page.goto('/import/#v=1&d=not-gzip-at-all');
    await expect(page.locator('#ho-bad')).toBeVisible();
    await page.goto('/import/#v=2&d=' + payload());
    await expect(page.locator('#ho-bad')).toBeVisible();
    await page.goto('/import/');
    await expect(page.locator('#ho-title')).toHaveText('Nothing to bring over');
    await expect(page.locator('#ho-none')).toBeVisible();
    expect(Object.keys(await stored(page)).filter(k => !['vm.sound', 'vm.tour'].includes(k))).toEqual([]);
  });

  test('the offer has no serious or critical axe violations, in both schemes', async ({ page }, testInfo) => {
    chromiumOnly(testInfo);
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(link(payload(p => { p.dropped = ['play']; })));
      await expect(page.locator('#ho-bring')).toBeVisible();
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${scheme} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    }
  });

  test('parts that did not fit are named', async ({ page }) => {
    await page.goto(link(payload(p => { p.dropped = ['play', 'seen']; })));
    await expect(page.locator('#ho-dropped')).toHaveText(/stay on the old site: game extras \(puzzles, gallery, daily games\), tips already seen\./);
  });
});

test.describe('a device that already has progress here', () => {
  // The fixture's Player: Swift Tiger 42 (p1), with Sparks
  test.use({ seedMode: 'challenger', seedProgress: { v: 3, sparks: 50, skills: { 'v-sq5': { n: 1, c: 1, m: 0.35, streak: 1, last: T } }, counts: { answers: 1 } } });

  test('it asks, and Keep this device\'s changes nothing', async ({ page }) => {
    await page.goto(link(payload()));
    const before = await stored(page);
    await expect(page.locator('#ho-conflict')).toBeVisible();
    await expect(page.locator('#ho-here')).toHaveText('Swift Tiger 42');
    await expect(page.locator('#ho-fresh')).toBeHidden();
    await page.locator('#ho-keep').click();
    await expect(page).toHaveURL(new RegExp(`${APP}#/arena$`));
    // The game itself fills in the record's defaults once it runs; the Players and the progress are this device's
    const after = await stored(page);
    expect(after['vm.players']).toBe(before['vm.players']);
    expect(JSON.parse(after['mathquest.v1.p1']).sparks).toBe(50);
    expect(after['vm.migratedAt'] ?? null).toBeNull();
    expect(await names(page)).toEqual(['Swift Tiger 42']);
  });

  test('Use the old site\'s replaces this device\'s Players', async ({ page }) => {
    await page.goto(link(payload()));
    await page.locator('#ho-use').click();
    await expect(page).toHaveURL(new RegExp(`${APP}#/arena$`));
    expect(await names(page)).toEqual(['Brave Otter 17', 'Cosmic Comet 33']);
    expect(JSON.parse((await stored(page))['mathquest.v1.p1']).sparks).toBe(1234);
  });

  test('Keep both adds the old site\'s Players next to this one, each with their own progress', async ({ page }) => {
    await page.goto(link(payload()));
    await page.locator('#ho-merge').click();
    await expect(page).toHaveURL(new RegExp(`${APP}#/arena$`));
    const s = await stored(page), P = JSON.parse(s['vm.players']);
    expect(P.list.map((p: any) => p.name)).toEqual(['Swift Tiger 42', 'Brave Otter 17', 'Cosmic Comet 33']);
    expect(JSON.parse(s['mathquest.v1.p1']).sparks).toBe(50);
    const otter = P.list.find((p: any) => p.name === 'Brave Otter 17');
    expect(otter.id).not.toBe('p1');
    expect(JSON.parse(s['mathquest.v1.' + otter.id]).sparks).toBe(1234);
    expect(new Set(P.list.map((p: any) => p.id)).size).toBe(3);
  });

  test('storage full part way: nothing changes, the error shows, and the fragment comes back so a reload retries', async ({ page }) => {
    // Every write succeeds until the Players list from the link is written: the import is half done when it fails
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === 'vm.players' && String(v).includes('Brave Otter')) throw new DOMException('full', 'QuotaExceededError');
        return set.call(this, k, v);
      };
    });
    const d = payload();
    await page.goto(link(d));
    await expect(page.locator('#ho-conflict')).toBeVisible();
    expect(page.url()).toMatch(/\/import\/$/);
    const before = await stored(page);
    await page.locator('#ho-use').click();
    await expect(page.locator('#ho-error')).toContainText('nothing was changed on this device');
    await expect(page.locator('#ho-title')).toHaveText('Progress not saved');
    await expect(page.locator('#ho-title')).toBeFocused();
    expect(await stored(page)).toEqual(before);
    expect(page.url()).toContain('/import/#v=1&d=' + d);
    await page.reload();
    await expect(page.locator('#ho-conflict')).toBeVisible();
    await expect(page.locator('#ho-title')).toHaveText('Bring your progress from the old site?');
    await expect(page.locator('#ho-list .ho-name')).toHaveText(['Brave Otter 17', 'Cosmic Comet 33']);
  });
});
