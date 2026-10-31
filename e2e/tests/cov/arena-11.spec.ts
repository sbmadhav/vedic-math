import { test, expect, open, cloudLog, appErrors, FIREBASE_SDK } from '../fixtures';
import { DAY, NOW, link, siteLink, clockAt, endRound, pressStart, scoreAfter, dailyItems, answerRight, fakeShareSheet, shared, worldBoardsStandIn, deviceBoard } from '../challenge-kit';

/* arena spec (change arena-challenge-link), Requirement "Challenge a friend from the daily result", Scenario "Under-13
   Player" (ADR 0006, design D6): the button is there for every Player and the share sheet opens as for anyone; while
   sharing and while playing a challenge link nothing loads Firebase (no request to a Google host, none under
   /vendor/firebase/, the SDK loader stubbed with js/cloud.js _setLoader is never called), nothing posts, and the Score
   ranks on the Device board only. A stand-in config turns World boards on, so a load or a post would show. Anonymous
   analytics requests are answered locally by the fixtures and are allowed. */

const GOOGLE = /(^|\.)(google\.com|googleapis\.com|gstatic\.com|firebaseapp\.com|firebaseio\.com|recaptcha\.net)$/;

test.describe('a Player whose Age answer is under 13', () => {
  test.use({ seedConsent: { age: 10 } });

  test('Under-13 Player: the share sheet opens as for any Player, nothing loads Firebase, nothing posts, Device board only', async ({ page, issues }) => {
    const reached: string[] = [];
    page.on('request', r => reached.push(r.url()));
    await worldBoardsStandIn(page);
    await fakeShareSheet(page);
    await clockAt(page, NOW);
    await open(page, '#/arena');
    // The SDK loader, stubbed: any call is recorded (and fails), so a load would show up twice
    await page.evaluate(async () => { const C = await e2eMod('cloud'); (window as any).__loads = []; C._setLoader(async (url: string) => { (window as any).__loads.push(url); throw new Error('stubbed in this test'); }); });
    // Device boards only: no Show World board button for this Player
    await expect(page.locator('#lbDay .lb-src')).toHaveText('This device');
    await expect(page.locator('[data-show-world]')).toHaveCount(0);
    await expect(page.locator('#lbDay .lb-why')).toContainText("Your scores stay on this device's board.");
    const items = await dailyItems(page, 'challenger', DAY);
    await pressStart(page);
    await answerRight(page, items, 0, 2); // 22
    await endRound(page);
    await expect(page.locator('.fx-toasts')).toContainText('Saved on this device.');
    const btn = page.locator('#arShare');
    await expect(btn).toHaveText('Challenge a friend');
    await btn.click();
    await expect.poll(async () => (await shared(page)).length).toBe(1);
    expect((await shared(page))[0].url).toBe(siteLink(DAY, 'challenger', scoreAfter(2)));
    expect((await shared(page))[0].text).not.toMatch(/Swift|Tiger|\b10\b|age/i);
    await page.locator('#arDone').click();
    // A friend's challenge link: today's, so the daily challenge; its Score ranks on the Device board only
    await open(page, link(DAY, 'challenger', '240'));
    await page.evaluate(async () => { const C = await e2eMod('cloud'); C._setLoader(async (url: string) => { (window as any).__loads.push(url); throw new Error('stubbed in this test'); }); });
    await expect(page.locator('#arFriend')).toContainText("A friend's challenge: Score 240 to beat");
    await pressStart(page);
    await answerRight(page, items, 0, 3); // 36: the day's best on this device
    await endRound(page);
    await expect(page.locator('.play-shell .ar-result')).toContainText('New personal best for today!');
    await page.locator('#arDone').click();
    await expect(page.locator('#lbDay .lb-body')).toContainText('Swift Tiger 42');
    await expect(page.locator('#lbDay .lb-body')).toContainText(String(scoreAfter(3)));
    await page.clock.runFor(70_000); // the weekly Sparks post's wait: nothing goes out for this Player either
    // Nothing loaded Firebase, nothing posted, no identity
    expect(await page.evaluate(() => (window as any).__loads), 'the SDK loader was called').toEqual([]);
    expect(reached.filter(u => FIREBASE_SDK.test(u)), 'a request under /vendor/firebase/').toEqual([]);
    expect(reached.filter(u => GOOGLE.test(new URL(u).hostname)), 'a request to a Google host').toEqual([]);
    const log = await cloudLog(page);
    expect(log.writes).toEqual([]);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(await page.evaluate(() => [localStorage.getItem('vm.cloudUids'), localStorage.getItem('vm.cloudUid'), localStorage.getItem('e2e.fakeAuth')])).toEqual([null, null, null]);
    // The Device board holds both daily Scores' best and the week's
    const board = await deviceBoard(page);
    expect(board.map(e => e.board).sort()).toEqual([`daily-${DAY}-challenger`, 'week-2026-W43-challenger']);
    expect(board.find(e => e.board === `daily-${DAY}-challenger`)!.score).toBe(scoreAfter(3));
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
