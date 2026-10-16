import { test, expect, open, type Page } from '../fixtures';

/* answer-checking spec:
   - Arithmetic skills take plain numbers only / Fractions and simplest form still apply
   - Algebra and higher keep expression input / Root answer in precalculus
   Questions are random, so each test reads the question on screen and works the answer out from it. */

const box = (page: Page) => page.locator('#practice');
const qText = async (page: Page) => (await box(page).locator('#prQ').textContent()) || '';
/** Show me, then Next: moves on to a fresh question */
async function skip(page: Page) {
  await box(page).locator('#prShow').click();
  await expect(box(page).locator('#prCheck')).toHaveText('Next');
  await box(page).locator('#prCheck').click();
  await expect(box(page).locator('#prCheck')).toHaveText('Check');
}
async function answer(page: Page, v: string) {
  await box(page).locator('.ans-in').fill(v);
  await box(page).locator('#prCheck').click();
}

test('an arithmetic fraction skill refuses a right value that is not in simplest form with the "simplify" message', async ({ page }) => {
  await open(page, '#/skill/5-fracmult');
  // a/b × c/d: the answer is (a·c)/(b·d); doubling top and bottom keeps the value but never the simplest form
  const parts = await box(page).locator('#prQ .fr').evaluateAll(els => els.map(e => [...e.children].map(c => Number(c.textContent))));
  const [[a, b], [c, d]] = parts;
  const N = a * c, D = b * d;
  await answer(page, `${2 * N}/${2 * D}`);
  const say = box(page).locator('#prSay');
  await expect(say).toContainText('Right value. Now simplify the fraction.');
  await expect(say).not.toHaveClass(/\bok\b/);
  await expect(say).not.toContainText('Type just the answer');
  // the simplest form is then right
  const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
  const k = g(N, D);
  await answer(page, D / k === 1 ? String(N / k) : `${N / k}/${D / k}`);
  await expect(say).toHaveClass(/\bok\b/);
});

test('an arithmetic skill refuses 14/12 for 7/6 with the "simplify" message', async ({ page }) => {
  test.setTimeout(120_000);
  // Unlike fractions (grade 5) can come out at 7/6, for example 2/3 + 1/2: keep drawing until one does
  await open(page, '#/skill/5-fracunlike');
  const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
  for (let i = 0; i < 400; i++) {
    const parts = await box(page).locator('#prQ .fr').evaluateAll(els => els.map(e => [...e.children].map(c => Number(c.textContent))));
    const sub = /−|-/.test(await qText(page));
    const [[a, b], [c, d]] = parts;
    let n = sub ? a * d - c * b : a * d + c * b, den = b * d; const k = g(Math.abs(n), den); n /= k; den /= k;
    if (n === 7 && den === 6) {
      await answer(page, '14/12');
      await expect(box(page).locator('#prSay')).toContainText('Right value. Now simplify the fraction.');
      await expect(box(page).locator('#prSay')).not.toHaveClass(/\bok\b/);
      await answer(page, '7/6');
      await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
      return;
    }
    await skip(page);
  }
  test.skip(true, 'no 7/6 question came up in 400 draws');
});

test('a root answer typed as 4sqrt(3) is right above grade 8', async ({ page }) => {
  test.setTimeout(120_000);
  // Special right triangles (grade 10): a 30-60-90 triangle with short leg 4 has long leg 4√3
  await open(page, '#/skill/10-special');
  for (let i = 0; i < 400; i++) {
    const q = await qText(page);
    if (/short leg 4\. Find the long leg/.test(q)) {
      await answer(page, '4sqrt(3)');
      await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
      await expect(box(page).locator('#prSay')).not.toContainText('Type just the answer');
      return;
    }
    await skip(page);
  }
  throw new Error('no question with long leg 4√3 came up');
});

test('precalculus keeps expression input: an exact value typed as sqrt(3)/2 or sqrt(2)/2 is right', async ({ page }) => {
  // The unit circle (grade 12, Precalculus and calculus)
  await open(page, '#/skill/12-unit');
  for (let i = 0; i < 200; i++) {
    const m = (await qText(page)).match(/(sin|cos)\((\d+)°\)/)!;
    const rad = Number(m[2]) * Math.PI / 180, v = m[1] === 'sin' ? Math.sin(rad) : Math.cos(rad);
    const sign = v < 0 ? '-' : '';
    const typed = Math.abs(Math.abs(v) - Math.sqrt(3) / 2) < 1e-9 ? `${sign}sqrt(3)/2` : Math.abs(Math.abs(v) - Math.sqrt(2) / 2) < 1e-9 ? `${sign}sqrt(2)/2` : '';
    if (typed) {
      await answer(page, typed);
      await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
      await expect(box(page).locator('#prSay')).not.toContainText('Type just the answer');
      return;
    }
    await skip(page);
  }
  throw new Error('no root-valued unit circle question came up');
});
