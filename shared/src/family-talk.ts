/* Talking with the Family (openspec family-helpers step 3, helper-conversation spec, design D15 and D18): the pure
   rules the browser (js/family-talk.js) and the Worker (workers/src/family/) both run. No DOM, no storage, no network,
   so every rule is a unit test (family-talk.test.ts) and the Worker's tests run it inside the Workers runtime.
   - TALK_SKILLS: the shared Skill table of the conversation. A Skill is in it when the answer to a question follows
     from the Skill id and the question's own numbers alone: every Trick whose answer is one number (vedic.ts), and the
     school Skills whose every question is "a op b = ?". That is how the Worker computes the answer it must never let a
     reply contain, and how both sides check a showExample.
   - stripPersonal(): what the browser removes before sending (and the Worker again on what it receives).
   - checkActions(): the four actions, validated against the question and the Skill; anything else dropped.
   - leaksAnswer(): the server check of a reply (task 3.10).
   - cluesUsed(), scriptedReply(), scriptedLine(), TALK_LINES: the clue limit and the scripted fallback lines.
   Nothing here knows the Player: no Nickname, id, Age or Grade answer reaches this module. */
import { TRICKS, problemFor, type Trick, type Vals } from './vedic.ts';
import { ri } from './lib.ts';

export const SPEAKERS = ['bolt', 'shunya', 'nava', 'eka'] as const;
export type Speaker = (typeof SPEAKERS)[number];
/* react(mood): the Family's poses (js/family.js FRIEND_POSES without idle); Bolt maps them to his own */
export const MOODS = ['talk', 'wave', 'cheer', 'think'] as const;
export type Mood = (typeof MOODS)[number];
export const ACTIONS = ['showExample', 'pointAt', 'showSutra', 'react'] as const;
export const CLUES = 3;         /* clues per question (design D18, tunable) */
export const MAX_MESSAGE = 300; /* characters a message may hold */
export const MAX_TURNS = 40;    /* turns of one Visit's words a request may carry */
export const MAX_LINE = 240;    /* characters a reply line may hold (about 30 words) */
export const MAX_REPLIES = 2;

export const isSpeaker = (s: unknown): s is Speaker => typeof s === 'string' && (SPEAKERS as readonly string[]).includes(s);
export const isMood = (s: unknown): s is Mood => typeof s === 'string' && (MOODS as readonly string[]).includes(s);
export const plainText = (s: unknown): string => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&times;/g, '×').replace(/&minus;/g, '−').replace(/&divide;/g, '÷').replace(/&radic;/g, '√').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/* ---------- The Skill table ---------- */
export interface TalkSkill {
  id: string;
  /* The Trick id for a speed-trick Skill, null for a school Skill */
  trick: string | null;
  title: string;
  idea: string;
  sutra: string;
  meaning: string;
  arity: number;
  /* What pointAt may name */
  parts: readonly string[];
  valid(nums: readonly number[]): boolean;
  answer(nums: readonly number[]): number;
  /* The left and right part the answer is written as, when the Trick has them (both together give it away) */
  pieces(nums: readonly number[]): number[];
  question(nums: readonly number[]): string;
  steps(nums: readonly number[]): string[];
  random(): number[];
}
export interface SkillFacts { title: string; idea: string; sutra: string; meaning: string }

