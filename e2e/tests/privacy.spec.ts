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

test('the note says only the Arena daily challenge sends a score, and the app sends nothing else', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  // The note promises: "Only a Daily challenge in the Arena sends a score, to two boards".
  // Earning XP anywhere (here: collecting two sutra cards) must therefore send nothing.
  await open(page, '#/me');
  await page.locator('details summary', { hasText: SUMMARY.challenger }).click();
  await expect(page.locator('details[open]')).toContainText('Only a Daily challenge in the Arena sends a score, to two boards');
  await page.goto(`${APP}#/sutras`);
  for (const i of [0, 1]) await page.locator('.sutra-card .sutra-face').nth(i).click();
  await page.waitForTimeout(4500); // the weekly XP post is queued 3 seconds after an XP gain
  const sent = (await cloudLog(page)).writes.map(w => w.path);
  expect(sent, 'boards written outside an Arena daily round, contrary to the parent note').toEqual([]);
});
