/* POST /api/family/v1/turn and GET /api/family/v1/status: talking with the Family (openspec family-helpers step 3,
   helper-conversation spec, design D15 and D18, tasks 3.7, 3.10 and 3.12; ADR 0015).
   A turn: the body is exactly { skillId, numbers, words } (this Visit's words, the last one the Player's message), with
   a family-scope session ticket in the x-vm-ticket header. The Worker checks the ticket (no ticket, no model call),
   checks the Skill and its numbers against the shared table, strips contact details again, counts the turn in
   VoiceLedger (about 20 an hour per address, and the day and month caps as request counts: over any of them the
   Family answer with scripted help, never an error), makes one call to Claude Haiku 4.5 with the fixed instructions,
   the Skill's facts, the numbers and the words, and checks every reply before returning it: a line with the question's
   answer, an unknown speaker, a link, an email address, a phone number, past the length limit or in another role is
   replaced by a scripted line for the same speaker; a third reply is dropped; a clue with none left becomes method talk.
   Nothing about the Player reaches this route, nothing is kept after the answer but the counts, and the log holds one
   fixed word per turn. */
import {
  CLUES, MAX_LINE, MAX_REPLIES, checkActions, cluesLeft as cluesLeftOf, isSpeaker, leaksAnswer, scriptedLine, scriptedReply, skillFacts, stripPersonal, talkSkill, wordsOk,
  type Action, type AskedAction, type Reply, type SkillFacts, type TalkSkill, type Turn, type TurnResult,
} from '../../../shared/src/family-talk.ts';
import { ledgerOf, periods } from '../ledger.ts';
import { TICKET_HEADER, addrHash, addressOf, checkTicket, realDeps, type Deps } from '../session.ts';
import { ANTHROPIC_VERSION, MESSAGES_URL, requestBody } from './prompt.ts';
import type { Env } from '../index.ts';

export const MODEL_TIMEOUT_MS = 12_000;
export const MAX_BODY = 16_000;
const num = (v: string | undefined, d: number): number => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : d; };
/* The Worker settings: the per-address limit and the caps as request counts (family-helpers design D18) */
export const limits = (env: Env) => ({ hour: num(env.FAMILY_TURNS_PER_HOUR, 20), day: num(env.FAMILY_TURNS_PER_DAY, 1250), month: num(env.FAMILY_TURNS_PER_MONTH, 12500) });
/* On only with the switch and every secret the route needs */
export const familyOn = (env: Env): boolean => env.FAMILY_ON === '1' && !!env.ANTHROPIC_API_KEY && !!env.TURNSTILE_SECRET && !!env.TICKET_KEY && !!env.TURNSTILE_SITE_KEY;

const json = (status: number, body: unknown, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const log = (outcome: string): void => { console.log(JSON.stringify({ family: { outcome } })); };

/* GET /api/family/v1/status: whether the conversation is on, and the Turnstile site key (public) the game renders with */
export function handleStatus(env: Env): Response {
  const on = familyOn(env);
  return json(200, { on, siteKey: on ? env.TURNSTILE_SITE_KEY : '', clues: CLUES }, { 'cache-control': 'public, max-age=300' });
}

interface Body { skillId: string; numbers: number[]; words: Turn[] }
/* The body, or why it is refused */
export function readBody(raw: unknown): { body: Body; row: TalkSkill } | { error: string; status: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'body must be an object', status: 400 };
  if (Object.keys(raw).sort().join() !== 'numbers,skillId,words') return { error: 'body must be exactly { skillId, numbers, words }', status: 400 };
  const { skillId, numbers, words } = raw as { skillId: unknown; numbers: unknown; words: unknown };
  const row = talkSkill(skillId);
  if (!row) return { error: 'unknown skillId', status: 422 };
  if (!Array.isArray(numbers) || !numbers.every(n => typeof n === 'number') || !row.valid(numbers as number[])) return { error: 'numbers do not fit the Skill', status: 422 };
  const why = wordsOk(words);
  if (why) return { error: why, status: 400 };
  return { body: { skillId: row.id, numbers: numbers as number[], words: words as Turn[] }, row };
}

