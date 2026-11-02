import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';

/* helper-conversation spec (change family-helpers), Requirement "Talking with the Family is for 13 and over, opt-in". */

test.describe('An under-13 Player', () => {
  test.use({ seedConsent: CHILD, seedPlayer: { family: true } });
  test('Me with the helpers on offers no talk option, and nothing reaches the conversation endpoint in the session', async ({ page }) => {
    const seen = watchTalkRequests(page);
    await open(page, '#/me');
    await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#familyTalkSwitch')).toHaveCount(0);
    await page.goto(`${APP}${TRICK}`);
    await ask(page).click();
    await expect(visit(page)).toBeVisible();
    await turns(page);
    await expect(talkBox(page)).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(seen).toEqual([]);
  });
});

test.describe('A Pro Player of 15', () => {
  test.use({ seedMode: 'pro', seedConsent: TEEN, seedPlayer: TALK_ON });
  test('types "why do we add 1?" and Bolt answers about the method, without the answer on screen', async ({ page }) => {
    await fakeFamilyServer(page, () => says(['bolt', 'Both numbers sit just under the base, so their distances multiply into the right part.']));
    await open(page, TRICK);
    const { a, b } = await nearBase(page);
    await openTalk(page);
    await sendAndWait(page, 'why do we add 1?', 'Bolt');
    await expect(say(page)).toContainText('distances multiply');
    await expect(page.locator('.fh-visit')).not.toContainText(String(a * b));
    await expect(page.locator('#practice #prSol')).toBeHidden();
  });
});
