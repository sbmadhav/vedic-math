import { test, expect, open } from '../fixtures';

/* honest-framing spec, "Sutras are credited to the 1965 book".
   Footer: WHEN any page is shown, THEN the footer says the speed tricks use sutras from Bharati Krishna Tirtha's
   1965 book. privacy.spec.ts checks the home page only; this walks every top-level route, deep routes and the
   mode picker, and checks the footer is still there after an in-app navigation.
   Future share text: the app has no share button, share card or share text yet (metrics.shareClick is unused),
   so there is nothing in the browser to assert. */

const CREDIT = "Speed tricks use sutras from Bharati Krishna Tirtha's 1965 book";

const PAGES = [
  '#/', '#/learn', '#/dojo', '#/arena', '#/games', '#/sutras', '#/watch', '#/me',
  '#/tower', '#/katas/sq5', '#/skill/v-sq5', '#/game/balloons', '#/arena/party',
];

async function expectCredit(page) {
  const foot = page.locator('footer.mq-foot');
  await expect(foot).toHaveCount(1);
  await expect(foot).toContainText(CREDIT);
  await expect(foot).not.toContainText(/from the Vedas|traditional Vedic/i);
}

for (const hash of PAGES) {
  test(`footer credits the 1965 book on ${hash}`, async ({ page }) => {
    await open(page, hash);
    await expectCredit(page);
    // The footer is part of the visible page, not hidden chrome
    await page.locator('footer.mq-foot').scrollIntoViewIfNeeded();
    await expect(page.locator('footer.mq-foot')).toBeVisible();
  });
}

test.describe('a first visit (no play mode yet)', () => {
  test.use({ seedMode: null as any });
  test('footer credits the 1965 book on the mode picker', async ({ page }) => {
    await open(page);
    await expect(page.locator('#view [data-mode]').first()).toBeVisible();
    await expectCredit(page);
  });
});

test('footer still credits the 1965 book after moving between views', async ({ page }) => {
  await open(page);
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect(page.locator('#view h1')).toHaveText('From white belt to black belt');
  await expectCredit(page);
  await page.evaluate(() => { location.hash = '#/sutras'; });
  await expect(page.locator('#view h1')).toHaveText('The 16 sutras and 13 sub-sutras');
  await expectCredit(page);
});
