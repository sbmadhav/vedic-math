import { test, expect, open, type Page } from '../fixtures';

/* answer-checking spec, Requirement: Mixed numbers are numbers.
   Scenarios "Mixed number for a fraction sum" (answer 7/4, typed `1 3/4`) and
   "Negative mixed number" (answer -2.5, typed `-2 1/2`), with the exact values the spec names.
   Questions are random, so the test seeds Math.random and moves on (Show me, Next) inside the page
   until a question whose answer, computed from the question text, is the spec's value. */

async function seedRandom(page: Page, seed: number) {
  await page.addInitScript(s => {
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
}

/* Skips questions in the page until want(answer) holds for the answer the named solver reads off the #prQ element
   ('frac': a/d + b/d or a/d − b/d; 'slope': the slope through (x1, y1) and (x2, y2), with U+2212 minus signs).
   The solvers live inside the page function, not in strings, because the page's Content-Security-Policy has no
   'unsafe-eval'. Returns the number of questions skipped. */
async function untilAnswer(page: Page, solver: 'frac' | 'slope', want: number) {
  const skipped = await page.evaluate(({ solver, want }) => {
    const answer = (q: Element) => {
      const text = q.textContent || '';
      if (solver === 'frac') {
        const [[a, d], [b]] = [...q.querySelectorAll('.fr')].map(e => [...e.children].map(c => Number(c.textContent)));
        return (text.includes('\u2212') ? a - b : a + b) / d;
      }
      const [x1, y1, x2, y2] = (text.replace(/\u2212/g, '-').match(/-?\d+/g) || []).map(Number);
      return (y2 - y1) / (x2 - x1);
    };
    for (let k = 0; k < 3000; k++) {
      const q = document.querySelector('#practice #prQ')!;
      if (Math.abs(answer(q) - want) < 1e-9) return k;
      (document.querySelector('#practice #prShow') as HTMLButtonElement).click();
      (document.querySelector('#practice #prCheck') as HTMLButtonElement).click();
    }
    return -1;
  }, { solver, want });
  expect(skipped, `a question with answer ${want} came up`).toBeGreaterThanOrEqual(0);
  return skipped;
}

test('mixed number for a fraction sum: 1 3/4 is right when the answer is 7/4', async ({ page }) => {
  await seedRandom(page, 21);
  await open(page, '#/skill/4-fracadd');
  const box = page.locator('#practice');
  const skipped = await untilAnswer(page, 'frac', 7 / 4);
  await box.locator('.ans-in').fill('1 3/4');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await expect(box.locator('.pr-score')).toHaveText(`1/${skipped + 1}`);
});

test('negative mixed number: -2 1/2 is right when the answer is -2.5', async ({ page }) => {
  await seedRandom(page, 5);
  await open(page, '#/skill/8-slope');
  const box = page.locator('#practice');
  await expect(box.locator('#prQ')).toContainText('slope');
  const skipped = await untilAnswer(page, 'slope', -2.5);
  await box.locator('.ans-in').fill('-2 1/2');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await expect(box.locator('.pr-score')).toHaveText(`1/${skipped + 1}`);
});
