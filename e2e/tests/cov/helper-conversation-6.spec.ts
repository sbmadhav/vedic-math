import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Four actions, checked by the app". */

test("An example on the question's own numbers: no example is drawn and the reply's line still shows", async ({ page }) => {
  await fakeFamilyServer(page, b => ({ ...says(['eka', 'Watch this one.']), actions: [{ type: 'showExample', a: b.numbers[0], b: b.numbers[1] }] }));
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'show me', 'Eka');
  await expect(say(page)).toContainText('Watch this one.');
  await expect(say(page).locator('.fh-steps')).toHaveCount(0);
  await expect(say(page).locator('.fh-ex')).toHaveCount(0);
});

test('An example with the same answer: the numbers in the other order, or others with the same result, draw nothing', async ({ page }) => {
  await fakeFamilyServer(page, b => {
    const [a, c] = b.numbers as [number, number];
    /* Other numbers near the base with the same product when they exist, else the question's own numbers reversed */
    let ex: [number, number] = [c, a];
    for (let x = 85; x <= 115 && ex[0] === c; x++) for (let y = x; y <= 115; y++) if (x * y === a * c && x !== a && y !== a && x !== c && Math.sign(x - 100) === Math.sign(y - 100) && x !== 100 && y !== 100) ex = [x, y];
    return { ...says(['eka', 'Here is another.']), actions: [{ type: 'showExample', a: ex[0], b: ex[1] }] };
  });
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'another one', 'Eka');
  await expect(say(page)).toContainText('Here is another.');
  await expect(say(page).locator('.fh-steps')).toHaveCount(0);
});

test.describe('A Sutra on a Skill with none', () => {
  test('showSutra on Times tables draws no Sutra and the line still shows', async ({ page }) => {
    await fakeFamilyServer(page, () => ({ ...says(['eka', 'Build it from a fact you know.']), actions: [{ type: 'showSutra' }] }));
    await open(page, '#/skill/3-mult');
    await ask(page).click();
    await expect(visit(page)).toBeVisible();
    await expect(talkBox(page)).toBeVisible();
    await sendAndWait(page, 'what is the sutra?', 'Eka');
    await expect(say(page)).toContainText('Build it from a fact you know.');
    await expect(say(page).locator('.fh-sutra')).toHaveCount(0);
  });
});
