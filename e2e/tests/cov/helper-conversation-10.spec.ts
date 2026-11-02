import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';

/* helper-conversation spec (change family-helpers), Requirement "A Turnstile check once per browser session". Turnstile
   is the fake in fixtures.ts (never the live widget); the server is the fake in family-talk-kit.ts. */

test.describe('An under-13 Player and Turnstile', () => {
  test.use({ seedConsent: CHILD, seedPlayer: TALK_ON });
  test('a session with the Family helpers on sends no request to Turnstile', async ({ page }) => {
    const seen = watchTalkRequests(page);
    await open(page, TRICK);
    await ask(page).click();
    await expect(visit(page)).toBeVisible();
    await turns(page);
    await closeVisit(page);
    await page.waitForLoadState('networkidle');
    expect(seen.filter(u => /challenges\.cloudflare\.com/.test(u))).toEqual([]);
    expect(await turnstileRenders(page)).toBe(0);
  });
});

test.describe('A Player of 15', () => {
  test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

  test('The first message: the check runs once, later messages in the session do not run it again until the ticket expires', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => says(['nava', 'Nod nod.']));
    await open(page, TRICK);
    await openTalk(page);
    expect(await turnstileRenders(page)).toBe(0);
    await sendAndWait(page, 'first', 'Nava');
    await send(page, 'second');
    await expect.poll(() => log.turns.length).toBe(2);
    expect(await turnstileRenders(page)).toBe(1);
    expect(log.sessions.length).toBe(1);
    /* The ticket expires: the next message runs the check again */
    await page.evaluate(() => { sessionStorage.removeItem('vm.familyTicket'); });
    await send(page, 'third');
    await expect.poll(() => log.turns.length).toBe(3);
    expect(await turnstileRenders(page)).toBe(2);
    expect(log.sessions.length).toBe(2);
  });

  test('No ticket: a request without a valid ticket is refused and the model is not called; the browser always sends one', async ({ page }) => {
    let modelCalls = 0;
    const log = await fakeFamilyServer(page, () => { modelCalls++; return says(['bolt', 'With a ticket.']); });
    /* The fake refuses a request with no ticket header, as the Worker does (workers/src/family/turn.test.ts) */
    await page.route(/\/api\/family\/v1\/turn(\?|$)/, async r => {
      if (!r.request().headers()['x-vm-ticket']) return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"ticket"}' });
      return r.fallback();
    });
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'hello', 'Bolt');
    expect(log.turns[0]!.headers['x-vm-ticket']).toMatch(/^family\./);
    const bare = await page.evaluate(async () => { const r = await fetch('/api/family/v1/turn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skillId: 'v-near-base', numbers: [98, 97], words: [{ who: 'player', line: 'hi' }] }) }); return r.status; });
    expect(bare).toBe(401);
    expect(modelCalls).toBe(1);
  });
});
