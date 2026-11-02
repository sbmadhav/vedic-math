import { test, expect, APP, open, cloudLog, appErrors } from '../fixtures';
import { DAY, YESTERDAY, WEEK, NOW, link, clockAt, endRound, pressStart, scoreAfter, dailyItems, answerRight, worldBoardsStandIn, scoreWrites, deviceBoard } from '../challenge-kit';

/* arena spec (change arena-challenge-link), Requirements "A challenge link on its day and League is the daily challenge"
   (Same day, same League) and "A challenge link on another day or League is Practice" (Another League, Another day).
   A stand-in config turns World boards on, so a post would show in the fixtures' fake SDK; nothing reaches a live
   backend. The Player is an adult, so the control case does post and a Practice post would be caught. */

test.describe('a Challenger adult', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('Same day, same League: the lobby shows the Score to beat, the round deals the sharer\'s questions in order, and the Score posts as any daily does', async ({ page, issues }) => {
    await worldBoardsStandIn(page);
    await clockAt(page, NOW);
    await open(page, link(DAY, 'challenger', '240'));
    const line = page.locator('#arFriend');
    await expect(line).toContainText("A friend's challenge: Score 240 to beat");
    await expect(line).toContainText("Start plays the same questions as your friend, as today's daily challenge.");
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-t="friend"]')).toHaveCount(0);
    const items = await dailyItems(page, 'challenger', DAY);
    expect(items.length).toBe(80);
    await pressStart(page);
    await expect(page.locator('#arTime')).toHaveText('60');
    await answerRight(page, items, 0, 5); // five in order, each the set's question
    await expect(page.locator('#arScore')).toHaveText(String(scoreAfter(5)));
    await endRound(page);
    await expect(page.locator('.play-shell .ar-result')).toContainText('5 right · 0 missed');
    await expect(page.locator('.play-shell .ar-result')).toContainText("Your friend's Score of 240 stands.");
    await expect.poll(async () => scoreWrites((await cloudLog(page)).writes).map(w => w.path.split('/')[1]).sort())
      .toEqual([`daily-${DAY}-challenger`, `week-${WEEK}-challenger`]);
    expect((await deviceBoard(page)).map(e => e.board).sort()).toEqual([`daily-${DAY}-challenger`, `week-${WEEK}-challenger`]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('Another day: the friend\'s round from yesterday is Practice, no Score board entry, while a weekly Sparks write stays allowed', async ({ page, issues }) => {
    await worldBoardsStandIn(page);
    await clockAt(page, NOW);
    await open(page, link(YESTERDAY, 'challenger', '40'));
    const line = page.locator('#arFriend');
    await expect(line).toContainText("A friend's challenge: Score 40 to beat");
    await expect(line).toContainText(`This challenge is from ${YESTERDAY}, so here it plays as Practice, not on the Boards. Today's challenge is beside it.`);
    await expect(page.locator('[data-t="friend"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-t="friend"]')).toHaveText("Play your friend's round");
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'false');
    const items = await dailyItems(page, 'challenger', YESTERDAY);
    await pressStart(page);
    await expect(page.locator('.play-shell .play-title')).toHaveText("Arena: a friend's round");
    await expect(page.locator('#arTime')).toHaveText('60'); // the friend's race keeps its clock (design D11)
    await answerRight(page, items, 0, 5); // 70, well over the 10 a board accepts, and over the friend's 40
    await endRound(page);
    const result = page.locator('.play-shell .ar-result');
    await expect(result).toContainText('5 right · 0 missed');
    await expect(result).toContainText("You beat your friend's Score of 40!");
    await expect(result).toContainText("Your friend's round, played as Practice: it is not on the Boards.");
    await expect(page.locator('#arShare')).toHaveCount(0);
    await page.clock.runFor(2000);
    expect(scoreWrites((await cloudLog(page)).writes), 'a Practice Score sent to a Score board').toEqual([]);
    expect(await deviceBoard(page)).toEqual([]);
    await expect(page.locator('.fx-toasts')).not.toContainText('Posted to the world leaderboard');
    // Later timers: the weekly Sparks total (Practice Sparks count, by design) may post, never the round's Score
    await page.clock.runFor(70_000);
    const writes = (await cloudLog(page)).writes;
    expect(scoreWrites(writes)).toEqual([]);
    for (const w of writes) { expect(w.path).toMatch(/^boards\/xp-week-/); expect(w.data.score).not.toBe(scoreAfter(5)); }
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});

test.describe('a Pro Player', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 'adult' } });

  test('Another League: a Challenger link offers the friend\'s round as Practice with the Challenger questions, today\'s Pro challenge beside it', async ({ page }) => {
    await worldBoardsStandIn(page);
    await clockAt(page, NOW);
    await open(page, link(DAY, 'challenger', '240'));
    await expect(page.locator('.g-best')).toContainText('League: Pro');
    const line = page.locator('#arFriend');
    await expect(line).toContainText("A friend's challenge: Score 240 to beat");
    await expect(line).toContainText("This challenge is for the Challenger League, so here it plays as Practice, not on the Boards. Today's challenge is beside it.");
    await expect(page.locator('[data-t="friend"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-t="daily"]')).toHaveText('Daily challenge');
    const items = await dailyItems(page, 'challenger', DAY);
    await pressStart(page);
    // The Challenger set, not Pro mental arithmetic: a skill question with no difficulty step
    await expect(page.locator('#arQ')).not.toHaveAttribute('data-d', /.*/);
    await answerRight(page, items, 0, 3);
    await page.goto(`${APP}#/learn`); // leave before the round ends
    expect((await cloudLog(page)).writes).toEqual([]);
    // Today's own Pro daily challenge is a tap away
    await open(page, link(DAY, 'challenger', '240'));
    await page.locator('[data-t="daily"]').click();
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    await pressStart(page);
    await expect(page.locator('#arQ')).toHaveAttribute('data-d', '6'); // the Pro daily ramp starts at 6
    await page.goto(`${APP}#/learn`);
    expect(scoreWrites((await cloudLog(page)).writes)).toEqual([]);
  });
});
