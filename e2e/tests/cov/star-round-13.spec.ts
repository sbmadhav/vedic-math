import { test, expect, open } from '../fixtures';

/* star-round: A video offer after two misses / No video for the Trick.
   The Tricks are picked at run time from js/videos.js (the list keeps growing): the first and the last Trick that is
   answered with one number and has no hand-matched video the Player's Mode may see. After two misses the replay must
   lead straight to the rematch with no offer.
   Answers here are always wrong ('1'), so the random questions do not matter.
   (Offer once is asserted by e2e/tests/star.spec.ts: 'two misses offer the hand-matched video once ...'.) */

type Page = import('@playwright/test').Page;
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function miss(page: Page) { await page.keyboard.type('1'); await page.keyboard.press('Enter'); }

/** Misses question 1 and its rematch, then misses question 2 and skips its replay (the moment an offer would come) */
async function twoMisses(page: Page) {
  await question(page, 1);
  await miss(page);
  await expect(page.locator('.star-replay')).toBeVisible();
  await page.locator('#stRSkip').click();
  await expect(tag(page)).toHaveText('Rematch');
  await miss(page);
  await expect(page.locator('#stSay')).toContainText('Close! It is');
  // The Next button can appear under the spot just tapped; move the pointer off so its hover lift does not jitter
  await page.mouse.move(0, 0);
  await page.locator('#stNext').click();
  await question(page, 2);
  await miss(page);
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
}

for (const which of ['first', 'last'] as const) {
  test(`no video for the Trick (the ${which} such Trick): two misses show no offer and the rematch follows the replay`, async ({ page }) => {
    await open(page, '#/');
    const none: string[] = await page.evaluate(async () => {
      const V = await import('/vedic-math/js/videos.js' as string), W = await import('/vedic-math/js/watch.js' as string);
      const { TRICKS } = await import('/vedic-math/js/vedic.js' as string), LV = await import('/vedic-math/js/levels.js' as string);
      // Tricks answered with one number, so a typed '1' is one whole (wrong) answer
      const oneNumber = (id: string) => LV.kata(id, 1).problems.every((p: { kind: string }) => p.kind === 'num');
      return TRICKS.map((t: { id: string }) => t.id).filter((id: string) => oneNumber(id) && !W.pickForTrick(V.VIDEOS, id, 'challenger'));
    });
    test.skip(!none.length, 'every Trick has a hand-matched video now');
    const trick = which === 'first' ? none[0] : none[none.length - 1];
    // Any YouTube request would mean a video was offered or played; none should be made
    const yt: string[] = [];
    await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => { yt.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }); });
    await open(page, `#/star/${trick}/1`);
    await twoMisses(page);
    await expect(tag(page)).toHaveText('Rematch');
    await expect(page.locator('.star-offer')).toHaveCount(0);
    await expect(page.locator('#stWatch')).toHaveCount(0);
    await expect(page.locator('dialog.vm-player')).toHaveCount(0);
    await expect(page.locator('#stSay')).not.toContainText('short video');
    // The round goes on unchanged: the rematch takes an answer as usual
    await miss(page);
    await expect(page.locator('#stSay')).toContainText('Close! It is');
    await expect(page.locator('.star-offer')).toHaveCount(0);
    expect(yt).toEqual([]);
  });
}
