import { test, expect, APP, heldClock, type Page } from './fixtures';

/* The first-visit tour never opens under a press (openspec change muse-review-polish, design D5; guide spec "The tour
   never opens under a press"): a new Challenger (a Mode, no Sparks, a device that has never shown the tour) who presses
   or types on Home before the tour's 300 ms are up gets what they pressed, no tour, and the tour stays due for the
   next visit to Home. Time is held by the test, so the press can straddle the moment the tour would open. */

const tour = (page: Page) => page.locator('dialog.vm-tour');
const tourState = (page: Page) => page.evaluate(() => localStorage.getItem('vm.tour'));

test.describe('a new Challenger on a fresh device', () => {
  test.use({ tourSeen: false, seedMode: 'challenger' });

  test('Play this Star pressed before the tour opens: the Star opens, no tour, and the next Home visit opens it', async ({ page }) => {
    await heldClock(page);
    await page.goto(APP);
    const play = page.locator('.sutra-door .md-btn--primary', { hasText: 'Play this Star' });
    await expect(play).toBeVisible();
    const box = (await play.boundingBox())!;
    // The finger goes down before 300 ms and comes up after: without the stand-down the modal opens between the two
    // and the tap lands on it
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(400);
    await expect(tour(page)).toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator('.star-round')).toBeVisible();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(tour(page)).toHaveCount(0);
    expect(await tourState(page)).toBeNull();
    // Back on Home with no press: the tour opens
    await page.goto(`${APP}#/`);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.clock.runFor(400);
    await expect(tour(page)).toBeVisible();
    await expect(tour(page).locator('#tourN')).toContainText('1 of');
    expect(await tourState(page)).toBe('shown');
  });

  test('a key pressed on Home before the tour opens stands it down this time only', async ({ page }) => {
    await heldClock(page);
    await page.goto(APP);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.clock.runFor(400);
    await expect(tour(page)).toHaveCount(0);
    await page.clock.runFor(2000);
    await expect(tour(page)).toHaveCount(0);
    expect(await tourState(page)).toBeNull();
    await page.goto(`${APP}#/learn`);
    await expect(page.locator('#view h1')).toHaveText('Pick a level');
    await page.goto(`${APP}#/`);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.clock.runFor(400);
    await expect(tour(page)).toBeVisible();
  });

  test('Quick tour, asked for with a press, opens as before', async ({ page }) => {
    await heldClock(page);
    await page.goto(APP);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.keyboard.press('Tab'); // the first-visit tour stands down
    await page.clock.runFor(400);
    await expect(tour(page)).toHaveCount(0);
    await page.locator('#tourAgain').click();
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.clock.runFor(400);
    await expect(tour(page)).toBeVisible();
  });
});
