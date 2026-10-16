import { test, expect, open, heldClock } from '../fixtures';
import type { Page } from '@playwright/test';

/* duel spec, Requirement: Resolving a question. arena.spec.ts covers the flow; these pin the 1.2 second freeze,
   that a frozen side cannot score on the next question, and that both sides get the same next question. */

async function seedable(page: Page) {
  await page.addInitScript(() => {
    let a = 1;
    (window as any).__seed = (s: number) => { a = s; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
}

/* Rebuilds the duel's question set with the same seed, so each question on screen maps to its answer */
async function startSeededDuel(page: Page, league: string, seed = 777) {
  const answers = new Map(await page.evaluate(async ([lg, sd]) => {
    const A = await import('/vedic-math/js/arena.js' as string);
    (window as any).__seed(sd);
    const set = A.makeSet(lg, null, 120);
    const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
    return set.map((q: { q: string; answer: number }) => [html(q.q), q.answer]);
  }, [league, seed] as const) as [string, number][]);
  await page.evaluate(sd => { (window as any).__seed(sd); (document.querySelector('#dGo') as HTMLElement).click(); }, seed);
  await expect(page.locator('.duel-side')).toHaveCount(2);
  return async () => { const q = await page.locator('#dQ0').innerHTML(); expect(answers.has(q), `question ${q} is in the rebuilt set`).toBe(true); return answers.get(q)!; };
}
const sideTexts = (page: Page, p: number) => page.locator(`#dQ${p}, #dC${p}`).allTextContents();

async function setup(page: Page) {
  await seedable(page);
  await heldClock(page);
  await open(page, '#/duel');
  await page.locator('[data-l="challenger"]').click();
  return startSeededDuel(page, 'challenger');
}

test('one side misses, the other is right: P1 frozen for 1.2 s, P2 scores, both get the next question', async ({ page }) => {
  const answer = await setup(page);
  const p1 = page.locator('.duel-p1'), p2 = page.locator('.duel-p2');
  const a = await answer(), q1 = await page.locator('#dQ0').innerHTML();
  await p1.locator(`.ar-choice:not([data-v="${a}"])`).first().click();
  await expect(p1).toHaveClass(/\bfrozen\b/);
  await expect(p2).not.toHaveClass(/\bfrozen\b/);
  await p2.locator(`.ar-choice[data-v="${a}"]`).click();
  // Player 2 gains the point, Player 1 gains nothing
  await expect(page.locator('#dS1')).toHaveText('1');
  await expect(page.locator('#dS0')).toHaveText('0');
  // Both get the next question: the same new question and choices on both sides
  await expect(page.locator('#dQ0')).not.toHaveJSProperty('innerHTML', q1);
  await expect(page.locator('#dQ1')).not.toHaveJSProperty('innerHTML', q1);
  expect(await sideTexts(page, 0)).toEqual(await sideTexts(page, 1));
  // Player 1 stays frozen until 1.2 seconds after the miss: a right tap on the new question is ignored
  const b = await answer();
  await page.clock.runFor(1100);
  await expect(p1).toHaveClass(/\bfrozen\b/);
  await p1.locator(`.ar-choice[data-v="${b}"]`).click();
  await expect(page.locator('#dS0')).toHaveText('0');
  await page.clock.runFor(200);
  await expect(p1).not.toHaveClass(/\bfrozen\b/);
  // Thawed, Player 1 can score on that question
  await p1.locator(`.ar-choice[data-v="${b}"]`).click();
  await expect(page.locator('#dS0')).toHaveText('1');
  await expect(page.locator('#dS1')).toHaveText('1');
});

test('both miss: no points, the right answer is shown, then both get the next question', async ({ page }) => {
  const answer = await setup(page);
  const p1 = page.locator('.duel-p1'), p2 = page.locator('.duel-p2');
  const a = await answer(), q1 = await page.locator('#dQ0').innerHTML();
  await p1.locator(`.ar-choice:not([data-v="${a}"])`).first().click();
  await p2.locator(`.ar-choice:not([data-v="${a}"])`).first().click();
  // Neither gains a point
  await expect(page.locator('#dS0')).toHaveText('0');
  await expect(page.locator('#dS1')).toHaveText('0');
  // The right answer is shown on both sides
  for (const p of [0, 1]) {
    await expect(page.locator(`#dA${p}`)).toHaveText(`Answer: ${a}`);
    await expect(page.locator(`#dC${p} .ar-choice.right`)).toHaveText(String(a));
  }
  // Taps during the reveal change nothing
  await p1.locator(`.ar-choice[data-v="${a}"]`).click();
  await p2.locator(`.ar-choice[data-v="${a}"]`).click();
  await expect(page.locator('#dS0')).toHaveText('0');
  await expect(page.locator('#dS1')).toHaveText('0');
  // Shown briefly, then both get the same next question with no answer line
  await page.clock.runFor(1300);
  await expect(page.locator('#dQ0')).not.toHaveJSProperty('innerHTML', q1);
  await expect(page.locator('#dQ1')).not.toHaveJSProperty('innerHTML', q1);
  for (const p of [0, 1]) {
    await expect(page.locator(`#dA${p}`)).toHaveText('');
    await expect(page.locator(`#dC${p} .ar-choice.right`)).toHaveCount(0);
  }
  expect(await sideTexts(page, 0)).toEqual(await sideTexts(page, 1));
  await expect(p1).not.toHaveClass(/\bfrozen\b/);
  await expect(p2).not.toHaveClass(/\bfrozen\b/);
  // Both can answer the next question
  await p2.locator(`.ar-choice[data-v="${await answer()}"]`).click();
  await expect(page.locator('#dS1')).toHaveText('1');
  await expect(page.locator('#dS0')).toHaveText('0');
});
