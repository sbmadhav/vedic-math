import { test, expect, open } from '../fixtures';

/* guide spec, Requirement "The guide is easy to find", Scenario "New here" (openspec change find-and-home-polish). */
test.use({ tourSeen: true });

test('New here: the note has exactly one control, Quick tour, and it opens the tour on a solid box', async ({ page }) => {
  await open(page);
  const note = page.locator('.gd-new');
  await expect(note).toBeVisible();
  await expect(note.locator('a, button')).toHaveCount(1);
  expect(await note.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  await note.getByRole('button', { name: 'Quick tour' }).click();
  await expect(page.locator('dialog.vm-tour[open]')).toBeVisible();
  await expect(page.locator('dialog.vm-tour')).toContainText(/1 of \d/);
});
