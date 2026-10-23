import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, who, say, btn, askFriend, closeVisit } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Playful mistakes on other numbers", Scenario "An Early
   reader's skit": an Explorer Player with no Grade answer reads as Early, so Shunya never makes a mistake. */
test.use({ seedMode: 'explorer', seedPlayer: ON });

test('An Early reader\'s skit: in a level 3 Visit, Shunya says no number at all', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page); await closeVisit(page);
  await askFriend(page); await closeVisit(page);
  await askFriend(page);
  await expect(visit(page)).toHaveAttribute('data-level', '3');
  for (let i = 0; i < 8; i++) {
    if ((await who(page).textContent()) === 'Shunya') expect(await say(page).locator('p').first().textContent()).not.toMatch(/\d/);
    if (!(await btn(page, 'Next').count())) break;
    await btn(page, 'Next').click();
  }
});
