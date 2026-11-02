import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Our own endpoint and a small model". */

test('Where a turn goes: the browser contacts only our own conversation route, and no downloadable file holds the provider\'s key', async ({ page, baseURL }) => {
  const log = await fakeFamilyServer(page, () => says(['bolt', 'Good question about the base.']));
  const outside: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.host !== new URL(baseURL!).host && !/^https?:$/.test(u.protocol) === false && u.host !== new URL(baseURL!).host) outside.push(r.url()); });
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'why?', 'Bolt');
  expect(log.turns.length).toBe(1);
  /* The only other host reached for the turn is Turnstile's (the fake), for the bot check */
  expect(outside.filter(u => !/challenges\.cloudflare\.com|goatcounter|cloudflareinsights/.test(u))).toEqual([]);
  for (const path of ['/js/family-talk.js', '/js/ts/shared/src/family-talk.js', '/js/family-view.js', '/js/app.js']) {
    const res = await page.request.get(path);
    expect(res.ok(), path).toBe(true);
    const text = await res.text();
    expect(text, path).not.toMatch(/sk-ant-|x-api-key|api\.anthropic\.com/);
  }
});
