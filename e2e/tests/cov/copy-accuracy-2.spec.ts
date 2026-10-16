import { test, expect, open, type Page } from '../fixtures';

/* copy-accuracy spec: "Correct ordinals / Multiples question" and "Lesson pictures match the number / Hundredths".
   The Skill's real generator runs; only the Math.random values it draws for the NEXT question are fixed, by
   wrapping that one Skill's gen() in the page (nothing else in the page sees the fixed values). */

/* Makes the next question of Skill `id` draw `draws` from Math.random (in order), then moves to that question. */
async function nextWithDraws(page: Page, id: string, draws: number[]) {
  await page.evaluate(async ({ id, draws }) => {
    const mods = ['/vedic-math/js/skills/middle.js'];
    for (const m of mods) {
      const list = (await import(m)).default as any[];
      const s = list.find(x => x.id === id);
      if (!s) continue;
      const orig = s.__origGen ||= s.gen;
      s.gen = function (...a: unknown[]) {
        const real = Math.random, q = [...draws];
        Math.random = () => (q.length ? q.shift()! : real());
        try { return orig.apply(this, a); } finally { Math.random = real; }
      };
      return;
    }
    throw new Error('skill not found: ' + id);
  }, { id, draws });
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test.describe('Correct ordinals: Multiples question', () => {
  // 4-factors gen: pick(['prime','count','multiple']) -> 'multiple'; k = ri(3, 12) -> 7; m = ri(2, 9) -> wanted
  const draw = (m: number) => [0.9, 4 / 10 + 0.01, (m - 2) / 8 + 0.01];
  for (const [m, word] of [[2, '2nd'], [3, '3rd'], [4, '4th']] as const) {
    test(`the ${word} multiple question reads "${word}"`, async ({ page }) => {
      await open(page, '#/skill/4-factors');
      await nextWithDraws(page, '4-factors', draw(m));
      const q = page.locator('#practice #prQ');
      await expect(q).toHaveText(`What is the ${word} multiple of 7? (The 1st is 7.)`);
      const text = (await q.textContent()) || '';
      expect(text).not.toMatch(/2th|3th|1th/);
    });
  }
});

test.describe('Lesson pictures match the number: Hundredths', () => {
  // 4-decimals gen: hund = random < .5 -> true; n = ri(1, 99); toDec = random < .5 -> false (picture question)
  const draw = (n: number) => [0.1, (n - 1) / 99 + 0.001, 0.9];

  test('0.25: the picture is a 10 by 10 grid with 25 squares shaded', async ({ page }) => {
    await open(page, '#/skill/4-decimals');
    await nextWithDraws(page, '4-decimals', draw(25));
    const box = page.locator('#practice');
    await expect(box.locator('#prQ')).toContainText('0.25 =');
    await expect(box.locator('#prQ .fr span').last()).toHaveText('100');
    const viz = box.locator('.mq-viz svg');
    await expect(viz).toHaveCount(1);
    await expect(viz).toHaveAttribute('aria-label', '25 out of 100 equal squares shaded');
    const rects = viz.locator('rect');
    await expect(rects).toHaveCount(100);
    await expect(viz.locator('rect.vz-coral')).toHaveCount(25);
    // 10 by 10: ten distinct columns and ten distinct rows, all squares the same size
    const grid = await rects.evaluateAll(els => els.map(e => [e.getAttribute('x'), e.getAttribute('y'), e.getAttribute('width'), e.getAttribute('height')]));
    expect(new Set(grid.map(g => g[0])).size).toBe(10);
    expect(new Set(grid.map(g => g[1])).size).toBe(10);
    expect(new Set(grid.map(g => `${g[2]}x${g[3]}`)).size).toBe(1);
    expect(grid[0][2]).toBe(grid[0][3]);
  });
});