/* The label the bubble shows for each part pointAt may name */
export const PART_LABELS: Record<string, string> = {
  firstNumber: 'the first number', secondNumber: 'the second number', base: 'the base, the nearest power of ten',
  distances: 'how far each number is from the base', front: 'the part before the last digit', last: 'the last digit',
  digits: 'the digits, one column at a time', leftPart: 'the left part of the answer', rightPart: 'the right part of the answer',
  ones: 'the ones digits', tens: 'the tens digits',
};
const TRICK_PARTS: Record<string, readonly string[]> = {
  sq5: ['front', 'last', 'leftPart', 'rightPart'], 'near-base': ['firstNumber', 'secondNumber', 'base', 'distances', 'leftPart', 'rightPart'],
  crosswise: ['firstNumber', 'secondNumber', 'digits'], from9: ['firstNumber', 'digits', 'last'], by9s: ['firstNumber', 'secondNumber', 'leftPart', 'rightPart'],
  ends10: ['firstNumber', 'secondNumber', 'front', 'ones', 'leftPart', 'rightPart'], 'square-near': ['firstNumber', 'base', 'distances'], by11: ['firstNumber', 'digits'],
  check9: ['firstNumber', 'secondNumber', 'digits'], times5: ['firstNumber', 'secondNumber'], 'sub-base': ['firstNumber', 'secondNumber', 'base', 'distances'],
  duplex: ['firstNumber', 'digits', 'tens', 'ones'], sqroot: ['firstNumber', 'digits', 'last'], cuberoot: ['firstNumber', 'digits', 'last'],
  transpose: ['firstNumber', 'secondNumber'], 'zero-sum': ['firstNumber', 'secondNumber'],
};
type Op = '+' | '-' | '*';
const OPS: Record<Op, (a: number, b: number) => number> = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b };
const SYM: Record<Op, string> = { '+': '+', '-': '−', '*': '×' };
/* School Skills whose every question is "a op b = ?" (skills/*.ts): the operator fixes the answer */
const ARITH: Record<string, { op: Op; lo: number; hi: number }> = {
  'k-sub10': { op: '-', lo: 0, hi: 10 }, '1-maketen': { op: '+', lo: 0, hi: 20 }, '1-doubles': { op: '+', lo: 0, hi: 40 },
  '2-add100': { op: '+', lo: 0, hi: 200 }, '2-sub100': { op: '-', lo: 0, hi: 200 }, '3-mult': { op: '*', lo: 0, hi: 144 },
  '3-multtens': { op: '*', lo: 0, hi: 9000 }, '3-dist': { op: '*', lo: 0, hi: 400 }, '4-mult2': { op: '*', lo: 0, hi: 1000000 },
};
const vals = (nums: readonly number[]): Vals => [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 0];

function trickRow(t: Trick): TalkSkill {
  const arity = t.inputs.length;
  return {
    id: `v-${t.id}`, trick: t.id, title: t.title, idea: plainText(t.idea), sutra: t.sutra || '', meaning: t.meaning || '', arity,
    parts: TRICK_PARTS[t.id] ?? ['firstNumber', 'secondNumber'].slice(0, Math.min(2, arity)),
    valid: nums => nums.length === arity && nums.every((n, i) => { const inp = t.inputs[i]; return !!inp && isInt(n) && n >= inp.min && n <= inp.max; }) && !t.valid(vals(nums)),
    answer: nums => Number(t.answer(vals(nums))),
    pieces: nums => (t.parts ? t.parts(vals(nums)).map(Number).filter(Number.isFinite) : []),
    question: nums => plainText(problemFor(t, vals(nums)).q),
    steps: nums => t.steps(vals(nums)).map(s => plainText(s.say)),
    random: () => t.random(),
  };
}
function arithRow(id: string, { op, lo, hi }: { op: Op; lo: number; hi: number }): TalkSkill {
  const f = OPS[op], sym = SYM[op];
  return {
    id, trick: null, title: id, idea: '', sutra: '', meaning: '', arity: 2, parts: ['firstNumber', 'secondNumber'],
    valid: nums => nums.length === 2 && nums.every(n => isInt(n) && n >= lo && n <= hi),
    answer: nums => f(nums[0] ?? 0, nums[1] ?? 0),
    pieces: () => [],
    question: nums => `${nums[0]} ${sym} ${nums[1]} = ?`,
    steps: nums => [`${nums[0]} ${sym} ${nums[1]} = ${f(nums[0] ?? 0, nums[1] ?? 0)}`],
    random: () => { const a = ri(lo, Math.min(hi, 99)), b = ri(Math.max(lo, 1), Math.min(hi, 12)); return op === '-' && b > a ? [b, a] : [a, b]; },
  };
}
/* Tricks whose answer is one number the Player types: no fields, no multiple choice, no special answer (div9's
   quotient and remainder, recip's digit) */
