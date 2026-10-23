/* The Nikhilam Family helpers (openspec family-helpers): the pure part. No DOM, no storage, no timers, so every rule
   is a unit test (test/family-helpers.test.mjs) and the React port reuses it unchanged.
   - FRIENDS: Shunya (the Zero, funny), Nava (the Nine, witty) and Eka (the One, names the Sutra). Fellow students of
     the Player, never teachers: Bolt is the teacher.
   - bandFor(): the Reading band that picks their tone (age-bands' Grade answer when it exists, else the Mode).
   - createCoach(): the help signals and escalation. note(event) returns the plan of a Visit, or null.
   - planVisit(): a Visit's turns (one friend speaks at a time) and buttons, from the line table (js/family-lines.js).
   - placeVisit(): where a Visit may stand without covering the question, the answer or the round's buttons.
   - exampleFor(): a worked example on other numbers, never the Player's question or its answer. */
import { LINES } from './family-lines.js';

/* Voices are Chirp 3 HD, distinct from Bolt's Aoede (design D13). Not spoken until the owner's recording lands. */
export const FRIENDS = {
  shunya: { id: 'shunya', name: 'Shunya', digit: 'Zero', voice: 'en-US-Chirp3-HD-Puck' },
  nava: { id: 'nava', name: 'Nava', digit: 'Nine', voice: 'en-US-Chirp3-HD-Leda' },
  eka: { id: 'eka', name: 'Eka', digit: 'One', voice: 'en-US-Chirp3-HD-Charon' }
};
export const BANDS = ['early', 'growing', 'fluent'];
export const SETTINGS = ['always', 'ask', 'off'];
/* The switch "Try the Nikhilam Family helpers" (design D10): off until a Player turns it on. The release flips this. */
export const FAMILY_DEFAULT = false;
/* Tunable later (design D4, D5, D8) */
export const RULES = { inRow: 2, inRound: 3, idleMs: 20000, hintTwice: 2, restMs: 180000, mistakeRate: 0.2 };

export const familyOn = p => !!p && (p.family ?? FAMILY_DEFAULT) === true;
export const helpSetting = p => (SETTINGS.includes(p && p.familyHelp) ? p.familyHelp : 'always');

/* age-bands decision 3 (bandOf), for when player.reading exists; else the Mode picks the tone (design D2) */
const EARLY_GRADES = ['pre-k', 'k', '1'], GROWING_GRADES = ['2', '3', '4'];
export function bandFor(p) {
  const r = p && p.reading;
  if (r && r.grade != null) { const g = String(r.grade).toLowerCase(); return EARLY_GRADES.includes(g) ? 'early' : GROWING_GRADES.includes(g) ? 'growing' : 'fluent'; }
  if (r && r.age != null) { const a = r.age === 'adult' ? 99 : Number(r.age); return a <= 6 ? 'early' : a <= 9 ? 'growing' : 'fluent'; }
  const m = p && p.mode;
  return m === 'explorer' ? 'early' : m === 'pro' ? 'fluent' : 'growing';
}
/* "Swift Tiger 42" is greeted as "Swift Tiger" */
export const nickWords = name => String(name || '').split(' ').filter(w => !/^\d+$/.test(w)).slice(0, 2).join(' ');

/* What the friends know about a Skill: its title and idea, and for a Trick its Sutra (sutras-first's tags, when they
   land, give school Skills a Sutra too). key is what memory counts: the Sutra for a Trick, else the Skill. */
export function skillInfo(skill, trick = null) {
  if (!skill) return { key: null, title: '', idea: '', sutra: '', meaning: '' };
  const t = trick || null;
  return { key: t && t.sutraId ? 'sutra:' + t.sutraId : 'skill:' + skill.id, title: skill.title || '', idea: firstSentence(skill.idea || (t && t.idea) || ''), sutra: (t && t.sutra) || '', meaning: (t && t.meaning) || '' };
}
const plainText = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&minus;/g, '-').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const firstSentence = s => { const t = plainText(s), m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim(); };

