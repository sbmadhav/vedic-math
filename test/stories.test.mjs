/* Word problems (openspec change word-problems): every template's answer worked out again from the story's own words,
   numbers in range, hints that never hold the answer, settings that travel, the slot plan and the Star wrappers.
   Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import * as S from '../js/stories.js';
import { byId, SKILLS } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { kata } from '../js/levels.js';
import { starRound, starAnswer, starNext, starDare, canDare } from '../js/star.js';

const rng = (a = 1) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const text = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&times;/g, '×').replace(/&minus;/g, '−').replace(/&divide;/g, '÷').replace(/&[a-z]+;/g, ' ');
const nums = h => (text(h).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(t => Number(t.replace(/,/g, '')));
const N = 2000;

/* The answer from the story's numbers, in the order the story gives them, worked out apart from the generator */
const SOLVE = {
  'e-join': ([a, b]) => a + b, 'e-away': ([a, b]) => a - b, 'e-more': ([a, b]) => a - b, 'e-tens': ([, k, m]) => 10 * k + m,
  'e-shop': ([a, b]) => a + b, 'e-groups': ([n, c]) => n * c, 'e-seats': ([a, b]) => a - b,
  'c-teams': ([k, n]) => k * n, 'c-packs': ([p, q, g]) => p * q - g, 'c-share': ([n, k]) => n / k, 'c-change': ([a, b, t]) => t - a - b,
  'c-time': ([h, m, eh, em]) => eh * 60 + em - h * 60 - m, 'c-fence': ([l, w], q) => (/fence/.test(q) ? 2 * (l + w) : l * w),
  'c-rows': ([a, b]) => a * b, 'c-square': ([n]) => n * n, 'c-fraction': ([a, b, n]) => (a * n) / b, 'c-percent': ([p, price]) => (p * price) / 100,
  'c-sale': ([price, p]) => price - (price * p) / 100, 'c-speed': ([d, h, h2]) => (d / h) * h2, 'c-recipe': ([g, p, p2]) => (g / p) * p2,
  'c-mean': s => s.reduce((a, b) => a + b, 0) / 4, 'c-cube': ([n]) => Math.round(Math.cbrt(n)),
  'p-budget': ([a, b, t]) => t - a * b, 'p-savings': ([per, m, s]) => per * m - s, 'p-recipe': ([p, g, P, h]) => (g / p) * P - h,
  'p-travel': ([v, d, s]) => (d / v) * 60 + s, 'p-sports': ([a, b, c, m]) => 4 * m - a - b - c, 'p-sale': ([p, d, note]) => note - p * (1 - d / 100),
  'p-tiles': ([n, k]) => n * n - k, 'p-growth': ([p]) => Math.round(p * 1.21), 'p-ladder': ([x, y]) => Math.hypot(x, y),
  'p-stadium': ([a, b, k]) => a * b - k, 'p-fence': ([n]) => 4 * Math.sqrt(n)
};
/* Draws of one template through its first Skill, for its own Mode */
function* draws(t, n = N, seed = 7) {
  const r = rng(seed), skill = { id: t.skills.find(id => !id.startsWith('v-')) || t.skills[0], grade: byId[t.skills[0]] ? byId[t.skills[0]].grade : 8 };
  const only = { ...skill, id: '__only__' }; /* draw from this template alone */
  t.skills.push('__only__');
  try { for (let i = 0; i < n; i++) { const p = S.storyFor(only, t.mode, { r }); assert.equal(p.story.id, t.id); yield p; } } finally { t.skills.pop(); }
}

test('every template has a solver here, a Mode, and Skills that exist', () => {
  for (const t of S.TEMPLATES) {
    assert.ok(SOLVE[t.id], `${t.id}: no solver in this test`);
    assert.ok(['explorer', 'challenger', 'pro'].includes(t.mode), t.id);
    for (const id of t.skills) assert.ok(byId[id], `${t.id}: no Skill ${id}`);
  }
  for (const w of S.WRITTEN) for (const id of w.skills) assert.ok(byId[id], `${w.id}: no Skill ${id}`);
});

