import { test, expect, blockAnalytics } from '../fixtures';
import { at, openWarm, nextUntil } from '../warm-up-kit';

/* teacher-warm-up spec (change teacher-warm-up), Requirement "The Trick of the day or the teacher's pick", Scenarios
   "Two days", "A bookmarked Trick" and "Problems rise". */
test.use({ seedMode: null });

const NOON = Date.UTC(2026, 10, 3, 12); // 3 November 2026, noon UTC: the same calendar date in every time zone a runner has

test('Two days: consecutive dates show two different Tricks, and the same date shows the same Trick to everyone', async ({ page, browser }) => {
  await page.clock.setFixedTime(NOON);
  await openWarm(page);
  const first = await page.locator('#wuTitle').innerText();
  await page.clock.setFixedTime(NOON + 864e5);
  await openWarm(page);
  const second = await page.locator('#wuTitle').innerText();
  expect(second).not.toBe(first);
  // another teacher, another browser, the first date
  const ctx = await browser.newContext();
  await blockAnalytics(ctx);
  const other = await ctx.newPage();
  await other.clock.setFixedTime(NOON);
  await openWarm(other);
  expect(await other.locator('#wuTitle').innerText()).toBe(first);
  await ctx.close();
});

test("A bookmarked Trick: /teachers/warm-up/?trick=by11 is Multiply by 11; an unknown id is the Trick of the day; Pick a trick changes this visit only", async ({ page }) => {
  await openWarm(page, 'by11');
  await expect(page.locator('#wuTitle')).toHaveText('Multiply by 11');
  await expect(page.locator('#wuPick')).toHaveValue('by11');
  await nextUntil(page, 'Problem 1 of 3');
  await expect(page.locator('#wuQ')).toHaveText('23 × 11');
  await page.clock.setFixedTime(NOON);
  await openWarm(page, 'nope');
  const today = await page.locator('#wuTitle').innerText();
  await openWarm(page);
  await expect(page.locator('#wuTitle')).toHaveText(today);
  await expect(page.locator('#wuPick option')).toHaveCount(15);
  await page.locator('#wuPick').selectOption('duplex');
  await expect(page.locator('#wuTitle')).toHaveText('Square any two-digit number');
  await expect(at(page)).toHaveText(/^Today's trick/);
  await expect(page).toHaveURL(/\?trick=duplex$/); // a bookmark for next time; nothing is stored
  await page.goto('/teachers/warm-up/');
  await expect(page.locator('#wuTitle')).toHaveText(today);
});

test("Problems rise: every problem passes its Trick's valid() and each Trick's three grow", async ({ page }) => {
  await openWarm(page);
  const r = await page.evaluate(async () => {
    type Trick = { id: string; valid(vals: number[]): string | null };
    type Data = { PROBLEMS: Record<string, { example: number[]; problems: number[][] }>; rises(p: number[][]): boolean };
    const { TRICKS } = (await e2eMod('vedic')) as { TRICKS: Trick[] };
    const m = (await import(new URL('/tricks/warm-up-problems.js', location.href).href)) as Data;
    const bad: string[] = [];
    for (const [id, w] of Object.entries(m.PROBLEMS)) {
      const t = TRICKS.find(x => x.id === id);
      if (!t) { bad.push(`${id}: no such Trick`); continue; }
      for (const p of [w.example, ...w.problems]) { const why = t.valid(p); if (why) bad.push(`${id} ${p.join(' ')}: ${why}`); }
      if (w.problems.length !== 3) bad.push(`${id}: ${w.problems.length} problems`);
      if (!m.rises(w.problems)) bad.push(`${id}: ${w.problems.map(p => p.join('×')).join(', ')} do not rise`);
    }
    return { bad, count: Object.keys(m.PROBLEMS).length };
  });
  expect(r.bad).toEqual([]);
  expect(r.count).toBe(15);
});
