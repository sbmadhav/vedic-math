import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "The clue limit". The clues are counted from this
   Visit's words: the fake server marks its first three replies as clues (as the Worker marks a reply that hints), and
   answers a fourth request for a hint the way the Worker does at zero, with method talk. */

test('Out of clues: "just one more hint?" gets the method in general, with no hint about the question', async ({ page }) => {
  const log = await fakeFamilyServer(page, (body, n) => {
    const used = body.words.filter(w => w.who !== 'player' && w.clue === true).length;
    if (used < 3) return { ...says({ speaker: 'nava', line: `Clue ${n}: look at the base.`, clue: true }), cluesLeft: 3 - used - 1 };
    return { ...says(['eka', 'No clues left, but the method is free: write how far each number is from the base.']), cluesLeft: 0 };
  });
  await open(page, TRICK);
  await openTalk(page);
  for (let i = 1; i <= 3; i++) { await send(page, `hint ${i}?`); await expect(say(page)).toContainText(`Clue ${i}`); }
  await send(page, 'just one more hint?');
  await expect(who(page)).toHaveText('Eka');
  await expect(say(page)).toContainText('the method is free');
  await expect(say(page)).not.toContainText(/Clue 4/);
  const last = log.turns[3]!.body.words;
  expect(last.filter(w => w.who !== 'player' && w.clue === true).length, 'three clues counted from the words sent').toBe(3);
});

test('General talk is free: a Sutra question with no clues left is answered, and the clue count does not change', async ({ page }) => {
  const log = await fakeFamilyServer(page, body => {
    const used = body.words.filter(w => w.who !== 'player' && w.clue === true).length;
    const last = body.words[body.words.length - 1]!.line;
    if (/sutra/i.test(last)) return { ...says(['eka', 'Nikhilam means all from nine and the last from ten: the distances come from it.']), actions: [{ type: 'showSutra' }], cluesLeft: 3 - used };
    return { ...says({ speaker: 'nava', line: `A clue: the base.`, clue: true }), cluesLeft: 3 - used - 1 };
  });
  await open(page, TRICK);
  await openTalk(page);
  for (let i = 1; i <= 3; i++) { await send(page, `hint ${i}?`); await expect(say(page)).toContainText('A clue'); }
  await send(page, 'what does the Sutra mean?');
  await expect(who(page)).toHaveText('Eka');
  await expect(say(page)).toContainText('all from nine');
  await expect(say(page).locator('.fh-sutra')).toHaveCount(1);
  await send(page, 'and again, what does the Sutra mean?');
  await expect.poll(() => log.turns.length).toBe(5);
  expect(log.turns[4]!.body.words.filter(w => w.who !== 'player' && w.clue === true).length).toBe(3);
});
