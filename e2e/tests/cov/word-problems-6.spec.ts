import { test, expect, open } from '../fixtures';
import { box, numbersIn, question, twoStepAnswer } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Read, plan, solve". Two-step word problems asks only Word
   problems, so its first question is one. */

test('The first hint asks what it is asking, and the second is the plan', async ({ page }) => {
  await open(page, '#/skill/3-twostep');
  await box(page).locator('#prHint').click();
  await expect(box(page).locator('#prSay')).toContainText('Hint: What is it asking?');
  await box(page).locator('#prHint').click();
  await expect(box(page).locator('#prSay')).toContainText(/Hint: (Two steps|Think|Count up)/);
});

test('Hints never hold the answer', async ({ page }) => {
  for (let round = 0; round < 3; round++) {
    await open(page, '#/skill/3-twostep');
    const answer = twoStepAnswer((await question(page).textContent()) || '');
    const hints: string[] = [];
    for (let i = 0; i < 2; i++) { await box(page).locator('#prHint').click(); hints.push((await box(page).locator('#prSay').textContent()) || ''); }
    for (const h of hints) expect(numbersIn(h), h).not.toContain(answer);
    await box(page).locator('#prShow').click();
    await expect(box(page).locator('#prSol .mq-ans b')).toHaveText(String(answer));
  }
});
