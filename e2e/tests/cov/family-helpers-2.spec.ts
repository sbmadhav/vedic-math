import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, friends, who, btn, askFriend, closeVisit } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Three friends, never teachers", Scenario "Two friends take
   turns": a level 2 Visit (the second Ask a friend) shows one friend's turn with Next, then the other's. */
test.use({ seedPlayer: ON });

test('Two friends take turns: one turn with Next, then the other friend', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page);
  await closeVisit(page);
  await askFriend(page);
  await expect(visit(page)).toHaveAttribute('data-level', '2');
  await expect(friends(page)).toHaveCount(2);
  const names = new Set<string>();
  for (let i = 0; i < 6; i++) {
    names.add((await who(page).textContent()) || '');
    if (!(await btn(page, 'Next').count())) break;
    await expect(page.locator('.fh-visit .fh-friend.fh-on')).toHaveCount(1); /* one speaker at a time */
    await btn(page, 'Next').click();
  }
  expect(names.size).toBe(2);
  for (const n of names) expect(['Shunya', 'Nava', 'Eka']).toContain(n);
});
