import { test, expect, open, APP } from '../fixtures';

/* medals spec, Requirement "Katas are done or not done":
   - Finishing a Kata: 5 of 6 right in Kata 3 -> done, 35 Sparks, no stars, Kata 4 opens
   - Old Kata stars: 1 to 3 stars before the update -> done; 0 stars -> not done
   Kata problems are seeded, so the expected answers come from the page's own levels.js module. */

type Page = import('@playwright/test').Page;
type P = { kind: string; answer: unknown };
const kataProblems = (page: Page, trick: string, n: number) =>
  page.evaluate(async ([t, k]) => {
    const LV = await import('/vedic-math/js/levels.js' as string);
    return LV.kata(t, k).problems.map((p: P) => ({ kind: p.kind, answer: p.answer }));
  }, [trick, n] as const);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));

const v3 = (katasDone: Record<string, number>) => ({ v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals: {}, katasDone, ratings: {}, weekSparks: {}, questDay: null });
const v2 = (stars: Record<string, number>) => ({ v: 2, skills: {}, xp: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, stars, ratings: {}, weekXp: {}, questDay: null });
const doneUpTo = (trick: string, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k:${trick}:${i + 1}`, 1]));

/** Plays kata n of a trick, answering wrong only at index `miss`, and returns the problem count */
async function play(page: Page, trick: string, n: number, miss: number) {
  await open(page, `#/kata/${trick}/${n}`);
  await expect(page.locator('#view h1')).toContainText(`Kata ${n}`);
  const probs = await kataProblems(page, trick, n);
  expect(probs.every(p => p.kind === 'num')).toBe(true);
  for (let i = 0; i < probs.length; i++) {
    await page.locator('#kata .ans-in').fill(i === miss ? '-12345' : String(probs[i].answer));
    await page.locator('#kGo').click();
    await expect(page.locator('#kSay')).toHaveClass(i === miss ? /\bno\b/ : /\bok\b/);
    await page.locator('#kGo').click();
  }
  return probs.length;
}

/** The Kata is done, Sparks are shown, no stars, the next Kata opens and the Katas page counts it */
async function expectFinished(page: Page, trick: string, n: number, right: number, total: number, sparks: number) {
  const res = page.locator('.lv-result');
  await expect(res.locator('h2')).toHaveText('Kata done!');
  await expect(res).toContainText(`${right} of ${total} right`);
  await expect(res).toContainText(`+${sparks} Sparks`);
  await expect(res).toContainText(`Kata ${n} is done.`);
  await expect(page.locator('#kata')).not.toContainText('★');
  await expect(page.locator('#kata .medal, #kata .star')).toHaveCount(0);
  await expect(res.locator(`a[href="#/kata/${trick}/${n + 1}"]`)).toBeVisible();
  const d = await saved(page);
  expect(d.katasDone[`k:${trick}:${n}`]).toBeTruthy();
  // A daily quest the Kata completes (for example "Finish a Dojo kata") adds its own 25 Sparks on top
  const questSparks = 25 * Object.keys(d.questDay?.done || {}).length;
  expect(d.sparks - questSparks).toBe(sparks);
  await page.goto(`${APP}#/katas/${trick}`);
  await expect(page.locator(`a.lv-node[href="#/kata/${trick}/${n}"]`)).toHaveAttribute('aria-label', `Kata ${n}, done`);
  await expect(page.locator(`a.lv-node[href="#/kata/${trick}/${n + 1}"]`)).toHaveAttribute('aria-label', `Kata ${n + 1}`);
  await expect(page.locator(`.lv-node.locked[aria-label="Kata ${n + 2}, locked"]`)).toBeVisible();
  await expect(page.locator('#view')).not.toContainText('★');
  // The next Kata really opens (no redirect back to the map)
  await page.goto(`${APP}#/kata/${trick}/${n + 1}`);
  await expect(page.locator('#view h1')).toContainText(`Kata ${n + 1}`);
}

test.describe('Finishing a Kata', () => {
  test.use({ seedProgress: v3(doneUpTo('sq5', 2)) });

  // SPEC-GAP: the spec's example is "5 of 6 problems right in Kata 3", but js/levels.js kata() deals 5 problems for
  // Katas 1 to 10 (count = n <= 10 ? 5 : n <= 30 ? 6 : 8), so Kata 3 has no 6th problem and 5 of 6 cannot happen.
  test.fixme('Kata 3 has 6 problems, so 5 of 6 right is possible', async ({ page }) => {
    await open(page, '#/kata/sq5/3');
    await expect(page.locator('#view .md-lede')).toContainText('6 problems');
  });

  test('Kata 3 with all but one right is done, earns 5 per right plus 10, shows no stars, and Kata 4 opens', async ({ page }) => {
    test.slow(); // a full Kata plus three page loads
    const total = await play(page, 'sq5', 3, 2);
    await expectFinished(page, 'sq5', 3, total - 1, total, 5 * (total - 1) + 10);
  });
});

test.describe('Finishing a six-problem Kata', () => {
  test.use({ seedProgress: v3(doneUpTo('sq5', 10)) });

  test('5 of 6 right is done, earns 35 Sparks, shows no stars, and the next Kata opens', async ({ page }) => {
    test.slow(); // a full Kata plus three page loads
    const total = await play(page, 'sq5', 11, 4);
    expect(total).toBe(6);
    await expectFinished(page, 'sq5', 11, 5, 6, 35);
  });
});

test.describe('Old Kata stars', () => {
  test.use({ seedProgress: v2({ 'k:sq5:1': 1, 'k:sq5:2': 2, 'k:sq5:3': 3, 'k:sq5:4': 0, 'k:by11:1': 0 }) });

  test('a Kata with 1 to 3 stars is done after the update; a Kata with 0 stars is not', async ({ page }) => {
    await open(page, '#/katas/sq5');
    for (const n of [1, 2, 3]) await expect(page.locator(`a.lv-node[href="#/kata/sq5/${n}"]`)).toHaveAttribute('aria-label', `Kata ${n}, done`);
    const k4 = page.locator('a.lv-node[href="#/kata/sq5/4"]');
    await expect(k4).toHaveAttribute('aria-label', 'Kata 4');
    await expect(k4).not.toHaveClass(/\bdone\b/);
    await expect(page.locator('.lv-node.locked[aria-label="Kata 5, locked"]')).toBeVisible();
    await expect(page.locator('#view .mq-small').first()).toContainText('3 of 50 done');
    await expect(page.locator('#view')).not.toContainText('★');

    await open(page, '#/katas/by11');
    await expect(page.locator('a.lv-node[href="#/kata/by11/1"]')).toHaveAttribute('aria-label', 'Kata 1');
    await expect(page.locator('#view .mq-small').first()).toContainText('0 of 50 done');

    await open(page, '#/dojo');
    await expect(page.locator('a.dojo-katas[href="#/katas/sq5"]')).toContainText('Katas 3/50 done');
    await expect(page.locator('a.dojo-katas[href="#/katas/by11"]')).toContainText('Katas 0/50 done');

    const d = await saved(page);
    expect(d.v).toBe(3);
    expect(Object.keys(d.katasDone).sort()).toEqual(['k:sq5:1', 'k:sq5:2', 'k:sq5:3']);

    // Kata 5 stays shut: Kata 4 (0 stars) is not done, so the route goes back to the map
    await page.goto(`${APP}#/kata/sq5/5`);
    await expect(page).toHaveURL(/#\/katas\/sq5$/);
  });
});
