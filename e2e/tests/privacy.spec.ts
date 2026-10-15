import { test, expect, APP, open, cloudLog, chromiumOnly } from './fixtures';

/* The note for parents is shown wherever a child sees a leaderboard nickname (Me, Arena, Pro home),
   and what it promises must match what the app sends. The fake Firebase SDK records what the app
   tries to write, so these checks never touch production. */

const SUMMARY = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
} as const;

async function expectNote(page: import('@playwright/test').Page, summary: string) {
  const note = page.locator('details', { has: page.locator('summary', { hasText: summary }) }).first();
  await expect(note).toBeVisible();
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  await expect(note).toContainText('World leaderboards run on Google Firebase');
  await expect(note).toContainText('No names, emails, ages, photos or typed text are ever collected');
  await expect(note).toContainText('Google reCAPTCHA');
  await expect(note.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/sbmadhav/');
}

test('the parent note is on the Me page and in the Arena', async ({ page }) => {
  await open(page, '#/me');
  await expectNote(page, SUMMARY.challenger);
  await open(page, '#/arena');
  await expectNote(page, SUMMARY.challenger);
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('the note is worded for grown-ups', async ({ page }) => {
    await open(page, '#/me');
    await expectNote(page, SUMMARY.explorer);
  });
});

test.describe('pro', () => {
  test.use({ seedMode: 'pro' });
  test('the note sits next to the home leaderboard', async ({ page }) => {
    await open(page);
    await expect(page.locator('#homeBoard .lb-tabs')).toBeVisible();
    await expectNote(page, SUMMARY.pro);
  });
});

test('the footer says progress stays in this browser', async ({ page }) => {
  await open(page);
  await expect(page.locator('footer.mq-foot')).toContainText('Progress stays in this browser, and leaderboards only see a made-up nickname.');
});

test('an Arena score entry holds only the nickname, avatar color, score and two timestamps', async ({ page }) => {
  // Calls the app's own cloud.submit (what the Arena daily round uses) against the fake SDK
  await open(page, '#/arena');
  const writes = await page.evaluate(async () => {
    const cloud = await import('/vedic-math/js/cloud.js' as string);
    const day = `daily-${cloud.dayId()}-challenger`;
    await cloud.submit(day, { id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', created: 1, score: 121 });
    return (globalThis as any).__e2eCloud.writes;
  });
  expect(writes).toHaveLength(1);
  expect(writes[0].path).toMatch(/^boards\/daily-\d{4}-\d{2}-\d{2}-challenger\/scores\/e2e-fake-uid$/);
  expect(Object.keys(writes[0].data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']);
  expect(writes[0].data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 120, ts: { serverTimestamp: true } });
});

/* Every write path in the app, run against the fake SDK. Together they are everything the note has to
   describe: js/app.js writes through cloud.submit from exactly three places (postScore for an Arena
   Daily challenge and for a Ranked game round, and queueXpPost for weekly XP). The clock is faked so
   60 second rounds and the once-a-minute XP post can be fast-forwarded. */
const UID = 'e2e-fake-uid';
const ENTRY_KEYS = ['avatar', 'exp', 'name', 'score', 'ts'];
const ids = (page: import('@playwright/test').Page) => page.evaluate(async () => {
  const cloud = await import('/vedic-math/js/cloud.js' as string);
  return { day: cloud.dayId() as string, wk: cloud.weekId() as string };
});
const writes = async (page: import('@playwright/test').Page) => (await cloudLog(page)).writes;

test('the note names every kind of score that is sent', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('details summary', { hasText: SUMMARY.challenger }).click();
  const note = page.locator('details[open]');
  // The shipped wording (97181d9); the write-path tests below check the app does exactly this
  await expect(note).toContainText("Three things send a score, each to boards for the player's league: a Daily challenge in the Arena and a Ranked round of a game (today's and this week's board for each), and the XP earned this week (one weekly board).");
  await expect(note).toContainText('Progress, badges, practice and endless rounds, and the players on this device stay in this browser only.');
});

test('opening a leaderboard signs in anonymously and only reads', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/arena');
  const { day, wk } = await ids(page);
  await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThanOrEqual(3);
  const log = await cloudLog(page);
  expect(log.signIns).toBe(1);
  expect(log.reads.sort()).toEqual([`boards/daily-${day}-challenger/scores`, `boards/week-${wk}-challenger/scores`, `boards/xp-week-${wk}-challenger/scores`].sort());
  expect(log.writes).toEqual([]);
});

test('an Arena Daily challenge sends its score to today\'s and this week\'s Arena boards', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await page.clock.install();
  await open(page, '#/arena');
  const { day, wk } = await ids(page);
  // The daily round is seeded, so the first question's answer comes from the app's own module
  const answer = await page.evaluate(async seed => (await import('/vedic-math/js/arena.js' as string)).makeSet('challenger', seed)[0].answer, `daily-${day}-challenger`);
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500); // 3, 2, 1
  await page.locator('#arType').fill(String(answer));
  await page.locator('#arForm button').click();
  await expect(page.locator('#arScore')).toHaveText('10');
  expect(await writes(page)).toEqual([]);
  await page.clock.runFor(61_000); // the 60 second round ends
  await expect(page.locator('.ar-result')).toBeVisible();
  await expect.poll(async () => (await writes(page)).length).toBe(2);
  const w = await writes(page);
  expect(w.map(x => x.path).sort()).toEqual([`boards/daily-${day}-challenger/scores/${UID}`, `boards/week-${wk}-challenger/scores/${UID}`]);
  for (const x of w) {
    expect(Object.keys(x.data).sort()).toEqual(ENTRY_KEYS);
    expect(x.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 10 });
  }
  // The round earned 2 XP, under the weekly XP board's minimum of 10: nothing else is sent
  await page.clock.runFor(70_000);
  expect(await writes(page)).toHaveLength(2);
});

