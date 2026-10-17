import { test, expect, open } from '../fixtures';

/* openspec star-round, Requirement: Three Stars per Trick
   - Count: 63 Stars, three for each of the 21 Tricks
   - Star 2 of Square numbers ending in 5: every main question comes from one of its Katas 18 to 34 */

type Page = import('@playwright/test').Page;
const tag = (page: Page) => page.locator('#stMain .star-tag');
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const lastKeys = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sky.last['sq5:2'] as string[]);

/** The n of every n² in the given Katas of Square numbers ending in 5, read from the app's own seeded Katas */
const kataBases = (page: Page, a: number, b: number) => page.evaluate(async ([a, b]) => {
  const L = await import('/vedic-math/js/levels.js' as string);
  const out: number[] = [];
  for (let n = a; n <= b; n++) for (const p of L.kata('sq5', n).problems) out.push(p.vals[0]);
  return out;
}, [a, b] as const);

/** Plays one Star 2 round right through (all four right) and returns the n of each main question */
async function playRound(page: Page) {
  const seen: number[] = [];
  for (let i = 1; i <= 4; i++) {
    await expect(tag(page)).toHaveText(`Question ${i} of 4`);
    const n = await base(page);
    seen.push(n);
    await page.keyboard.type(String(n * n));
    await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 2 is lit!');
  return seen;
}

test.describe('Count', () => {
  test('the Dojo lists 63 Stars, three for each of the 21 Tricks, all open', async ({ page }) => {
    await open(page, '#/dojo');
    const stars = page.locator('.dojo-star');
    await expect(stars).toHaveCount(63);
    const hrefs = await stars.evaluateAll(els => els.map(e => e.getAttribute('href') || ''));
    const byTrick = new Map<string, number[]>();
    for (const h of hrefs) {
      const m = h.match(/^#\/star\/([^/]+)\/(\d)$/);
      expect(m, `Star link ${h}`).not.toBeNull();
      byTrick.set(m![1], [...(byTrick.get(m![1]) || []), Number(m![2])]);
    }
    expect(byTrick.size).toBe(21);
    for (const [trick, ns] of byTrick) expect(ns.sort(), `Stars of ${trick}`).toEqual([1, 2, 3]);
    // Every Star is open on a fresh start: none is locked
    await expect(page.locator('.dojo-star--open')).toHaveCount(63);
    // The app's own list of Tricks agrees: 21 Tricks
    const tricks = await page.evaluate(async () => (await import('/vedic-math/js/vedic.js' as string)).TRICKS.map((t: { id: string }) => t.id));
    expect(tricks).toHaveLength(21);
    expect([...byTrick.keys()].sort()).toEqual([...tricks].sort());
  });
});

test.describe('Star 2 of Square numbers ending in 5', () => {
  test('a new Player: every main question of two rounds comes from Katas 18 to 34', async ({ page }) => {
    await open(page, '#/star/sq5/2');
    await expect(page.locator('.star-top .md-tag')).toHaveText('Star 2 of 3');
    const allowed = new Set(await kataBases(page, 18, 34));
    const outside = new Set([...(await kataBases(page, 1, 17)), ...(await kataBases(page, 35, 50))].filter(n => !allowed.has(n)));
    expect(outside.size).toBeGreaterThan(0); // the check below can tell Katas apart
    for (let r = 0; r < 2; r++) {
      if (r) { await page.locator('#stAgain').click(); }
      await expect(tag(page)).toHaveText('Question 1 of 4');
      const keys = await lastKeys(page);
      expect(keys).toHaveLength(4);
      for (const k of keys) { const kata = Number(k.split(':')[0]); expect(kata).toBeGreaterThanOrEqual(18); expect(kata).toBeLessThanOrEqual(34); }
      const seen = await playRound(page);
      for (const n of seen) expect(allowed.has(n), `${n} squared is in Katas 18 to 34`).toBe(true);
    }
  });

  test.describe('top Rating', () => {
    test.use({ seedProgress: { ratings: { 'skill:v-sq5': 20 } } });
    test('at Rating 20 the main questions still come from Katas 18 to 34', async ({ page }) => {
      await open(page, '#/star/sq5/2');
      const allowed = new Set(await kataBases(page, 18, 34));
      const keys = await lastKeys(page);
      expect(keys).toHaveLength(4);
      for (const k of keys) { const kata = Number(k.split(':')[0]); expect(kata).toBeGreaterThanOrEqual(18); expect(kata).toBeLessThanOrEqual(34); }
      const seen = await playRound(page);
      for (const n of seen) expect(allowed.has(n), `${n} squared is in Katas 18 to 34`).toBe(true);
    });
  });
});
