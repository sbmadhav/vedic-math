import { test, expect, open, type Page } from '../fixtures';

/* answer-display spec, "Fraction answers are shown as fractions":
   - Decimal skills keep decimals: "Write 7/10 as a decimal" reveals `0.7`
   - Other decimal answers stay decimals: a percent answer reads `5`, and a non-whole one reads `12.5`, not `25/2`
   Questions are random, so the skill's generator (the same module instance the app uses) is wrapped to draw
   from a fixed list of Math.random values (and, for percents, a fixed level); the next question is then known.
   The percent generator cannot make "12.5% of 40", so the same answers come from 25% of 20 (= 5) and 25% of 50 (= 12.5). */

async function fixNextQuestion(page: Page, file: string, skillId: string, randoms: number[], level?: number) {
  await page.evaluate(async ({ file, skillId, randoms, level }) => {
    const mod = await import(`/js/skills/${file}` as string);
    const s = (mod.default as any[]).find(x => x.id === skillId);
    const orig = s.gen;
    s.gen = function (...args: unknown[]) {
      const real = Math.random; let i = 0;
      Math.random = () => (i < randoms.length ? randoms[i++] : real());
      try { return orig.apply(this, level == null ? args : [level]); } finally { Math.random = real; }
    };
  }, { file, skillId, randoms, level: level ?? null });
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test('Decimal skills keep decimals: "Write 7/10 as a decimal" reveals 0.7', async ({ page }) => {
  await open(page, '#/skill/4-decimals');
  // hund = 0.9 < .5 -> false (tenths); n = ri(1, 9) -> 1 + floor(0.7 * 9) = 7; toDec = 0.1 < .5 -> true
  await fixNextQuestion(page, 'middle.js', '4-decimals', [0.9, 0.7, 0.1]);
  const box = page.locator('#practice');
  await expect(box.locator('#prQ')).toContainText('Write');
  await expect(box.locator('#prQ')).toContainText('as a decimal');
  const parts = await box.locator('#prQ .fr').evaluateAll(els => els.map(e => [...e.children].map(c => c.textContent)));
  expect(parts).toEqual([['7', '10']]);
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  await expect(ans).toHaveText('0.7');
  await expect(ans).not.toContainText('/');
});

const PERCENTS = [
  // pick([10, 20, 25, 50, 75]) -> 0.5 -> 25; n = ri(2, 40) * 10: 0 -> 2 -> 20, 0.087 -> 2 + floor(0.087 * 39) = 5 -> 50
  { r: [0.5, 0], q: 'What is 25% of 20?', want: '5' },
  { r: [0.5, 0.087], q: 'What is 25% of 50?', want: '12.5' },
];
for (const c of PERCENTS) {
  test(`Other decimal answers stay decimals: "${c.q}" reveals ${c.want}`, async ({ page }) => {
    await open(page, '#/skill/6-percent');
    await fixNextQuestion(page, 'upper.js', '6-percent', c.r, 1);
    const box = page.locator('#practice');
    await expect(box.locator('#prQ')).toHaveText(c.q);
    await box.locator('#prShow').click();
    const ans = box.locator('#prSol .mq-ans b');
    await expect(ans).toHaveText(c.want);
    await expect(ans).not.toContainText('/');
    await expect(ans).not.toContainText('25/2');
  });
}
