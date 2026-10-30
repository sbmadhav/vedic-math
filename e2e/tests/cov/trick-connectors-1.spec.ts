import { test, expect, open } from '../fixtures';
import { animate, diagram, next } from '../connector-kit';

/* trick-connectors spec, Requirement "Lines join the digits each step uses" (openspec working-memory-scaffolds):
   - Scenarios "Near-base, the distances", "the cross", "the right part": 97 × 94 joins each number to its distance
     (coral, teal), crosses from 97 to −6 (sky), then joins −3 and −6 (sun).
   - Scenario "Crosswise columns": 23 × 41 joins 3 and 1, then 3 and 4 with 2 and 1, then 2 and 4.
   - Scenario "The answer step": no diagram. Colours are category tokens only. */

test('97 × 94: the distances, the cross, the distances multiplied, then no diagram', async ({ page }) => {
  await animate(page, 'near-base', 97, 94);
  let d = await diagram(page);
  expect(d.colors).toEqual(['coral', 'teal']);
  await expect(d.svg.locator('text.on')).toHaveText(['97', '94', '−3', '−6']);
  await next(page);
  d = await diagram(page);
  expect(d.colors).toEqual(['sky', 'sky']); // the cross, and the other cross (dashed) that gives the same
  await expect(d.svg.locator('line.cx-dash')).toHaveCount(1);
  await expect(d.svg.locator('text.on')).toHaveText(['97', '−6']);
  await next(page);
  d = await diagram(page);
  expect(d.colors).toEqual(['sun']);
  await expect(d.svg.locator('text.on')).toHaveText(['−3', '−6']);
  await next(page);
  await expect(page.locator('#animPos')).toHaveText('4 / 4');
  await expect(page.locator('#animLinks svg')).toHaveCount(0);
});

test('23 × 41: one line, two crossing lines, one line, then the answer with no diagram', async ({ page }) => {
  await animate(page, 'crosswise', 23, 41);
  let d = await diagram(page);
  expect(d.colors).toHaveLength(1);
  expect(d.label).toBe('A line joins the top 3 and the bottom 1.');
  await next(page);
  d = await diagram(page);
  expect(d.colors).toEqual(['coral', 'teal']);
  expect(d.label).toBe('Lines join the top 3 and the bottom 4, and the top 2 and the bottom 1.');
  await next(page);
  d = await diagram(page);
  expect(d.label).toBe('A line joins the top 2 and the bottom 4.');
  await next(page);
  await expect(page.locator('#animLinks svg')).toHaveCount(0);
});

test('the lines are drawn in the theme\'s category colours in both schemes', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await animate(page, 'near-base', 97, 94);
    const { svg } = await diagram(page);
    const [stroke, coral] = await svg.locator('line.cx-coral').evaluate(l => [getComputedStyle(l).stroke, (() => { const p = document.createElement('i'); p.style.color = 'var(--coral)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()]);
    expect(stroke, scheme).toBe(coral);
  }
});

test('a Trick without connectors shows no diagram', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  await expect(page.locator('#animNav')).toBeVisible(); /* the page shows a random example's steps */
  await expect.poll(() => page.evaluate(async () => !!(await e2eMod('connectors')).linksFor)).toBe(true);
  await page.locator('#animNext').click();
  await expect(page.locator('#animLinks svg')).toHaveCount(0);
});
