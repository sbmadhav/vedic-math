import { test, expect, open, cloudLog, appErrors } from '../fixtures';
import { startWordRound } from '../word-kit';
import { DAY, NOW, siteLink, clockAt, endRound, pressStart, scoreAfter, dailyItems, answerRight, fakeShareSheet, shared, noShareSheet, copied, scoreWrites } from '../challenge-kit';

/* arena spec (change arena-challenge-link), Requirement "Challenge a friend from the daily result" and "The share text
   says what the round was and nothing personal": one test per scenario. The share sheet and the clipboard are fakes that
   record what they get; the fixtures' fake SDK records any write, and nothing reaches a live backend. */

const NOTHING_PERSONAL = /Swift|Tiger|p1|teal|rating|—|\p{Extended_Pictographic}/iu;

test('Sharing a daily result: the share sheet gets the title, the three lines and the link with the date, League and Score', async ({ page, issues }) => {
  await fakeShareSheet(page);
  await clockAt(page, NOW);
  await open(page, '#/arena');
  const items = await dailyItems(page, 'challenger', DAY);
  await pressStart(page);
  await answerRight(page, items, 0, 3); // 10 + 12 + 14 = 36
  await endRound(page);
  await expect(page.locator('.play-shell .ar-result .md-value')).toHaveText(String(scoreAfter(3)));
  const btn = page.locator('#arShare');
  await expect(btn).toHaveText('Challenge a friend');
  await btn.click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  const [s] = await shared(page);
  expect(s.title).toBe('Learn Vedic Math');
  expect(s.url).toBe(siteLink(DAY, 'challenger', 36));
  expect(s.text.split('\n')).toEqual([
    `Learn Vedic Math: Arena daily challenge, Challenger League, ${DAY}`,
    'Score 36: 3 right, 0 missed, best combo 3x',
    'The same questions for every Challenger today, 60 seconds, no sign-in. Can you beat it?',
  ]);
  expect(`${s.title}\n${s.text}\n${s.url}`).not.toMatch(NOTHING_PERSONAL);
  // The tap sends nothing to any Board (World boards are off at launch; the device board took the daily Score)
  expect(scoreWrites((await cloudLog(page)).writes)).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test('No share sheet: the text and link are copied to the clipboard and "Copied. Paste it anywhere." is shown', async ({ page }) => {
  await noShareSheet(page);
  await clockAt(page, NOW);
  await open(page, '#/arena');
  const items = await dailyItems(page, 'challenger', DAY);
  await pressStart(page);
  await answerRight(page, items, 0, 1);
  await endRound(page);
  await page.locator('#arShare').click();
  await expect.poll(async () => (await copied(page)).length).toBe(1);
  const [text] = await copied(page);
  expect(text.split('\n')).toEqual([
    `Learn Vedic Math: Arena daily challenge, Challenger League, ${DAY}`,
    'Score 10: 1 right, 0 missed, best combo 1x',
    'The same questions for every Challenger today, 60 seconds, no sign-in. Can you beat it?',
    siteLink(DAY, 'challenger', 10),
  ]);
  await expect(page.locator('.fx-toast').filter({ hasText: 'Copied. Paste it anywhere.' })).toBeVisible();
});

test('Practice has no button: a Practice, an untimed Practice and a Word problems result show no Challenge a friend', async ({ page }) => {
  await clockAt(page, NOW);
  await open(page, '#/arena');
  // Practice (timed)
  await page.locator('[data-t="practice"]').click();
  await pressStart(page);
  await endRound(page);
  await expect(page.locator('.play-shell .ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
  await expect(page.locator('#arShare')).toHaveCount(0);
  await page.locator('#arDone').click();
  // Practice, no clock: Finish after one answer
  await page.locator('[data-t="untimed"]').click();
  await pressStart(page);
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('#arForm button').click();
  await page.locator('#arFinish').click();
  await expect(page.locator('.play-shell .ar-result')).toBeVisible();
  await expect(page.locator('#arShare')).toHaveCount(0);
  await page.locator('#arDone').click();
  // Word problems: ten answers end it
  await startWordRound(page);
  for (let k = 0; k < 10; k++) { await page.keyboard.press('1'); await page.keyboard.press('Enter'); }
  await expect(page.locator('.play-shell .ar-result')).toBeVisible();
  await expect(page.locator('#arShare')).toHaveCount(0);
  // Control: the daily result has it
  await page.locator('#arDone').click();
  await page.locator('[data-t="daily"]').click();
  await pressStart(page);
  await endRound(page);
  await expect(page.locator('#arShare')).toBeVisible();
  expect(scoreWrites((await cloudLog(page)).writes)).toEqual([]);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: the button reads "Send to family" and shares the Explorer League link', async ({ page }) => {
    await fakeShareSheet(page);
    await clockAt(page, NOW);
    await open(page, '#/arena');
    await pressStart(page);
    await page.locator('.ar-choice').first().click();
    await endRound(page);
    const btn = page.locator('#arShare');
    await expect(btn).toHaveText('Send to family');
    await btn.click();
    await expect.poll(async () => (await shared(page)).length).toBe(1);
    const [s] = await shared(page);
    expect(s.url).toMatch(new RegExp(`^https://learnvedicmath\\.com/play/#/arena/day/${DAY}/explorer/\\d{1,4}$`));
    expect(s.text).toContain('Explorer League');
    expect(s.text).toContain('The same questions for every Explorer today');
    expect(s.text).not.toMatch(NOTHING_PERSONAL);
  });
});
