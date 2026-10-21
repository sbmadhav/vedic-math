import { test, expect, open, type Page } from '../fixtures';

/* answer-display spec, "Algebra keys use real signs":
   - Factoring with negative roots: "Factor: x² − 3x + 2" reveals `(x − 1)(x − 2)`
   - Leading coefficient: a factoring question with leading coefficient 2 and a negative constant reveals
     like `(2x − 3)(x + 4)`, with no `+-`
   Questions are random, so the 9-factor generator (the same module instance the app uses) is wrapped to draw
   from a fixed list of Math.random values, and optionally at a fixed level; the next question is then the
   scenario's. ri(-9, 9) = -9 + floor(r * 19), so r = (v + 9 + 0.5) / 19 gives v. */

const r = (v: number) => (v + 9 + 0.5) / 19;

async function fixNextQuestion(page: Page, randoms: number[], level?: number) {
  await page.evaluate(async ({ randoms, level }) => {
    const mod = await e2eMod('skills/high');
    const s = (mod.default as any[]).find(x => x.id === '9-factor');
    const orig = s.gen;
    s.gen = function (lv: unknown, ...rest: unknown[]) {
      const real = Math.random; let i = 0;
      Math.random = () => (i < randoms.length ? randoms[i++] : real());
      try { return orig.call(this, level ?? lv, ...rest); } finally { Math.random = real; }
    };
  }, { randoms, level });
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

const norm = (t: string | null) => (t || '').replace(/\s+/g, ' ').trim();

test('Factoring with negative roots: x² − 3x + 2 reveals (x − 1)(x − 2)', async ({ page }) => {
  await open(page, '#/skill/9-factor');
  // p = rnz(-9, 9) -> -1, q = rnz(-9, 9) -> -2; level 1 so a = 1
  await fixNextQuestion(page, [r(-1), r(-2)], 1);
  const box = page.locator('#practice');
  expect(norm(await box.locator('#prQ').textContent())).toContain('Factor: x2 − 3x + 2');
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  await expect(ans).toHaveText('(x − 1)(x − 2)');
  const t = (await ans.textContent()) || '';
  expect(t).not.toMatch(/\+\s*[-−]|[-−]\s*[-−]|\+ 0|(^|[^\d.])1x/);
});

test('Leading coefficient: 2x² + 5x − 12 reveals (2x − 3)(x + 4), with no +-', async ({ page }) => {
  await open(page, '#/skill/9-factor');
  // p -> -3, q -> 4, pick([2, 3]) -> 2 at level 3
  await fixNextQuestion(page, [r(-3), r(4), 0.1], 3);
  const box = page.locator('#practice');
  expect(norm(await box.locator('#prQ').textContent())).toContain('Factor: 2x2 + 5x − 12');
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  await expect(ans).toHaveText('(2x − 3)(x + 4)');
  const t = (await ans.textContent()) || '';
  expect(t).not.toMatch(/\+\s*[-−]|[-−]\s*[-−]|\+ 0|(^|[^\d.])1x/);
});

test('Leading coefficient: 2x² − 7x − 4 reveals (2x + 1)(x − 4), with no +-', async ({ page }) => {
  await open(page, '#/skill/9-factor');
  // p -> 1, q -> -4, a -> 2: constant p * q = -4 negative, both signs present
  await fixNextQuestion(page, [r(1), r(-4), 0.1], 3);
  const box = page.locator('#practice');
  expect(norm(await box.locator('#prQ').textContent())).toContain('Factor: 2x2 − 7x − 4');
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  await expect(ans).toHaveText('(2x + 1)(x − 4)');
  const t = (await ans.textContent()) || '';
  expect(t).not.toMatch(/\+\s*[-−]|[-−]\s*[-−]|\+ 0|(^|[^\d.])1x/);
});
