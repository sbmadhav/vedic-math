import { test, expect, APP, open, cloudLog, appErrors, type Page, typeAnswer } from '../fixtures';

/* openspec/specs/arena/spec.md, "Daily rounds are identical for a League", scenario Ramp:
   WHEN a Pro Player answers through a daily round THEN later questions are at the same or higher difficulty than
   earlier ones. The round is played through the page (right and wrong answers mixed, since the ramp is fixed and
   does not follow the answers) and left before it ends, so nothing is posted.
   ("Arena Practice rounds adapt / Strong Pro Player" is already asserted in e2e/tests/arena.spec.ts.) */

/* The answer to a Pro Arena question from its HTML (× ÷, <sup>2</sup>, percent of a number) */
function answerOf(html: string): number {
  const h = html.replace(/&times;/g, '×').replace(/&divide;/g, '÷').trim();
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(h))) return +m[1] * +m[2];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(h))) return +m[1] / +m[2];
  if ((m = /^(\d+)<sup>2<\/sup> = \?$/.exec(h))) return +m[1] * +m[1];
  if ((m = /^What is (\d+(?:\.\d+)?)% of (\d+)\?$/.exec(h))) return (Math.round(+m[1] * 10) * +m[2]) / 1000;
  throw new Error('not a Pro Arena question: ' + html);
}

/* A fake clock held at a given local time (moves only with runFor / fastForward) */
async function heldAt(page: Page, local: string) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  const t = new Date(local);
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(t.getTime() + 1000));
}

test.describe('Daily rounds are identical for a League: Ramp', () => {
  test.use({ seedMode: 'pro' });

  test('a Pro Player answering through the daily round never meets an easier question than an earlier one', async ({ page, issues }) => {
    test.setTimeout(120_000);
    // A date on or after the switch to mental arithmetic (2026-10-19), so daily items carry a difficulty step
    await heldAt(page, '2026-10-21T10:00:00');
    await open(page, '#/arena');
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#arGo').click();
    await page.clock.runFor(2200); // the 3, 2, 1 countdown
    const q = page.locator('#arQ');
    await expect(q).not.toBeEmpty();
    const n = await page.evaluate(async () => (await import('/vedic-math/js/arena.js' as string)).dailySet('pro', '2026-10-21').length as number);
    expect(n, 'a daily set has questions').toBeGreaterThan(1);
    const steps: number[] = [];
    let prevHtml = '';
    for (let i = 0; i < n; i++) {
      const html = await q.innerHTML();
      if (i > 0) expect(html, `question ${i + 1} is a new question`).not.toBe(prevHtml);
      const d = Number(await q.getAttribute('data-d'));
      expect(Number.isFinite(d) && d >= 1 && d <= 20, `question ${i + 1} has a difficulty step (got ${d})`).toBe(true);
      steps.push(d);
      const a = answerOf(html);
      // Every third answer is a miss: the daily ramp must not follow the answers
      await typeAnswer(page, String(i % 3 === 2 ? a + 1 : a));
      await page.locator('#arForm button').click();
      prevHtml = html;
      if (i < n - 1) await expect.poll(() => q.innerHTML()).not.toBe(html);
    }
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i], `question ${i + 1} (difficulty ${steps[i]}) is at least as hard as question ${i} (${steps[i - 1]})`).toBeGreaterThanOrEqual(steps[i - 1]);
    }
    expect(steps[steps.length - 1], 'the ramp rises over the round').toBeGreaterThan(steps[0]);
    // Leave before the round ends: nothing is posted
    await page.goto(`${APP}#/learn`);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
