import { test, expect, APP, open, cloudLog, appErrors, type Page, typeAnswer } from '../fixtures';

/* openspec/specs/arena/spec.md, "Pro Arena is mental arithmetic":
   - A full Pro daily set: every question of a Pro daily set dated 2026-10-19 or later belongs to one of the five
     families (2-digit by 2-digit product, square, percent of a number, near-base product, exact division) and has
     a whole-number answer.
   - Pro Duel and Practice: every question of an Arena Practice round or a Pro Duel belongs to one of the five families.
   Nothing here posts a score: daily rounds are left before they end, Practice never posts, Duels are local. */

const FAMILIES = ['mul2x2', 'square', 'percent', 'nearBase', 'divide'];

/* Reads a Pro question (its HTML, with × ÷ and <sup>2</sup>) and returns the families its form fits and its answer.
   Throws for anything outside the five families (algebra, powers, logarithms, ...). */
function classify(html: string): { families: string[]; answer: number } {
  const h = html.replace(/&times;/g, '×').replace(/&divide;/g, '÷').trim();
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(h))) {
    const a = +m[1], b = +m[2], fam: string[] = [];
    if (a >= 10 && a <= 99 && b >= 10 && b <= 99) fam.push('mul2x2');
    const near = (v: number) => (Math.abs(v - 100) <= 20 && v !== 100) || (Math.abs(v - 1000) <= 99 && v !== 1000);
    if (near(a) && near(b)) fam.push('nearBase');
    return { families: fam, answer: a * b };
  }
  if ((m = /^(\d+)<sup>2<\/sup> = \?$/.exec(h))) return { families: ['square'], answer: +m[1] * +m[1] };
  if ((m = /^What is (\d+(?:\.\d+)?)% of (\d+)\?$/.exec(h))) {
    const tenths = Math.round(+m[1] * 10), n = +m[2];
    // a whole-number answer only when p * n is a multiple of 100
    return { families: (tenths * n) % 1000 === 0 ? ['percent'] : [], answer: (tenths * n) / 1000 };
  }
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(h))) {
    const a = +m[1], k = +m[2];
    return { families: a % k === 0 ? ['divide'] : [], answer: a / k };
  }
  return { families: [], answer: NaN };
}

/* Asserts one shown or generated question is a mental arithmetic question with a whole-number answer that fits the
   Arena keypad (7 characters). Returns the answer. */
function assertMental(html: string, where: string, expected?: { answer: number; family: string }) {
  const c = classify(html);
  expect(c.families.length, `${where}: "${html}" belongs to one of the five families`).toBeGreaterThan(0);
  expect(Number.isInteger(c.answer), `${where}: "${html}" has a whole-number answer`).toBe(true);
  expect(String(c.answer).length, `${where}: answer fits the keypad`).toBeLessThanOrEqual(7);
  if (expected) {
    expect(FAMILIES, `${where}: family tag`).toContain(expected.family);
    expect(c.families, `${where}: "${html}" has the form of its family ${expected.family}`).toContain(expected.family);
    expect(expected.answer, `${where}: stored answer of "${html}"`).toBe(c.answer);
  }
  return c.answer;
}

/* A fake clock held at a given local time (moves only with runFor / fastForward) */
async function heldAt(page: Page, local: string) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  const t = new Date(local);
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(t.getTime() + 1000));
}

/* The page's own normalisation of an HTML string (so module questions compare with #arQ.innerHTML) */
const asShown = (page: Page, html: string) => page.evaluate(h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; }, html);