/* ---------- The coach: help signals and escalation (design D4, D5) ----------
   Events, in the order a round sends them:
     { type: 'question', skill }          a new question is on screen
     { type: 'miss', skill }               a wrong try
     { type: 'right', skill, first }       a right answer (first: first try, no hint)
     { type: 'hint', skill }               the round's Hint was pressed
     { type: 'idle', skill }               about RULES.idleMs on one question with no input (the view times it)
     { type: 'leave', skill }              the Player left the round
     { type: 'ask', skill }                Ask a friend
     { type: 'raceStart' }                 a timed race began: hold what is noticed until roundEnd
     { type: 'roundEnd', skill, misses, lit, hard }  a round ended (hard: memory says this Skill was hard last time)
   note() returns { level: 1 | 2 | 3, kind: 'help' | 'cheer' | 'leave', skill, reason, asked } or null, and records the
   Visit it returns: the view shows every plan it gets. note(event, { quiet: true }) counts the event but starts no
   Visit (one is already open). used() marks that the Player used the open Visit's buttons. */
export function createCoach({ now = () => Date.now(), rules = RULES, setting = 'always', muted = false } = {}) {
  const st = { visits: {}, row: { skill: null, n: 0 }, roundMiss: 0, hints: 0, sinceRight: 0, lastAt: -Infinity, last: null, used: false, race: false, held: null, setting, muted };
  const resting = () => now() - st.lastAt < rules.restMs;
  const auto = () => st.setting === 'always' && !st.muted && !resting();
  const visitLevel = (skill, min = 1) => Math.max(min, Math.min(3, (st.visits[skill] || 0) + 1));
  let quiet = false; /* a Visit is open: count, but start nothing */
  const record = plan => { if (quiet) return null; st.lastAt = now(); st.visits[plan.skill] = (st.visits[plan.skill] || 0) + (plan.kind === 'help' ? 1 : 0); st.last = { skill: plan.skill, level: plan.level, kind: plan.kind }; st.used = plan.asked; return plan; };
  const help = (skill, reason, min = 1) => {
    const plan = { level: visitLevel(skill, min), kind: reason === 'leave' ? 'leave' : 'help', skill, reason, asked: false };
    if (plan.kind === 'leave') plan.level = 1;
    if (st.race) { if (!st.held || plan.level > st.held.level) st.held = plan; return null; }
    return auto() ? record(plan) : null;
  };
  function note(ev, opts = {}) {
    if (st.setting === 'off' || !ev) return null;
    quiet = !!opts.quiet;
    const skill = ev.skill || null;
    switch (ev.type) {
      case 'question': st.hints = 0; return null;
      case 'miss': {
        st.sinceRight++; st.roundMiss++;
        if (st.row.skill === skill) st.row.n++; else st.row = { skill, n: 1 };
        if (st.row.n >= rules.inRow) { st.row.n = 0; if (st.roundMiss >= rules.inRound) st.roundMiss = 0; return help(skill, 'row'); }
        if (st.roundMiss >= rules.inRound) { st.roundMiss = 0; return help(skill, 'round', 2); }
        return null;
      }
      case 'right': {
        st.sinceRight = 0; st.row = { skill, n: 0 };
        const after = st.last && st.last.kind === 'help' && st.last.skill === skill && st.last.level >= 2;
        if (!ev.first || !after || st.race || st.setting === 'off') return null;
        const plan = { level: 3, kind: 'cheer', skill, reason: 'breakthrough', asked: false };
        if (st.used) return record(plan); /* the ending of the Visit the Player used: not a new Visit (design D5) */
        return auto() ? record(plan) : null;
      }
      case 'hint': if (++st.hints < rules.hintTwice) return null; st.hints = -Infinity; return help(skill, 'hint');
      case 'idle': return help(skill, 'idle');
      case 'leave': { const was = st.sinceRight > 0; st.sinceRight = 0; return was ? help(skill, 'leave') : null; }
      case 'ask': return record({ level: visitLevel(skill), kind: 'help', skill, reason: 'ask', asked: true }); /* any time, muted or resting */
      case 'raceStart': st.race = true; st.held = null; return null;
      case 'roundEnd': {
        const held = st.held; st.race = false; st.held = null; st.roundMiss = 0; st.sinceRight = 0;
        if (ev.lit && ev.hard) return auto() ? record({ level: 3, kind: 'cheer', skill, reason: 'breakthrough', asked: false }) : null;
        if ((ev.misses || 0) >= 2) return help(skill, 'round', ev.misses >= 3 ? 3 : 2);
        return held && auto() ? record(held) : null;
      }
      default: return null;
    }
  }
  return {
    note,
    used: () => { st.used = true; },
    mute: () => { st.muted = true; },
    setSetting: s => { st.setting = SETTINGS.includes(s) ? s : 'always'; },
    state: () => ({ ...st, visits: { ...st.visits } })
  };
}