export const TALK_SKILLS: Record<string, TalkSkill> = Object.fromEntries([
  ...TRICKS.filter(t => !t.fields && !t.choice && t.id !== 'div9' && t.id !== 'recip').map(t => [`v-${t.id}`, trickRow(t)] as const),
  ...Object.entries(ARITH).map(([id, a]) => [id, arithRow(id, a)] as const),
]);
export const talkSkill = (id: unknown): TalkSkill | null => (typeof id === 'string' && Object.hasOwn(TALK_SKILLS, id) ? (TALK_SKILLS[id] ?? null) : null);
/* The facts the scripted lines and the prompt use: the table's, or for a school Skill the game's own title and idea
   (the browser passes its Skill; the Worker keeps the table's) */
export function skillFacts(row: TalkSkill, skill: { title?: string; idea?: string } | null = null): SkillFacts {
  return { title: skill?.title || row.title, idea: row.idea || plainText(skill?.idea ?? ''), sutra: row.sutra, meaning: row.meaning };
}

/* The numbers of the question on screen: a Trick's own values (ordered as the Trick takes them), else the numbers
   written in the question. null when the Skill is not in the table or the numbers do not fit it. */
export function questionNumbers(skillId: unknown, problem: { q?: unknown; vals?: unknown } | null | undefined): number[] | null {
  const row = talkSkill(skillId);
  if (!row || !problem) return null;
  const nums = Array.isArray(problem.vals) ? problem.vals.map(Number) : (plainText(problem.q).match(/-?\d+/g) ?? []).map(Number);
  return row.valid(nums) ? nums : null;
}

/* ---------- Never the answer ---------- */
/* Does text give the answer away: the whole answer (separators stripped), or every part of it at once */
export function leaksAnswer(row: TalkSkill, nums: readonly number[], text: string): boolean {
  const flat = String(text).replace(/(\d)[,\s.](?=\d{3}\b)/g, '$1').replace(/−/g, '-');
  const seen = (flat.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const answer = row.answer(nums);
  if (Number.isFinite(answer) && seen.some(n => n === answer)) return true;
  const pieces = row.pieces(nums).filter(p => !nums.includes(p));
  return pieces.length > 1 && pieces.every(p => seen.includes(p));
}
/* Would an example on these numbers show the Player's question or its answer (helper-conversation spec)? */
export function exampleClashes(row: TalkSkill, nums: readonly number[], ex: readonly number[]): boolean {
  if (!row.valid(ex)) return true;
  const same = [...ex].sort((a, b) => a - b).join(',') === [...nums].sort((a, b) => a - b).join(',');
  return same || row.answer(ex) === row.answer(nums);
}
/* A fresh example whose question and answer both differ (up to 12 draws), else null */
export function freshExample(row: TalkSkill, nums: readonly number[], tries = 12): number[] | null {
  for (let i = 0; i < tries; i++) { const ex = row.random(); if (!exampleClashes(row, nums, ex)) return ex; }
  return null;
}

/* ---------- What leaves the browser (design D18 safety) ----------
   Email addresses, phone numbers and any run of 4 or more digits that is not one of the question's numbers are
   replaced by a blank. The Worker runs it again on what it receives. */
export function stripPersonal(text: unknown, nums: readonly number[] = []): { text: string; removed: boolean } {
  let removed = false;
  const blank = (): string => { removed = true; return ' '; };
  const keep = new Set(nums.map(n => String(Math.abs(Number(n)))));
  let t = String(text ?? '').slice(0, MAX_MESSAGE);
  t = t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, blank);
  t = t.replace(/\+?\d[\d\s().-]{6,}\d/g, m => (m.replace(/\D/g, '').length >= 7 ? blank() : m));
  t = t.replace(/\d{4,}/g, m => (keep.has(m) ? m : blank()));
  return { text: t.replace(/\s+/g, ' ').trim(), removed };
}

/* ---------- The four actions, checked (helper-conversation spec) ---------- */
/* As the model asked (the Worker shapes tool calls into this) */
export interface AskedAction { type?: unknown; a?: unknown; b?: unknown; part?: unknown; mood?: unknown }
export type Action =
  | { type: 'showExample'; numbers: number[] }
  | { type: 'pointAt'; part: string }
  | { type: 'showSutra' }
  | { type: 'react'; mood: Mood };
