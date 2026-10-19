import { test, expect, open, type Mode } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec parent-note:
   - "The note says the ID belongs to one Player" / Note explains removing a Player
   - "The note mentions anonymous usage counts" / Grown-up reads the note (in any Mode)
   e2e/tests/privacy.spec.ts checks fragments of these lines; here every Mode's note is opened and the
   complete statements are asserted, on the Me page and in the Arena. */

const SUMMARY: Record<Mode, string> = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
};

/* Removing a Player forgets their ID on this device; entries already posted stay until removal is requested */
const REMOVAL: Record<Mode, RegExp> = {
  explorer: /Removing a player on the Me page forgets their ID on this device\./,
  challenger: /Removing a player on the Me page forgets their ID on this device\./,
  pro: /Removing a player on the Me page forgets their ID on this device\./,
};

/* Usage is counted anonymously, without cookies or IDs, separately from World boards */
const USAGE: Record<Mode, string> = {
  explorer: 'Separately from World boards, the site counts visits and things done in the app (pages opened, questions answered, rounds finished) to make it better, with GoatCounter, anonymously: no cookies, no IDs and no names.',
  challenger: 'Separately from World boards, the site counts visits and actions in the app (pages opened, questions answered, rounds finished) to improve it, with GoatCounter, anonymously: no cookies, no IDs and no names.',
  pro: 'Separately from World boards, the site counts visits and actions in the app (pages opened, questions answered, rounds finished) to improve it, with GoatCounter, anonymously: no cookies, no IDs and no names.',
};

async function openNote(page: Page, mode: Mode) {
  const note = page.locator('#view details.pn', { has: page.locator('summary', { hasText: SUMMARY[mode] }) }).first();
  await expect(note).toBeVisible();
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  return note;
}

for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
  test.describe(`${mode} mode`, () => {
    test.use({ seedMode: mode });

    for (const route of ['#/me', '#/arena']) {
      test(`note on ${route} explains removing a Player`, async ({ page }) => {
        await open(page, route);
        const note = await openNote(page, mode);
        await expect(note).toContainText(REMOVAL[mode]);
        // The ID is the Player's own, not the browser's
        await expect(note).toContainText('Firebase gives that player their own random ID on this browser');
        await expect(note).not.toContainText('gives this browser');
        // Entries are kept until removal is asked for, and the note says how to ask
        await expect(note).toContainText('Entries are not deleted automatically.');
        await expect(note).toContainText('To have an entry removed, message Madhav on LinkedIn with the nickname, color and date.');
      });

      test(`note on ${route} says usage is counted anonymously, separately from World boards`, async ({ page }) => {
        await open(page, route);
        const note = await openNote(page, mode);
        const p = note.locator('p', { hasText: 'GoatCounter' });
        await expect(p).toHaveCount(1);
        await expect(p).toHaveText(USAGE[mode]);
        await expect(p).toContainText('Separately from World boards');
        await expect(p).toContainText('anonymously: no cookies, no IDs');
      });
    }
  });
}
