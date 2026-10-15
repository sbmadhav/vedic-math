import { test, expect, APP, open, cloudLog, chromiumOnly } from './fixtures';

/* The note for grown-ups is shown beside every World board (Arena, game pages, Pro home) and on the Me
   page, and what it promises must match what the app sends (openspec parent-note spec). The fake Firebase
   SDK records what the app tries to read, sign in and write, so these checks never touch production. */

const SUMMARY = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
} as const;

/* Every statement the parent-note spec requires */
const REQUIRED = [
  'World boards run on Google Firebase.',
  // every kind of post, and nothing else
  "Three kinds of post go to boards for the player's league: the score of a Daily challenge in the Arena and the score of a Ranked round of a game (today's and this week's board for each), and the player's Sparks total for this week (one weekly board).",
  // Sparks and Practice
  'Sparks come from all play, Practice included, so practice adds to that posted weekly total. Practice scores themselves never leave this device.',
  // consent
  'Nothing is posted before a player answers one question about their age. The answer stays on this device and is never sent.',
  'Nothing is posted for a player under 13 until a grown-up turns on World boards for them on this device (Me page, World boards), and it can be turned off there at any time.',
  // identity
  'No identity exists until the first post: looking at World boards needs no sign-in.',
  // one identity per Player (board-identity spec), and what removing a Player does
  'Firebase gives that player their own random ID on this browser and keeps it with the dates it was created and last used.',
  'Each player on this device who posts has their own ID and their own entry on each board.',
  'Removing a player on the Me page forgets their ID on this device; entries',
  'already posted stay until',
  // fields and keeping
  'Each entry holds exactly: the made-up nickname (picked from fixed word lists, never typed), an avatar color, the best score, the time it was saved, and the time it expires.',
  'No names, emails, ages, photos or typed text are ever collected',
  'Google reCAPTCHA',
  'Entries are not deleted automatically, and turning World boards off does not delete them.',
  'To have an entry removed, message Madhav on LinkedIn with the nickname, color and date.',
  // anonymous usage counts (analytics spec), separate from World boards
  'Separately from World boards, the site counts visits and',
  '(pages opened, questions answered, rounds finished)',
  'with GoatCounter, anonymously: no cookies, no IDs and no names.',
];
async function expectNote(page: import('@playwright/test').Page, summary: string, now?: string) {
  const note = page.locator('details', { has: page.locator('summary', { hasText: summary }) }).first();
  await expect(note).toBeVisible();
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  for (const line of REQUIRED) await expect(note).toContainText(line);
  if (now) await expect(note.locator('.pn-now')).toHaveText(now);
  // Practice is never described as staying on the device without its Sparks counting, and XP is gone
  await expect(note).not.toContainText('practice and endless rounds');
  await expect(note).not.toContainText(/\bXP\b/);
  // The ID belongs to one Player, not to the browser
  await expect(note).not.toContainText('gives this browser');
  await expect(note).not.toContainText('share one entry');
  await expect(note.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/sbmadhav/');
  return note;
}
const NOW = {
  noAnswer: 'Right now nothing is posted for this player. They have not answered the age question yet; it is asked the first time a score would be posted.',
  under13: 'Right now nothing is posted for this player, because their age answer is under 13. To turn on World boards for them, a grown-up opens the Me page and goes to World boards.',
  parentOk: 'A grown-up turned on World boards for this player on this device. They can turn it off again on the Me page, under World boards.',
  posting: "This player's scores and weekly Sparks post to World boards.",
};

test('the parent note is on the Me page, in the Arena and beside a game\'s World boards', async ({ page }) => {
  await open(page, '#/me');
  await expectNote(page, SUMMARY.challenger, NOW.noAnswer);
  await open(page, '#/arena');
  await expectNote(page, SUMMARY.challenger, NOW.noAnswer);
  await open(page, '#/game/times-sprint');
  await expect(page.locator('#gbDay .lb-tabs')).toBeVisible();
  await expectNote(page, SUMMARY.challenger, NOW.noAnswer);
});

test.describe('under 13 without the Parent step', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 10 } });
  test('the note says nothing is posted for this player and how to turn World boards on', async ({ page }) => {
    await open(page, '#/arena');
    await expectNote(page, SUMMARY.pro, NOW.under13);
  });
});
test.describe('under 13 with the Parent step', () => {
  test.use({ seedMode: 'explorer', seedConsent: { age: 7, parentOk: 1760000000000 } });
  test('the note says a grown-up turned World boards on and where to turn them off', async ({ page }) => {
    await open(page, '#/me');
    await expectNote(page, SUMMARY.explorer, NOW.parentOk);
  });
});
test.describe('13 and over', () => {
  test.use({ seedConsent: { age: 14 } });
  test('the note says this player posts', async ({ page }) => {
    await open(page, '#/arena');
    await expectNote(page, SUMMARY.challenger, NOW.posting);
  });
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('the note is worded for grown-ups', async ({ page }) => {
    await open(page, '#/me');
    await expectNote(page, SUMMARY.explorer, NOW.noAnswer);
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
  // Honest framing: the sutras come from the 1965 book, not "traditional Vedic mathematics"
  await expect(page.locator('footer.mq-foot')).toContainText("Speed tricks use sutras from Bharati Krishna Tirtha's 1965 book; lessons, problems and visuals are original.");
  await expect(page.locator('footer.mq-foot')).not.toContainText(/traditional|Vedas/i);
});

test.describe('a Player who may post (a grown-up)', () => {
test.use({ seedConsent: { age: 'adult' } });

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
   Daily challenge and for a Ranked game round, and queueSparksPost for weekly Sparks). The clock is faked so
   60 second rounds and the once-a-minute Sparks post can be fast-forwarded. */
const UID = 'e2e-fake-uid';
const ENTRY_KEYS = ['avatar', 'exp', 'name', 'score', 'ts'];
const ids = (page: import('@playwright/test').Page) => page.evaluate(async () => {
  const cloud = await import('/vedic-math/js/cloud.js' as string);
  return { day: cloud.dayId() as string, wk: cloud.weekId() as string };
});
const writes = async (page: import('@playwright/test').Page) => (await cloudLog(page)).writes;

test('the note names every kind of score that is sent', async ({ page }) => {
  await open(page, '#/me');
  // The write-path tests below check the app sends exactly these three kinds of post
  await expectNote(page, SUMMARY.challenger, NOW.posting);
});

test('opening a leaderboard reads without loading Auth or signing in', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/arena');
  const { day, wk } = await ids(page);
  await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThanOrEqual(3);
  const log = await cloudLog(page);
  expect(log.authLoaded).toBe(false);
  expect(log.signIns).toBe(0);
  expect(log.reads.sort()).toEqual([`boards/daily-${day}-challenger/scores`, `boards/week-${wk}-challenger/scores`, `boards/xp-week-${wk}-challenger/scores`].sort());
  expect(log.writes).toEqual([]);
});

test('an Arena Daily challenge sends its score to today\'s and this week\'s Arena boards', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await page.clock.install();
  await open(page, '#/arena');
  const { day, wk } = await ids(page);
  // The daily round is seeded, so the first question's answer comes from the app's own module
  const answer = await page.evaluate(async d => (await import('/vedic-math/js/arena.js' as string)).dailySet('challenger', d)[0].answer, day);
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
  // The round earned 2 Sparks, under the weekly Sparks board's minimum of 10: nothing else is sent
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
  // The round also earned at least 10 Sparks, so this week's Sparks follow 3 seconds later
  await page.clock.runFor(3_500);
  await expect.poll(async () => (await writes(page)).map(x => x.path)).toContain(`boards/xp-week-${wk}-challenger/scores/${UID}`);
  expect(await writes(page)).toHaveLength(3);
});

test('Sparks earned anywhere send this week\'s Sparks total to the weekly Sparks board (id xp-week-), at most once a minute', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await page.clock.install();
  await open(page, '#/sutras');
  const { wk } = await ids(page);
  const board = `boards/xp-week-${wk}-challenger/scores/${UID}`;
  const card = (i: number) => page.locator('.sutra-card .sutra-face').nth(i);
  // Collecting a sutra card is worth 5 Sparks: under the board's minimum of 10, so nothing is sent
  await card(0).click();
  await page.clock.runFor(70_000);
  expect(await writes(page)).toEqual([]);
  // 10 Sparks this week: sent 3 seconds after the gain
  await card(1).click();
  await page.clock.runFor(3_500);
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  let w = await writes(page);
  expect(w[0].path).toBe(board);
  expect(Object.keys(w[0].data).sort()).toEqual(ENTRY_KEYS);
  expect(w[0].data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 10 });
  // More Sparks within the minute waits for the minute to pass, then sends the new total
  await card(2).click();
  await page.clock.runFor(10_000);
  expect(await writes(page)).toHaveLength(1);
  await page.clock.runFor(60_000);
  await expect.poll(async () => (await writes(page)).length).toBe(2);
  w = await writes(page);
  expect(w[1].path).toBe(board);
  expect(w[1].data.score).toBe(15); // weekly Sparks are not rounded to even (only Arena scores are)
});
}); // a Player who may post

