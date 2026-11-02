import { test, expect, open } from '../fixtures';

/* quests spec, Requirement "Home says when quests change", Scenario "The refresh line" (openspec change
   muse-review-polish, design D2): the quest card says new quests come at local midnight and that every Player in the
   Mode gets the same three; the Guide's quest section says the same, in each Mode's words. */

const LINE = 'New quests at midnight, your time. Everyone in your Mode gets the same three.';

for (const mode of ['challenger', 'pro'] as const) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });
    test(`a ${mode} Player opens Home: the quest card says when quests change`, async ({ page }) => {
      await open(page, '#/');
      await expect(page.locator('.quest-card .quest-when')).toHaveText(LINE);
      await expect(page.locator('.quest-card')).not.toContainText('New quests every day');
      await expect(page.locator('.quest-card')).toContainText('Each quest is worth 25 bonus Sparks.');
    });
    test(`the ${mode} Guide's quest section says the same`, async ({ page }) => {
      await open(page, '#/guide/home');
      await expect(page.locator('#gd-home .gd-how')).toContainText('New quests come at midnight, your time, and everyone in your Mode gets the same three.');
    });
  });
}

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('the Explorer Guide says new quests come every morning', async ({ page }) => {
    await open(page, '#/guide/home');
    await expect(page.locator('#gd-home .gd-how')).toContainText('New quests every morning.');
  });
});
