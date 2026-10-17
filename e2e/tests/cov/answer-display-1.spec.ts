import { test, expect, open, type Page } from '../fixtures';

/* answer-display spec, "Fraction answers are shown as fractions":
   - Improper fraction in Practice: 2/3 + 3/3 reveals `5/3 = 1 2/3`, not `1.666667`
   - Shaded fraction: 3 of 8 parts shaded reveals `3/8`
   Questions are random, so the skill's generator (the same module instance the app uses) is wrapped to draw
   from a fixed list of Math.random values; the next question the app asks is then exactly the scenario's. */

async function fixNextQuestion(page: Page, skillId: string, randoms: number[]) {
  await page.evaluate(async ({ skillId, randoms }) => {
    const mod = await import('/vedic-math/js/skills/middle.js' as string);
    const s = (mod.default as any[]).find(x => x.id === skillId);
    const orig = s.gen;
    s.gen = function (...args: unknown[]) {
      const real = Math.random; let i = 0;
      Math.random = () => (i < randoms.length ? randoms[i++] : real());
      try { return orig.apply(this, args); } finally { Math.random = real; }
    };
  }, { skillId, randoms });
  // Move on to a fresh question, which now comes from the wrapped generator
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test('Improper fraction in Practice: 2/3 + 3/3 reveals 5/3 = 1 2/3, not 1.666667', async ({ page }) => {
  await open(page, '#/skill/4-fracadd');
  // d = pick([3,...]) -> 3; a = ri(1, 6) -> 2; b = ri(1, 3) -> 3; sub = 0.9 < .4 -> false
  await fixNextQuestion(page, '4-fracadd', [0, 0.2, 0.9, 0.9]);
  const box = page.locator('#practice');
  const parts = await box.locator('#prQ .fr').evaluateAll(els => els.map(e => [...e.children].map(c => c.textContent)));
  expect(parts).toEqual([['2', '3'], ['3', '3']]);
  await expect(box.locator('#prQ')).toContainText('+');
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  await expect(ans).toHaveText('5/3 = 1 2/3');
  await expect(ans).not.toContainText('1.666667');
  await expect(ans).not.toContainText('.');
});

for (const circle of [false, true]) {
  test(`Shaded fraction: 3 of 8 parts shaded (${circle ? 'circle' : 'bar'}) reveals 3/8`, async ({ page }) => {
    await open(page, '#/skill/3-frac');
    // d = pick([2,3,4,5,6,8]) -> 8; n = ri(1, 7) -> 3; circle = r < .5
    await fixNextQuestion(page, '3-frac', [0.9, 0.3, circle ? 0.1 : 0.9]);
    const box = page.locator('#practice');
    await expect(box.locator('#prQ')).toContainText('What fraction is shaded?');
    await expect(box.locator('.mq-viz [aria-label]').first()).toHaveAttribute('aria-label',
      circle ? 'Circle with 3 of 8 parts shaded' : '3 out of 8 equal parts shaded');
    await box.locator('#prShow').click();
    const ans = box.locator('#prSol .mq-ans b');
    await expect(ans).toHaveText('3/8');
    await expect(ans).not.toContainText('0.375');
  });
}