test.describe('a Player who may not post', () => {
  test.use({ seedConsent: { age: 9 } });
  test('Sparks earned by an under-13 Player without the Parent step sends nothing and signs in nowhere', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    await page.clock.install();
    await open(page, '#/sutras');
    for (const i of [0, 1, 2, 3]) await page.locator('.sutra-card .sutra-face').nth(i).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).sparks)).toBe(20);
    await page.clock.runFor(130_000);
    const log = await cloudLog(page);
    expect(log.writes).toEqual([]);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
  });
});

/* ---------- One identity per Player (openspec board-identity) ----------
   Two Players on one device, both grown-ups. The fake SDK keeps one session per Firebase app, so each
   Player's writes carry their own uid: 'e2e-fake-uid' for the first Player (p1, the default app) and
   'e2e-fake-vm-<id>' for any other. */
const PB = 'pbtest1', UID_A = 'e2e-fake-uid', UID_B = `e2e-fake-vm-${PB}`;
const boardIds = (page: import('@playwright/test').Page) => page.evaluate(async () => {
  const cloud = await import('/vedic-math/js/cloud.js' as string);
  return { day: cloud.dayId() as string, wk: cloud.weekId() as string };
});
const sent = async (page: import('@playwright/test').Page) => (await cloudLog(page)).writes;
const B = { id: PB, name: 'Lucky Otter 17', avatar: 'plum', mode: 'challenger', created: 1, age: 'adult' };
/** Adds Player B (a grown-up, Challenger unless told otherwise) to the seeded device, once, before the page loads. */
async function seedSecondPlayer(page: import('@playwright/test').Page, extra: Record<string, unknown> = {}, more: Record<string, string> = {}) {
  await page.addInitScript(([b, more]) => {
    if (localStorage.getItem('e2e.seeded2')) return;
    localStorage.setItem('e2e.seeded2', '1');
    const P = JSON.parse(localStorage.getItem('vm.players')!);
    P.list.push(b); localStorage.setItem('vm.players', JSON.stringify(P));
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [{ ...B, ...extra }, more] as const);
}
const switchTo = (page: import('@playwright/test').Page, id: string) => page.evaluate(async id => {
  (await import('/vedic-math/js/store.js' as string)).switchPlayer(id);
}, id);

test.describe('two Players on one device', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('each Player\'s Arena Daily challenge goes under their own identity, with their own Nickname', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    test.slow(); // two full 60 second rounds on the fake clock take about 20 seconds each
    await seedSecondPlayer(page);
    await page.clock.install();
    await open(page, '#/arena');
    const { day, wk } = await boardIds(page);
    const answer = await page.evaluate(async d => (await import('/vedic-math/js/arena.js' as string)).dailySet('challenger', d)[0].answer, day);
    const play = async () => {
      await page.locator('#arGo').click();
      await page.clock.runFor(2_500);
      await page.locator('#arType').fill(String(answer));
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore')).toHaveText('10');
      await page.clock.runFor(61_000);
      await expect(page.locator('.ar-result')).toBeVisible();
    };
    await play();
    await expect.poll(async () => (await sent(page)).length).toBe(2);
    // Player B takes over the device and plays the same Daily challenge
    await switchTo(page, PB);
    await page.goto(`${APP}#/me`);
    await page.goto(`${APP}#/arena`);
    await expect(page.locator('#arGo')).toBeVisible();
    await play();
    await expect.poll(async () => (await sent(page)).length).toBe(4);
    const w = await sent(page);
    const by = (uid: string) => w.filter(x => x.path.endsWith('/' + uid));
    expect(by(UID_A).map(x => x.path).sort()).toEqual([`boards/daily-${day}-challenger/scores/${UID_A}`, `boards/week-${wk}-challenger/scores/${UID_A}`]);
    expect(by(UID_B).map(x => x.path).sort()).toEqual([`boards/daily-${day}-challenger/scores/${UID_B}`, `boards/week-${wk}-challenger/scores/${UID_B}`]);
    for (const x of by(UID_A)) expect(x.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal' });
    for (const x of by(UID_B)) expect(x.data).toMatchObject({ name: 'Lucky Otter 17', avatar: 'plum' });
    expect((await cloudLog(page)).signIns).toBe(2);
  });

  test('Sparks earned by A and posted after a switch to B goes out as A\'s own total, under A\'s identity', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    await seedSecondPlayer(page, { mode: 'pro' });
    await page.clock.install();
    await open(page, '#/sutras');
    const { wk } = await boardIds(page);
    await page.locator('.sutra-card .sutra-face').nth(0).click();
    await page.locator('.sutra-card .sutra-face').nth(1).click(); // 10 Sparks for A: the post is due in 3 seconds
    await switchTo(page, PB);
    await page.clock.runFor(3_500);
    await expect.poll(async () => (await sent(page)).length).toBe(1);
    const [x] = await sent(page);
    expect(x.path).toBe(`boards/xp-week-${wk}-challenger/scores/${UID_A}`); // A's League, A's uid
    expect(x.data).toMatchObject({ name: 'Swift Tiger 42', score: 10 });
    const log = await cloudLog(page);
    expect(log.apps).not.toContain(`vm-${PB}`); // B has earned nothing and posted nothing: no identity
    expect(log.signIns).toBe(1);
  });

  test('"me" on a World board follows the active Player', async ({ page }) => {
    await seedSecondPlayer(page, {}, { 'vm.cloudUids': JSON.stringify({ p1: UID_A, [PB]: UID_B }) });
    await page.addInitScript(([a, b]) => { (globalThis as any).__e2eRows = [[a, 'Swift Tiger 42', 400], [b, 'Lucky Otter 17', 300], ['someone', 'Brave Panda 12', 200]]; }, [UID_A, UID_B] as const);
    await open(page, '#/arena');
    await expect(page.locator('#lbDay li.me')).toHaveCount(1);
    await expect(page.locator('#lbDay li.me .lb-name')).toHaveText('Swift Tiger 42');
    await open(page, '#/me');
    await page.locator(`[data-switch="${PB}"]`).click();
    await expect(page.locator('#view h1')).toHaveText('Lucky Otter 17');
    await open(page, '#/arena');
    await expect(page.locator('#lbDay li.me')).toHaveCount(1);
    await expect(page.locator('#lbDay li.me .lb-name')).toHaveText('Lucky Otter 17');
    const log = await cloudLog(page);
    expect(log.authLoaded).toBe(false);
    expect(log.signIns).toBe(0);
  });
});

