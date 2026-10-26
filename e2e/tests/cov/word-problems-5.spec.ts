import { test, expect, open } from '../fixtures';
import { READY, box, label, question, skip } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "The Sutra is the shortcut inside the story". */

test.use({ seedMode: 'challenger', seedProgress: READY });

test('Tickets near 100: both numbers near one power of ten, the plan hint says so, the steps work the near-base Trick', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  await skip(page, 2);
  await expect(label(page)).toHaveText('Word problem');
  const q = (await question(page).textContent()) || '';
  const m = q.replace(/,/g, '').match(/buys (\d+) tickets .* costs (\d+) (rupees|dollars)/);
  expect(m, q).not.toBeNull();
  const [a, b] = [Number(m![1]), Number(m![2])];
  const base = [10, 100, 1000].find(x => Math.abs(a - x) <= x * 0.3 && Math.abs(b - x) <= x * 0.3);
  expect(base, `${a} and ${b}`).toBeTruthy();
  await box(page).locator('#prHint').click();
  await box(page).locator('#prHint').click();
  await expect(box(page).locator('#prSay')).toContainText(`near ${base!.toLocaleString('en-US')}, so the near-base trick works`);
  await box(page).locator('#prShow').click();
  await expect(box(page).locator('#prSol .mq-steps')).toContainText(`Base ${base}`);
  expect(((await box(page).locator('#prSol .mq-ans b').textContent()) || '').replace(/,/g, '')).toBe(String(a * b));
});
