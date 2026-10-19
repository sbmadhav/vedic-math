import { test, expect, open, type Mode, type Consent } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec parent-note:
   - "The note explains Sparks and Practice" / A parent reads about Practice
   - "The note mentions videos" / Grown-up reads the note (in any Mode)
   The note is opened in every Mode, beside the Arena and game World boards and on the Me page, for a Player
   with no Age answer, an under-13 Player and a grown-up Player. */

const SUMMARY: Record<Mode, string> = {
  explorer: 'For grown-ups: what the leaderboard keeps',
  challenger: 'For parents: what the leaderboard keeps',
  pro: 'Privacy: what the leaderboard stores',
};

const SPARKS_POSTED = 'Sparks come from all play, Practice included, so practice adds to that posted weekly total.';
const PRACTICE_LOCAL = 'Practice scores themselves never leave this device.';
const VIDEO = "Videos play from YouTube in privacy-enhanced mode, and YouTube's own rules apply once one plays.";

async function openNote(page: Page, mode: Mode) {
  const note = page.locator('#view details.pn', { has: page.locator('summary', { hasText: SUMMARY[mode] }) }).first();
  await expect(note).toBeVisible();
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  return note;
}

const sentences = (text: string) => text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

const CONSENTS: { name: string; consent: Consent | null }[] = [
  { name: 'no Age answer', consent: null },
  { name: 'under 13', consent: { age: 9 } },
  { name: 'grown-up', consent: { age: 'adult' } },
];

for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
  for (const { name, consent } of CONSENTS) {
    test.describe(`${mode} mode, ${name}`, () => {
      test.use({ seedMode: mode, seedConsent: consent });

      for (const route of ['#/me', '#/arena', '#/game/times-sprint']) {
        test(`note on ${route}: Practice Sparks count toward the posted weekly total, and videos come from YouTube`, async ({ page }) => {
          // Nothing external is fetched for these checks; any YouTube request is answered locally
          await page.route(/^https:\/\/(www\.)?(youtube(-nocookie)?\.com|ytimg\.com|i\.ytimg\.com)\//, r => r.fulfill({ status: 204, body: '' }));
          await open(page, route);
          const note = await openNote(page, mode);
          const text = (await note.textContent())!;
          const all = sentences(text);

          /* A parent reads about Practice: the note never says Practice stays on the device without also saying
             its Sparks count toward the posted weekly total */
          await expect(note).toContainText(SPARKS_POSTED);
          await expect(note).toContainText(PRACTICE_LOCAL);
          const practiceLocal = all.filter(s => /practice/i.test(s) && /(device|browser|never leave|stay)/i.test(s));
          expect(practiceLocal.length).toBeGreaterThan(0);
          const sparksPosted = all.filter(s => /practice/i.test(s) && /sparks/i.test(s) && /posted weekly total/i.test(s));
          expect(sparksPosted, 'the note says Practice Sparks count toward the posted weekly total').toHaveLength(1);
          // Sparks from all play add up to one weekly total that is posted
          await expect(note).toContainText("the player's Sparks total for this week (one weekly board)");
          // It does not mention XP
          expect(text).not.toMatch(/\bXP\b/i);

          /* Videos: one sentence saying they play from YouTube in privacy-enhanced mode and YouTube's rules apply
             once one plays */
          const video = note.locator('p.pn-video');
          await expect(video).toHaveCount(1);
          await expect(video).toContainText(VIDEO);
          const ytSentences = all.filter(s => /youtube/i.test(s));
          expect(ytSentences).toEqual([VIDEO]);
        });
      }
    });
  }
}
