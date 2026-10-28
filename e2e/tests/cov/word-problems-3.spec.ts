import { test, expect, open } from '../fixtures';
import { READY, label, question, skip } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "A due Word problem waits for a Skill with stories". */

test.use({ seedMode: 'challenger', seedProgress: READY });

test('A Skill with no story: eight questions of Count objects to 20, none a Word problem', async ({ page }) => {
  await open(page, '#/skill/k-count');
  for (let i = 1; i <= 8; i++) {
    await expect(question(page)).toHaveText('How many dots are there?');
    await expect(label(page)).toHaveCount(0);
    if (i < 8) await skip(page);
  }
});
