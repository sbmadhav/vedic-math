/* Session tickets and the Turnstile check (workers/src/session.ts; openspec family-helpers design D18 "Bot protection",
   task 3.12; react-typescript design D17). The Turnstile verify endpoint is a fake here, never the live one. */
import { test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { TICKETS_PER_HOUR, TICKET_MS, TURNSTILE_VERIFY, addrHash, checkTicket, handleSession, issueTicket, type Deps } from './session.ts';

const T0 = Date.UTC(2026, 10, 3, 10, 15);
const KEY = 'test-ticket-key';
/* A fake Turnstile: good for the token "good", records what it was asked */
function fakeDeps(now = T0) {
  const asked: { url: string; body: string }[] = [];
  const deps: Deps = {
    now: () => now,
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const body = String(init?.body ?? '');
      asked.push({ url, body });
      if (url !== TURNSTILE_VERIFY) return new Response('not found', { status: 404 });
      return Response.json({ success: new URLSearchParams(body).get('response') === 'good' });
    },
  };
  return { deps, asked };
}
const post = (body: unknown, ip = '203.0.113.9') => new Request('https://learnvedicmath.com/api/session', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip } });

test('a ticket checks only for its scope, its key and its time', async () => {
  const t = await issueTicket(KEY, 'family', T0);
  expect(t.split('.').length).toBe(4);
  expect(t.startsWith('family.')).toBe(true);
  expect(await checkTicket(KEY, t, 'family', T0 + 1000)).toBe(true);
  expect(await checkTicket(KEY, t, 'voice', T0 + 1000), 'another scope').toBe(false);
  expect(await checkTicket('other-key', t, 'family', T0 + 1000), 'another key').toBe(false);
  expect(await checkTicket(KEY, t, 'family', T0 + TICKET_MS + 1), 'expired').toBe(false);
  expect(await checkTicket(KEY, t.replace(/.$/, c => (c === 'A' ? 'B' : 'A')), 'family', T0), 'a changed signature').toBe(false);
  expect(await checkTicket(KEY, t.replace('family.', 'voice.'), 'voice', T0), 'a changed scope with the old signature').toBe(false);
  expect(await checkTicket(KEY, null, 'family', T0)).toBe(false);
  expect(await checkTicket(KEY, 'family.1.2', 'family', T0)).toBe(false);
  expect(await checkTicket(undefined, t, 'family', T0), 'no key configured').toBe(false);
});

test('the address hash is keyed, changes with the day and never holds the address', async () => {
  const a = await addrHash(KEY, '203.0.113.9', T0), b = await addrHash(KEY, '203.0.113.9', T0 + 60_000), c = await addrHash(KEY, '203.0.113.9', T0 + 86_400_000);
  expect(a).toBe(b);
  expect(a).not.toBe(c);
  expect(a).not.toBe(await addrHash(KEY, '203.0.113.10', T0));
  expect(a).not.toBe(await addrHash('another-key', '203.0.113.9', T0));
  expect(a).toMatch(/^[\w-]{32}$/);
  expect(a).not.toContain('203');
});

test('POST /api/session: a good Turnstile token earns a 30-minute family ticket; the token goes to Cloudflare only', async () => {
  const { deps, asked } = fakeDeps();
  const res = await handleSession(post({ scope: 'family', token: 'good' }), env, deps);
  expect(res.status).toBe(200);
  const out = (await res.json()) as { ticket: string; expires: number; scope: string };
  expect(out.scope).toBe('family');
  expect(out.expires).toBe(T0 + TICKET_MS);
  expect(await checkTicket(env.TICKET_KEY, out.ticket, 'family', T0 + 1)).toBe(true);
  expect(asked.length).toBe(1);
  expect(asked[0]!.url).toBe(TURNSTILE_VERIFY);
  expect(new URLSearchParams(asked[0]!.body).get('secret')).toBe(env.TURNSTILE_SECRET);
});

test('a bad token, a bad scope, a bad body and a GET are refused with no ticket', async () => {
  const { deps, asked } = fakeDeps();
  expect((await handleSession(post({ scope: 'family', token: 'bad' }), env, deps)).status).toBe(403);
  expect((await handleSession(post({ scope: 'kitchen', token: 'good' }), env, deps)).status).toBe(400);
  expect((await handleSession(post({ scope: 'family' }), env, deps)).status).toBe(400);
  expect((await handleSession(new Request('https://learnvedicmath.com/api/session', { method: 'POST', body: 'not json' }), env, deps)).status).toBe(400);
  expect((await handleSession(new Request('https://learnvedicmath.com/api/session'), env, deps)).status).toBe(405);
  expect(asked.length, 'only the bad token reached the verify endpoint').toBe(1);
});

test('tickets an hour per address are limited, counted under the hash, and the count is gone with the hour', async () => {
  const { deps, asked } = fakeDeps();
  const ip = `198.51.100.${Math.floor(Math.random() * 200)}`;
  for (let i = 0; i < TICKETS_PER_HOUR; i++) expect((await handleSession(post({ scope: 'family', token: 'good' }, ip), env, deps)).status).toBe(200);
  const over = await handleSession(post({ scope: 'family', token: 'good' }, ip), env, deps);
  expect(over.status).toBe(429);
  expect(asked.length, 'the refused request asked Turnstile nothing').toBe(TICKETS_PER_HOUR);
  const keys = await env.VOICE_LEDGER.get(env.VOICE_LEDGER.idFromName('ledger')).keys(T0);
  expect(keys.some(k => k.includes(ip)), 'no address in storage').toBe(false);
  expect(keys.some(k => k.startsWith('addr:session:'))).toBe(true);
  const later = fakeDeps(T0 + 3_600_000);
  expect((await handleSession(post({ scope: 'family', token: 'good' }, ip), env, later.deps)).status).toBe(200);
});