test('a finished Ranked game round sends its score to that game\'s today and this week boards', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await page.clock.install();
  await open(page, '#/game/times-sprint');
  const { day, wk } = await ids(page);
  await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#gStart').click();
  const q = (await page.locator('#gArea .g-q').textContent())!.replace(/,/g, '');
  const [x, y] = q.split('×').map(v => Number(v.trim()));
  await page.locator('#gArea .ans-in').fill(String(x * y));
  await page.locator('#gArea .ans-in').press('Enter');
  await expect(page.locator('#gPts')).toHaveText(/^[1-9]/);
  await page.clock.runFor(61_000); // the 60 second round ends
  await expect(page.locator('.g-result .md-kicker')).toHaveText('Ranked score');
  await expect.poll(async () => (await writes(page)).length).toBe(2);
  const w = await writes(page);
  expect(w.map(x => x.path).sort()).toEqual([`boards/g_times_sprint-daily-${day}-challenger/scores/${UID}`, `boards/g_times_sprint-week-${wk}-challenger/scores/${UID}`]);
  for (const e of w) {
    expect(Object.keys(e.data).sort()).toEqual(ENTRY_KEYS);
    expect(e.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal' });
    expect(e.data.score).toBeGreaterThanOrEqual(10);
  }
  // The round also earned at least 10 XP, so this week's XP follows 3 seconds later
  await page.clock.runFor(3_500);
  await expect.poll(async () => (await writes(page)).map(x => x.path)).toContain(`boards/xp-week-${wk}-challenger/scores/${UID}`);
  expect(await writes(page)).toHaveLength(3);
});

test('XP earned anywhere sends this week\'s XP total to the weekly XP board, at most once a minute', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await page.clock.install();
  await open(page, '#/sutras');
  const { wk } = await ids(page);
  const board = `boards/xp-week-${wk}-challenger/scores/${UID}`;
  const card = (i: number) => page.locator('.sutra-card .sutra-face').nth(i);
  // Collecting a sutra card is worth 5 XP: under the board's minimum of 10, so nothing is sent
  await card(0).click();
  await page.clock.runFor(70_000);
  expect(await writes(page)).toEqual([]);
  // 10 XP this week: sent 3 seconds after the gain
  await card(1).click();
  await page.clock.runFor(3_500);
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  let w = await writes(page);
  expect(w[0].path).toBe(board);
  expect(Object.keys(w[0].data).sort()).toEqual(ENTRY_KEYS);
  expect(w[0].data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 10 });
  // More XP within the minute waits for the minute to pass, then sends the new total
  await card(2).click();
  await page.clock.runFor(10_000);
  expect(await writes(page)).toHaveLength(1);
  await page.clock.runFor(60_000);
  await expect.poll(async () => (await writes(page)).length).toBe(2);
  w = await writes(page);
  expect(w[1].path).toBe(board);
  expect(w[1].data.score).toBe(15); // weekly XP is not rounded to even (only Arena scores are)
});
