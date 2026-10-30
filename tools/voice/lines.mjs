/* Studio voice, step 1 of 3: list every line to record (openspec better-voice, tasks 2.1).
   Run from the repo root:  node tools/voice/lines.mjs [samplesPerSkillLevel=500]
   Writes tools/voice/out/lines.json (git-ignored):
   - whole: every line of the Skills recorded whole (K to 2, except three-digit adding and comparing), enumerated until
     WHOLE_QUIET draws in a row add nothing new, plus every fixed line the app speaks (literal speak() calls, praise,
     the Balloon pop prompts and counts) and the names Explorer's menu tabs say (js/nav.js NAV_LINES);
   - clips: every number clip in both takes, and every word frame seen while sampling every other source (all Skills,
     all Katas, which Stars deal, Arena sets for each League, towers), each assigned to the first pack that needs it.
   - explanations (openspec explanation-audio): every line js/explain-lines.js lists (Skill ideas and methods, Trick
     ideas, Sutra cards and deep dives, the Guide and the tour, game rules, badges, Watch descriptions) recorded whole;
     worked steps (a Skill problem's steps, a Trick's steps) hold numbers made up per problem, so their frames go into
     the clip packs.
   Spoken text is what the app passes to fx.speak(): a question's `say` when it has one, else `q`; and its hints. */
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { normalize } from '../../js/voice.js';
import { planLine, clipText, NUMBER_CLIPS } from '../../js/voice-plan.js';
import { SKILLS } from '../../js/skills/index.js';
import { TRICKS } from '../../js/vedic.js';
import { KATAS_PER_TRICK, kata, CHALLENGE_COUNT, challenge, challengeSet } from '../../js/levels.js';
import { makeSet } from '../../js/arena.js';
import { STUDIO } from '../../js/voice-index.js';
import { allExplanationLines } from '../../js/explain-lines.js';
import { VIDEOS, LINKS } from '../../js/videos.js';
import { TEMPLATES, WRITTEN, storyFor } from '../../js/stories.js';
import { NAV_LINES } from '../../js/nav.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const N = +(process.argv[2] || 500);
const WHOLE_QUIET = +(process.env.WHOLE_QUIET || 200000);
/* Skills recorded whole: every K to 2 Skill except the two whose lines run to hundreds of thousands */
export const STITCHED_K2 = ['2-add1000', '1-compare'];
export const wholeSkills = () => SKILLS.filter(s => ['K', '1', '2'].includes(String(s.grade)) && !STITCHED_K2.includes(s.id));
const spoken = p => [p.say || p.q, ...(p.hints || [])].filter(Boolean);
const gen = (s, lv) => { try { return s.gen(lv); } catch (e) { return null; } };

/* ---------- Fixed lines: literal speak() strings in js/, praise, Balloon pop ---------- */
export function fixedLines() {
  const out = new Set();
  for (const f of readdirSync(ROOT + 'js').filter(f => f.endsWith('.js'))) {
    const src = readFileSync(ROOT + 'js/' + f, 'utf8');
    for (const m of src.matchAll(/\b(?:speak|speakIt)\(\s*'((?:[^'\\]|\\.)+)'/g)) out.add(m[1].replace(/\\'/g, "'"));
    const praise = src.match(/const PRAISE = (\{[^\n]*?\});/);
    if (praise) Object.values(Function(`return ${praise[1]}`)()).flat().forEach(t => out.add(t));
  }
  out.add('You got it!');
  for (let n = 1; n <= 24; n++) out.add(String(n)); // Balloon pop counts each pop
  for (let n = 1; n <= 20; n++) {
    out.add(`Pop ${n} balloon${n > 1 ? 's' : ''}`);
    if (n <= 10) out.add(`Pop double ${n} balloons`);
    for (let a = 1; a <= 4; a++) { out.add(`Pop ${a} more than ${n} balloons`); out.add(`Pop ${n + a} take away ${a} balloon${n > 1 ? 's' : ''}`); }
  }
  return [...out];
}

