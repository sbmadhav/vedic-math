import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, friends, missTwice, askFriend } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Help signals start a visit". */

test.describe('Always', () => {
  test.use({ seedPlayer: ON });

  test('Two misses in a row: one friend hops in while the question stays open', async ({ page }) => {
    await open(page, SKILL);
    await missTwice(page);
    await expect(visit(page)).toBeVisible();
    await expect(friends(page)).toHaveCount(1);
    await expect(page.locator('#practice #prCheck')).toHaveText('Check');
    await expect(page.locator('#practice .ans-in')).toBeEditable();
  });

  test('Idle on a question: after 20 seconds untouched, a friend hops in', async ({ page }) => {
    await page.clock.install();
    await open(page, SKILL);
    await expect(page.locator('#practice #prQ')).toBeVisible(); /* the question is up, so its idle timer is armed */
    await page.clock.fastForward(15_000);
    await expect(visit(page)).toHaveCount(0);
    await page.clock.fastForward(6_000);
    await expect(visit(page)).toBeVisible();
  });
});

test.describe('Only when I ask', () => {
  test.use({ seedPlayer: { ...ON, familyHelp: 'ask' } });

  test('Only when I ask: two misses bring nobody until Ask a friend, then one friend comes', async ({ page }) => {
    await open(page, SKILL);
    await missTwice(page);
    await expect(visit(page)).toHaveCount(0);
    await askFriend(page);
    await expect(friends(page)).toHaveCount(1);
  });
});
