import { expect, type Page } from './fixtures';
import { ask, visit, who, say, btn } from './family-kit';

/* Shared steps for talking with the Family (openspec family-helpers step 3, helper-conversation spec):
   e2e/tests/family-conversation.spec.ts and the coverage specs in e2e/tests/cov/helper-conversation-*.spec.ts.
   The conversation's server is always a fake here (fakeFamilyServer), and Turnstile is the fake in fixtures.ts: nothing
   reaches the Worker, the model provider or Cloudflare. Practice runs on Multiply numbers near 100 (a × b, a Trick in
   the conversation's Skill table), so the question's numbers are the two factors on screen. */
export const TRICK = '#/skill/v-near-base';
/** The Family helpers on and talking with them on (the Me switches), for a Player whose Age answer allows it */
export const TALK_ON = { family: true, familyTalk: true };
export const TEEN = { age: 15 } as const;
export const CHILD = { age: 11 } as const;
export const NOTE = "Don't share your name or where you live.";

export type Reply = { speaker: string; line: string; clue?: boolean };
export type Action = { type: string; [k: string]: unknown };
export type TurnBody = { skillId: string; numbers: number[]; words: { who: string; line: string; clue?: boolean }[] };
export type Turn = { lines: Reply[]; actions?: Action[]; source?: string; cluesLeft?: number };
export type Refusal = { status: number; body?: unknown };
export type ServerLog = { sessions: unknown[]; turns: { body: TurnBody; headers: Record<string, string> }[]; statusReads: number };

/** A fake conversation server on this page: the status (on, with a site key), a ticket for any Turnstile token, and
    turn replies from `reply(body, n)` (n counts the turns). Everything the browser sends is recorded in the log. */
export async function fakeFamilyServer(page: Page, reply: (body: TurnBody, n: number) => Turn | Refusal | Promise<Turn | Refusal>, { on = true } = {}): Promise<ServerLog> {
  const log: ServerLog = { sessions: [], turns: [], statusReads: 0 };
  const json = (status: number, body: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/api\/family\/v1\/status(\?|$)/, r => { log.statusReads++; return r.fulfill(json(200, { on, siteKey: on ? 'e2e-site-key' : '', clues: 3 })); });
  await page.route(/\/api\/session(\?|$)/, r => { log.sessions.push(r.request().postDataJSON()); return r.fulfill(json(200, { ticket: `family.${Date.now() + 1_800_000}.e2e.e2esig`, expires: Date.now() + 1_800_000, scope: 'family' })); });
  await page.route(/\/api\/family\/v1\/turn(\?|$)/, async r => {
    const body = r.request().postDataJSON() as TurnBody;
    log.turns.push({ body, headers: r.request().headers() });
    const out = await reply(body, log.turns.length);
    if ('status' in out && !('lines' in out)) return r.fulfill(json(out.status, out.body ?? { error: 'e2e' }));
    return r.fulfill(json(200, { source: 'model', actions: [], cluesLeft: 3, ...out }));
  });
  return log;
}
/** A reply of one or two lines in the shape the Worker sends */
export const says = (...lines: (Reply | [string, string])[]): Turn => ({ lines: lines.map(l => (Array.isArray(l) ? { speaker: l[0], line: l[1], clue: false } : { clue: false, ...l })) });

export const talkBox = (page: Page) => page.locator('.fh-visit .fh-talk');
export const talkInput = (page: Page) => page.locator('.fh-visit .fh-talk-in');
export const talkNote = (page: Page) => page.locator('.fh-visit .fh-talk-note');
/** Ask a friend, then the Visit with its chat box is open */
export async function openTalk(page: Page) {
  await ask(page).click();
  await expect(visit(page)).toBeVisible();
  await expect(talkBox(page)).toBeVisible();
}
/** Types a message and sends it */
export async function send(page: Page, text: string) {
  await talkInput(page).fill(text);
  await page.locator('.fh-visit .fh-talk-send').click();
}
/** Sends a message and waits for the first reply to show (the speaker named in the bubble) */
export async function sendAndWait(page: Page, text: string, speaker: string) {
  const before = (await say(page).innerHTML().catch(() => '')) || '';
  await send(page, text);
  /* The reply has drawn: the bubble changed (the opening Visit may already show the same speaker) */
  await expect.poll(() => say(page).innerHTML().catch(() => ''), { message: 'the reply is drawn' }).not.toBe(before);
  await expect(who(page)).toHaveText(speaker);
}
/** The a × b of the Practice question on screen (Multiply numbers near 100) */
export async function nearBase(page: Page) {
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  return { a: a!, b: b!, q };
}
/** How often the fake Turnstile was asked to render */
export const turnstileRenders = (page: Page) => page.evaluate(() => ((globalThis as unknown as { __e2eTurnstile?: { renders: number } }).__e2eTurnstile?.renders ?? 0));
/** Every request to Turnstile's host or the conversation routes during the test, recorded from the start */
export function watchTalkRequests(page: Page) {
  const seen: string[] = [];
  page.on('request', r => { const u = r.url(); if (/challenges\.cloudflare\.com|\/api\/family\/|\/api\/session/.test(u)) seen.push(u); });
  return seen;
}
export { who, say, btn, visit };
