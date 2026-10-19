import { test, expect, APP, open, cloudLog, appErrors, type Page, typeAnswer } from '../fixtures';

/* openspec/specs/arena/spec.md
   - "The switch-over never mixes a Board", scenario "No algebra": WHEN a Pro Player plays an Arena round THEN no
     question asks to solve for x, simplify a power or evaluate a logarithm. The requirement keeps the previous pool
     only for Pro daily rounds dated before Monday 2026-10-19, so daily rounds are checked from that date on, and
     Practice rounds on any date (today included). The Duel was retired for Party Mode (openspec play-experiences).
   - "Daily rounds are identical for a League", scenario "Two Pro Players on the same date": WHEN two Pro Players with
     different Arena Ratings play the daily round on the same date THEN they get the same questions in the same order.
   Nothing here posts a score: daily rounds are left before they end, and Practice never posts. */

/* What the scenario forbids, read from a question's HTML: an unknown x (solve for x, or x as a base),
   a power other than a square (simplify a power, or exponents beyond squares), a logarithm, a root. */
function algebra(html: string): string | null {
  if (/<i>\s*[a-z]\s*<\/i>|\bx\b/i.test(html)) return 'an unknown (solve for x)';
  if (/simplify/i.test(html)) return 'simplify';
  if (/<sup>(?!2<\/sup>)/.test(html)) return 'a power other than a square';
  if (/\^/.test(html)) return 'a power';
  if (/\blog/i.test(html)) return 'a logarithm';
  if (/&radic;|√/.test(html)) return 'a root';
  return null;
}
const noAlgebra = (html: string, where: string) => expect(algebra(html), `${where}: "${html}" has no algebra`).toBeNull();

/* The answer to a Pro mental arithmetic question, from its HTML */
function answerOf(html: string): number {
  const h = html.replace(/&times;/g, '×').replace(/&divide;/g, '÷').trim();
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(h))) return +m[1] * +m[2];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(h))) return +m[1] / +m[2];
  if ((m = /^(\d+)<sup>2<\/sup> = \?$/.exec(h))) return +m[1] * +m[1];
  if ((m = /^What is (\d+(?:\.\d+)?)% of (\d+)\?$/.exec(h))) return Math.round(+m[1] * 10 * +m[2]) / 1000;
  throw new Error('not a Pro mental arithmetic question: ' + html);
}

/* A fake clock held at a given local time (moves only with runFor / fastForward) */
async function heldAt(page: Page, local: string) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  const t = new Date(local);
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(t.getTime() + 1000));
}

/* Starts the round selected in the lobby and waits out the 3, 2, 1 countdown */
async function startRound(page: Page) {
  await page.locator('#arGo').click();
  await page.clock.runFor(2200);
  await expect(page.locator('#arQ')).not.toBeEmpty();
}

/* Answers n questions of a running Arena round (a miss every `missEvery`th one, if set) and returns what was shown,
   as "difficulty|html", checking each question for algebra on the way */
async function play(page: Page, n: number, where: string, missEvery = 0) {
  const q = page.locator('#arQ'), seen: string[] = [];
  for (let i = 0; i < n; i++) {
    const html = await q.innerHTML();
    noAlgebra(html, `${where} #${i + 1}`);
    seen.push(`${await q.getAttribute('data-d')}|${html}`);
    const ans = answerOf(html);
    const miss = missEvery > 0 && i % missEvery === missEvery - 1;
    await typeAnswer(page, String(miss ? ans + 1 : ans));
    await page.locator('#arForm button').click();
    await expect(page.locator('#arPop')).toHaveText(miss ? String(ans) : /^\+\d+$/);
  }
  return seen;
}