test.describe('Pro Arena is mental arithmetic', () => {
  test.use({ seedMode: 'pro' });
  // Many questions are played through the page; leave room on a busy machine
  test.describe.configure({ timeout: 240_000 });

  test('A full Pro daily set: every question of daily sets from 2026-10-19 on is in a family with a whole-number answer', async ({ page }) => {
    await open(page, '#/arena');
    // The switch day, its week, a later month and a later year, plus a run of consecutive days
    const days = ['2026-10-19', '2026-10-20', '2026-10-25', '2026-11-30', '2026-12-31', '2027-01-01', '2027-06-15', '2028-02-29'];
    for (let d = 1; d <= 30; d++) days.push(`2026-11-${String(d).padStart(2, '0')}`);
    const sets = await page.evaluate(async ds => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const div = document.createElement('div');
      return ds.map((day: string) => [day, A.dailySet('pro', day).map((q: any) => { div.innerHTML = q.q; return { q: div.innerHTML, answer: q.answer, family: q.family, d: q.d }; })]);
    }, days) as [string, { q: string; answer: number; family: string; d: number }[]][];
    for (const [day, set] of sets) {
      expect(set.length, `${day}: a full daily set`).toBe(80);
      set.forEach((q, i) => assertMental(q.q, `${day} #${i + 1}`, q));
      // all five families take turns through the set
      expect(new Set(set.map(q => q.family)).size, `${day}: the five families`).toBe(5);
    }
  });

  test('A full Pro daily set, played on Monday 2026-10-19: every question shown is in a family and its whole-number answer is accepted', async ({ page, issues }) => {
    await heldAt(page, '2026-10-19T10:00:00');
    await open(page, '#/arena');
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    const expected = await page.evaluate(async () => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const div = document.createElement('div');
      return A.dailySet('pro', '2026-10-19').map((q: any) => { div.innerHTML = q.q; return { q: div.innerHTML, answer: q.answer, family: q.family }; });
    }) as { q: string; answer: number; family: string }[];
    expect(expected).toHaveLength(80);
    await page.locator('#arGo').click();
    await page.clock.runFor(2200); // the 3, 2, 1 countdown
    const q = page.locator('#arQ');
    await expect(q).not.toBeEmpty();
    // Play the first 25 questions (the clock is held, so the 60 second round never runs out): the round deals the
    // daily set above, in order, and takes each whole-number answer on the keypad as right
    const PLAY = 25;
    for (let i = 0; i < PLAY; i++) {
      const html = await q.innerHTML();
      expect(html, `question ${i + 1} is the daily set's`).toBe(expected[i].q);
      const ans = assertMental(html, `shown #${i + 1}`, expected[i]);
      await typeAnswer(page, String(ans));
      await expect(page.locator('#arEntry')).toHaveText(String(ans));
      await page.locator('#arForm button').click();
      await expect.poll(() => q.innerHTML()).toBe(expected[i + 1].q);
    }
    // Every whole-number answer typed was right
    expect(Number(await page.locator('#arScore').textContent())).toBeGreaterThanOrEqual(PLAY * 10);
    await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('Pro Practice: every question of a round is in a family, at any Arena Rating, right or wrong', async ({ page, issues }) => {
    await heldAt(page, '2026-10-21T10:00:00');
    await open(page, '#/arena');
    // The generator at every difficulty step, many times
    const items = await page.evaluate(async () => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const div = document.createElement('div'), out: any[] = [];
      for (let d = 1; d <= 20; d++) for (let k = 0; k < 40; k++) { const q = A.practiceItem('pro', d); div.innerHTML = q.q; out.push({ q: div.innerHTML, answer: q.answer, family: q.family, d }); }
      return out;
    }) as { q: string; answer: number; family: string; d: number }[];
    items.forEach(it => assertMental(it.q, `practice d${it.d}`, it));
    expect(new Set(items.map(i => i.family)).size).toBe(5);
    // A played round: right answers push the difficulty up, misses bring it down; every question stays mental arithmetic
    await page.locator('[data-t="practice"]').click();
    await expect(page.locator('[data-t="practice"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#arGo').click();
    await page.clock.runFor(2200);
    const q = page.locator('#arQ');
    await expect(q).not.toBeEmpty();
    for (let i = 0; i < 20; i++) {
      const html = await q.innerHTML();
      const ans = assertMental(html, `practice round #${i + 1} (d${await q.getAttribute('data-d')})`);
      const wrong = i % 4 === 3; // mostly right, some misses
      await typeAnswer(page, String(wrong ? ans + 1 : ans));
      await page.locator('#arForm button').click();
      await expect(page.locator('#arPop')).toHaveText(wrong ? String(ans) : /^\+\d+$/);
    }
    await page.clock.fastForward(61_000);
    await page.clock.runFor(100);
    await expect(page.locator('.ar-result')).toContainText('15 right · 5 missed');
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('Pro Duel: every question dealt is in a family, through a whole Duel', async ({ page, issues }) => {
    await heldAt(page, '2026-10-21T10:00:00');
    await open(page, '#/duel');
    // The Duel's set generator (unseeded, 120 items) many times over
    const sets = await page.evaluate(async () => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const div = document.createElement('div');
      return Array.from({ length: 10 }, () => A.makeSet('pro', null, 120).map((q: any) => { div.innerHTML = q.q; return { q: div.innerHTML, answer: q.answer, family: q.family }; }));
    }) as { q: string; answer: number; family: string }[][];
    sets.forEach((set, s) => { expect(set).toHaveLength(120); set.forEach((q, i) => assertMental(q.q, `duel set ${s} #${i + 1}`, q)); });
    // A played Pro Duel: misses on both sides reveal and move on, then Player 1 wins with right answers
    await page.locator('[data-l="pro"]').click();
    await expect(page.locator('[data-l="pro"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#dGo').click();
    await expect(page.locator('.duel-side')).toHaveCount(2);
    for (let k = 0; k < 3; k++) {
      const html = await page.locator('#dQ0').innerHTML();
      expect(await page.locator('#dQ1').innerHTML()).toBe(html);
      const a = assertMental(html, `duel both-miss #${k + 1}`);
      await page.locator(`.duel-p1 .ar-choice:not([data-v="${a}"])`).first().click();
      await page.locator(`.duel-p2 .ar-choice:not([data-v="${a}"])`).first().click();
      await expect(page.locator('#dA0')).toHaveText(`Answer: ${a}`);
      await page.clock.runFor(1300);
      await expect(page.locator('#dA0')).toHaveText('');
    }
    for (let k = 0; k < 10; k++) {
      const html = await page.locator('#dQ0').innerHTML();
      expect(await page.locator('#dQ1').innerHTML()).toBe(html);
      const a = assertMental(html, `duel point #${k + 1}`);
      await page.locator(`.duel-p1 .ar-choice[data-v="${a}"]`).click();
      if (k < 9) await expect(page.locator('#dS0')).toHaveText(String(k + 1));
    }
    await expect(page.locator('#dS0')).toHaveText('10');
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