test('every template\'s answer is right: worked out again from the story\'s own numbers', () => {
  for (const t of S.TEMPLATES) for (const p of draws(t)) {
    const want = SOLVE[t.id](nums(p.q), text(p.q));
    assert.ok(Math.abs(want - p.answer) < 1e-9, `${t.id}: "${text(p.q)}" gives ${want}, the story says ${p.answer}`);
    assert.ok(Number.isInteger(p.answer) && p.answer > 0, `${t.id}: answer ${p.answer} is not a positive whole number`);
    assert.equal(p.kind, 'num');
  }
});

test('numbers in range: Explorer stories stay small, nothing is negative, no answer is huge', () => {
  for (const t of S.TEMPLATES) for (const p of draws(t, 500)) {
    if (t.mode === 'explorer') assert.ok(p.answer <= 100 && nums(p.q).every(n => n <= 100), `${t.id}: ${text(p.q)} = ${p.answer}`);
    assert.ok(p.answer < 100000, `${t.id}: ${p.answer}`);
    assert.ok(!/−\s*\d/.test(text(p.q)), `${t.id}: a negative number in the story`);
  }
});

test('read, plan, solve: two hints, the first asks what it is asking, and no hint or story number is the answer', () => {
  const check = (p, id) => {
    assert.equal(p.hints.length, 2, id);
    assert.ok(p.hints[0].startsWith('What is it asking? '), `${id}: ${p.hints[0]}`);
    for (const h of p.hints) assert.ok(!nums(h).includes(p.answer), `${id}: hint "${text(h)}" holds the answer ${p.answer}`);
    assert.ok(!nums(p.q).includes(p.answer), `${id}: the story already shows ${p.answer}`);
    assert.ok(p.steps.length >= 1 && nums(p.steps.at(-1)).includes(p.answer), `${id}: the last step does not reach ${p.answer}`);
  };
  for (const t of S.TEMPLATES) for (const p of draws(t)) check(p, t.id);
  for (const w of S.WRITTEN) check({ ...w, hints: [`What is it asking? ${w.ask}`, w.plan] }, w.id);
  for (let i = 0; i < 200; i++) { const p = byId['8-reallife'].gen(1); check(p, p.story.id); }
});

test('styles grow with the Mode: Pro plans name two or more steps, every Explorer story has a picture', () => {
  for (const t of S.TEMPLATES.filter(x => x.mode === 'pro')) for (const p of draws(t, 50)) {
    if (t.id === 'p-ladder') continue; /* one formula, three moves: square, add, root */
    assert.match(p.hints[1], /^(Two|Three) steps/, `${t.id}: ${p.hints[1]}`);
  }
  for (const t of S.TEMPLATES.filter(x => x.mode === 'explorer')) for (const p of draws(t, 50)) assert.ok(p.viz, `${t.id}: no picture`);
  for (const w of S.WRITTEN) assert.match(w.plan, /steps|Share/, w.id);
});