/* The ones that pass, at most one of each type, in the order given: showExample only on valid numbers that differ
   from the question's in either order with a different result; pointAt only with a part from the Skill's list;
   showSutra only when the Skill has a Sutra and its meaning; react only with a known mood. Anything else is dropped. */
export function checkActions(actions: unknown, row: TalkSkill, nums: readonly number[]): Action[] {
  const out: Action[] = [], seen = new Set<string>();
  for (const a of Array.isArray(actions) ? (actions as unknown[]) : []) {
    if (!a || typeof a !== 'object') continue;
    const { type, ...rest } = a as AskedAction;
    if (typeof type !== 'string' || !(ACTIONS as readonly string[]).includes(type) || seen.has(type)) continue;
    if (type === 'showExample') {
      const ex = row.arity === 1 ? [rest.a] : [rest.a, rest.b];
      if (!ex.every(isInt) || exampleClashes(row, nums, ex)) continue;
      out.push({ type, numbers: ex });
    } else if (type === 'pointAt') {
      if (typeof rest.part !== 'string' || !row.parts.includes(rest.part)) continue;
      out.push({ type, part: rest.part });
    } else if (type === 'showSutra') {
      if (!row.sutra || !row.meaning) continue;
      out.push({ type });
    } else {
      if (!isMood(rest.mood)) continue;
      out.push({ type: 'react', mood: rest.mood });
    }
    seen.add(type);
  }
  return out;
}

/* ---------- Words and clues ----------
   This Visit's turns, the last one the Player's new message. A reply marked clue, and every pointAt (the browser
   records it as a clue on its turn), count against CLUES. */
export interface Turn { who: 'player' | Speaker; line: string; clue?: boolean }
export interface Reply { speaker: Speaker; line: string; clue: boolean }
export interface TurnResult { lines: Reply[]; actions: Action[]; source: 'model' | 'scripted'; cluesLeft: number }

/* Why a list of turns is refused, or null */
export function wordsOk(words: unknown): string | null {
  if (!Array.isArray(words) || !words.length) return 'words must be a list of turns';
  if (words.length > MAX_TURNS) return `at most ${MAX_TURNS} turns`;
  for (const w of words as unknown[]) {
    if (!w || typeof w !== 'object') return 'a turn is an object';
    const { who, line, clue } = w as Partial<Turn>;
    if (typeof line !== 'string' || !line.trim() || line.length > MAX_MESSAGE) return `a turn needs a line of 1 to ${MAX_MESSAGE} characters`;
    if (who !== 'player' && !isSpeaker(who)) return 'a turn needs a known speaker';
    if (clue != null && typeof clue !== 'boolean') return 'clue must be true or false';
  }
  if ((words[words.length - 1] as Turn).who !== 'player') return 'the last turn is the Player\'s message';
  return null;
}
export const cluesUsed = (words: readonly Turn[]): number => words.filter(w => w.who !== 'player' && w.clue === true).length;
export const cluesLeft = (words: readonly Turn[]): number => Math.max(0, CLUES - cluesUsed(words));
export const asksWhy = (text: string): boolean => /\b(why|how|what for|explain)\b/i.test(text);

/* ---------- Scripted lines (the fallback, design D18) ----------
   The Fluent register (the conversation is for Players 13 and over). Bolt joins the three as the teacher. Kinds: method
   (the Skill's idea: a why or how question, and the whole turn when the model cannot be asked), sutra, safe (a reply
   that nearly gave the answer was replaced), noClues (a clue asked for with none left), steer (anything but math).
   Same rules as js/family-lines.js: no em dashes, no digits, placeholders only {idea}, {title}, {sutra}, {meaning};
   never the answer (family-talk.test.ts). */
