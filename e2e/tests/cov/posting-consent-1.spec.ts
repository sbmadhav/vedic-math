import { test, expect, open, cloudLog, heldClock } from '../fixtures';
import type { Page } from '@playwright/test';

/* posting-consent spec, "Age answer before the first post":
   - First Ranked round of a new Player: the age question is shown before anything is posted, and the Score is
     kept on the Device board either way.
   - Player dismisses the question: nothing is posted, and it is offered again at the next would-be post.
   e2e/tests/consent.spec.ts covers both through Arena Daily challenges (chromium and mobile). These tests cover
   the other Ranked round that posts, a ranked game round (Times sprint), with a dismissal by the backdrop.
   Every write goes to the fake Firebase SDK (fixtures.ts). */

const sheet = (page: Page) => page.locator('dialog.vm-sheet');
const gameWrites = async (page: Page) => (await cloudLog(page)).writes.filter(w => /^boards\/g_/.test(w.path));
const deviceBoard = (page: Page) => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('vm.board') || '[]') as { board: string; score: number }[]).filter(e => /^g_/.test(e.board)));
const savedPlayer = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0]);

/** Plays one ranked Times sprint round: answers questions right (read from the page) until the points reach 10
    or more, then lets the 60 second clock run out. Returns the round's points. */
async function rankedSprint(page: Page) {
  // The last round's result is still in the play shell: Back to the game
  if (await page.locator('#gDone').isVisible()) await page.locator('#gDone').click();
  await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#gStart').click();
  const area = page.locator('#gArea'), q = area.locator('.g-q'), inp = area.locator('.ans-in');
  await expect(area.locator('.g-timer')).toBeAttached();
  for (let i = 0; i < 6; i++) {
    const before = (await q.textContent())!;
    const [x, y] = before.replace(/,/g, '').split('×').map(s => Number(s.trim()));
    await inp.fill(String(x * y));
    await inp.press('Enter');
    await expect(q).not.toHaveText(before);
    if (Number((await page.locator('#gPts').textContent())!.replace(/,/g, '')) >= 10) break;
  }
  const pts = Number((await page.locator('#gPts').textContent())!.replace(/,/g, ''));
  expect(pts).toBeGreaterThanOrEqual(10);
  await page.clock.runFor(61_000);
  await expect(page.locator('.play-shell .g-result')).toBeVisible();
  return pts;
}

test.describe('ranked game round, Player with no Age answer', () => {
  test.use({ seedMode: 'challenger', seedConsent: null });

  test('the age question comes before any post, dismissing posts nothing, the next round asks again', async ({ page }) => {
    test.setTimeout(90_000);
    await heldClock(page);
    await open(page, '#/game/times-sprint');
    expect((await savedPlayer(page)).age).toBeUndefined();

    const first = await rankedSprint(page);
    // The age question is shown, and nothing has been posted
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator('h2')).toHaveText('How old are you?');
    await expect(sheet(page).locator('[data-age]')).toHaveCount(14);
    expect(await gameWrites(page)).toEqual([]);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect((await cloudLog(page)).signIns).toBe(0);
    // The Score is on the Device board (today's and this week's game boards)
    expect((await deviceBoard(page)).map(e => e.score)).toEqual([first, first]);

    // Dismissed by a tap outside the sheet: nothing posted, no Age answer stored, the toast says where it went
    await page.mouse.click(3, 3);
    await expect(sheet(page)).toBeHidden();
    await expect(page.locator('.fx-toast').last()).toHaveText('Saved on this device. It is on the This device board.');
    expect((await savedPlayer(page)).age).toBeUndefined();
    expect((await cloudLog(page)).writes).toEqual([]);
    expect((await deviceBoard(page)).map(e => e.score)).toEqual([first, first]);

    // The next would-be post offers the question again
    await rankedSprint(page);
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator('h2')).toHaveText('How old are you?');
    expect((await cloudLog(page)).writes).toEqual([]);

    // Answered 13 or over: only now does the Score go out, to the game's two boards
    await sheet(page).getByRole('button', { name: 'Grown-up', exact: true }).click();
    await expect(sheet(page)).toBeHidden();
    await expect.poll(async () => (await gameWrites(page)).length).toBe(2);
    await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
    expect((await deviceBoard(page)).length).toBe(2);
  });

  test('answered under 13: nothing is posted and the Score stays on the Device board', async ({ page }) => {
    test.setTimeout(60_000);
    await heldClock(page);
    await open(page, '#/game/times-sprint');
    const pts = await rankedSprint(page);
    await expect(sheet(page)).toBeVisible();
    expect((await cloudLog(page)).writes).toEqual([]);
    await sheet(page).getByRole('button', { name: '9', exact: true }).click();
    await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
    expect((await savedPlayer(page)).age).toBe(9);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect((await cloudLog(page)).signIns).toBe(0);
    expect((await deviceBoard(page)).map(e => e.score)).toEqual([pts, pts]);
    // The Device board on the page shows it too
    await sheet(page).getByRole('button', { name: 'OK' }).click();
    await expect(sheet(page)).toBeHidden();
    await page.clock.runFor(2_000);
    await page.locator('#gDone').click(); // leave the result in the play shell
    await page.locator('#gbDay [data-src="device"]').click();
    await expect(page.locator('#gbDay .lb li.me b')).toHaveText(pts.toLocaleString('en-US'));
  });
});
