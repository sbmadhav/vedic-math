import { test, expect, open } from '../fixtures';
import { box, question, recordSpeech, said, spoken } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Word problems are read aloud with the existing voice".
   The Studio voice has no recording of the new lines, so the Built-in voice (a recorder here) says them. */

test('Hear it on a Word problem speaks the whole story', async ({ page }) => {
  await recordSpeech(page);
  await open(page, '#/skill/3-twostep');
  expect(await said(page)).toBe(''); /* Read aloud is off for Challenger: nothing before the tap */
  await expect(box(page).locator('#prStory')).toHaveText('Word problem');
  await box(page).locator('#prHear').click();
  const words = await spoken(page, await question(page).innerHTML());
  await expect.poll(() => said(page), { timeout: 5000 }).toContain(words);
});
