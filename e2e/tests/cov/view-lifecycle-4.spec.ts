import { test, expect, open, cloudLog, heldClock, appErrors } from '../fixtures';
import type { Page } from '@playwright/test';

/* view-lifecycle spec, "Ending a round stops that round / Stop a game round and start again".
   "Leave during a countdown" is already asserted in e2e/tests/routes.spec.ts ('leaving the Arena during the
   countdown never starts the round'). The existing balloon test in games.spec.ts checks that no late timer from
   the stopped round changes the new one; this one also checks that only the new round reacts to taps (one
   answer, one Score change, counted once in the result) and that the stopped round's 60 second clock does not
   end the new round early. Times sprint, ranked round, no Age answer: nothing may be posted. */

const pts = (page: Page) => page.locator('#gPts');

async function product(page: Page) {
  const t = (await page.locator('#gArea .g-q').textContent()) || '';
  const [x, y] = t.replace(/,/g, '').split('×').map(s => Number(s.trim()));
  return x * y;
}
async function answer(page: Page, v: number) {
  const inp = page.locator('#gArea .ans-in');
  await inp.fill(String(v));
  await inp.press('Enter');
}

test('Times sprint: stop a ranked round and start again, only the new round reacts', async ({ page, issues }) => {
  await heldClock(page);
  await open(page, '#/game/times-sprint');
  await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');

  // Round 1: 30 s in, a right answer then a miss, stopped during the 1.2 s hold
  await page.locator('#gStart').click();
  await expect(page.locator('#gArea .g-q')).toContainText('×');
  await page.clock.fastForward(30_000);
  await answer(page, await product(page));
  await expect(pts(page)).not.toHaveText('0');
  await answer(page, (await product(page)) + 1);
  await expect(page.locator('#gArea .g-tip')).toContainText('= ');
  await page.locator('#gQuit').click();
  await expect(page.locator('#gStart')).toBeVisible();

  // Round 2 straight away
  await page.locator('#gStart').click();
  const q = page.locator('#gArea .g-q'), tip = page.locator('#gArea .g-tip');
  await expect(q).toContainText('×');
  await expect(pts(page)).toHaveText('0');
  await expect(page.locator('#gArea .ans-in')).toHaveCount(1);
  const first = await q.textContent();

  // No late timer from round 1: its hold would have cleared the tip and moved the question on
  await page.clock.runFor(1500);
  await expect(q).toHaveText(first!);
  await expect(tip).toHaveText('');
  await expect(pts(page)).toHaveText('0');
  await expect(page.locator('#gArea .ans-in')).toBeEnabled();

  // Round 1's 60 s clock would run out here (30 s + 31 s); round 2 must still be going
  await page.clock.fastForward(31_000);
  await page.clock.runFor(100);
  await expect(page.locator('#gQuit')).toBeVisible();
  await expect(page.locator('.g-result')).toHaveCount(0);
  await expect(q).toHaveText(first!);

  // One right answer: counted once, the question moves on once
  await page.evaluate(() => {
    const w = window as any; w.__qMut = 0;
    new MutationObserver(r => { w.__qMut += r.length; }).observe(document.querySelector('#gArea .g-q')!, { childList: true, characterData: true, subtree: true });
  });
  await answer(page, await product(page));
  const gain = page.locator('#gHud .g-gain');
  await expect(gain).toHaveText(/^\+\d+$/);
  const g = Number((await gain.textContent())!.slice(1));
  await expect(pts(page)).toHaveText(g.toLocaleString('en-US'));
  await page.clock.runFor(500);
  expect(await page.evaluate(() => (window as any).__qMut)).toBe(1);
  await expect(pts(page)).toHaveText(g.toLocaleString('en-US'));

  // Let round 2 run out (60 s from its start): the result counts only round 2's one answer
  await page.clock.fastForward(30_000);
  await page.clock.runFor(200);
  await expect(page.locator('.g-result .md-value')).toHaveText(g.toLocaleString('en-US'));
  await expect(page.locator('.g-result')).toContainText('1 of 1 right.');

  expect((await cloudLog(page)).writes).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});
