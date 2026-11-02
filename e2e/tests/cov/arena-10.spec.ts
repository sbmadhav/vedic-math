import { test, expect, APP, open, cloudLog, appErrors, pathTo } from '../fixtures';
import { DAY, NOW, link, clockAt, endRound, pressStart, dailyItems, answerRight, worldBoardsStandIn, scoreWrites, deviceBoard } from '../challenge-kit';

/* arena spec (change arena-challenge-link), Requirements "A challenge link survives the Mode picker" (No Mode yet),
   "A challenge link on its day and League is the daily challenge" (Midnight) and "A challenge link is checked and never
   starts by itself" (A broken link, A bad Score, No autoplay), plus the no-Score form of the link. */

const RANKED_LINE = /^A friend's challenge\. Start plays the same questions as your friend, as today's daily challenge\.$/;

test.describe('No Mode yet', () => {
  test.use({ seedMode: null });
  test('a new visitor sees the Mode picker, then the friend\'s challenge with no number, not Home', async ({ page, issues }) => {
    await clockAt(page, NOW);
    await page.goto(`${APP}${link(DAY, 'challenger')}`);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await expect(page.locator('#arGo')).toHaveCount(0);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
    await expect(page.locator('#arFriend')).toHaveText(RANKED_LINE);
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).pathname).toBe(pathTo(link(DAY, 'challenger'))); // the link's path (indexable-routes)
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});

test.describe('a Challenger adult', () => {
  test.use({ seedConsent: { age: 'adult' } });
  test('Midnight: a lobby opened at 23:58 and started after midnight plays the link\'s questions as Practice, posting nothing', async ({ page, issues }) => {
    await worldBoardsStandIn(page);
    await clockAt(page, new Date(`${DAY}T23:58:00`));
    await open(page, link(DAY, 'challenger', '240'));
    await expect(page.locator('#arFriend')).toContainText("A friend's challenge: Score 240 to beat");
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    await page.clock.fastForward(3 * 60_000); // past midnight: the link's date is yesterday now
    const items = await dailyItems(page, 'challenger', DAY);
    await pressStart(page);
    await answerRight(page, items, 0, 3); // the link's questions, not the new day's
    await endRound(page);
    const result = page.locator('.play-shell .ar-result');
    await expect(result).toContainText("Your friend's round, played as Practice: it is not on the Boards.");
    await expect(result).not.toContainText('Play again to beat your best.');
    await expect(page.locator('#arShare')).toHaveCount(0);
    await page.clock.runFor(2000);
    expect(scoreWrites((await cloudLog(page)).writes), 'a Score sent to a World Score board').toEqual([]);
    expect(await deviceBoard(page)).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});

test('A broken link: #/arena/day/yesterday/wizard/lots opens the Arena lobby as #/arena does, with no friend\'s line', async ({ page, issues }) => {
  await clockAt(page, NOW);
  await open(page, '#/arena/day/yesterday/wizard/lots');
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  await expect(page.locator('#arGo')).toBeVisible();
  await expect(page.locator('#arFriend')).toHaveCount(0);
  await expect(page.locator('[data-t="friend"]')).toHaveCount(0);
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.g-best')).toContainText('League: Challenger');
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test('A bad Score: 99999 is ignored and the line reads "A friend\'s challenge" with no Score', async ({ page }) => {
  await clockAt(page, NOW);
  await open(page, link(DAY, 'challenger', '99999'));
  await expect(page.locator('#arFriend')).toHaveText(RANKED_LINE);
  await expect(page.locator('#arFriend')).not.toContainText('Score');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
});

test('No Score part: #/arena/day/<today>/<league> reaches the challenge lobby reading "A friend\'s challenge" with no number', async ({ page }) => {
  await clockAt(page, NOW);
  await open(page, link(DAY, 'challenger'));
  const line = page.locator('#arFriend');
  await expect(line).toHaveText(RANKED_LINE);
  expect(await line.textContent()).not.toMatch(/\d/);
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
});

test('No autoplay: a challenge link opens the lobby ready to Start, and no countdown or round starts by itself', async ({ page }) => {
  await clockAt(page, NOW);
  await open(page, link(DAY, 'challenger', '240'));
  await expect(page.locator('#arFriend')).toBeVisible();
  await page.clock.runFor(5000);
  await page.waitForTimeout(500);
  await expect(page.locator('.play-shell')).toHaveCount(0);
  await expect(page.locator('.ar-count')).toHaveCount(0);
  await expect(page.locator('#arQ')).toHaveCount(0);
  await expect(page.locator('#arGo')).toBeVisible();
  await expect(page.locator('#arGo')).toHaveText(/Start/);
  // Only the tap starts it
  await pressStart(page);
  await expect(page.locator('.play-shell .play-title')).toHaveText('Arena: daily challenge');
});
