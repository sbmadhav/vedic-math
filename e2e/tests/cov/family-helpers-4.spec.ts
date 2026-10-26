import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, friends, say, btn, missTwice, askFriend, closeVisit, factors } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Help escalates", Scenario "A real block": after two
   Visits on one Skill, a third help signal after 3 minutes brings all three, and Eka works an example on other numbers. */
test.use({ seedPlayer: ON });

test('A real block: all three visit, and Eka shows a worked example on numbers different from the question', async ({ page }) => {
  await page.clock.install();
  await open(page, SKILL);
  await askFriend(page); await closeVisit(page);
  await askFriend(page); await closeVisit(page);
  await page.clock.fastForward(181_000);
  const { q } = await factors(page);
  await missTwice(page);
  await expect(visit(page)).toHaveAttribute('data-level', '3');
  await expect(friends(page)).toHaveCount(3);
  for (let i = 0; i < 8 && !(await say(page).locator('.fh-steps').count()); i++) await btn(page, 'Next').click();
  await expect(page.locator('.fh-visit .fh-who')).toHaveText('Eka');
  await expect(say(page).locator('.fh-steps li').first()).toBeVisible();
  const ex = (await say(page).locator('.fh-ex').textContent()) || '';
  expect(ex.replace(/\s/g, '')).not.toBe(q.replace(/\s/g, ''));
});
