import { test, expect, open, heldClock } from '../fixtures';
import type { Page } from '@playwright/test';

/* duel spec:
   - Requirement: Pictures are shown in Duels / Scenario: Explorer counting question
   - Requirement: A Duel ends at 10 / Scenario: Winning tap
   arena.spec.ts checks that some Explorer picture appears on both sides and that a win shows the result; these pin
   the counting question itself (same dots picture next to the same choices, also face to face) and that taps after
   the winning tap change nothing. */

async function seedable(page: Page) {
  await page.addInitScript(() => {
    let a = 1;
    (window as any).__seed = (s: number) => { a = s; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
}

/* Builds the duel's question set for a few seeds and returns the first seed (and its set) that fits: 'count' wants a
   "How many dots?" question in the first 9, 'any' takes the first seed. A named check, not a function built from a
   string, because the page's Content-Security-Policy has no 'unsafe-eval'. */
async function findSeed(page: Page, league: string, pick: 'count' | 'any') {
  return page.evaluate(async ([lg, src]) => {
    const A = await import('/vedic-math/js/arena.js' as string);
    const ok = (rows: { q: string }[]) => src === 'any' || rows.slice(0, 9).some(r => /^How many dots/.test(r.q));
    for (let sd = 1; sd < 400; sd++) {
      (window as any).__seed(sd);
      const set = A.makeSet(lg, null, 120);
      const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
      const rows = set.map((q: { q: string; answer: number }) => ({ q: html(q.q), answer: q.answer }));
      if (ok(rows)) return { seed: sd, rows: rows as { q: string; answer: number }[] };
    }
    throw new Error('no seed found');
  }, [league, pick] as const);
}

async function startDuel(page: Page, seed: number) {
  await page.evaluate(sd => { (window as any).__seed(sd); (document.querySelector('#dGo') as HTMLElement).click(); }, seed);
  await expect(page.locator('.duel-side')).toHaveCount(2);
}

const COUNT = /^How many dots/;

test.describe('explorer duel counting question', () => {
  test.use({ seedMode: 'explorer' });
  for (const flip of [false, true]) {
    test(`"How many dots?" shows the dots picture on both sides next to the same choices${flip ? ' (face to face)' : ''}`, async ({ page }) => {
      // Face to face turns the top side only on a tablet or phone width (math.css, up to 700 px)
      if (flip) await page.setViewportSize({ width: 600, height: 900 });
      await seedable(page);
      await open(page, '#/duel');
      await expect(page.locator('[data-l="explorer"]')).toHaveAttribute('aria-pressed', 'true');
      if (flip) await page.locator('#dFlip').check();
      // A seed whose duel deals a counting question within the first 9 questions (before anyone can reach 10)
      const { seed, rows } = await findSeed(page, 'explorer', 'count');
      const at = rows.findIndex(r => COUNT.test(r.q));
      await startDuel(page, seed);
      for (let i = 0; i < at; i++) {
        expect(await page.locator('#dQ0').innerHTML()).toBe(rows[i].q);
        await page.locator(`.duel-p1 .ar-choice[data-v="${rows[i].answer}"]`).click();
        await expect(page.locator('#dS0')).toHaveText(String(i + 1));
      }
      // The counting question is dealt on both sides
      for (const p of [0, 1]) await expect(page.locator(`#dQ${p}`)).toHaveText(COUNT);
      expect(await page.locator('#dQ1').innerHTML()).toBe(await page.locator('#dQ0').innerHTML());
      // Both sides show the dots picture, the same picture
      for (const p of [0, 1]) {
        await expect(page.locator(`#dV${p} svg`)).toHaveCount(1);
        await expect(page.locator(`#dV${p} svg`)).toBeVisible();
      }
      expect(await page.locator('#dV1').innerHTML()).toBe(await page.locator('#dV0').innerHTML());
      // ... next to the same choices, which include the count
      const c0 = await page.locator('#dC0 .ar-choice').allTextContents(), c1 = await page.locator('#dC1 .ar-choice').allTextContents();
      expect(c0.length).toBe(4);
      expect(c1).toEqual(c0);
      expect(c0).toContain(String(rows[at].answer));
      // The picture sits inside its own side, next to that side's choices
      for (const p of [0, 1]) {
        const side = page.locator(`.duel-p${p + 1}`);
        await expect(side.locator(`#dV${p}`)).toHaveCount(1);
        await expect(side.locator(`#dC${p}`)).toHaveCount(1);
      }
      if (flip) {
        expect(await page.locator('.duel-p1').evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
        expect(await page.locator('.duel-p2').evaluate(e => getComputedStyle(e).transform)).toBe('none');
      }
      // Either side can answer it from the picture: Player 2 taps the count and scores
      await page.locator(`.duel-p2 .ar-choice[data-v="${rows[at].answer}"]`).click();
      await expect(page.locator('#dS1')).toHaveText('1');
    });
  }
});

test('winning tap: the side that reaches 10 wins and later taps change nothing', async ({ page }) => {
  await seedable(page);
  await heldClock(page);
  await open(page, '#/duel');
  await page.locator('[data-l="challenger"]').click();
  const { seed, rows } = await findSeed(page, 'challenger', 'any');
  await startDuel(page, seed);
  const tapRight = async (p: number, i: number) => page.locator(`.duel-p${p + 1} .ar-choice[data-v="${rows[i].answer}"]`).click();
  // Player 1 scores 3, then Player 2 scores 10 (13 questions)
  let i = 0;
  for (; i < 3; i++) { await tapRight(0, i); await expect(page.locator('#dS0')).toHaveText(String(i + 1)); }
  for (let n = 1; n <= 10; n++, i++) {
    expect(await page.locator('#dQ1').innerHTML()).toBe(rows[i].q);
    await tapRight(1, i);
    await expect(page.locator('#dS1')).toHaveText(String(n));
  }
  await expect(page.locator('#dS1')).toHaveText('10');
  await expect(page.locator('#dS0')).toHaveText('3');
  // The winning question stays on screen until the result: later taps, right or wrong, on either side change nothing
  const last = i - 1;
  const q0 = await page.locator('#dQ0').innerHTML();
  await tapRight(0, last);
  await tapRight(1, last);
  await page.locator(`.duel-p1 .ar-choice:not([data-v="${rows[last].answer}"])`).first().click();
  await page.locator(`.duel-p2 .ar-choice:not([data-v="${rows[last].answer}"])`).first().click();
  await expect(page.locator('#dS0')).toHaveText('3');
  await expect(page.locator('#dS1')).toHaveText('10');
  await expect(page.locator('#dQ0')).toHaveJSProperty('innerHTML', q0);
  await expect(page.locator('.duel-side.frozen')).toHaveCount(0);
  await expect(page.locator('#dA0')).toHaveText('');
  // The Duel ends with Player 2 as the winner
  await page.clock.runFor(700);
  await expect(page.locator('.ar-result')).toHaveCount(1);
  await expect(page.locator('.ar-result .md-kicker')).toHaveText('Winner');
  await expect(page.locator('.ar-result .md-value')).toHaveText('Player 2');
  await expect(page.locator('.duel-side')).toHaveCount(0);
  await expect(page.locator('#dShell .ar-choice')).toHaveCount(0);
  // Nothing scheduled by the finished duel changes the result later
  await page.clock.runFor(5000);
  await expect(page.locator('.ar-result .md-value')).toHaveText('Player 2');
  await expect(page.locator('.ar-result')).toHaveCount(1);
  await expect(page.locator('#dGo')).toBeVisible();
});
