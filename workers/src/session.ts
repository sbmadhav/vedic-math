/* Session tickets and the Turnstile check (openspec change react-typescript, design D17 and "Turnstile before the
   server voice"; family-helpers design D18 "Bot protection", task 3.12; ADR 0015).
   POST /api/session { scope, token }: the Worker verifies the Cloudflare Turnstile token with the secret, discards it,
   and answers with a ticket for that scope, an HMAC the Worker signs with TICKET_KEY over the scope, a random value
   and a 30-minute expiry. A ticket is never stored and never tied to a Player; each paid route accepts only its own
   scope. The address is read only to verify the token and to count tickets an hour, under a keyed hash whose key
   changes daily (addrHash), never kept or logged as it is. */
import { ledgerOf, periods } from './ledger.ts';
import type { Env } from './index.ts';

export const SCOPES = ['family', 'voice', 'room'] as const;
export type Scope = (typeof SCOPES)[number];
export const TICKET_MS = 30 * 60_000;
export const TICKETS_PER_HOUR = 30; /* tickets one address may ask for in an hour */
export const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TICKET_HEADER = 'x-vm-ticket';

const enc = new TextEncoder();
const b64url = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(key: string, text: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(text));
}
const same = (a: string, b: string): boolean => { const x = enc.encode(a), y = enc.encode(b); return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y); };

/* A ticket: scope.expiry.random.signature */
export async function issueTicket(key: string, scope: Scope, now: number = Date.now()): Promise<string> {
  const body = `${scope}.${now + TICKET_MS}.${b64url(crypto.getRandomValues(new Uint8Array(12)).buffer)}`;
  return `${body}.${b64url(await hmac(key, body))}`;
}
/* True for a ticket this Worker signed for that scope that has not expired */
export async function checkTicket(key: string | undefined, ticket: string | null, scope: Scope, now: number = Date.now()): Promise<boolean> {
  if (!key || !ticket || ticket.length > 200) return false;
  const parts = ticket.split('.');
  if (parts.length !== 4) return false;
  const [s, exp, rand, sig] = parts as [string, string, string, string];
  if (s !== scope || !/^\d+$/.test(exp) || Number(exp) <= now || Number(exp) > now + TICKET_MS + 60_000) return false;
  return same(sig, b64url(await hmac(key, `${s}.${exp}.${rand}`)));
}

/* The connection address, kept only as a keyed hash whose key changes every UTC day: nothing stored can be turned back
   into the address, and yesterday's hashes mean nothing today */
export const addressOf = (request: Request): string => request.headers.get('cf-connecting-ip') || 'unknown';
export async function addrHash(key: string, ip: string, now: number = Date.now()): Promise<string> {
  const dayKey = b64url(await hmac(key, `addr:${new Date(now).toISOString().slice(0, 10)}`));
  return b64url(await hmac(dayKey, ip)).slice(0, 32);
}

export type Fetch = typeof fetch;
export interface Deps { fetch: Fetch; now: () => number; /* how long a model call may take (the tests shorten it) */ modelTimeoutMs?: number }
export const realDeps: Deps = { fetch: (input, init) => fetch(input, init), now: () => Date.now() };

/* Asks Cloudflare whether a Turnstile token is good; the token and the address go to Cloudflare and nowhere else */
export async function verifyTurnstile(secret: string, token: string, ip: string, deps: Deps): Promise<boolean> {
  try {
    const res = await deps.fetch(TURNSTILE_VERIFY, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const out = (await res.json()) as { success?: unknown };
    return out.success === true;
  } catch {
    return false;
  }
}

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/* POST /api/session */
export async function handleSession(request: Request, env: Env, deps: Deps = realDeps): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!env.TICKET_KEY || !env.TURNSTILE_SECRET) return json(503, { error: 'off' });
  let body: { scope?: unknown; token?: unknown };
  try {
    const text = await request.text();
    if (text.length > 4_000) return json(413, { error: 'big' });
    body = JSON.parse(text) as { scope?: unknown; token?: unknown };
  } catch { return json(400, { error: 'json' }); }
  const scope = body.scope;
  if (typeof scope !== 'string' || !(SCOPES as readonly string[]).includes(scope) || typeof body.token !== 'string' || !body.token || body.token.length > 2_048) return json(400, { error: 'body' });
  const now = deps.now(), p = periods(now), ip = addressOf(request);
  const full = await ledgerOf(env).take([{ key: `addr:session:${await addrHash(env.TICKET_KEY, ip, now)}:${p.hour}`, limit: TICKETS_PER_HOUR, expires: p.hourEnd }], now);
  if (full) return json(429, { error: 'limit' });
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, body.token, ip, deps))) return json(403, { error: 'turnstile' });
  return json(200, { ticket: await issueTicket(env.TICKET_KEY, scope as Scope, now), expires: now + TICKET_MS, scope });
}
