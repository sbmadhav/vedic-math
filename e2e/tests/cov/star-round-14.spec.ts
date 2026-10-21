import { test, expect, open, heldClock } from '../fixtures';

/* star-round: "A video offer after two misses / Offline" and "Calm path and announcements / Reduced motion".
   star.spec.ts covers going offline before the round starts (the video list never loads) and checks the first
   replay step under reduced motion. These add: going offline mid-round after the Trick's video was already found,
   and every replay step under reduced motion followed by the rematch. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }
const noYouTube = (page: Page) => page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));

test('offline mid-round, after the video list loaded: two misses show no offer and the rematch follows', async ({ page, context }) => {
  await noYouTube(page);
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  // The Trick's video is found while online (the list module loads)
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /\/js\/videos\.js/.test(e.name)));
  await enter(page, '1');
  await page.locator('#stRSkip').click();
  await expect(tag(page)).toHaveText('Rematch');
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('Close! It is');
  // The Next button can appear under the spot just tapped; move the pointer off so its hover lift does not jitter
  await page.mouse.move(0, 0);
  await page.locator('#stNext').click();
  await question(page, 2);
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await enter(page, '1'); // the second miss, while offline
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  await expect(page.locator('.star-offer')).toHaveCount(0);
  await expect(page.locator('#stWatch')).toHaveCount(0);
  await context.setOffline(false);
});

/** Running animations and transitions on anything in the Star round */
const moving = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return !!t && !!t.closest('.star-round') && a.playState === 'running';
}).length);

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('a miss: every replay step appears with nothing moving, then the rematch follows', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/sq5/1');
    await question(page, 1);
    await expect(page.locator('.star-round')).toHaveClass(/\bstill\b/);
    const n = await base(page);
    await enter(page, '1');
    await expect(page.locator('#stSay')).toContainText('Not quite');
    expect(await moving(page)).toBe(0);
    await page.clock.runFor(1000);
    await expect(page.locator('.star-replay')).toBeVisible();
    await expect(page.locator('.star-step')).toHaveCount(1);
    expect(await moving(page)).toBe(0);
    // Let the replay run on its own to the end, checking each step as it appears
    let count = 1;
    for (let guard = 0; guard < 12 && (await page.locator('#stRGo').count()) === 0; guard++) {
      await page.clock.runFor(2600);
      count++;
      await expect(page.locator('.star-step')).toHaveCount(count);
      expect(await moving(page)).toBe(0);
    }
    await expect(page.locator('#stRGo')).toBeVisible();
    expect(count).toBeGreaterThan(1);
    // Every step is in place and none moved in from elsewhere
    const steps = page.locator('.star-step');
    for (let i = 0; i < count; i++) await expect(steps.nth(i)).toBeVisible();
    await expect(steps.first()).toContainText(String((n - 5) / 10));
    expect(await page.locator('.fx-sparkles, .fx-confetti').count()).toBe(0);
    await page.locator('#stRGo').click();
    await expect(tag(page)).toHaveText('Rematch');
    expect(await moving(page)).toBe(0);
    await expect(page.locator('.star-offer')).toHaveCount(0);
  });
});
