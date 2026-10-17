import { test, expect, open, cloudLog } from '../fixtures';

/* openspec parent-note: "The note says the ID belongs to one Player" / Grown-up reads the note on a shared tablet.
   (The under-13 without the Parent step scenario is already asserted in e2e/tests/privacy.spec.ts:78.)
   A device with several Players, one per Mode, so the note is read in every wording. */

const SUMMARY = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
} as const;

const PLAYERS = [
  { id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', age: 'adult' },
  { id: 'p2', name: 'Brave Otter 7', avatar: 'coral', mode: 'explorer', age: 9, parentOk: 1760000000000 },
  { id: 'p3', name: 'Calm Heron 15', avatar: 'violet', mode: 'pro', age: 14 },
] as const;

test.beforeEach(async ({ page }) => {
  // Replace the fixture's single Player with three, once per test (reloads keep what the app saved)
  await page.addInitScript((list) => {
    try {
      if (sessionStorage.getItem('cov.pn2')) return;
      sessionStorage.setItem('cov.pn2', '1');
      localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: list.map(p => ({ ...p, created: Date.now() })) }));
    } catch (e) { /* storage blocked */ }
  }, PLAYERS as unknown as Record<string, unknown>[]);
});

async function readNote(page: import('@playwright/test').Page, summary: string) {
  const note = page.locator('#view details.pn', { has: page.locator('summary', { hasText: summary }) }).first();
  await expect(note).toBeVisible();
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  // Each Player who posts has their own random ID and their own entries
  await expect(note).toContainText('Firebase gives that player their own random ID on this browser');
  await expect(note).toContainText('Each player on this device who posts has their own ID and their own entry on each board.');
  // ...and it does not say the ID belongs to the browser
  await expect(note).not.toContainText('gives this browser');
  await expect(note).not.toContainText('share one entry');
  await expect(note).not.toContainText(/browser'?s (own )?(random )?ID/i);
  await expect(note).not.toContainText(/(one|a single|the same) (random )?ID for (this|the) (browser|device)/i);
  await expect(note).not.toContainText(/players on this device share/i);
  return note;
}

test('on a shared tablet the note says each Player who posts has their own ID and entries, in every Mode', async ({ page }) => {
  await open(page, '#/me');
  await expect(page.locator('#view .players .player')).toHaveCount(3);

  await readNote(page, SUMMARY.challenger);

  // Switch to the Explorer Player, then the Pro Player: the note is worded per Mode and says the same
  await page.locator('#view [data-switch="p2"]').click();
  await expect(page.locator('#view .players .player.on')).toContainText('Brave Otter 7');
  await readNote(page, SUMMARY.explorer);

  await page.locator('#view [data-switch="p3"]').click();
  await expect(page.locator('#view .players .player.on')).toContainText('Calm Heron 15');
  await readNote(page, SUMMARY.pro);

  // Reading the note creates no identity and posts nothing
  const log = await cloudLog(page);
  expect(log.signIns).toBe(0);
  expect(log.writes).toEqual([]);
});

test('the note beside the Arena World boards says the same on a device with several Players', async ({ page }) => {
  await open(page, '#/arena');
  await readNote(page, SUMMARY.challenger);
  expect((await cloudLog(page)).writes).toEqual([]);
});
