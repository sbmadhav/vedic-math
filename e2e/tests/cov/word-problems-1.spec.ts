import { test, expect, open } from '../fixtures';
import { READY, label, question, skip } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Word problems join Practice by Mode". */

test.describe('Challenger', () => {
  test.use({ seedMode: 'challenger', seedProgress: READY });
  test('A Challenger\'s third question: a Word problem labelled "Word problem", the first two bare', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    for (let i = 1; i <= 2; i++) { await expect(label(page)).toHaveCount(0); await expect(question(page)).toContainText('×'); await skip(page); }
    await expect(label(page)).toHaveText('Word problem');
    await expect(question(page)).toContainText(/How many \w+ (are there|are left)\?/);
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro', seedProgress: READY });
  test('Pro meets one sooner: the second question is a Word problem', async ({ page }) => {
    await open(page, '#/skill/v-near-base');
    await expect(label(page)).toHaveCount(0);
    await skip(page);
    await expect(label(page)).toHaveText('Word problem');
    await expect(question(page)).toContainText(/\?$/);
  });
});
