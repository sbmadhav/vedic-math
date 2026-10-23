import { test, expect, open } from '../fixtures';
import { SKILL, ON, say, askFriend, closeVisit } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "They remember on the device only". The seeded Player is
   Swift Tiger 42 (fixtures). */
test.use({ seedPlayer: ON });

test('Greeted by Nickname: the first turn of the first Visit says Swift Tiger', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page);
  await expect(say(page)).toContainText('Swift Tiger');
});

test('Nothing is sent: three Visits, and no request holds the Nickname or the helpers\' memory', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', r => seen.push(`${r.url()} ${r.postData() || ''}`));
  await open(page, SKILL);
  for (let i = 0; i < 3; i++) { await askFriend(page); await closeVisit(page); }
  const mem = await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players') || '{}').list[0].familyMem);
  expect(mem && mem.last).toBe('skill:3-mult'); /* remembered, on the device */
  for (const line of seen) {
    expect(line).not.toMatch(/Swift|Tiger|familyMem|skill:3-mult|sutra:s\d/);
  }
});
