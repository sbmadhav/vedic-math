import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, APP } from './fixtures';
import type { Page } from '@playwright/test';

/* Third parties (openspec third-party-requests, change learnvedicmath, design D10, task 7.4). build.py holds the one
   list of hosts the site may reach (THIRD_PARTIES, read from shared/src/policy.json, each with its reason and the action
   that first reaches it); this spec reads that list from the checkout, so a host a module starts to fetch from fails here as well as in the build. The
   first visit the spec describes (the landing, /learn/, a Mode, a Star, the Watch shelf and a video's player, without
   pressing play) reaches no Google or YouTube host, and nothing but this origin and the listed hosts. The hosts that
   need a tap are out of a first visit: the YouTube frame comes after play (tests/watch.spec.ts), Firebase after a
   Player 13 or over opens a World board (tests/csp.spec.ts, tests/arena.spec.ts), the natural voice after an opt-in.
   The fixtures answer analytics locally; such a request still carries its host, so it is counted here. */

/* The list lives in shared/src/policy.json since react-typescript task 3.1 (build.py reads it as THIRD_PARTIES) */
const POLICY = JSON.parse(readFileSync(join(__dirname, '..', '..', 'shared', 'src', 'policy.json'), 'utf8')) as { thirdParties: { host: string }[] };
/** The hosts of build.py's THIRD_PARTIES */
function thirdParties(): string[] {
  expect(POLICY.thirdParties.length, 'shared/src/policy.json holds THIRD_PARTIES').toBeGreaterThan(0);
  return POLICY.thirdParties.map(t => new URL(t.host).host);
}
const GOOGLE_OR_YOUTUBE = /(^|\.)(google\.com|gstatic\.com|googleapis\.com|googlevideo\.com|ytimg\.com|youtube\.com|youtube-nocookie\.com)$/;

/** The n of the n² on screen in a Star for Square numbers ending in 5, squared (tests/star.spec.ts) */
const sq = async (page: Page) => { const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]); return String(n * n); };

test('the list in build.py names the hosts the app reaches on a tap, and no Google host', () => {
  const hosts = thirdParties();
  expect(hosts).toEqual(expect.arrayContaining(['www.youtube-nocookie.com', 'learnvedicmath.goatcounter.com']));
  expect(hosts.filter(h => GOOGLE_OR_YOUTUBE.test(h))).toEqual(['www.youtube-nocookie.com']);
});

test.describe('a first-time visitor', () => {
  test.use({ seedMode: null });

  test('a full first visit reaches no Google or YouTube host, and no host outside build.py THIRD_PARTIES', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    // Every host reached, with the first URL that reached it. Only http(s): data: and blob: URLs have no host.
    const hosts = new Map<string, string>();
    page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && !hosts.has(u.host)) hosts.set(u.host, r.url()); });

    await page.goto('/'); // the landing
    await expect(page.locator('h1').first()).toBeVisible();
    await page.goto(APP); // the game: a first visit meets the Mode picker
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.locator('.mode-card[data-mode="challenger"]').click(); // picks a Mode
    await expect(page.locator('#view h1').first()).toBeVisible();
    await page.goto(`${APP}#/star/sq5/1`); // plays a Star: four right answers light it
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
      await page.keyboard.type(await sq(page));
      await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    await page.goto(`${APP}#/watch`); // opens the Watch shelf
    const card = page.locator('#view button.watch-card').first();
    await expect(card).toBeVisible();
    await expect.poll(() => card.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), 'a thumbnail from this site').toBe(true);
    await card.click(); // and a video's player, without pressing play
    const dlg = page.locator('dialog.vm-player');
    await expect(dlg).toBeVisible();
    await expect.poll(() => dlg.locator('.vp-play img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), 'the facade thumbnail from this site').toBe(true);
    await expect(dlg.locator('iframe')).toHaveCount(0);
    await dlg.locator('.vp-x').click();
    await expect(dlg).toBeHidden();
    await page.waitForLoadState('networkidle'); // anything that waited for idle (analytics) has been asked for by now

    const reached = [...hosts.entries()];
    expect(reached.filter(([h]) => GOOGLE_OR_YOUTUBE.test(h)).map(([, u]) => u), 'Google or YouTube reached on a first visit').toEqual([]);
    const allowed = new Set([new URL(baseURL!).host, ...thirdParties()]);
    expect(reached.filter(([h]) => !allowed.has(h)).map(([, u]) => u), `a host not in build.py THIRD_PARTIES (${[...allowed].join(', ')})`).toEqual([]);
    expect(hosts.has(new URL(baseURL!).host), 'the site itself was reached').toBe(true);
  });
});
