import { test, expect, open } from '../fixtures';
import { ON, visit, say, btn, askFriend, closeVisit } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Their words fit the reader", Scenario "Eka in Pro": a Pro
   Player (Fluent with no Grade answer) on a Trick gets Eka naming its Sutra, marked as Sanskrit, and its meaning. */
test.use({ seedMode: 'pro', seedPlayer: ON });

test('Eka in Pro: a level 2 Visit on Square numbers ending in 5 names Ekādhikena Pūrveṇa with lang sa-Latn', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  await askFriend(page); await closeVisit(page);
  await askFriend(page);
  await expect(visit(page)).toHaveAttribute('data-level', '2');
  let found = false;
  for (let i = 0; i < 6 && !found; i++) {
    const sutra = say(page).locator('span[lang="sa-Latn"]');
    if (await sutra.count()) {
      await expect(page.locator('.fh-visit .fh-who')).toHaveText('Eka');
      await expect(sutra).toHaveText('Ekādhikena Pūrveṇa');
      await expect(say(page)).toContainText('By one more than the one before');
      found = true;
    } else if (await btn(page, 'Next').count()) await btn(page, 'Next').click();
  }
  expect(found).toBe(true);
});
