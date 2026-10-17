import { test, expect, open, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* sparks spec, Requirement "Watching videos earns no Sparks", Scenario "A new video": a Player opens a video they
   have never opened, and their Sparks total does not change (not even after the player stays open a whole minute,
   which earns the Video learner badge, whose rule is kept). YouTube is answered with an empty page, as in
   tests/watch.spec.ts, so no third-party player loads.
   (Scenario "Board id is unchanged" is already asserted by tests/privacy.spec.ts and tests/cov/sparks-2.spec.ts.) */

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
const WK = isoWeek();
const progress = { v: 3, skills: {}, sparks: 120, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: { [WK]: 40 }, questDay: null };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));

test.describe('a Player who may post, with 120 Sparks (40 this week), opens a video they have never opened', () => {
  test.use({ seedMode: 'challenger', seedConsent: { age: 'adult' }, seedProgress: progress });

  test('their Sparks total does not change, even after a whole minute in the player', async ({ page }) => {
    await noYouTube(page);
    await page.clock.install();
    await open(page, '#/watch');
    // Record every Sparks gain, whatever its reason
    await page.evaluate(async () => {
      const store = await import('/vedic-math/js/store.js' as string);
      (window as any).__gains = [];
      store.on((type: string, d: any) => { if (type === 'sparks') (window as any).__gains.push(d); });
    });
    const card = page.locator('#view button.watch-card').first();
    await expect(card).toBeVisible();
    const before = await saved(page);
    expect(before.sparks).toBe(120);
    expect(Object.keys(before.seen).filter(k => /video|watch|yt/i.test(k))).toEqual([]);

    await card.click();
    const dlg = page.locator('dialog.vm-player');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    // A whole minute in the player: the Video learner badge's rule (kept), but no Sparks
    await page.clock.runFor(61_000);
    await expect.poll(async () => (await saved(page)).counts.watchedMinute).toBe(1);
    await dlg.locator('.vp-x').click();
    await expect(dlg).toBeHidden();
    await page.clock.runFor(70_000); // past any weekly Sparks Board post window

    const after = await saved(page);
    expect(after.sparks).toBe(120);
    expect(after.weekSparks).toEqual({ [WK]: 40 });
    expect(await page.evaluate(() => (window as any).__gains)).toEqual([]);
    // Nothing new to post, so no weekly Sparks Board write either
    expect((await cloudLog(page)).writes.filter(w => /^boards\/xp-week-/.test(w.path))).toEqual([]);
    // The Me page still shows 120 Sparks
    await page.goto('/vedic-math/#/me');
    await expect(page.locator('.me-head')).toContainText('120 Sparks');
  });
});