/* Ratings stay on the device (ratings spec): after Arena rounds and skill Practice, no request carries one */
test.describe('Ratings', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 'adult' } });
  test('no request after Arena daily and Practice rounds and skill Practice contains a Rating', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    const out: string[] = [];
    page.on('request', r => out.push(`${r.method()} ${r.url()}\n${r.postData() || ''}`));
    await page.clock.install();
    await open(page, '#/arena');
    const { day } = await boardIds(page);
    // A finished daily round: it posts, and its entries hold no Rating
    const answer = await page.evaluate(async d => (await import('/vedic-math/js/arena.js' as string)).dailySet('pro', d)[0].answer, day);
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    await page.locator('#arType').fill(String(answer));
    await page.locator('#arForm button').click();
    for (let k = 0; k < 4; k++) { await page.locator('#arType').fill('1'); await page.locator('#arForm button').click(); }
    await page.clock.runFor(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    await expect.poll(async () => (await sent(page)).length).toBe(2);
    // A finished Practice round with enough answers to save the Arena Rating
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    for (let k = 0; k < 5; k++) { await page.locator('#arType').fill('1'); await page.locator('#arForm button').click(); }
    await page.clock.runFor(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    // Skill Practice: 10 answers save a Skill Rating
    await page.goto(`${APP}#/skill/3-mult`);
    const box = page.locator('#practice');
    for (let k = 0; k < 10; k++) { await box.locator('#prShow').click(); await box.locator('#prCheck').click(); }
    await page.goto(`${APP}#/learn`);
    await page.clock.runFor(70_000); // past the weekly Sparks post's wait
    const ratings = await page.evaluate(async () => (await import('/vedic-math/js/store.js' as string)).load().ratings);
    expect(Object.keys(ratings)).toEqual(expect.arrayContaining(['arena:pro', 'skill:3-mult']));
    for (const r of out) { expect(r).not.toMatch(/rating/i); expect(r).not.toContain('arena:'); }
    for (const w of await sent(page)) { expect(JSON.stringify(w)).not.toMatch(/rating|arena:/i); expect(Object.keys(w.data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']); }
  });
});
