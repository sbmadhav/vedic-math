import { test, expect, open, heldClock, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* view-lifecycle spec, "An explanation stays with its question" / "Taps during the hold":
   WHEN a Player taps an answer during the 1.2-second hold
   THEN the tap is ignored and does not count as an answer to either question.

   games.spec.ts checks that the points do not move during a Number bonds hold. These tests also check that the
   tap is not counted after the hold: the Difficulty dial (a miss turns it down, a right answer up) and the points
   stay where the first miss left them, the next question arrives unanswered with no explanation, and answering it
   right then scores exactly one right answer at the lowered difficulty. js/adapt.js: a right answer at
   difficulty d is worth 10 + 7 * (d - 1); in the first five answers a miss turns the dial down by 2. */

const num = (t: string | null) => Number((t || '').replace(/,/g, '').replace('−', '-'));
const pointsAt = (d: number) => 10 + 7 * (d - 1);
const level = async (page: Page) => num(((await page.locator('#gHud .dial').getAttribute('aria-label')) || '').match(/Difficulty (\d+)/)![1]);

async function startEndless(page: Page, game: string) {
  await heldClock(page);
  await open(page, `#/game/${game}`);
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  await expect(page.locator('#gArea')).toBeVisible();
}

test('Number bonds: taps on the right and a wrong part during the hold count for neither question', async ({ page }) => {
  await startEndless(page, 'bonds');
  const area = page.locator('#gArea'), say = page.locator('#gSay'), pts = page.locator('#gPts');
  const whole = area.locator('.bond-w'), part = area.locator('.bond-a'), chips = area.locator('.g-opts .md-chip');
  const d0 = await level(page);
  const W = await whole.textContent(), A = await part.textContent(), b = Math.round((num(W) - num(A)) * 100) / 100;
  const values = (await chips.allTextContents()).map(num);
  const wrong = values.findIndex(v => v !== b), right = values.indexOf(b);
  await chips.nth(wrong).click();
  await expect(say).toContainText('so the part is');
  const explanation = await say.textContent();
  await expect(pts).toHaveText('0');
  const dHeld = await level(page);
  expect(dHeld).toBeLessThan(d0);

  // During the hold: a real tap on the right part, another on a wrong part, and a scripted click on each
  await chips.nth(right).click({ force: true });
  await chips.nth(wrong).click({ force: true });
  await chips.nth(right).dispatchEvent('click');
  await chips.nth(wrong).dispatchEvent('click');
  await page.clock.runFor(600);
  // Still the same question with its own explanation, nothing scored, the dial unmoved
  await expect(whole).toHaveText(W!);
  await expect(part).toHaveText(A!);
  await expect(say).toHaveText(explanation!);
  await expect(pts).toHaveText('0');
  expect(await level(page)).toBe(dHeld);

  // After the hold: the next question, unanswered, with no explanation and the taps still not counted
  await page.clock.runFor(700);
  await expect(say).toHaveText('');
  await expect.poll(async () => `${await whole.textContent()}|${await part.textContent()}`).not.toBe(`${W}|${A}`);
  await expect(area.locator('.bond-b')).toHaveText('?');
  await expect(chips.first()).toBeEnabled();
  await expect(pts).toHaveText('0');
  expect(await level(page)).toBe(dHeld);

  // Answering it right scores exactly one right answer at the lowered difficulty: the held taps added nothing
  const W2 = await whole.textContent(), A2 = await part.textContent(), b2 = Math.round((num(W2) - num(A2)) * 100) / 100;
  const v2 = (await chips.allTextContents()).map(num);
  await chips.nth(v2.indexOf(b2)).click();
  await expect(pts).toHaveText(pointsAt(dHeld).toLocaleString('en-US'));
  expect((await cloudLog(page)).writes).toEqual([]);
});

test('Times sprint: a tap on Go and Enter during the hold count for neither question', async ({ page }) => {
  await startEndless(page, 'times-sprint');
  const area = page.locator('#gArea'), q = area.locator('.g-q'), tip = area.locator('.g-tip'), inp = area.locator('.ans-in');
  const go = area.getByRole('button', { name: 'Go' }), pts = page.locator('#gPts');
  const product = async () => { const [x, y] = ((await q.textContent()) || '').replace(/,/g, '').split('×').map(s => Number(s.trim())); return x * y; };
  const d0 = await level(page);
  const q1 = await q.textContent(), p1 = await product();
  // Miss: the answer box keeps the wrong value through the hold
  await inp.fill(String(p1 + 1));
  await inp.press('Enter');
  await expect(tip).toContainText(`= ${p1.toLocaleString('en-US')}`);
  const explanation = await tip.textContent();
  await expect(pts).toHaveText('0');
  const dHeld = await level(page);
  expect(dHeld).toBeLessThan(d0);

  // During the hold: tap Go, press Enter, and a scripted click and submit on the form
  await go.click({ force: true });
  await inp.press('Enter').catch(() => {});
  await go.dispatchEvent('click');
  await page.evaluate(() => { const f = document.querySelector('#gArea form') as HTMLFormElement; f.requestSubmit(); });
  await page.clock.runFor(600);
  await expect(q).toHaveText(q1!);
  await expect(tip).toHaveText(explanation!);
  await expect(pts).toHaveText('0');
  expect(await level(page)).toBe(dHeld);

  // After the hold: the next question with an empty box, no explanation, and the taps still not counted
  await page.clock.runFor(700);
  await expect(tip).toHaveText('');
  await expect(q).not.toHaveText(q1!);
  await expect(inp).toBeEnabled();
  await expect(inp).toHaveValue('');
  await expect(pts).toHaveText('0');
  expect(await level(page)).toBe(dHeld);

  // Answering it right scores exactly one right answer at the lowered difficulty
  await inp.fill(String(await product()));
  await inp.press('Enter');
  await expect(pts).toHaveText(pointsAt(dHeld).toLocaleString('en-US'));
  await expect(tip).toHaveText('');
  expect((await cloudLog(page)).writes).toEqual([]);
});
