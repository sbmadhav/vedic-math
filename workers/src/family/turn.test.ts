/* The conversation route (workers/src/family/turn.ts; openspec family-helpers helper-conversation spec, design D18,
   tasks 3.7, 3.10, 3.12 and 3.15). The model is a fake that answers like the Messages API and records every request;
   the Turnstile check is covered in session.test.ts (a ticket here is signed with the test key). Nothing reaches the
   provider or Cloudflare. */
import { test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { TALK_SKILLS, CLUES, type Turn } from '../../../shared/src/family-talk.ts';
import { ledgerOf } from '../ledger.ts';
import { TICKET_HEADER, issueTicket, type Deps } from '../session.ts';
import { MESSAGES_URL, MODEL, MAX_TOKENS, TOOLS, FIXED, messagesFor } from './prompt.ts';
import { cleanReply, handleStatus, handleTurn, readBody } from './turn.ts';

const T0 = Date.UTC(2026, 10, 3, 10, 15);
const KEY = env.TICKET_KEY as string;
type Line = { speaker: string; line: string; clue?: boolean };
type Tool = { name: string; input: Record<string, unknown> };
/* A fake Messages API: answers with the lines and tool calls given, shaped as the provider shapes them */
function fakeModel(lines: Line[] | (() => Line[]), tools: Tool[] = [], { status = 200, now = T0, stop = 'end_turn', hang = false } = {}) {
  const modelTimeoutMs = hang ? 50 : 12_000;
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const deps: Deps = {
    now: () => now,
    modelTimeoutMs,
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const h = init?.headers as Record<string, string>;
      calls.push({ url, headers: h, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      if (hang) return new Promise<Response>((_, reject) => { init?.signal?.addEventListener('abort', () => reject(new Error('timeout'))); });
      if (status !== 200) return new Response('{"type":"error"}', { status });
      const ls = typeof lines === 'function' ? lines() : lines;
      return Response.json({ id: 'msg_1', type: 'message', role: 'assistant', model: MODEL, stop_reason: stop, content: [{ type: 'text', text: JSON.stringify({ lines: ls }) }, ...tools.map((t, i) => ({ type: 'tool_use', id: `toolu_${i}`, name: t.name, input: t.input }))], usage: { input_tokens: 1800, output_tokens: 90 } });
    },
  };
  return { deps, calls };
}
const ip = () => `198.51.100.${Math.floor(Math.random() * 250)}`;
async function post(body: unknown, { ticket, addr = ip(), now = T0 }: { ticket?: string | null; addr?: string; now?: number } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': addr };
  if (ticket !== null) headers[TICKET_HEADER] = ticket ?? (await issueTicket(KEY, 'family', now));
  return new Request('https://learnvedicmath.com/api/family/v1/turn', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });
}
type Out = { lines: Line[]; actions: { type: string; [k: string]: unknown }[]; source: string; cluesLeft: number; error?: string };
const read = async (res: Response) => (await res.json()) as Out;
/* 98 × 97 (answer 9506, parts 95 and 06) on Multiply numbers near 100 */
const Q = { skillId: 'v-near-base', numbers: [98, 97] };
const words = (...lines: (string | Turn)[]): Turn[] => lines.map(l => (typeof l === 'string' ? { who: 'player', line: l } : l));

test('status: on with the switch and every secret, with the public site key; off without', () => {
  const on = handleStatus(env);
  expect(on.headers.get('cache-control')).toContain('max-age=300');
  return on.json().then(async (s: unknown) => {
    expect(s).toEqual({ on: true, siteKey: 'test-site-key', clues: CLUES });
    expect(await handleStatus({ ...env, FAMILY_ON: '0' }).json()).toEqual({ on: false, siteKey: '', clues: CLUES });
    expect(await handleStatus({ ...env, ANTHROPIC_API_KEY: '' }).json()).toMatchObject({ on: false, siteKey: '' });
    expect(await handleStatus({ ...env, TURNSTILE_SITE_KEY: '' }).json()).toMatchObject({ on: false });
  });
});

test('no ticket, an expired one, a forged one or a voice ticket: refused, and the model is not called', async () => {
  const { deps, calls } = fakeModel([{ speaker: 'bolt', line: 'Hello.' }]);
  const body = { ...Q, words: words('why do we add 1?') };
  expect((await handleTurn(await post(body, { ticket: null }), env, deps)).status).toBe(401);
  expect((await handleTurn(await post(body, { ticket: await issueTicket(KEY, 'family', T0 - 31 * 60_000) }), env, deps)).status).toBe(401);
  expect((await handleTurn(await post(body, { ticket: await issueTicket('wrong-key', 'family', T0) }), env, deps)).status).toBe(401);
  expect((await handleTurn(await post(body, { ticket: await issueTicket(KEY, 'voice', T0) }), env, deps)).status).toBe(401);
  expect(calls.length).toBe(0);
});

test('a turn: one model call holding only the fixed instructions, the Skill, the numbers and this Visit\'s words', async () => {
  const { deps, calls } = fakeModel([{ speaker: 'bolt', line: 'Because both numbers sit just under 100, their distances multiply to the right part.' }, { speaker: 'nava', line: 'Nod nod. Distances first, then the rest follows.' }]);
  const visit = words({ who: 'shunya', line: 'Hi there.' }, 'why do we add 1?');
  const res = await handleTurn(await post({ ...Q, words: visit }), env, deps);
  expect(res.status).toBe(200);
  const out = await read(res);
  expect(out.source).toBe('model');
  expect(out.lines.map(l => l.speaker)).toEqual(['bolt', 'nava']);
  expect(calls.length).toBe(1);
  const c = calls[0]!;
  expect(c.url).toBe(MESSAGES_URL);
  expect(c.headers['x-api-key']).toBe(env.ANTHROPIC_API_KEY);
  expect(c.headers['anthropic-version']).toBe('2023-06-01');
  expect(Object.keys(c.body).sort()).toEqual(['max_tokens', 'messages', 'model', 'system', 'tool_choice', 'tools']);
  expect(c.body.model).toBe('claude-haiku-4-5-20251001');
  expect(c.body.max_tokens).toBe(MAX_TOKENS);
  expect(c.body.max_tokens).toBeLessThanOrEqual(300);
  expect(c.body.tools).toEqual(TOOLS);
  for (const t of c.body.tools as { strict: boolean; input_schema: { additionalProperties: boolean } }[]) { expect(t.strict).toBe(true); expect(t.input_schema.additionalProperties).toBe(false); }
  const system = c.body.system as { type: string; text: string; cache_control?: unknown }[];
  expect(system[0]!.text).toBe(FIXED);
  expect(system[0]!.cache_control).toEqual({ type: 'ephemeral' });
  expect(system[1]!.text).toContain('98 × 97');
  expect(system[1]!.text).toContain('Multiply numbers near 10, 100 or 1000');
  expect(system[1]!.text).toContain(`Clues left for this question: ${CLUES} of ${CLUES}`);
  expect(c.body.messages).toEqual(messagesFor(visit));
  /* Nothing else: no Nickname, id, age, grade, address or ticket anywhere in the request */
  const all = JSON.stringify(c.body);
  for (const bad of ['Swift', 'Tiger', '"p1"', '198.51', TICKET_HEADER, 'ticket']) expect(all.toLowerCase(), bad).not.toContain(bad.toLowerCase());
});

test('a third reply is dropped; a fifth speaker is dropped', async () => {
  const { deps } = fakeModel([{ speaker: 'bolt', line: 'One.' }, { speaker: 'eka', line: 'Two.' }, { speaker: 'shunya', line: 'Three.' }]);
  const out = await read(await handleTurn(await post({ ...Q, words: words('how?') }), env, deps));
  expect(out.lines.map(l => l.line)).toEqual(['One.', 'Two.']);
  const five = fakeModel([{ speaker: 'teacher', line: 'I am the teacher.' }, { speaker: 'eka', line: 'Steps first.' }]);
  const out2 = await read(await handleTurn(await post({ ...Q, words: words('how?') }), env, five.deps));
  expect(out2.lines).toEqual([{ speaker: 'eka', line: 'Steps first.', clue: false }]);
});

test('a reply with the answer, or both its parts, is replaced by a scripted line for the same speaker, with no error', async () => {
  for (const line of ['Easy, 98 × 97 is 9506!', 'It is 9,506 when you write it out.', 'Left part 95, right part 06, done.']) {
    const { deps } = fakeModel([{ speaker: 'shunya', line }]);
    const res = await handleTurn(await post({ ...Q, words: words('what is 98 times 97?') }), env, deps);
    expect(res.status).toBe(200);
    const out = await read(res);
    expect(out.lines[0]!.speaker).toBe('shunya');
    expect(out.lines[0]!.line).not.toContain('9506');
    expect(out.lines[0]!.line).not.toMatch(/\d/);
    expect(out.lines[0]!.line).toMatch(/yours/);
    expect(out.error).toBeUndefined();
  }
});

test('a link, an email address, a phone number, a too long line or another role is replaced by a scripted line', async () => {
  const cases = [
    'See https://example.com/vedic for the trick.',
    'Write to me at bolt@example.com any time.',
    'Call me on 555 123 4567 and we will do it.',
    'word '.repeat(60),
    'As your teacher, I say you must add the distances.',
    'I am an AI language model and I can tell you the method.',
  ];
  for (const line of cases) {
    const { deps } = fakeModel([{ speaker: 'eka', line }]);
    const out = await read(await handleTurn(await post({ ...Q, words: words('how does this work?') }), env, deps));
    expect(out.lines.length).toBe(1);
    expect(out.lines[0]!.speaker).toBe('eka');
    expect(out.lines[0]!.line, line).not.toBe(line.trim());
    expect(out.lines[0]!.line).not.toMatch(/https?:|@|555|As your teacher|AI language/);
  }
});

test('the clue limit: the fourth clue becomes method talk, pointAt counts as a clue, general talk is free', async () => {
  const spent: Turn[] = [{ who: 'player', line: 'help' }, { who: 'nava', line: 'Look at the distances.', clue: true }, { who: 'player', line: 'more' }, { who: 'nava', line: 'How far is 98 from the base?', clue: true }, { who: 'player', line: 'more' }, { who: 'eka', line: 'And 97?', clue: true }, { who: 'player', line: 'just one more hint?' }];
  const { deps, calls } = fakeModel([{ speaker: 'nava', line: 'Multiply the two distances for the right part.', clue: true }], [{ name: 'pointAt', input: { part: 'distances' } }]);
  const out = await read(await handleTurn(await post({ ...Q, words: spent }), env, deps));
  expect(out.cluesLeft).toBe(0);
  expect(out.lines[0]!.clue).toBe(false);
  expect(out.lines[0]!.line).not.toContain('Multiply the two distances');
  expect(out.actions.some(a => a.type === 'pointAt'), 'no pointAt with no clues left').toBe(false);
  expect((calls[0]!.body.system as { text: string }[])[1]!.text).toContain('Clues left for this question: 0');
  /* A pointAt with clues left marks the reply as a clue */
  const fresh = fakeModel([{ speaker: 'nava', line: 'See how far each sits from the base.', clue: false }], [{ name: 'pointAt', input: { part: 'distances' } }]);
  const out2 = await read(await handleTurn(await post({ ...Q, words: words('a hint?') }), env, fresh.deps));
  expect(out2.actions).toEqual([{ type: 'pointAt', part: 'distances' }]);
  expect(out2.lines[0]!.clue).toBe(true);
  expect(out2.cluesLeft).toBe(CLUES - 1);
  /* General talk with no clues left: the line stays, the count stays at zero */
  const general = fakeModel([{ speaker: 'eka', line: 'The Sutra says all from nine and the last from ten: that is how the distances are found.', clue: false }], [{ name: 'showSutra', input: {} }]);
  const out3 = await read(await handleTurn(await post({ ...Q, words: [...spent.slice(0, 6), { who: 'player', line: 'what does the Sutra mean?' }] }), env, general.deps));
  expect(out3.lines[0]!.line).toContain('all from nine');
  expect(out3.actions).toEqual([{ type: 'showSutra' }]);
  expect(out3.cluesLeft).toBe(0);
});

test('the actions are checked on the server too: an example on the question\'s numbers or with its answer is dropped, a bad mood or part too', async () => {
  const { deps } = fakeModel([{ speaker: 'eka', line: 'Watch one on other numbers.' }], [
    { name: 'showExample', input: { a: 97, b: 98 } }, { name: 'pointAt', input: { part: 'kitchen' } }, { name: 'react', input: { mood: 'furious' } }, { name: 'nextQuestion', input: {} },
  ]);
  const out = await read(await handleTurn(await post({ ...Q, words: words('show me') }), env, deps));
  expect(out.actions).toEqual([]);
  const good = fakeModel([{ speaker: 'eka', line: 'Watch one on other numbers.' }], [{ name: 'showExample', input: { a: 94, b: 96 } }, { name: 'react', input: { mood: 'think' } }, { name: 'showSutra', input: {} }]);
  const out2 = await read(await handleTurn(await post({ ...Q, words: words('show me') }), env, good.deps));
  expect(out2.actions).toEqual([{ type: 'showExample', numbers: [94, 96] }, { type: 'react', mood: 'think' }, { type: 'showSutra' }]);
});

test('a 21st turn in the hour from one address gets scripted help and no model call; after the hour it is counted afresh; no address in storage', async () => {
  const addr = ip();
  const { deps, calls } = fakeModel([{ speaker: 'bolt', line: 'Good question about the base.' }]);
  for (let i = 0; i < 20; i++) expect((await read(await handleTurn(await post({ ...Q, words: words('why?') }, { addr }), env, deps))).source).toBe('model');
  const over = await read(await handleTurn(await post({ ...Q, words: words('why?') }, { addr }), env, deps));
  expect(over.source).toBe('scripted');
  expect(over.lines[0]!.speaker).toBe('bolt');
  expect(over.lines[0]!.line).not.toMatch(/\d/);
  expect(over.error).toBeUndefined();
  expect(calls.length).toBe(20);
  const keys = await ledgerOf(env).keys(T0);
  expect(keys.some(k => k.includes(addr)), 'no address in storage').toBe(false);
  expect(keys.some(k => k.startsWith('addr:family:'))).toBe(true);
  const later = fakeModel([{ speaker: 'bolt', line: 'Good question about the base.' }], [], { now: T0 + 3_600_000 });
  expect((await read(await handleTurn(await post({ ...Q, words: words('why?') }, { addr, now: T0 + 3_600_000 }), env, later.deps))).source).toBe('model');
  expect(later.calls.length).toBe(1);
});

test('the daily cap: at 1,250 turns in the UTC day the Family answer with scripted help and no model call', async () => {
  const day = Date.UTC(2031, 0, 20, 9); /* a day no other test touches */
  const { deps, calls } = fakeModel([{ speaker: 'bolt', line: 'Good question about the base.' }], [], { now: day });
  const L = ledgerOf(env), p = { key: 'turns:family:d:2031-01-20', limit: 1250, expires: Date.UTC(2031, 0, 21) };
  await Promise.all(Array.from({ length: 1249 }, () => L.take([p], day)));
  expect((await read(await handleTurn(await post({ ...Q, words: words('why?') }, { now: day }), env, deps))).source).toBe('model');
  const capped = await read(await handleTurn(await post({ ...Q, words: words('why?') }, { now: day }), env, deps));
  expect(capped.source).toBe('scripted');
  expect(calls.length).toBe(1);
  /* The next day is counted afresh */
  const next = fakeModel([{ speaker: 'bolt', line: 'Good question about the base.' }], [], { now: Date.UTC(2031, 0, 21, 1) });
  expect((await read(await handleTurn(await post({ ...Q, words: words('why?') }, { now: Date.UTC(2031, 0, 21, 1) }), env, next.deps))).source).toBe('model');
});

test('a slow or failing model, a refusal or the switch off: scripted help with no error', async () => {
  const body = { ...Q, words: words('how does it work?') };
  const slow = fakeModel([], [], { hang: true });
  const out = await read(await handleTurn(await post(body), env, slow.deps));
  expect(out.source).toBe('scripted');
  expect(out.lines[0]!.speaker).toBe('bolt');
  const err = fakeModel([], [], { status: 529 });
  expect((await read(await handleTurn(await post(body), env, err.deps))).source).toBe('scripted');
  const refused = fakeModel([], [], { stop: 'refusal' });
  expect((await read(await handleTurn(await post(body), env, refused.deps))).source).toBe('scripted');
  const off = fakeModel([{ speaker: 'bolt', line: 'Hi.' }]);
  const res = await handleTurn(await post(body), { ...env, FAMILY_ON: '0' }, off.deps);
  expect(res.status).toBe(200);
  expect((await read(res)).source).toBe('scripted');
  expect(off.calls.length).toBe(0);
});

test('a phone number or a long number in the words is stripped before the model sees it', async () => {
  const { deps, calls } = fakeModel([{ speaker: 'bolt', line: 'Good question.' }]);
  await handleTurn(await post({ ...Q, words: words('call me on 555 123 4567, how does this work? my code is 123456 and the question has 98') }), env, deps);
  const sent = JSON.stringify(calls[0]!.body.messages);
  expect(sent).not.toContain('555');
  expect(sent).not.toContain('123456');
  expect(sent).toContain('how does this work?');
  expect(sent).toContain('98');
});

test('the body: exactly { skillId, numbers, words }, a Skill from the table, numbers that fit it, well formed words', () => {
  expect(readBody({ ...Q, words: words('hi') })).toMatchObject({ body: { skillId: 'v-near-base', numbers: [98, 97] } });
  expect(readBody({ ...Q, words: words('hi'), nick: 'Swift Tiger' })).toMatchObject({ status: 400 });
  expect(readBody({ skillId: 'v-near-base', numbers: [98, 97] })).toMatchObject({ status: 400 });
  expect(readBody({ skillId: 'v-osculator', numbers: [95700, 13], words: words('hi') })).toMatchObject({ status: 422 });
  expect(readBody({ skillId: '7-prob', numbers: [1, 2], words: words('hi') })).toMatchObject({ status: 422 });
  expect(readBody({ skillId: 'v-near-base', numbers: [98, 2], words: words('hi') })).toMatchObject({ status: 422 });
  expect(readBody({ skillId: 'v-near-base', numbers: ['98', '97'], words: words('hi') })).toMatchObject({ status: 422 });
  expect(readBody({ ...Q, words: [{ who: 'bolt', line: 'hi' }] })).toMatchObject({ status: 400 });
  expect(readBody({ ...Q, words: words('x'.repeat(301)) })).toMatchObject({ status: 400 });
  expect(readBody({ skillId: '3-mult', numbers: [7, 8], words: words('why?') })).toMatchObject({ body: { skillId: '3-mult' } });
});

test('a Word problem Skill: the answer computed from its numbers like any question is caught in a reply (task 3.15)', async () => {
  const row = TALK_SKILLS['3-mult']!;
  const out = cleanReply([{ type: 'text', text: JSON.stringify({ lines: [{ speaker: 'shunya', line: 'Seven baskets of eight apples is 56 apples!' }] }) }], row, { title: 'Times tables', idea: 'Build the fact from doubles, fives and tens.', sutra: '', meaning: '' }, [7, 8], CLUES);
  expect(out!.lines[0]!.line).not.toContain('56');
  expect(out!.lines[0]!.line).toMatch(/yours/);
});

test('an unreadable model answer falls back to scripted help', async () => {
  const deps: Deps = { now: () => T0, fetch: async () => Response.json({ content: [{ type: 'text', text: 'Sure! Here is my answer without any JSON.' }] }) };
  const out = await read(await handleTurn(await post({ ...Q, words: words('why?') }), env, deps));
  expect(out.source).toBe('scripted');
  expect(out.lines.length).toBeGreaterThan(0);
});
