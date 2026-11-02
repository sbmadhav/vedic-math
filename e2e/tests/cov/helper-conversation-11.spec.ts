import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "About 20 turns an hour per address". The count lives on
   the server (workers/src/family/turn.test.ts covers the 21st turn and the hour's end); the fake here answers the way
   the Worker does at the limit, scripted help, and the browser shows it with no error. */

test('Too many turns from one address: the 21st turn gets scripted help with no error', async ({ page }) => {
  await fakeFamilyServer(page, (_b, n) => (n >= 2
    ? { ...says(['bolt', 'Good question. Write how far each number is from the base.']), source: 'scripted', actions: [{ type: 'showSutra' }] }
    : says(['bolt', 'From the model, before the limit.'])));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'why?', 'Bolt');
  await expect(say(page)).toContainText('before the limit');
  await send(page, 'why again?');
  await expect(say(page)).toContainText('Write how far each number is from the base.');
  await expect(page.locator('.fh-visit')).not.toContainText(/error|limit|too many|wait/i);
});

test('The hour ends: the next turn is counted afresh and the model answers again', async ({ page }) => {
  await fakeFamilyServer(page, (_b, n) => (n === 1
    ? { ...says(['bolt', 'Scripted while the hour ran out.']), source: 'scripted' }
    : says(['bolt', 'Back from the model in a new hour.'])));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'why?', 'Bolt');
  await expect(say(page)).toContainText('Scripted while the hour ran out.');
  await send(page, 'and now?');
  await expect(say(page)).toContainText('Back from the model in a new hour.');
});
