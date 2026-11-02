import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Safety in what is said and sent". */

test('A phone number typed: the request holds the question without the phone number', async ({ page }) => {
  const log = await fakeFamilyServer(page, () => says(['bolt', 'Good question. The distances do the work.']));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'call me on 555 123 4567, how does this work?', 'Bolt');
  const sent = log.turns[0]!.body.words[0]!.line;
  expect(sent).not.toMatch(/555|123|4567/);
  expect(sent).toContain('how does this work?');
});

test('Off topic: a question about a video game gets a friendly line that steers back to the question or the Sutra', async ({ page }) => {
  /* What the Worker returns under the fixed instructions (or its steer line when a reply left the role) */
  await fakeFamilyServer(page, () => says(['shunya', 'Ha! Save that for snack time. Your question first: write how far each number is from the base.']));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'what is your favourite video game?', 'Shunya');
  await expect(say(page)).toContainText(/question|base|Sutra/);
});

test('The note: "Don\'t share your name or where you live." shows under the box', async ({ page }) => {
  await fakeFamilyServer(page, () => says(['bolt', 'Hi.']));
  await open(page, TRICK);
  await openTalk(page);
  await expect(talkNote(page)).toHaveText(NOTE);
  const box = await talkInput(page).boundingBox(), note = await talkNote(page).boundingBox();
  expect(note!.y).toBeGreaterThan(box!.y);
});
