import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Bolt and the three friends speak, two replies at most". */

test('A why question: one call, Bolt first, at most one more reply from Shunya, Nava or Eka', async ({ page }) => {
  const log = await fakeFamilyServer(page, () => says(['bolt', 'Because the base is a power of ten, the distances carry the whole product.'], ['eka', 'Nikhilam in one line: all from nine and the last from ten.']));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'why does this trick work?', 'Bolt');
  await expect.poll(() => log.turns.length).toBe(1);
  const seen = (await turns(page)).map(([w]) => w).filter(Boolean);
  expect(seen[0]).toBe('Bolt');
  expect(seen.length).toBeLessThanOrEqual(2);
  if (seen[1]) expect(['Shunya', 'Nava', 'Eka']).toContain(seen[1]);
});

test('A third reply: only the first two are shown', async ({ page }) => {
  await fakeFamilyServer(page, () => says(['shunya', 'Reply one.'], ['nava', 'Reply two.'], ['eka', 'Reply three.']));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'hello everyone', 'Shunya');
  const seen = await turns(page);
  expect(seen.filter(([, s]) => /Reply (one|two|three)/.test(s)).map(([w]) => w)).toEqual(['Shunya', 'Nava']);
  await expect(page.locator('.fh-visit')).not.toContainText('Reply three.');
});