/* ---------- Memory on the device (design D9): player.familyMem = { hard: { key: n }, last } ---------- */
export function memoryAfter(mem, key, { solved = false } = {}) {
  const m = { hard: { ...((mem && mem.hard) || {}) }, last: (mem && mem.last) || null };
  if (!key) return m;
  if (solved) { if (m.last === key) m.last = null; return m; }
  m.hard[key] = Math.min(99, (m.hard[key] || 0) + 1); m.last = key;
  const keys = Object.keys(m.hard); if (keys.length > 40) delete m.hard[keys[0]]; /* bounded: the oldest goes */
  return m;
}
export const wasHard = (mem, key) => !!(key && mem && mem.hard && mem.hard[key] > 0);

/* ---------- A worked example on other numbers (design D8) ----------
   gen() draws a problem from the Skill's generator; answerOf(p) writes its answer. The example's question and answer
   must both differ from the Player's (compared as plain text); up to 12 draws, else null (the Visit shows no example). */
export function exampleFor({ gen, answerOf, q, answer, tries = 12 }) {
  const Q = plainText(q), A = plainText(answer);
  for (let i = 0; i < tries; i++) {
    let p; try { p = gen(); } catch (e) { return null; }
    if (!p || !Array.isArray(p.steps) || !p.steps.length) continue;
    const a = answerOf(p);
    if (plainText(p.q) !== Q && plainText(a) !== A && a !== '') return { q: p.q, steps: p.steps, answer: a };
  }
  return null;
}

/* ---------- A Visit's turns (design D5, D7, D8) ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const linesFor = (friend, kind, band) => { const k = LINES[friend] && LINES[friend][kind]; return (k && (k[band] || k.growing)) || []; };
/* One line, its placeholders filled and escaped. {sutra} is the Sutra name marked as Sanskrit (accessibility spec).
   {name} becomes an empty <span class="fh-nick">, which the overlay fills with textContent: the Nickname is never part
   of a markup string, so it can never reach a policy report's sample of one (content-security, ADR 0002). */
export function fill(line, vars = {}) {
  return esc(line).replace(/\{(\w+)\}/g, (m, k) => (k === 'sutra' ? (vars.sutra ? `<span lang="sa-Latn">${esc(vars.sutra)}</span>` : '') : k === 'name' ? (vars.name ? '<span class="fh-nick"></span>' : '') : vars[k] != null ? esc(vars[k]) : ''));
}
const pickOf = rng => list => list[Math.floor(rng() * list.length) % list.length];

/* plan: from createCoach().note(). info: skillInfo(). example: exampleFor() or null. greet: the first Visit this session.
   remember: the Skill was hard last time. canHint: the round has a Hint to give.
   Returns { kind, level, turns: [{ friend, html, steps?, pose }], buttons: ['show', 'hint', 'notnow'] or ['thanks'] } */
