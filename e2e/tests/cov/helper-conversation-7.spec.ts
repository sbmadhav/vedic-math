import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "No action reaches the answer or the round". */

test('An unknown action, such as moving to the next question, is ignored and nothing changes in the round', async ({ page }) => {
  await fakeFamilyServer(page, () => ({ ...says(['nava', 'Nod nod.']), actions: [{ type: 'nextQuestion' }, { type: 'setMode', mode: 'explorer' }, { type: 'revealAnswer' }, { type: 'addSparks', n: 100 }] }));
  await open(page, TRICK);
  const before = await nearBase(page);
  const score = await page.locator('#practice .pr-score').textContent();
  await openTalk(page);
  await sendAndWait(page, 'skip this one', 'Nava');
  await expect(say(page)).toContainText('Nod nod.');
  await expect(page.locator('#practice #prQ')).toHaveText(before.q);
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
  await expect(page.locator('#practice #prSol')).toBeHidden();
  await expect(page.locator('#practice .pr-score')).toHaveText(score!);
  await expect(page.locator('#practice #prSay')).not.toContainText(String(before.a * before.b));
  expect(await page.evaluate(async () => (await e2eMod('store')).player().mode)).not.toBe('explorer');
});
