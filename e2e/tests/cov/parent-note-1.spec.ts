import { test, expect, open, cloudLog, chromiumOnly, type Mode, typeAnswer } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec parent-note: "Note beside a World board" and "Note matches what is sent". Every Board (the Device board for
   anyone, with World boards after a tap for a Player 13 or over; change learnvedicmath) has the note beside it. */

const SUMMARY: Record<Mode, string> = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
};

const noteIn = (page: Page, mode: Mode) =>
  page.locator('#view details.pn', { has: page.locator('summary', { hasText: SUMMARY[mode] }) });

async function expectNoteBesideBoard(page: Page, mode: Mode, board: string) {
  await expect(page.locator(board).locator('.lb-body')).toBeVisible();
  const note = noteIn(page, mode);
  await expect(note).toHaveCount(1);
  await expect(note).toBeVisible();
  // The note is available: it opens and says what World boards keep
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  await expect(note).toContainText('World boards run on Google Firebase.');
  // Beside the board: board and note share the same card or section of the view
  const together = await page.evaluate(([b]) => {
    const boardEl = document.querySelector(b)!, noteEl = document.querySelector('#view details.pn')!;
    let p: Element | null = boardEl.parentElement;
    while (p && !p.contains(noteEl)) p = p.parentElement;
    return !!p && p !== document.body && (p as HTMLElement).closest('#view') !== null;
  }, [board]);
  expect(together).toBe(true);
}

const MODES: Mode[] = ['explorer', 'challenger', 'pro'];

for (const mode of MODES) {
  test.describe(`${mode}: every Board has the parent note beside it`, () => {
    test.use({ seedMode: mode });

    test('Arena boards (today, this week, weekly Sparks)', async ({ page }) => {
      await open(page, '#/arena');
      for (const b of ['#lbDay', '#lbWeek', '#lbSparks']) await expect(page.locator(b).locator('.lb-body')).toBeVisible();
      await expectNoteBesideBoard(page, mode, '#lbSparks');
    });

    test('every game page\'s boards', async ({ page }) => {
      test.setTimeout(120_000);
      await open(page, '#/games');
      const ids: string[] = await page.evaluate(async () => (await import('/js/games.js' as string)).GAMES.map((g: { id: string }) => g.id));
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        await open(page, `#/game/${id}`);
        await expect(page.locator('#gbDay .lb-body'), id).toBeVisible();
        await expect(page.locator('#gbWeek .lb-body'), id).toBeVisible();
        await expectNoteBesideBoard(page, mode, '#gbDay');
      }
    });

    test('home: a Board only where the note is', async ({ page }) => {
      await open(page);
      const boards = page.locator('#view .lb-body');
      if (mode === 'pro') {
        await expectNoteBesideBoard(page, mode, '#homeBoard');
      } else {
        // No Board on this home, so there is nothing for the note to sit beside
        await expect(boards).toHaveCount(0);
      }
    });
  });
}

/* Every write path, run against the fake SDK, compared with the kinds of post the note names */
test.describe('the note matches what is sent', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('each kind of post the app sends is named in the note, and the note names no other', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    test.setTimeout(90_000);
    await page.clock.install();
    await open(page, '#/arena');
    const { day, wk } = await page.evaluate(async () => {
      const cloud = await import('/js/cloud.js' as string);
      return { day: cloud.dayId() as string, wk: cloud.weekId() as string };
    });

    // Arena Daily challenge
    const answer = await page.evaluate(async d => (await import('/js/arena.js' as string)).dailySet('challenger', d)[0].answer, day);
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    await typeAnswer(page, String(answer));
    await page.locator('#arForm button').click();
    await page.clock.fastForward(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBeGreaterThanOrEqual(2);

    // A Ranked game round
    await page.evaluate(() => { location.hash = '#/game/times-sprint'; });
    await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#gStart').click();
    for (let i = 0; i < 3; i++) {
      const q = (await page.locator('#gArea .g-q').textContent())!.replace(/,/g, '');
      const [x, y] = q.split('×').map(v => Number(v.trim()));
      await page.locator('#gArea .ans-in').fill(String(x * y));
      await page.locator('#gArea .ans-in').press('Enter');
      await expect(page.locator('#gPts')).toHaveText(/^[1-9]/);
      await page.clock.runFor(1_500);
    }
    await page.clock.fastForward(61_000);
    await expect(page.locator('.g-result .md-kicker')).toHaveText('Ranked score');
    // Weekly Sparks follow a few seconds after a gain (at most once a minute)
    await page.clock.runFor(65_000);

    const KINDS: Record<string, RegExp> = {
      arena: new RegExp(`^boards/(daily-${day}|week-${wk})-challenger/scores/[^/]+$`),
      ranked: new RegExp(`^boards/g_times_sprint-(daily-${day}|week-${wk})-challenger/scores/[^/]+$`),
      sparks: new RegExp(`^boards/xp-week-${wk}-challenger/scores/[^/]+$`),
    };
    await expect.poll(async () => (await cloudLog(page)).writes.map(w => w.path).filter(p => KINDS.sparks.test(p)).length).toBeGreaterThanOrEqual(1);
    const paths = (await cloudLog(page)).writes.map(w => w.path);
    const kindOf = (p: string) => Object.keys(KINDS).filter(k => KINDS[k].test(p));
    // Every request is one of the three kinds, and each kind was sent
    for (const p of paths) expect(kindOf(p), p).toHaveLength(1);
    expect(new Set(paths.flatMap(kindOf))).toEqual(new Set(['arena', 'ranked', 'sparks']));

    // The note names exactly these three kinds
    await page.evaluate(() => { location.hash = '#/me'; });
    const note = noteIn(page, 'challenger');
    await note.locator('summary').click();
    await expect(note).toContainText("Three kinds of post go to boards for the player's league:");
    await expect(note).toContainText('the score of a Daily challenge in the Arena');
    await expect(note).toContainText('the score of a Ranked round of a game');
    await expect(note).toContainText("the player's Sparks total for this week (one weekly board)");
    await expect(note).toContainText('Practice scores themselves never leave this device.');
    // and no other kind of post
    const text = (await note.textContent())!;
    expect(text.match(/kinds? of post/g)).toEqual(['kinds of post']);
    for (const other of [/\bduel/i, /\bstar\b/i, /\brating\b/i, /\bbelt/i, /\bmedal/i, /\bXP\b/]) expect(text).not.toMatch(other);
  });
});
