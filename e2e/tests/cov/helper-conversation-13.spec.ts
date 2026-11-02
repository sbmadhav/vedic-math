import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Capped, and scripted at the cap". The cap lives on the
   server (workers/src/family/turn.test.ts, "the daily cap"); the fake here answers as the Worker does at the cap, and
   the browser shows scripted help with no error. */

test('The daily cap: the Family answer with scripted help and no error is shown', async ({ page }) => {
  await fakeFamilyServer(page, () => ({ ...says(['bolt', 'Good question. Write how far each number is from the base.'], ['eka', 'Bolt calls it Nikhilam: all from nine and the last from ten.']), source: 'scripted', actions: [{ type: 'showSutra' }] }));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'why do we add 1?', 'Bolt');
  await expect(say(page)).toContainText('Write how far each number is from the base.');
  await btn(page, 'Next').click();
  await expect(who(page)).toHaveText('Eka');
  await expect(page.locator('.fh-visit')).not.toContainText(/error|cap|limit|budget/i);
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
});
