import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, missTwice, closeVisit, nextQuestion } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Visits rest between", Scenario "Not again so soon". */
test.use({ seedPlayer: ON });

test('Not again so soon: under 3 minutes after a Visit, two more misses in a row bring nobody', async ({ page }) => {
  await open(page, SKILL);
  await missTwice(page);
  await expect(visit(page)).toBeVisible();
  await closeVisit(page);
  await nextQuestion(page);
  await missTwice(page);
  await page.waitForTimeout(300);
  await expect(visit(page)).toHaveCount(0);
});
