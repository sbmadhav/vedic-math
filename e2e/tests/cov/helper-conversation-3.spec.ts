import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "What the conversation sends". */

test("A turn's request: the body holds the Skill id, the numbers and this Visit's words only", async ({ page }) => {
  const log = await fakeFamilyServer(page, () => says(['nava', 'Nod nod. Start with how far each number is from the base.']));
  await open(page, TRICK);
  const { a, b } = await nearBase(page);
  await openTalk(page);
  await sendAndWait(page, 'where do I start?', 'Nava');
  const { body } = log.turns[0]!;
  expect(Object.keys(body).sort()).toEqual(['numbers', 'skillId', 'words']);
  expect(body).toEqual({ skillId: 'v-near-base', numbers: [a, b], words: [{ who: 'player', line: 'where do I start?' }] });
  expect(JSON.stringify(log.turns[0])).not.toMatch(/Swift|Tiger|"age"|"grade"|"p1"|challenger|pro/);
});

test('The next question: the request holds none of the words said about the previous question', async ({ page }) => {
  const log = await fakeFamilyServer(page, () => says(['eka', 'One step at a time.']));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'first question words', 'Eka');
  await closeVisit(page);
  await page.locator('#practice #prShow').click();
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
  await openTalk(page);
  await sendAndWait(page, 'second question words', 'Eka');
  expect(log.turns.length).toBe(2);
  expect(log.turns[1]!.body.words).toEqual([{ who: 'player', line: 'second question words' }]);
  expect(JSON.stringify(log.turns[1]!.body)).not.toContain('first question words');
});