/* ---------- The server check of a reply (task 3.10) ---------- */
const LINK = /https?:\/\/|www\.|\b[\w-]+\.(com|org|net|io|edu|gov|co)\b/i;
const CONTACT = /[\w.+-]+@[\w-]+(\.[\w-]+)+|\+?\d[\d\s().-]{6,}\d/;
const ROLE = /\b(as (your|a|an|the) (teacher|tutor|parent|mom|dad|mother|father|doctor|assistant|ai|chatbot|language model|therapist|boyfriend|girlfriend))\b|\b(i am|i'm|i’m) (an? )?(ai|assistant|language model|chatbot|claude|anthropic|large language model)\b|\bas an ai\b/i;
const tidy = (s: string): string => s.replace(/\s*[—–]\s*/g, ', ').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();

interface ContentBlock { type?: unknown; text?: unknown; name?: unknown; input?: unknown }
/* The model's message, read and checked: at most two lines from the four speakers, each replaced by a scripted line
   when it fails a rule; the actions validated against the question. null when nothing usable came back. */
export function cleanReply(content: unknown, row: TalkSkill, facts: SkillFacts, nums: readonly number[], left: number, rng: () => number = Math.random): { lines: Reply[]; actions: Action[] } | null {
  const blocks = Array.isArray(content) ? (content as ContentBlock[]) : [];
  const text = blocks.filter(b => b.type === 'text' && typeof b.text === 'string').map(b => b.text as string).join('\n');
  let parsed: { lines?: unknown } | null = null;
  try { const m = text.match(/\{[\s\S]*\}/); parsed = m ? (JSON.parse(m[0]) as { lines?: unknown }) : null; } catch { parsed = null; }
  if (!parsed || !Array.isArray(parsed.lines)) return null;
  const lines: Reply[] = [];
  let clueUsed = false;
  for (const l of (parsed.lines as unknown[]).slice(0, MAX_REPLIES)) {
    if (!l || typeof l !== 'object') continue;
    const { speaker, line, clue } = l as { speaker?: unknown; line?: unknown; clue?: unknown };
    if (!isSpeaker(speaker) || typeof line !== 'string' || !line.trim()) continue; /* a fifth speaker has no scripted line of its own: dropped */
    const said = tidy(line);
    if (leaksAnswer(row, nums, said)) { lines.push({ speaker, line: scriptedLine(speaker, 'safe', facts, rng), clue: false }); continue; }
    if (said.length > MAX_LINE || LINK.test(said) || CONTACT.test(said)) { lines.push({ speaker, line: scriptedLine(speaker, 'method', facts, rng), clue: false }); continue; }
    if (ROLE.test(said)) { lines.push({ speaker, line: scriptedLine(speaker, 'steer', facts, rng), clue: false }); continue; }
    const isClue = clue === true;
    if (isClue && (left <= 0 || clueUsed)) { lines.push({ speaker, line: scriptedLine(speaker, 'noClues', facts, rng), clue: false }); continue; }
    if (isClue) clueUsed = true;
    lines.push({ speaker, line: said, clue: isClue });
  }
  if (!lines.length) return null;
  const asked: AskedAction[] = blocks.filter(b => b.type === 'tool_use' && typeof b.name === 'string').map(b => ({ type: b.name, ...((b.input && typeof b.input === 'object' ? b.input : {}) as Record<string, unknown>) }));
  let actions = checkActions(asked, row, nums);
  /* A pointAt is a clue: none with no clues left; with one, it marks the reply as a clue */
  if (actions.some(a => a.type === 'pointAt')) {
    if (left <= 0 || (clueUsed && !lines.some(l => l.clue))) actions = actions.filter(a => a.type !== 'pointAt');
    else if (!clueUsed) { const first = lines[0]; if (first) first.clue = true; }
  }
  return { lines, actions };
}

/* POST /api/family/v1/turn */
export async function handleTurn(request: Request, env: Env, deps: Deps = realDeps): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const now = deps.now();
  if (!(await checkTicket(env.TICKET_KEY, request.headers.get(TICKET_HEADER), 'family', now))) { log('refused:ticket'); return json(401, { error: 'ticket' }); }
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) { log('refused:big'); return json(413, { error: 'big' }); }
    raw = JSON.parse(text);
  } catch { log('refused:json'); return json(400, { error: 'json' }); }
  const read = readBody(raw);
  if ('error' in read) { log('refused:body'); return json(read.status, { error: read.error }); }
  const { body, row } = read;
  const facts = skillFacts(row);
  /* Contact details and long numbers are stripped in the browser; stripped again here on what arrived */
  const words: Turn[] = body.words.map(w => ({ who: w.who, line: stripPersonal(w.line, body.numbers).text || '.', ...(w.clue === true ? { clue: true } : {}) }));
  const last = words[words.length - 1]?.line ?? '';
  const left = cluesLeftOf(words);
  const scripted = (why: string): Response => { log(`scripted:${why}`); return json(200, { ...scriptedReply(facts, last), cluesLeft: left }); };
  if (!familyOn(env)) return scripted('off');
  /* The counts: the address this hour (a keyed hash, the key changing daily), the UTC day and the month */
  const p = periods(now), lim = limits(env);
  const full = await ledgerOf(env).take([
    { key: `addr:family:${await addrHash(env.TICKET_KEY as string, addressOf(request), now)}:${p.hour}`, limit: lim.hour, expires: p.hourEnd },
    { key: `turns:family:d:${p.day}`, limit: lim.day, expires: p.dayEnd },
    { key: `turns:family:m:${p.month}`, limit: lim.month, expires: p.monthEnd },
  ], now);
  if (full) return scripted(full.startsWith('addr:') ? 'address' : 'cap');
  /* One call per turn */
  let content: unknown;
  try {
    const res = await deps.fetch(MESSAGES_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY as string, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify(requestBody(row, facts, body.numbers, words, left)),
      signal: AbortSignal.timeout(deps.modelTimeoutMs ?? MODEL_TIMEOUT_MS),
    });
    if (!res.ok) return scripted('model-error');
    const msg = (await res.json()) as { content?: unknown; stop_reason?: unknown };
    if (msg.stop_reason === 'refusal') return scripted('refusal');
    content = msg.content;
  } catch {
    return scripted('unreachable');
  }
  const out = cleanReply(content, row, facts, body.numbers, left);
  if (!out) return scripted('unreadable');
  log('model');
  const result: TurnResult = { ...out, source: 'model', cluesLeft: Math.max(0, left - (out.lines.some(l => l.clue) ? 1 : 0)) };
  return json(200, result);
}