export function planVisit({ plan, band = 'growing', info = skillInfo(null), example = null, nick = '', greet = false, remember = false, canHint = true, rng = Math.random }) {
  const pick = pickOf(rng), vars = { name: nick, title: info.title, idea: info.idea, sutra: info.sutra, meaning: info.meaning };
  const say = (friend, kind, pose = 'talk', more = {}) => { const list = linesFor(friend, kind, band); return list.length ? { friend, html: fill(pick(list), { ...vars, ...more }), pose } : null; };
  const turns = [];
  const hello = friend => { if (greet && nick) turns.push(say(friend, 'hello', 'wave')); };
  if (plan.kind === 'cheer') {
    hello('shunya');
    turns.push(say('shunya', 'cheer', 'cheer'), say('nava', 'cheer', 'cheer'), say('eka', 'cheer', 'cheer'));
    return { kind: 'cheer', level: 3, turns: turns.filter(Boolean), buttons: ['thanks'] };
  }
  if (plan.kind === 'leave') {
    const f = rng() < 0.5 ? 'shunya' : 'nava'; hello(f); turns.push(say(f, 'leave', 'wave'));
    return { kind: 'leave', level: 1, turns: turns.filter(Boolean), buttons: ['notnow'] };
  }
  const level = plan.level;
  /* Eka names the Sutra for a Trick in Growing and Fluent, and states the idea when there is one */
  const method = () => [say('eka', info.sutra && band !== 'early' ? 'sutra' : info.idea && band !== 'early' ? 'method' : 'methodEarly', 'think')];
  if (level === 1) {
    const f = rng() < 0.5 ? 'shunya' : 'nava'; hello(f);
    turns.push(say(f, info.idea && band !== 'early' ? 'nudge' : 'nudgeEarly'));
  } else if (level === 2) {
    hello('eka');
    if (remember) turns.push(say('eka', 'remember', 'think'));
    turns.push(...method(), say(rng() < 0.5 ? 'nava' : 'shunya', 'encourage', 'cheer'));
  } else {
    hello('shunya');
    if (remember) turns.push(say('eka', 'remember', 'think'));
    turns.push(say('shunya', 'intro'));
    const wrong = example && /^-?\d+$/.test(plainText(example.answer)) ? String(Number(plainText(example.answer)) + 1) : null;
    if (example && wrong && band !== 'early' && rng() < RULES.mistakeRate) {
      turns.push({ friend: 'shunya', html: `${fill(pick(linesFor('shunya', 'mistake', band)), { ...vars, wrong })}`, pose: 'cheer', example: { q: example.q } });
      turns.push(say(rng() < 0.5 ? 'nava' : 'eka', 'catch', 'think'));
    }
    if (example) turns.push({ ...say('eka', 'steps', 'think'), steps: example.steps, example: { q: example.q, answer: example.answer } });
    else turns.push(...method());
    turns.push(say('nava', 'outro', 'cheer'));
  }
  const buttons = level === 3 ? (canHint ? ['hint', 'notnow'] : ['notnow']) : canHint ? ['show', 'hint', 'notnow'] : ['show', 'notnow'];
  return { kind: 'help', level, turns: turns.filter(Boolean), buttons };
}
/* Show me inside a Visit: Eka works the example (or says the method when the Skill has no example) */
export function showMeTurn({ band = 'growing', info = skillInfo(null), example = null, rng = Math.random }) {
  const pick = pickOf(rng), vars = { title: info.title, idea: info.idea, sutra: info.sutra, meaning: info.meaning };
  if (example) return { friend: 'eka', html: fill(pick(linesFor('eka', 'steps', band)), vars), pose: 'think', steps: example.steps, example: { q: example.q, answer: example.answer } };
  return { friend: 'eka', html: fill(pick(linesFor('eka', info.idea && band !== 'early' ? 'method' : 'methodEarly', band)), vars), pose: 'think' };
}

/* ---------- Where a Visit stands (design D6) ----------
   view { w, h, top }: the viewport and the bottom of the sticky header. protect: the rects that must stay clear
   (question, answer, buttons, Bolt's bubble), in viewport pixels. box { w, h }: the Visit's size. Returns
   { side: 'right' | 'left' | 'below' | 'above' | 'dock', x, y, from: the screen edge it enters from }.
   Pure: it never returns a box that overlaps a protected rect; 'dock' means "in the page flow under the card". */
export function placeVisit(view, protect, box, { gap = 8 } = {}) {
  const top = (view.top || 0) + gap, seen = protect.filter(r => r && r.bottom > 0 && r.top < view.h && r.right > r.left && r.bottom > r.top);
  if (!seen.length) return { side: 'below', x: Math.max(gap, view.w - box.w - gap), y: Math.max(top, view.h - box.h - gap), from: 'right' };
  const U = { left: Math.min(...seen.map(r => r.left)), right: Math.max(...seen.map(r => r.right)), top: Math.min(...seen.map(r => r.top)), bottom: Math.max(...seen.map(r => r.bottom)) };
  const clampY = y => Math.max(top, Math.min(y, view.h - box.h - gap));
  const clampX = x => Math.max(gap, Math.min(x, view.w - box.w - gap));
  const fitsV = view.h - top - gap >= box.h;
  const cands = [];
  if (fitsV && view.w - gap - (U.right + gap) >= box.w) cands.push({ side: 'right', x: U.right + gap, y: clampY(U.top), from: 'right' });
  if (fitsV && U.left - gap - gap >= box.w) cands.push({ side: 'left', x: U.left - gap - box.w, y: clampY(U.top), from: 'left' });
  if (view.h - gap - (U.bottom + gap) >= box.h && view.w - 2 * gap >= box.w) cands.push({ side: 'below', x: clampX(U.right - box.w), y: U.bottom + gap, from: 'bottom' });
  if (U.top - gap - top >= box.h && view.w - 2 * gap >= box.w) cands.push({ side: 'above', x: clampX(U.right - box.w), y: U.top - gap - box.h, from: 'top' });
  const clear = c => seen.every(r => c.x + box.w <= r.left || c.x >= r.right || c.y + box.h <= r.top || c.y >= r.bottom);
  return cands.find(clear) || { side: 'dock', x: 0, y: 0, from: 'bottom' };
}