test.describe('Pro Arena: no algebra', () => {
  test.use({ seedMode: 'pro' });
  test.describe.configure({ timeout: 300_000 }); // whole rounds, played one answer at a time

  test('the check catches the old Pro pool (solve for x, powers, logarithms), so it can tell', async ({ page }) => {
    await open(page, '#/arena');
    const old = await page.evaluate(async () => (await import('/vedic-math/js/arena.js' as string)).dailySet('pro', '2026-10-15').map((q: any) => q.q as string)) as string[];
    const kinds = new Set(old.map(algebra).filter(Boolean));
    expect([...kinds]).toEqual(expect.arrayContaining(['an unknown (solve for x)', 'a logarithm', 'a power other than a square']));
  });

  test('a whole daily round on Monday 2026-10-19, and the daily sets of the weeks after, ask no algebra', async ({ page, issues }) => {
    await heldAt(page, '2026-10-19T09:30:00');
    await open(page, '#/arena');
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    // The round as played, all 80 questions
    await startRound(page);
    const seen = await play(page, 80, 'daily 2026-10-19 played', 7);
    expect(new Set(seen).size).toBeGreaterThan(1);
    await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
    // Every daily set for the eight weeks from the switch day
    const sets = await page.evaluate(async () => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const out: [string, string[]][] = [];
      for (let t = new Date(2026, 9, 19); t < new Date(2026, 11, 14); t.setDate(t.getDate() + 1)) {
        const day = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        out.push([day, A.dailySet('pro', day).map((q: any) => q.q)]);
      }
      return out;
    }) as [string, string[]][];
    expect(sets.length).toBe(56);
    for (const [day, set] of sets) set.forEach((h, i) => noAlgebra(h, `daily ${day} #${i + 1}`));
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  for (const rating of [1, 20]) test.describe(`Arena Rating ${rating}`, () => {
    test.use({ seedProgress: { ratings: { 'arena:pro': rating } } });

    test(`a Practice round today (before the switch day) asks no algebra, at every difficulty it reaches`, async ({ page, issues }) => {
      await heldAt(page, '2026-10-15T10:00:00');
      await open(page, '#/arena');
      await expect(page.locator('#arRating')).toHaveAttribute('data-rating', String(rating));
      // The Practice generator at every difficulty step
      const items = await page.evaluate(async () => {
        const A = await import('/vedic-math/js/arena.js' as string);
        const out: [number, string][] = [];
        for (let d = 1; d <= 20; d++) for (let k = 0; k < 50; k++) out.push([d, A.practiceItem('pro', d).q]);
        return out;
      }) as [number, string][];
      items.forEach(([d, h]) => noAlgebra(h, `practice d${d}`));
      // A played round: right answers at Rating 20 (stays hard), mostly misses at Rating 1 (stays easy)
      await page.locator('[data-t="practice"]').click();
      await expect(page.locator('[data-t="practice"]')).toHaveAttribute('aria-pressed', 'true');
      await startRound(page);
      await expect(page.locator('#arQ')).toHaveAttribute('data-d', String(rating));
      await play(page, 30, `practice round at Rating ${rating}`, rating === 1 ? 1 : 0);
      await page.clock.fastForward(61_000);
      await page.clock.runFor(100);
      await expect(page.locator('.ar-result')).toBeVisible();
      expect((await cloudLog(page)).writes).toEqual([]);
      expect(appErrors(issues), 'console errors').toEqual([]);
    });
  });
});

test.describe('Daily rounds are identical for a League', () => {
  test.use({ seedMode: 'pro', seedProgress: { ratings: { 'arena:pro': 1 } } });
  test.describe.configure({ timeout: 400_000 }); // two whole rounds, played one answer at a time

  test('two Pro Players with Arena Ratings 1 and 20 get the same 80 questions in the same order on the same date', async ({ page, issues }) => {
    await heldAt(page, '2026-10-22T18:00:00');
    // A second Pro Player on this device with the top Arena Rating
    await page.addInitScript(() => { if (!localStorage.getItem('mathquest.v1.p2')) localStorage.setItem('mathquest.v1.p2', JSON.stringify({ ratings: { 'arena:pro': 20 } })); });
    const wholeRound = async (rating: number) => {
      await open(page, '#/arena');
      await expect(page.locator('#arRating')).toHaveAttribute('data-rating', String(rating));
      await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
      await startRound(page);
      const seen = await play(page, 80, `daily as Rating ${rating}`, rating === 1 ? 3 : 0);
      await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
      return seen;
    };
    const one = await wholeRound(1);
    await page.evaluate(() => {
      const P = JSON.parse(localStorage.getItem('vm.players')!);
      P.list.push({ id: 'p2', name: 'Calm Otter 17', avatar: 'sky', mode: 'pro', created: Date.now() }); P.active = 'p2';
      localStorage.setItem('vm.players', JSON.stringify(P));
    });
    await page.reload();
    const two = await wholeRound(20);
    expect(two).toEqual(one);
    // And it is that date's daily set for the League, in its order
    const expected = await page.evaluate(async () => {
      const A = await import('/vedic-math/js/arena.js' as string);
      const div = document.createElement('div');
      return A.dailySet('pro', '2026-10-22').map((q: any) => { div.innerHTML = q.q; return `${q.d}|${div.innerHTML}`; });
    }) as string[];
    expect(one).toEqual(expected);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
