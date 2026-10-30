import { test, expect, open, type Page } from '../fixtures';

/* answer-checking spec, Requirement "Mixed numbers are numbers":
   - Scenario "Extra spaces": the answer is 7/4 and the Player types ` 1  3/4 ` -> right.
   - Scenario "Two whole numbers with a space": the answer is 1225 and the Player types `1 225` -> not right.
   Questions are random, so the Practice tests read the question on screen and work the answer out. */

/* The like-fractions question on screen: a/d + b/d (or minus), as numbers */
async function fracQuestion(page: Page) {
  const q = page.locator('#practice #prQ');
  const parts = await q.locator('.fr').evaluateAll(els => els.map(e => [...e.children].map(c => Number(c.textContent))));
  const sub = (await q.textContent() || '').includes('−');
  const [[a, d], [b]] = parts;
  return { n: sub ? a - b : a + b, d };
}
/* Moves on (Show me, then Next) until the answer is more than 1 and not whole */
async function untilMixed(page: Page) {
  const box = page.locator('#practice');
  for (let k = 0; k < 25; k++) {
    const f = await fracQuestion(page);
    if (f.n > f.d && f.n % f.d !== 0) return f;
    await box.locator('#prShow').click();
    await box.locator('#prCheck').click();
  }
  throw new Error('no question above 1 came up');
}
/* Grades an input against a number answer with the app's own checker (the one every Practice view uses) */
const check = (page: Page, spec: Record<string, unknown>, input: string) =>
  page.evaluate(async ([s, i]) => (await e2eMod('check')).checkOne(s, i), [spec, input] as const);

test.describe('Mixed numbers are numbers', () => {
  test('Extra spaces: the answer 7/4 typed as " 1  3/4 " is right', async ({ page }) => {
    await open(page, '#/');
    for (const spec of [{ kind: 'num', answer: 7 / 4 }, { kind: 'num', answer: 7 / 4, plain: true }, { kind: 'num', answer: 7 / 4, plain: true, simplest: true }]) {
      expect((await check(page, spec, ' 1  3/4 ')).ok, JSON.stringify(spec)).toBe(true);
    }
  });

  test('Extra spaces: a padded mixed number is right in fraction-sum Practice', async ({ page }) => {
    await open(page, '#/skill/4-fracadd');
    const box = page.locator('#practice');
    const { n, d } = await untilMixed(page);
    const skipped = Number(((await box.locator('.pr-score').textContent()) || '0/0').split('/')[1]); // questions passed over with Show me
    await box.locator('.ans-in').fill(` ${Math.floor(n / d)}  ${n % d}/${d} `);
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
    await expect(box.locator('.pr-score')).toHaveText(`1/${skipped + 1}`);
  });

  test('Two whole numbers with a space: 1225 typed as "1 225" is not right', async ({ page }) => {
    await open(page, '#/');
    // plain-number skills (K to 8, tricks) and expression skills above grade 8 alike
    for (const spec of [{ kind: 'num', answer: 1225 }, { kind: 'num', answer: 1225, plain: true }]) {
      expect((await check(page, spec, '1 225')).ok, JSON.stringify(spec)).toBe(false);
      expect((await check(page, spec, '1225')).ok, JSON.stringify(spec)).toBe(true); // the same digits without the space are right
    }
  });

  test('Two whole numbers with a space: a square typed with a space is not right in Practice', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    const box = page.locator('#practice');
    const q = await box.locator('#prQ').innerHTML(); // "35<sup>2</sup> = ?"
    const base = Number(q.match(/(\d+)<sup>2<\/sup>/)![1]);
    const ans = String(base * base);
    const spaced = `${ans[0]} ${ans.slice(1)}`; // 1225 -> "1 225"
    await box.getByRole('button', { name: 'Type it in one box' }).click(); // this checks the one box (openspec working-memory-scaffolds)
    await box.locator('.ans-in').fill(spaced);
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).not.toBeEmpty();
    await expect(box.locator('#prSay')).not.toHaveClass(/\bok\b/);
    await expect(box.locator('.pr-score')).toHaveText('0/0');
    await expect(box.locator('#prCheck')).toHaveText('Check');
    // the same digits without the space are right
    await box.locator('.ans-in').fill(ans);
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
    await expect(box.locator('.pr-score')).toHaveText('1/1');
  });
});