test('settings that travel: money in rupees or dollars as words, metric units, names from the list', () => {
  const NOT = /\$|₹|¢|€|£|\b(cents?|euros?|pounds?|miles?|feet|foot|inch(es)?|ounces?|gallons?|yards?|Fahrenheit)\b/i;
  const words = new Set();
  for (const t of S.TEMPLATES) for (const p of draws(t, 300)) {
    const all = [p.q, ...p.hints, ...p.steps].map(text).join(' ');
    assert.ok(!NOT.test(all), `${t.id}: ${all}`);
    if (p.unit) assert.ok(['rupees', 'dollars', 'm', 'm²', 'cm', 'km', 'g', 'minutes', 'players', 'points', 'seats', 'tiles', 'people', 'children', 'mangoes', 'chairs', 'beads', 'sheets', 'trees', ...['shells', 'stickers', 'marbles', 'cards', 'stamps', 'leaves']].includes(p.unit), `${t.id}: unit ${p.unit}`);
    for (const m of text(p.q).matchAll(/(?:^|[,.?] |\s)([A-Z][a-z]+)(?='s|\s(?:has|buys|scores|saves|cooks|pays|is))/g)) words.add(m[1]);
  }
  for (const w of words) assert.ok(S.NAMES.includes(w) || ['Each', 'There', 'The', 'Class', 'What', 'How', 'It'].includes(w), `a name not on the list: ${w}`);
  for (const w of S.WRITTEN) assert.ok(!NOT.test([w.q, w.ask, w.plan, ...w.steps].join(' ')), w.id);
});

test('the Sutra inside the story: a Trick template\'s plan names the Trick, and its steps work it', () => {
  for (const p of draws(S.TEMPLATES.find(t => t.id === 'c-rows'), 200)) assert.match(p.hints[1], /near-base trick|start the same and the last digits add to 10/);
  for (const p of draws(S.TEMPLATES.find(t => t.id === 'c-square'), 50)) { assert.match(p.hints[1], /fives trick/); assert.match(p.steps.join(' '), /part before the 5/); }
  for (const p of draws(S.TEMPLATES.find(t => t.id === 'p-budget'), 50)) { assert.match(p.hints[1], /near-base trick/); assert.match(p.steps[0], /Base 100/); }
});

/* ---------- A Trick's own numbers (Star rounds and Trick practice) ---------- */
test('a Trick story keeps the bare question\'s numbers and answer, and passes the guard, for every Kata of every Trick with one', () => {
  for (const t of TRICKS) for (const n of [1, 10, 20, 30, 40, 50]) for (const bare of kata(t.id, n).problems) {
    const p = S.trickStory(t.id, bare, 'challenger');
    if (!S.hasTrickStory(t.id) || bare.kind !== 'num') { assert.equal(p, null, t.id); continue; }
    if (!p) continue; /* the guard: the answer would be a number the story shows (100 − 91 = 9 beside "all from 9") */
    assert.equal(p.answer, bare.answer); assert.deepEqual(p.vals, bare.vals);
    assert.ok(S.clean(p), `${t.id}: ${p.q}`);
    assert.ok(p.story.first.say.startsWith('What is it asking? '));
  }
  const kept = TRICKS.filter(t => S.hasTrickStory(t.id)).map(t => t.id).sort();
  assert.deepEqual(kept, ['by11', 'by9s', 'crosswise', 'cuberoot', 'duplex', 'ends10', 'from9', 'near-base', 'sq5', 'sqroot', 'square-near', 'sub-base', 'times5']);
});

/* ---------- When a round asks one ---------- */
test('slots by Mode: Explorer 5, 15, 25; Challenger 3, 8, 13; Pro 2, 5, 8', () => {
  const at = mode => Array.from({ length: 30 }, (_, i) => i + 1).filter(k => S.isSlot(mode, k));
  assert.deepEqual(at('explorer'), [5, 15, 25]);
  assert.deepEqual(at('challenger'), [3, 8, 13, 18, 23, 28]);
  assert.deepEqual(at('pro'), [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]);
  assert.equal(S.starSlot('challenger', 20), 2); assert.equal(S.starSlot('pro', 20), 1);
  assert.equal(S.starSlot('explorer', 99), -1); assert.equal(S.starSlot('pro', 19), -1);
});

const round = (mode, skills, answered = 20, n = 12) => {
  const plan = S.storyPlan(mode, { answered: () => answered, r: rng(3) });
  return skills(n).map(s => { const bare = s.gen(1); return plan.next(s, bare) ? 'W' : '.'; }).join('');
};
const same = id => n => Array(n).fill(byId[id]);

test('the plan: the slot questions are Word problems once the Player has 20 answers, and none before', () => {
  assert.equal(round('challenger', same('3-mult')), '..W....W....');
  assert.equal(round('pro', same('3-mult')), '.W..W..W..W.');
  assert.equal(round('explorer', same('k-add10'), 20, 16), '....W.........W.');
  assert.equal(round('challenger', same('3-mult'), 19), '............');
  assert.equal(round('challenger', same('k-count')), '............', 'a Skill with no story never shows one');
});

test('a due slot waits for the next Skill that has a story', () => {
  const mix = n => Array.from({ length: n }, (_, i) => byId[i < 5 ? 'k-count' : '3-mult']);
  assert.equal(round('challenger', mix), '.....W.W....');
});

test('a Word problem Skill asks only Word problems, and a slot on it is not counted twice', () => {
  for (const id of ['3-twostep', '8-reallife']) for (let i = 0; i < 300; i++) { const p = byId[id].gen(1); assert.ok(p.story, id); assert.ok(p.hints[0].startsWith('What is it asking?'), id); }
  assert.equal(round('challenger', same('3-twostep')), '............', 'its own questions are stories already');
  assert.equal(byId['8-reallife'].grade, 8); assert.equal(byId['8-reallife'].tower, false);
  assert.equal(SKILLS.length, 136);
});

test('Pro Practice on a Skill a hand-written story fits uses one about one time in four', () => {
  const r = rng(11); let w = 0;
  for (let i = 0; i < 2000; i++) if (S.storyFor(byId['6-ratio'], 'pro', { r }).story.id.startsWith('w-')) w++;
  assert.ok(w > 400 && w < 600, `${w} of 2000`);
});

/* ---------- Star rounds ---------- */
const story = p => S.trickStory('sq5', p);
test('a Star round with a story slot: that main question is a Word problem on the same numbers; the others and the Dare stay bare', () => {
  const st = starRound({ trick: 'sq5', star: 1, rating: 5, rand: rng(2), story, storyAt: 2 });
  assert.deepEqual(st.qs.map(p => !!p.story), [false, false, true, false]);
  assert.equal(st.qs[2].answer, st.qs[2].vals[0] ** 2);
  let s = starAnswer(st, true).state; s = starAnswer(s, true).state;
  assert.ok(canDare(s)); const d = starDare(s).state; assert.ok(!d.current.story, 'a Dare stays bare');
  const none = starRound({ trick: 'sq5', star: 1, rating: 5, rand: rng(2) });
  assert.ok(none.qs.every(p => !p.story), 'no story option: no Word problem');
});

test('a missed Word problem in a Star: the rematch is a Word problem, and its replay opens with what it asks', () => {
  let st = starRound({ trick: 'sq5', star: 1, rating: 5, rand: rng(4), story, storyAt: 0 });
  assert.ok(st.qs[0].story.first.say.startsWith('What is it asking? The area of the garden'));
  st = starAnswer(st, false).state; st = starNext(st).state;
  assert.equal(st.mode, 'rematch'); assert.ok(st.current.story, 'the rematch is a story'); assert.notDeepEqual(st.current.vals, st.qs[0].vals);
  let b = starRound({ trick: 'sq5', star: 1, rating: 5, rand: rng(4), story, storyAt: 1 });
  b = starAnswer(b, false).state; b = starNext(b).state;
  assert.ok(!b.current.story, 'a rematch after a bare miss stays bare');
});

/* ---------- Off the first paint (js/story-plan.js) ---------- */
test('the templates are not in the first paint\'s import graph: only js/story-plan.js is, and it imports nothing', async () => {
  const { readFileSync } = await import('node:fs');
  const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
  for (const f of ['app.js', 'star.js', 'skills/middle.js', 'skills/upper.js']) assert.ok(!/from '\.{1,2}\/stories\.js'/.test(src(f)), `${f} imports stories.js statically`);
  /* The plan moved to shared/src/story-plan.ts (react-typescript task 3.1): js/story-plan.js imports only that module, which imports nothing */
  assert.deepEqual([...src('story-plan.js').matchAll(/^(?:import|export)\b[^'"]*from '([^']+)'/gm)].map(m => m[1]).sort(), ['../shared/src/story-plan.ts', '../shared/src/story-plan.ts'], 'js/story-plan.js imports only the shared plan');
  assert.ok(!/^import (?!type )/m.test(readFileSync(new URL('../shared/src/story-plan.ts', import.meta.url), 'utf8')), 'shared/src/story-plan.ts has no static import');
});

test('a Star\'s story slot is filled when its question comes, if the deal could not (the stories were loading)', async () => {
  const { withStory } = await import('../js/star.js');
  let ready = false; const late = p => (ready ? S.trickStory('sq5', p) : null);
  let st = starRound({ trick: 'sq5', star: 1, rating: 5, rand: rng(5), story: late, storyAt: 1 });
  assert.ok(st.qs.every(p => !p.story), 'nothing at the deal');
  st = starAnswer(st, true).state; ready = true;
  st = withStory(st);
  assert.ok(st.current.story && st.qs[1].story, 'question 2 is a Word problem when it comes');
  assert.equal(withStory(st), st, 'once only');
});

test('the bus picture draws exactly the bus\'s seats, with the children in them', () => {
  for (const p of draws(S.TEMPLATES.find(t => t.id === 'e-seats'), 200)) {
    const [a, b] = nums(p.q);
    assert.equal((p.viz.match(/class="vz-cell"/g) || []).length, a, p.q);
    assert.equal((p.viz.match(/vz-dot/g) || []).length, b, p.q);
  }
});

/* ---------- Any round (openspec word-problems-more, design D4): the Arena's Word problems round ---------- */
test('roundStory gives each Mode its own style, a whole-number answer the keypad takes, and hints that keep the answer back', () => {
  const r = rng(29), modeOf = id => (id.startsWith('w-') ? 'pro' : S.TEMPLATES.find(t => t.id === id).mode);
  for (const mode of ['explorer', 'challenger', 'pro']) {
    let written = 0;
    for (let i = 0; i < N; i++) {
      const p = S.roundStory(mode, r);
      assert.equal(modeOf(p.story.id), mode, `${mode}: ${p.story.id}`);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && String(p.answer).length <= 7, `${p.story.id}: ${p.answer}`);
      assert.ok(p.hints[0].startsWith(S.ASK) && S.clean(p), `${p.story.id}: a hint shows the answer`);
      if (mode === 'explorer') assert.ok(p.viz, `${p.story.id}: an Explorer story is drawn`);
      if (p.story.id.startsWith('w-')) written++;
    }
    if (mode === 'pro') assert.ok(written > N * 0.15 && written < N * 0.35, `written stories ${written} of ${N}`);
    else assert.equal(written, 0);
  }
});

/* Only Word problems (openspec word-problems-more, design D2): every Skill a Mode's choice picks gives a story in it */
test('hasStory(skill, mode) names only Skills whose stories that Mode is asked, and each gives one every time', () => {
  const r = rng(31);
  for (const mode of ['explorer', 'challenger', 'pro']) for (const s of SKILLS) {
    if (!S.hasStory(s, mode)) { if (S.hasStory(s)) assert.ok(mode !== 'pro', `${s.id}: Pro has every story`); continue; }
    for (let i = 0; i < 40; i++) { const bare = s.gen(2); if (bare.story) continue; assert.ok(S.storyFor(s, mode, { bare, r }), `${mode} ${s.id}: no story`); }
  }
  assert.equal(S.hasStory(byId['6-eval'], 'challenger'), false, 'a Skill only the hand-written (Pro) stories fit');
  assert.equal(S.hasStory(byId['6-eval'], 'pro'), true);
});
