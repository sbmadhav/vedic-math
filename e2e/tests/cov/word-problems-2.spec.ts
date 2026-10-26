import { test, expect, open } from '../fixtures';
import { box, label, question, skip } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "A new Player's first answers stay bare". */

test('A new Player: none of the first four Practice questions is a Word problem', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  for (let i = 1; i <= 4; i++) {
    await expect(label(page)).toHaveCount(0);
    await expect(question(page)).toContainText('×');
    if (i < 4) await skip(page);
  }
});

test('A new Player who picks a Word problem Skill: its first question is a Word problem', async ({ page }) => {
  await open(page, '#/skill/3-twostep');
  await expect(label(page)).toHaveText('Word problem');
  await expect(box(page).locator('.pr-unit')).toBeVisible();
});
