import { test, expect, open, type Page } from '../fixtures';

/* answer-checking spec, Requirement: Arithmetic skills take plain numbers only.
   - Typing the question back: refused with "type just the answer", try count, mastery and Sparks unchanged.
   - Plain forms are accepted: for an answer of 1225, `1225`, `1,225` and `1225.0` are each right. */

const sparks = (page: Page) => page.evaluate(async () => (await e2eMod('store')).sparks() as number);
const skillRec = (page: Page, id: string) => page.evaluate(async k => {
  const st = await e2eMod('store');
  return JSON.parse(JSON.stringify(st.skill(k))) as { n: number; c: number; m: number; streak: number; last: number };
}, id);

test('typing the question back on 44 × 72 style multiplication is refused: no try, mastery and Sparks unchanged', async ({ page }) => {
  await open(page, '#/skill/4-mult2');
  const box = page.locator('#practice');
  const q = (await box.locator('#prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  const sparksBefore = await sparks(page);
  const recBefore = await skillRec(page, '4-mult2');
  const scoreBefore = await box.locator('.pr-score').textContent();

  for (const typed of [`${a}*${b}`, `${a}×${b}`, `${a} x ${b}`]) {
    await box.locator('.ans-in').fill(typed);
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).toContainText('Type just the answer');
    await expect(box.locator('#prSay')).not.toHaveClass(/\b(no|ok)\b/);
    // Not a try: the session score does not move and the question stays open
    await expect(box.locator('.pr-score')).toHaveText(scoreBefore || '0/0');
    await expect(box.locator('#prCheck')).toHaveText('Check');
    // No hint offer, which only follows a wrong try
    await expect(box.locator('#prSay [data-hint]')).toHaveCount(0);
  }
  expect(await sparks(page)).toBe(sparksBefore);
  expect(await skillRec(page, '4-mult2')).toEqual(recBefore);

  // The plain product afterwards is still a right first try, which proves no try was spent
  await box.locator('.ans-in').fill(String(a * b));
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('.pr-score')).toHaveText('1/1');
  const after = await skillRec(page, '4-mult2');
  expect(after.n).toBe(recBefore.n + 1);
  expect(after.c).toBe(recBefore.c + 1);
  expect(await sparks(page)).toBeGreaterThan(sparksBefore);
});

/* Squares ending in 5 (a speed trick, grade V): 35² = 1225. A fixed Math.random makes ri(1, 19) give 3, so the
   next question is 35². Show me then Next moves past the first (random) question. */
async function to35Squared(page: Page) {
  await open(page, '#/skill/v-sq5');
  const box = page.locator('#practice');
  await page.evaluate(() => { Math.random = () => 0.12; });
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
  await expect(box.locator('#prQ')).toHaveText(/^\s*352\s*=\s*\?\s*$/);
  return box;
}

for (const typed of ['1225', '1,225', '1225.0']) {
  test(`answer 1225: typing "${typed}" is right`, async ({ page }) => {
    const box = await to35Squared(page);
    await box.locator('.ans-in').fill(typed);
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
    await expect(box.locator('#prSay')).not.toContainText('Type just the answer');
    await expect(box.locator('#prCheck')).toHaveText('Next');
  });
}