export type LineKind = 'method' | 'sutra' | 'safe' | 'noClues' | 'steer';
export const TALK_LINES: Record<LineKind, Record<Speaker, readonly string[]>> = {
  method: {
    bolt: ['Good question. {idea}', 'Here is the heart of it. {idea}', 'Think of it this way. {idea}'],
    shunya: ['I am all ears. Well, all zero. The idea is: {idea}', 'Not to be a zero about it, but: {idea}'],
    nava: ['Here is the idea, free of charge: {idea}', 'Nod nod. The method: {idea}'],
    eka: ['Bolt showed us this one. {idea}', 'Step by step, as Bolt put it: {idea}'],
  },
  sutra: {
    bolt: ['The Sutra behind it is {sutra}: {meaning}.'],
    shunya: ['Eka would say {sutra}. I would say: round and round. It means {meaning}.'],
    nava: ['Fancy name, simple idea: {sutra}, {meaning}.'],
    eka: ['Bolt calls it {sutra}: {meaning}.', 'The Sutra is {sutra}, {meaning}.'],
  },
  safe: {
    bolt: ['Careful, I nearly said too much. That one is yours to find. Want an example on other numbers?'],
    shunya: ['Oops, I nearly spoiled it. That one is yours. Want one on other numbers instead?'],
    nava: ['Nearly let it slip. Nope, that one is yours to find. An example on other numbers?'],
    eka: ['I will not say the answer. Let us work one on other numbers instead.'],
  },
  noClues: {
    bolt: ['No more clues on this one, but the method is all yours: {idea}'],
    shunya: ['Clue jar is empty! The idea still works though: {idea}'],
    nava: ['All clues spent. Free of charge anyway: {idea}'],
    eka: ['No clues left, but the method is free: {idea}'],
  },
  steer: {
    bolt: ['Fun thought. Back to the question, though: {idea}'],
    shunya: ['Ha! Save that for snack time. Your question first: {idea}'],
    nava: ['Nice try. The question is still waiting. {idea}'],
    eka: ['Let us stay with the question. {idea}'],
  },
};
const pickOf = (rng: () => number) => <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length) % list.length] as T;
/* {idea}, {title}, {sutra}, {meaning} filled as plain text (the browser escapes before drawing) */
export const fillPlain = (line: string, vars: Partial<SkillFacts> = {}): string =>
  line.replace(/\{(\w+)\}/g, (_m, k: string) => (vars as Record<string, string | undefined>)[k] ?? '').replace(/\s+/g, ' ').replace(/\s([.,:;!?])/g, '$1').replace(/:\s*$/, '.').trim();
/* One scripted line for a speaker and kind, with the Skill's facts filled in; the method when the kind needs a
   Sutra the Skill has none of, and a fixed line when the Skill has no idea either */
export function scriptedLine(speaker: Speaker, kind: LineKind, facts: SkillFacts, rng: () => number = Math.random): string {
  const k: LineKind = kind === 'sutra' && !(facts.sutra && facts.meaning) ? 'method' : kind;
  const line = fillPlain(pickOf(rng)(TALK_LINES[k][speaker]), facts);
  /* A line whose placeholder was empty (a Skill with no idea) is too short to help: a fixed line instead */
  return line.split(/\s+/).length >= 6 ? line : 'Let us look at the method together, one step at a time.';
}
/* A whole scripted turn: Bolt (and Eka with the Sutra) for a why or how question, else one friend with the idea.
   Never a clue, never the answer: the lines hold no digits. */
export function scriptedReply(facts: SkillFacts, lastWords = '', { rng = Math.random, kind = 'method' as LineKind } = {}): TurnResult {
  const hasSutra = !!(facts.sutra && facts.meaning);
  const lines: Reply[] = asksWhy(lastWords)
    ? [{ speaker: 'bolt', line: scriptedLine('bolt', kind, facts, rng), clue: false }, ...(hasSutra ? [{ speaker: 'eka' as Speaker, line: scriptedLine('eka', 'sutra', facts, rng), clue: false }] : [])]
    : [(() => { const s: Speaker = rng() < 0.5 ? 'shunya' : 'nava'; return { speaker: s, line: scriptedLine(s, kind, facts, rng), clue: false }; })()];
  return { lines: lines.slice(0, MAX_REPLIES), actions: hasSutra ? [{ type: 'showSutra' }] : [], source: 'scripted', cluesLeft: CLUES };
}