function main() {
  const whole = new Map(); // words -> source
  const addWhole = (t, src) => { const w = normalize(t); if (w && !whole.has(w)) whole.set(w, src); };
  for (const t of fixedLines()) addWhole(t, 'fixed');
  for (const t of NAV_LINES) addWhole(t, 'nav'); /* Explorer's menu tabs say their names (openspec change play-nav-by-mode) */
  for (const { text, src } of allExplanationLines({ videos: VIDEOS, links: LINKS })) addWhole(text, 'explain:' + src);
  for (const s of wholeSkills()) {
    let quiet = 0, before = whole.size;
    for (let i = 0; quiet < WHOLE_QUIET && i < 5e6; i++) {
      const p = gen(s, 1 + (i % 3)); if (!p) continue;
      spoken(p).forEach(t => addWhole(t, s.id));
      if (whole.size > before) { before = whole.size; quiet = 0; } else quiet++;
    }
  }

  /* ---------- Clips: numbers, then every frame, by the first pack that needs it ---------- */
  const PACKS = ['core', 'g3-5', 'tricks', 'g6-8', 'g9-12'];
  const clips = new Map(NUMBER_CLIPS.map(id => [id, 'core']));
  const addClips = (t, pack) => { const w = normalize(t); if (!w) return; for (const p of planLine(w)) if (p.clip && !clips.has(p.clip)) clips.set(p.clip, pack); };
  const band = g => (['K', '1', '2'].includes(String(g)) ? 'core' : ['3', '4', '5'].includes(String(g)) ? 'g3-5' : ['6', '7', '8'].includes(String(g)) ? 'g6-8' : String(g) === 'V' ? 'tricks' : 'g9-12');
  for (const [w, src] of whole) if (!src.startsWith('explain:')) addClips(w, 'core'); // explanations are always whole
  for (let d = 0; d < 60; d++) makeSet('explorer', 'lines-' + d).forEach(p => spoken(p).forEach(t => addClips(t, 'core')));
  const bySkillBand = PACKS.map(pk => SKILLS.filter(s => band(s.grade) === pk));
  const withSteps = p => [...spoken(p), ...(p.steps || [])];
  bySkillBand.forEach((list, i) => list.forEach(s => { for (const lv of [1, 2, 3]) for (let k = 0; k < N; k++) { const p = gen(s, lv); if (p) withSteps(p).forEach(t => addClips(t, PACKS[i])); } }));
  for (const t of TRICKS) for (let k = 0; k < N; k++) { const v = t.random(); if (!(t.valid && t.valid(v))) t.steps(v).forEach(st => addClips(st.say, 'tricks')); }
  for (const t of TRICKS) for (let n = 1; n <= KATAS_PER_TRICK; n++) kata(t.id, n).problems.forEach(p => withSteps(p).forEach(x => addClips(x, 'tricks')));
  for (let d = 0; d < 40; d++) { makeSet('challenger', 'lines-' + d).forEach(p => spoken(p).forEach(t => addClips(t, 'tricks'))); makeSet('pro', 'lines-' + d).forEach(p => spoken(p).forEach(t => addClips(t, 'tricks'))); }
  for (let id = 1; id <= CHALLENGE_COUNT; id += 3) challengeSet(challenge(id), 30).forEach(p => spoken(p).forEach(t => addClips(t, 'tricks')));
  /* Word problems (openspec word-problems, design D11): names and settings vary too much to record whole, so their
     frames go into the clip packs, Explorer's into core */
  for (const t of TEMPLATES) for (let k = 0; k < N; k++) { const p = storyFor({ id: t.skills[0], grade: 3 }, t.mode); if (p) withSteps(p).forEach(x => addClips(x, t.mode === 'explorer' ? 'core' : t.mode === 'challenger' ? 'g3-5' : 'g6-8')); }
  for (const w of WRITTEN) [w.q, w.ask, w.plan, ...w.steps].forEach(x => addClips(x, 'g6-8'));

  const wholeChars = [...whole.keys()].reduce((a, w) => a + w.length, 0);
  const clipChars = [...clips.keys()].reduce((a, id) => a + clipText(id).length, 0);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(OUT + 'lines.json', JSON.stringify({
    voice: STUDIO.voice, speed: STUDIO.speed, packs: PACKS, coveredSkills: wholeSkills().map(s => s.id),
    whole: [...whole].map(([words, src]) => ({ words, src })), clips: Object.fromEntries(clips), chars: { whole: wholeChars, clips: clipChars }
  }));
  const perPack = PACKS.map(pk => `${pk} ${[...clips.values()].filter(v => v === pk).length}`).join(', ');
  console.log(`whole lines: ${whole.size} (${wholeChars} characters); clips: ${clips.size} (${clipChars} characters; ${perPack})`);
  console.log(`total to record: ${wholeChars + clipChars} characters, about $${((wholeChars + clipChars) * 30e-6).toFixed(2)} at list price (Chirp 3 HD, before the free 1 million a month)`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
