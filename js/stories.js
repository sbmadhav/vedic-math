/* Word problems (openspec change word-problems): everyday stories whose answer is one number, generated on the device
   from templates (fresh numbers every time, offline, free) plus a few hand-written ones for depth. Pure: no DOM, no
   network. Every generator takes a random source r (Math.random by default; tests pass a seeded one).
   - Styles grow with the Mode (design D5): Explorer one-step picture stories, Challenger one and two steps, Pro
     multi-step real life (budgets, travel times, recipes, sports stats, savings).
   - The Sutra is the shortcut inside the story (D6): numbers a Trick makes fast; the plan hint says which Trick fits.
   - Read, plan, solve (D7): hints[0] starts "What is it asking?", hints[1] is the plan. No hint holds the answer, and
     the answer is never a number the story already shows (clean() below; test/stories.test.mjs draws thousands).
   - Settings that travel (D8): names from many cultures (never a Nickname), rupees or dollars in words, metric units.
   A problem has the shape every round uses (q, kind 'num', answer, unit, hints, steps, viz) plus story: { id, mode }. */
import { TRICKS } from './vedic.js';
import * as V from './viz.js';

/* When a round asks one, and the labels, live in js/story-plan.js (in the first paint's graph); this module loads after
   the first paint and registers itself there. Re-exported so tests and tools read one place. */
import { SLOTS, RULES, LABEL, ASK, isSlot, starSlot, storyPlan, register } from './story-plan.js';
export { SLOTS, RULES, LABEL, ASK, isSlot, starSlot, storyPlan };

export const NAMES = ['Aisha', 'Mateo', 'Priya', 'Kenji', 'Amara', 'Liam', 'Zara', 'Diego', 'Mei', 'Kofi', 'Sofia', 'Arjun', 'Noor', 'Yuki', 'Tomas', 'Ada', 'Ravi', 'Leila', 'Sipho', 'Hana', 'Omar', 'Ines'];
export const MONEY = ['rupees', 'dollars'];

const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pk = (r, arr) => arr[Math.floor(r() * arr.length)];
const fmt = n => Number(n).toLocaleString('en-US');
const X = '&times;', M = '&minus;';
const trick = id => TRICKS.find(t => t.id === id);
const trickSteps = (id, vals) => trick(id).steps(vals).map(s => s.say);
/* The base a number pair is near (10, 100 or 1000), as the near-base Trick decides it */
const baseOf = (a, b) => [10, 100, 1000].find(x => Math.abs(a - x) <= x * 0.3 && Math.abs(b - x) <= x * 0.3);

/* ---------- The guard (D7): the answer is no number the story or a hint shows ---------- */
const numbersIn = s => (String(s).replace(/<[^>]+>/g, ' ').match(/\d[\d,]*(?:\.\d+)?/g) || []).map(t => Number(t.replace(/,/g, '')));
export function clean(p) {
  const a = Number(p.answer);
  return [p.q, ...p.hints].every(t => !numbersIn(t).includes(a));
}
/* A raw draw ({ q, ask, plan, answer, unit, steps, viz }) into a problem */
const make = (id, mode, raw) => ({
  q: raw.q, kind: 'num', answer: raw.answer, ...(raw.unit ? { unit: raw.unit } : {}), ...(raw.viz ? { viz: raw.viz } : {}),
  hints: [`${ASK} ${raw.ask}`, raw.plan], steps: raw.steps, story: { id, mode }
});
/* Draws until the guard passes (a handful of tries at most; the templates already avoid most clashes) */
function draw(t, r, ctx) {
  let p = null;
  for (let i = 0; i < 60; i++) { p = make(t.id, t.mode, t.gen(r, ctx)); if (clean(p)) return p; }
  return p;
}

/* ---------- A Trick's own numbers as a story (Star rounds and Trick practice, D6) ----------
   Each takes the bare problem's vals and returns { q, ask, plain, plan, unit } with the Trick's own answer. */
const ITEMS = ['bag', 'lamp', 'jacket', 'bicycle helmet', 'board game', 'backpack', 'pair of shoes', 'kettle'];
const EVENTS = ['school trip', 'science fair', 'concert', 'football match', 'museum visit', 'zoo trip', 'boat ride'];
export const TRICK_STORY = {
  'near-base': ([a, b], r) => { const c = pk(r, MONEY); return { q: `${pk(r, NAMES)}'s school buys ${fmt(a)} tickets for a ${pk(r, EVENTS)}. Each ticket costs ${fmt(b)} ${c}. How many ${c} is that in all?`, ask: 'The cost of all the tickets together.', plain: `${fmt(a)} ${X} ${fmt(b)}`, plan: `This is ${fmt(a)} ${X} ${fmt(b)}. Both numbers are near ${fmt(baseOf(a, b))}, so the near-base trick works.`, unit: c }; },
  crosswise: ([a, b]) => ({ q: `A market gets ${a} crates of mangoes with ${b} mangoes in each crate. How many mangoes is that?`, ask: 'How many mangoes in all the crates.', plain: `${a} ${X} ${b}`, plan: `This is ${a} ${X} ${b}: multiply vertically and crosswise.`, unit: 'mangoes' }),
  by9s: ([n, m]) => ({ q: `A shop packs beads in bags of ${m}. It fills ${n} bags. How many beads is that?`, ask: 'How many beads in all the bags.', plain: `${n} ${X} ${m}`, plan: `This is ${n} ${X} ${m}. Times a row of nines: one less than ${n}, then all from 9.`, unit: 'beads' }),
  ends10: ([a, b]) => ({ q: `A hall has ${a} rows of chairs with ${b} chairs in each row. How many chairs are there?`, ask: 'How many chairs in the whole hall.', plain: `${a} ${X} ${b}`, plan: `This is ${a} ${X} ${b}. They start the same and the last digits add to 10.`, unit: 'chairs' }),
  by11: ([n]) => ({ q: `A football tournament has ${n} teams, and each team has 11 players. How many players are there?`, ask: 'How many players in all the teams.', plain: `${n} ${X} 11`, plan: `This is ${n} ${X} 11: use the 11 sandwich.`, unit: 'players' }),
  times5: ([n, m]) => ({ q: `A school orders ${n} packs of paper with ${m} sheets in each pack. How many sheets is that?`, ask: 'How many sheets in all the packs.', plain: `${n} ${X} ${m}`, plan: `This is ${n} ${X} ${m}: ${{ 5: 'times 10, then halve', 25: 'times 100, then divide by 4', 50: 'times 100, then halve', 125: 'times 1,000, then divide by 8' }[m]}.`, unit: 'sheets' }),
  'sub-base': ([a, b]) => { const k = Math.round((a + b) / 20) * 10; return { q: `A farm plants ${a} rows of trees with ${b} trees in each row. How many trees is that?`, ask: 'How many trees on the whole farm.', plain: `${a} ${X} ${b}`, plan: `This is ${a} ${X} ${b}. Both are near ${k}, so use ${k} as a working base.`, unit: 'trees' }; },
  sq5: ([n]) => ({ q: `A square garden is ${n} m long on each side. What is its area in square metres?`, ask: 'The area of the garden: the space inside it.', plain: `${n} ${X} ${n}`, plan: `The area of a square is side ${X} side: ${n} ${X} ${n}. It ends in 5, so use the fives trick.`, unit: 'm²' }),
  'square-near': ([n]) => { const b = [10, 100, 1000].find(x => Math.abs(n - x) <= x * 0.3); return { q: `A square floor is ${fmt(n)} tiles long on each side. How many tiles cover the whole floor?`, ask: 'How many tiles cover the floor.', plain: `${fmt(n)} ${X} ${fmt(n)}`, plan: `This is ${fmt(n)} ${X} ${fmt(n)}. It is near ${fmt(b)}, so square it from its distance to ${fmt(b)}.`, unit: 'tiles' }; },
  duplex: ([n]) => ({ q: `A square park is ${n} m long on each side. What is its area in square metres?`, ask: 'The area of the park: the space inside it.', plain: `${n} ${X} ${n}`, plan: `The area of a square is side ${X} side: square ${n} in one line with the duplex.`, unit: 'm²' }),
  from9: ([n], r) => { const base = 10 ** String(n).length, c = pk(r, MONEY), it = pk(r, ITEMS); return { q: `${pk(r, NAMES)} has ${fmt(base)} ${c} and buys a ${it} for ${fmt(n)} ${c}. How many ${c} are left?`, ask: `The money left after buying the ${it}.`, plain: `${fmt(base)} ${M} ${fmt(n)}`, plan: `This is ${fmt(base)} ${M} ${fmt(n)}: all from 9 and the last from 10.`, unit: c }; },
  sqroot: ([n]) => ({ q: `A square courtyard has an area of ${fmt(n)} square metres. How long is each side, in metres?`, ask: 'The length of one side of the square.', plain: `&radic;${fmt(n)}`, plan: `Which number times itself makes ${fmt(n)}? Look at the last digit for the ones, then the first part for the tens.`, unit: 'm' }),
  cuberoot: ([n]) => ({ q: `A cube-shaped box holds ${fmt(n)} cubic centimetres. How long is each edge, in centimetres?`, ask: 'The length of one edge of the cube.', plain: `the cube root of ${fmt(n)}`, plan: `Which number times itself three times makes ${fmt(n)}? The last digit gives the ones, the thousands give the tens.`, unit: 'cm' })
};
export const hasTrickStory = id => !!TRICK_STORY[id];

/* A bare Trick problem (with its vals) as a Word problem with the same numbers and answer, or null when the Trick has no
   story, the answer is not one number, or the guard fails. first: the replay's opening step (D7). */
export function trickStory(trickId, bare, mode = 'challenger', r = Math.random) {
  const f = TRICK_STORY[trickId];
  if (!f || !bare || bare.kind !== 'num' || !Array.isArray(bare.vals)) return null;
  const s = f(bare.vals, r);
  const p = { ...bare, q: s.q, unit: s.unit, hints: [`${ASK} ${s.ask}`, s.plan], steps: [`${s.ask} That is ${s.plain}.`, ...bare.steps], story: { id: 'trick-' + trickId, mode, first: { say: `${ASK} ${s.ask} That is ${s.plain}.`, show: s.plain } } };
  return clean(p) ? p : null;
}

/* ---------- Templates ----------
   { id, mode, skills, gen(r, ctx) }: ctx is { grade } of the Skill on screen. */
const SCENE_JOIN = [['birds', 'sit on a wire', 'fly over'], ['ducks', 'swim in a pond', 'swim over'], ['frogs', 'sit on a log', 'hop over'], ['kites', 'fly in the sky', 'go up'], ['children', 'play in the park', 'run over'], ['boats', 'float on the lake', 'sail in']];
const SCENE_AWAY = [['birds', 'sit on a fence', 'fly away'], ['ducks', 'swim in a pond', 'swim away'], ['balloons', 'float at a party', 'pop'], ['bubbles', 'float in the air', 'pop'], ['ants', 'walk on a leaf', 'walk off']];
const THINGS = ['shells', 'stickers', 'marbles', 'cards', 'beads', 'stamps', 'leaves'];
const GROUPS = [['plates', 'plate', 'strawberries'], ['bags', 'bag', 'oranges'], ['nests', 'nest', 'eggs'], ['vases', 'vase', 'flowers'], ['boxes', 'box', 'pencils']];
const SPORTS = [['football', 11], ['basketball', 5], ['volleyball', 6], ['hockey', 11]];
const FOODS = ['rice', 'flour', 'lentils', 'pasta', 'oats'];
const ends10Pair = r => { const t = ri(r, 2, 9), u = ri(r, 1, 9); return [t * 10 + u, t * 10 + 10 - u]; };
const nearHundred = r => pk(r, [ri(r, 88, 99), ri(r, 101, 112)]);

export const TEMPLATES = [
  /* ---------- Explorer: one-step picture stories ---------- */
  { id: 'e-join', mode: 'explorer', skills: ['k-add10', 'k-bonds', '1-maketen', '1-doubles', '1-add20'], gen(r, { grade }) {
    const top = String(grade) === 'K' ? 10 : 20, [th, sit, come] = pk(r, SCENE_JOIN), a = ri(r, 2, top - 2), b = ri(r, 2, Math.min(9, top - a));
    return { q: `${a} ${th} ${sit}. ${b} more ${come}. How many ${th} now?`, ask: `How many ${th} there are now, all together.`, plan: `Start at ${Math.max(a, b)} and count on ${Math.min(a, b)}.`, answer: a + b, viz: V.tenFrame(a, b, a + b <= 10 ? 1 : null), steps: [`${a} + ${b} = ${a + b}`, `There are ${a + b} ${th} now.`] };
  } },
  { id: 'e-away', mode: 'explorer', skills: ['k-sub10', '1-add20', '1-missing'], gen(r, { grade }) {
    const top = String(grade) === 'K' ? 10 : 20, [th, sit, go] = pk(r, SCENE_AWAY), a = ri(r, 3, top), b = ri(r, 1, a - 1);
    return { q: `${a} ${th} ${sit}. ${b} ${go}. How many ${th} are left?`, ask: `How many ${th} are still there after some ${go.split(' ')[0]}.`, plan: `Start at ${a} and count back ${b}.`, answer: a - b, viz: V.tenFrame(a - b, b, a <= 10 ? 1 : null), steps: [`${a} ${M} ${b} = ${a - b}`, `${a - b} ${th} are left.`] };
  } },
  { id: 'e-more', mode: 'explorer', skills: ['1-missing', '1-add20', 'k-sub10'], gen(r) {
    const A = pk(r, NAMES); let B = pk(r, NAMES); while (B === A) B = pk(r, NAMES);
    const th = pk(r, THINGS), b = ri(r, 2, 8), a = ri(r, b + 1, Math.min(15, b + 9));
    return { q: `${A} has ${a} ${th}. ${B} has ${b} ${th}. How many more ${th} does ${A} have?`, ask: `How many more ${th} ${A} has than ${B}.`, plan: `Think: ${b} and how many more make ${a}?`, answer: a - b, viz: V.rows(a, b, [A[0], B[0]]), steps: [`${b} + ${a - b} = ${a}`, `${A} has ${a - b} more.`] };
  } },
  { id: 'e-tens', mode: 'explorer', skills: ['1-tens', '1-addtens', '2-place'], gen(r) {
    const k = ri(r, 2, 9), m = ri(r, 2, 9), who = pk(r, NAMES);
    return { q: `A box holds 10 crayons. ${who} has ${k} full boxes and ${m} more crayons. How many crayons is that?`, ask: 'How many crayons in all, in the boxes and out of them.', plan: `${k} full boxes make ${k} tens. Then add the ${m} ones.`, answer: 10 * k + m, viz: V.baseTen(10 * k + m), steps: [`${k} tens = ${10 * k}`, `${10 * k} + ${m} = ${10 * k + m}`] };
  } },
  { id: 'e-shop', mode: 'explorer', skills: ['2-add100', '2-money'], gen(r) {
    const c = pk(r, MONEY), a = ri(r, 1, 4) * 10 + ri(r, 1, 9), b = ri(r, 1, 4) * 10 + ri(r, 1, 9), [x, y] = [pk(r, ['pencil', 'ball', 'toy car', 'book']), pk(r, ['eraser', 'kite', 'cup', 'hat'])];
    return { q: `A ${x} costs ${a} ${c}. A ${y} costs ${b} ${c}. How many ${c} for both?`, ask: `How much the ${x} and the ${y} cost together.`, plan: 'Add the tens first, then add the ones.', answer: a + b, unit: c, viz: V.baseTen(a) + V.baseTen(b), steps: [`${a} + ${b} = ${a + b}`, `Both cost ${a + b} ${c}.`] };
  } },
  { id: 'e-groups', mode: 'explorer', skills: ['2-arrays', '2-skip', '3-mult'], gen(r) {
    const [many, one, th] = pk(r, GROUPS), n = ri(r, 2, 5), c = ri(r, 2, 5);
    return { q: `There are ${n} ${many}. Each ${one} has ${c} ${th}. How many ${th} in all?`, ask: `How many ${th} on all the ${many} together.`, plan: `Count by ${c}s, ${n} times.`, answer: n * c, viz: V.array(n, c), steps: [`${n} groups of ${c}`, `${n} &times; ${c} = ${n * c}`] };
  } },
  { id: 'e-seats', mode: 'explorer', skills: ['2-sub100', '2-add1000'], gen(r) {
    const a = ri(r, 30, 60), b = ri(r, 11, a - 6);
    return { q: `A bus has ${a} seats. ${b} children get on and sit down. How many seats are still empty?`, ask: 'How many seats nobody is sitting in.', plan: `Count up from ${b} to ${a}.`, answer: a - b, unit: 'seats', viz: V.tenFrame(b, 0, Math.ceil(a / 10)), steps: [`${a} ${M} ${b} = ${a - b}`, `${a - b} seats are empty.`] };
  } },

  /* ---------- Challenger: one and two steps ---------- */
  { id: 'c-teams', mode: 'challenger', skills: ['3-mult', '3-multtens'], gen(r) {
    const [sport, k] = pk(r, SPORTS), n = ri(r, 3, 12);
    return { q: `Each ${sport} team has ${k} players. ${n} teams come to a tournament. How many players are there?`, ask: 'How many players in all the teams.', plan: `${n} teams of ${k}: multiply.${k === 11 ? ' Times 11 is the 11 sandwich.' : ''}`, answer: n * k, unit: 'players', steps: [`${n} &times; ${k} = ${n * k}`] };
  } },
  { id: 'c-packs', mode: 'challenger', skills: ['3-twostep', '3-mult', '4-mult2'], gen(r) {
    const who = pk(r, NAMES), th = pk(r, THINGS), p = ri(r, 3, 9), q = ri(r, 4, 12), g = ri(r, 2, p * q - 3);
    return { q: `${who} buys ${p} packs of ${th} with ${q} in each pack, then gives ${g} to friends. How many ${th} are left?`, ask: `How many ${th} ${who} still has after giving some away.`, plan: `Two steps: first how many in all (${p} &times; ${q}), then take away the ${g} given.`, answer: p * q - g, unit: th, steps: [`${p} &times; ${q} = ${p * q}`, `${p * q} ${M} ${g} = ${p * q - g}`] };
  } },
  { id: 'c-share', mode: 'challenger', skills: ['3-div', '3-twostep'], gen(r) {
    const k = ri(r, 3, 9), each = ri(r, 3, 12), th = pk(r, THINGS);
    return { q: `${k * each} ${th} are shared equally among ${k} friends. How many ${th} does each friend get?`, ask: `How many ${th} one friend gets.`, plan: `Think: ${k} &times; ? = ${k * each}.`, answer: each, unit: th, steps: [`${k} &times; ${each} = ${k * each}`, `${k * each} &divide; ${k} = ${each}`] };
  } },
  { id: 'c-change', mode: 'challenger', skills: ['3-twostep', '2-add1000', 'v-from9'], gen(r) {
    const c = pk(r, MONEY), who = pk(r, NAMES), a = ri(r, 120, 480), b = ri(r, 110, 990 - a), [x, y] = [pk(r, ['book', 'football', 'lunch box']), pk(r, ['pen set', 'water bottle', 'cap'])], t = a + b;
    return { q: `${who} buys a ${x} for ${a} ${c} and a ${y} for ${b} ${c}, and pays with 1,000 ${c}. How much change does ${who} get?`, ask: 'The change: what comes back from 1,000.', plan: 'Two steps: add the two prices, then take the total from 1,000 (all from 9 and the last from 10).', answer: 1000 - t, unit: c, steps: [`${a} + ${b} = ${t}`, `1,000 ${M} ${t} = ${1000 - t}`] };
  } },
  { id: 'c-time', mode: 'challenger', skills: ['3-twostep', '2-time5'], gen(r) {
    const h = ri(r, 7, 10), m = ri(r, 1, 11) * 5, d = pk(r, [35, 40, 45, 50, 55, 65, 70, 75, 80, 85, 95, 100, 105, 110].filter(x => x > 60 - m)), e = h * 60 + m + d, eh = Math.floor(e / 60), em = e % 60;
    const t = (H, Mi) => `${H}:${String(Mi).padStart(2, '0')}`;
    return { q: `A bus leaves at ${t(h, m)} and arrives at ${t(eh, em)}. How many minutes is the trip?`, ask: 'How long the trip takes, in minutes.', plan: `Count up to ${t(h + 1, 0)} first, then on to ${t(eh, em)}.`, answer: d, unit: 'minutes', steps: [`${t(h, m)} to ${t(h + 1, 0)} is ${60 - m} minutes.`, `${t(h + 1, 0)} to ${t(eh, em)} is ${d - 60 + m} minutes.`, `${60 - m} + ${d - 60 + m} = ${d} minutes.`] };
  } },
  { id: 'c-fence', mode: 'challenger', skills: ['3-area'], gen(r) {
    const l = ri(r, 6, 25), w = ri(r, 3, l - 1), around = r() < .5;
    return around
      ? { q: `A garden is ${l} m long and ${w} m wide. How many metres of fence go all the way around it?`, ask: 'The distance all the way around the garden.', plan: 'Add all four sides: two lengths and two widths.', answer: 2 * (l + w), unit: 'm', steps: [`${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} m`] }
      : { q: `A garden is ${l} m long and ${w} m wide. How many square metres of grass cover it?`, ask: 'The area of the garden: the space inside it.', plan: 'Area is length times width.', answer: l * w, unit: 'm²', steps: [`${l} &times; ${w} = ${l * w} m²`] };
  } },
  { id: 'c-rows', mode: 'challenger', skills: ['4-mult2', '3-dist', 'v-ends10', 'v-near-base'], gen(r) {
    const near = r() < .5, [a, b] = near ? [nearHundred(r), nearHundred(r)] : ends10Pair(r), s = near ? TRICK_STORY['near-base']([a, b], r) : TRICK_STORY.ends10([a, b]);
    return { q: s.q, ask: s.ask, plan: s.plan, answer: a * b, unit: s.unit, steps: [`${s.plain}`, ...trickSteps(near ? 'near-base' : 'ends10', [a, b])] };
  } },
  { id: 'c-square', mode: 'challenger', skills: ['6-exp', '3-area', 'v-sq5'], gen(r) {
    const n = ri(r, 1, 9) * 10 + 5, s = TRICK_STORY.sq5([n]);
    return { q: s.q, ask: s.ask, plan: s.plan, answer: n * n, unit: s.unit, steps: [s.plain, ...trickSteps('sq5', [n])] };
  } },
  { id: 'c-fraction', mode: 'challenger', skills: ['4-fracwhole', '5-fracmult'], gen(r) {
    const b = pk(r, [3, 4, 5, 6, 8, 10]), a = ri(r, 2, b - 1), n = b * ri(r, 4, 12);
    return { q: `${a}/${b} of the ${n} children in a school walk to school. How many children walk?`, ask: 'How many of the children walk to school.', plan: `Find 1/${b} of ${n} first, then take ${a} of those parts.`, answer: (a * n) / b, unit: 'children', steps: [`1/${b} of ${n} is ${n / b}.`, `${a} &times; ${n / b} = ${(a * n) / b}`] };
  } },
  { id: 'c-percent', mode: 'challenger', skills: ['6-percent', '7-pctchange'], gen(r) {
    const p = pk(r, [10, 20, 25, 50]), price = ri(r, 3, 40) * 20, c = pk(r, MONEY), it = pk(r, ITEMS), off = (p * price) / 100;
    const way = { 10: 'a tenth', 20: 'a fifth', 25: 'a quarter', 50: 'half' }[p];
    return { q: `A shop takes ${p}% off a ${it} that costs ${price} ${c}. How many ${c} come off?`, ask: 'How much money comes off the price (not the new price).', plan: `${p}% is ${way}: find ${way} of the price.`, answer: off, unit: c, steps: [`${p}% of ${price} = ${price} &times; ${p}/100 = ${off}`] };
  } },
  { id: 'c-sale', mode: 'challenger', skills: ['7-pctchange', '6-percent'], gen(r) {
    const p = pk(r, [10, 20, 25, 50]), price = ri(r, 3, 40) * 20, c = pk(r, MONEY), it = pk(r, ITEMS), off = (p * price) / 100;
    return { q: `A ${it} costs ${price} ${c}. In a sale it is ${p}% off. What is the sale price?`, ask: 'The new price after the money comes off.', plan: `Two steps: find ${p}% of ${price}, then take it away from ${price}.`, answer: price - off, unit: c, steps: [`${p}% of ${price} = ${off}`, `${price} ${M} ${off} = ${price - off}`] };
  } },
  { id: 'c-speed', mode: 'challenger', skills: ['6-ratio', '7-prop'], gen(r) {
    const v = ri(r, 8, 18) * 5, h = ri(r, 2, 4); let h2 = ri(r, 2, 7); while (h2 === h) h2 = ri(r, 2, 7);
    return { q: `A train goes ${v * h} km in ${h} hours at a steady speed. How far does it go in ${h2} hours?`, ask: `The distance in ${h2} hours.`, plan: `Find the distance in 1 hour first, then multiply by ${h2}.`, answer: v * h2, unit: 'km', steps: [`${v * h} &divide; ${h} = ${v} km in 1 hour`, `${v} &times; ${h2} = ${v * h2} km`] };
  } },
  { id: 'c-recipe', mode: 'challenger', skills: ['7-prop', '6-ratio'], gen(r) {
    const per = ri(r, 2, 6) * 25, p = ri(r, 2, 5), food = pk(r, FOODS); let p2 = ri(r, 3, 12); while (p2 === p) p2 = ri(r, 3, 12);
    return { q: `A recipe uses ${per * p} g of ${food} for ${p} people. How many grams of ${food} for ${p2} people?`, ask: `How much ${food} the cook needs for ${p2} people.`, plan: `How many grams for 1 person? Then multiply by ${p2}.`, answer: per * p2, unit: 'g', steps: [`${per * p} &divide; ${p} = ${per} g for 1 person`, `${per} &times; ${p2} = ${per * p2} g`] };
  } },
  { id: 'c-mean', mode: 'challenger', skills: ['6-stats'], gen(r) {
    const m = ri(r, 20, 60), x = ri(r, 1, 15); let y = ri(r, 1, 15); while (y === x) y = ri(r, 1, 15);
    const s = [m + x, m - y, m + y, m - x], who = pk(r, NAMES), sport = pk(r, ['basketball', 'football', 'table tennis']);
    return { q: `${who} scores ${s[0]}, ${s[1]}, ${s[2]} and ${s[3]} points in four ${sport} games. What is the mean score?`, ask: 'The mean: the score each game would have if all four were the same.', plan: 'Add the four scores, then share the total by 4. Pair scores that make a round number first.', answer: m, unit: 'points', steps: [`${s.join(' + ')} = ${4 * m}`, `${4 * m} &divide; 4 = ${m}`] };
  } },
  { id: 'c-cube', mode: 'challenger', skills: ['8-roots', 'v-cuberoot'], gen(r) {
    const k = ri(r, 11, 49), n = k ** 3, s = TRICK_STORY.cuberoot([n]);
    return { q: s.q, ask: s.ask, plan: s.plan, answer: k, unit: s.unit, steps: trickSteps('cuberoot', [n]) };
  } },

  /* ---------- Pro: multi-step real life ---------- */
  { id: 'p-budget', mode: 'pro', skills: ['8-reallife', 'v-near-base', '4-mult2', 'v-from9'], gen(r) {
    const a = ri(r, 88, 99), b = ri(r, 88, 99), c = pk(r, MONEY), ab = a * b;
    return { q: `A club buys ${a} train tickets at ${b} ${c} each, paid from a budget of 10,000 ${c}. How much of the budget is left?`, ask: 'The money left in the budget after the tickets.', plan: `Two steps: the tickets cost ${a} &times; ${b} (both near 100: the near-base trick), then take that from 10,000 (all from 9 and the last from 10).`, answer: 10000 - ab, unit: c, steps: [...trickSteps('near-base', [a, b]), `10,000 ${M} ${fmt(ab)} = ${fmt(10000 - ab)}`] };
  } },
  { id: 'p-savings', mode: 'pro', skills: ['8-reallife', 'v-by9s', '9-seq'], gen(r) {
    const m = ri(r, 12, 36), who = pk(r, NAMES), c = pk(r, MONEY), saved = 99 * m, s = ri(r, 5, Math.floor(saved / 100) - 2) * 100;
    return { q: `${who} saves 99 ${c} every month for ${m} months, then spends ${fmt(s)} ${c} on a bicycle. How many ${c} are left?`, ask: 'The savings left after buying the bicycle.', plan: `Two steps: the savings are ${m} &times; 99, which is ${m} &times; 100 minus ${m}. Then take away the bicycle.`, answer: saved - s, unit: c, steps: [`${m} &times; 99 = ${m * 100} ${M} ${m} = ${fmt(saved)}`, `${fmt(saved)} ${M} ${fmt(s)} = ${fmt(saved - s)}`] };
  } },
  { id: 'p-recipe', mode: 'pro', skills: ['8-reallife', '7-prop', '6-ratio'], gen(r) {
    const per = ri(r, 2, 6) * 25, p = ri(r, 2, 6), food = pk(r, FOODS), who = pk(r, NAMES); let P = ri(r, 8, 24); while (P === p) P = ri(r, 8, 24);
    const need = per * P, h = ri(r, 1, Math.max(1, Math.floor(need / 50) - 1)) * 50;
    return { q: `A recipe for ${p} people needs ${per * p} g of ${food}. ${who} cooks for ${P} people and already has ${fmt(h)} g. How many more grams of ${food} are needed?`, ask: `How much more ${food} to buy, after what is already in the kitchen.`, plan: `Three steps: grams for 1 person (${per * p} &divide; ${p}), times ${P} people, then take away the ${fmt(h)} g already there.`, answer: need - h, unit: 'g', steps: [`${per * p} &divide; ${p} = ${per} g`, `${per} &times; ${P} = ${fmt(need)} g`, `${fmt(need)} ${M} ${fmt(h)} = ${fmt(need - h)} g`] };
  } },
  { id: 'p-travel', mode: 'pro', skills: ['8-reallife', '6-ratio', '7-prop'], gen(r) {
    const v = pk(r, [40, 50, 60, 80, 90]), h = pk(r, [1.5, 2, 2.5, 3, 3.5, 4]), d = v * h, s = ri(r, 2, 6) * 5;
    return { q: `A bus travels at ${v} km an hour. The trip is ${d} km, with one ${s} minute stop. How many minutes does the whole trip take?`, ask: 'The time for the whole trip, driving and the stop, in minutes.', plan: `Two steps: driving time is ${d} &divide; ${v} hours; change it to minutes. Then add the stop.`, answer: h * 60 + s, unit: 'minutes', steps: [`${d} &divide; ${v} = ${h} hours = ${h * 60} minutes`, `${h * 60} + ${s} = ${h * 60 + s} minutes`] };
  } },
  { id: 'p-sports', mode: 'pro', skills: ['8-reallife', '6-stats'], gen(r) {
    let m, a, b, c, need;
    do { m = ri(r, 15, 30); a = ri(r, m - 8, m + 8); b = ri(r, m - 8, m + 8); c = ri(r, m - 8, m + 8); need = 4 * m - a - b - c; } while (need < 5);
    return { q: `A basketball player scores ${a}, ${b} and ${c} points in three games. How many points are needed in the fourth game for a mean of ${m} over all four?`, ask: 'The score needed in game four.', plan: `Two steps: a mean of ${m} over 4 games means ${m} &times; 4 points in all. Then take away the three games.`, answer: need, unit: 'points', steps: [`${m} &times; 4 = ${4 * m}`, `${a} + ${b} + ${c} = ${a + b + c}`, `${4 * m} ${M} ${a + b + c} = ${need}`] };
  } },
  { id: 'p-sale', mode: 'pro', skills: ['8-reallife', '7-pctchange', '6-percent'], gen(r) {
    const c = pk(r, MONEY), rs = c === 'rupees', p = rs ? ri(r, 8, 40) * 100 : ri(r, 2, 10) * 20, d = pk(r, [10, 20, 25, 50]), who = pk(r, NAMES), sale = p - (p * d) / 100, note = (rs ? [1000, 2000, 5000] : [50, 100, 200]).find(n => n > sale);
    return { q: `A jacket costs ${fmt(p)} ${c}. It is ${d}% off, and ${who} pays with ${fmt(note)} ${c}. How much change comes back?`, ask: `The change from ${fmt(note)} after paying the sale price.`, plan: `Three steps: ${d}% of ${fmt(p)}, then the sale price, then the change from ${fmt(note)}.`, answer: note - sale, unit: c, steps: [`${d}% of ${fmt(p)} = ${fmt((p * d) / 100)}`, `${fmt(p)} ${M} ${fmt((p * d) / 100)} = ${fmt(sale)}`, `${fmt(note)} ${M} ${fmt(sale)} = ${fmt(note - sale)}`] };
  } },
  { id: 'p-tiles', mode: 'pro', skills: ['8-reallife', 'v-square-near', 'v-duplex'], gen(r) {
    const n = pk(r, [ri(r, 91, 98), ri(r, 102, 109)]), k = ri(r, 10, Math.floor((n * n) / 100) - 5) * 100;
    return { q: `A square hall is ${n} tiles long on each side. ${fmt(k)} tiles are already laid. How many more tiles are needed?`, ask: 'How many tiles are still missing.', plan: `Two steps: all the tiles are ${n} &times; ${n} (${n} is near 100: square it from its distance), then take away the tiles laid.`, answer: n * n - k, unit: 'tiles', steps: [...trickSteps('square-near', [n]), `${fmt(n * n)} ${M} ${fmt(k)} = ${fmt(n * n - k)}`] };
  } },
  { id: 'p-growth', mode: 'pro', skills: ['8-reallife', '9-exp'], gen(r) {
    const p = ri(r, 10, 90) * 100, y1 = p * 1.1;
    return { q: `A town has ${fmt(p)} people and grows by 10% each year. How many people live there after 2 years?`, ask: 'The number of people after two years of growth.', plan: 'Two steps: add 10% for the first year, then add 10% of the new number for the second year.', answer: Math.round(p * 1.21), unit: 'people', steps: [`${fmt(p)} + ${fmt(p / 10)} = ${fmt(Math.round(y1))}`, `${fmt(Math.round(y1))} + ${fmt(Math.round(y1 / 10))} = ${fmt(Math.round(p * 1.21))}`] };
  } },
  { id: 'p-ladder', mode: 'pro', skills: ['8-pyth', '8-reallife'], gen(r) {
    const [a, b, c] = pk(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]]), up = r() < .5;
    return { q: `A ladder leans on a wall. Its top is ${up ? b : a} m up the wall and its base is ${up ? a : b} m from the wall. How long is the ladder?`, ask: 'The length of the ladder: the longest side of the triangle.', plan: 'Square the two sides you know, add them, then take the square root.', answer: c, unit: 'm', steps: [`${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}`, `&radic;${c * c} = ${c} m`] };
  } },
  { id: 'p-stadium', mode: 'pro', skills: ['8-reallife', 'v-ends10', 'v-crosswise', '4-mult2'], gen(r) {
    const [a, b] = ends10Pair(r), k = ri(r, 2, Math.floor((a * b) / 100) - 1) * 100;
    return { q: `A stadium has ${a} rows of ${b} seats. ${fmt(k)} tickets are sold, one seat each. How many seats are still free?`, ask: 'How many seats nobody has a ticket for.', plan: `Two steps: all the seats are ${a} &times; ${b} (same start, last digits add to 10), then take away the tickets sold.`, answer: a * b - k, unit: 'seats', steps: [...trickSteps('ends10', [a, b]), `${fmt(a * b)} ${M} ${fmt(k)} = ${fmt(a * b - k)}`] };
  } },
  { id: 'p-fence', mode: 'pro', skills: ['8-roots', 'v-sqroot', '8-reallife'], gen(r) {
    let k; do { k = ri(r, 11, 49); } while (k % 10 === 0); const n = k * k;
    return { q: `A square courtyard has an area of ${fmt(n)} square metres. A fence goes all the way around it. How many metres of fence is that?`, ask: 'The length of fence around all four sides.', plan: `Two steps: one side is the square root of ${fmt(n)} (look at the last digit, then the first part), then four sides.`, answer: 4 * k, unit: 'm', steps: [...trickSteps('sqroot', [n]), `4 &times; ${k} = ${4 * k} m`] };
  } }
];

/* ---------- Hand-written stories (D9): fixed numbers, their own words ---------- */
export const WRITTEN = [
  { id: 'w-trip', skills: ['8-reallife', '6-ratio'], q: 'Class 9 is going on a trip to the hills. The bus costs 9,600 rupees, shared equally by 48 students, and each student also pays 85 rupees for lunch. How many rupees does each student pay in all?', ask: 'What one student pays for the bus and the lunch together.', plan: 'Two steps: share the bus cost by the 48 students, then add the lunch.', answer: 285, unit: 'rupees', steps: ['9,600 &divide; 48 = 200', '200 + 85 = 285 rupees'] },
  { id: 'w-bake', skills: ['8-reallife', 'v-times5', '6-ratio'], q: 'For a school fair, Amara bakes 16 trays of cookies with 25 cookies on each tray. She sells them in bags of 8. How many bags can she fill?', ask: 'How many full bags of cookies there are.', plan: 'Two steps: all the cookies (16 &times; 25 is 16 &times; 100 divided by 4), then share them into bags of 8.', answer: 50, unit: 'bags', steps: ['16 &times; 25 = 400 cookies', '400 &divide; 8 = 50 bags'] },
  { id: 'w-phone', skills: ['8-reallife', '7-twostep', '6-eval'], q: 'A phone plan costs 15 dollars a month, plus 2 dollars for each extra gigabyte. In one year Kenji uses 18 extra gigabytes. How many dollars does the plan cost for the whole year?', ask: 'The cost of the plan for 12 months, extras included.', plan: 'Two steps: 12 months of the monthly price, then add the extra gigabytes.', answer: 216, unit: 'dollars', steps: ['12 &times; 15 = 180', '18 &times; 2 = 36', '180 + 36 = 216 dollars'] },
  { id: 'w-tank', skills: ['8-reallife', 'v-times5', '6-ratio'], q: 'A water tank holds 2,000 litres. A family uses 125 litres each day, and the tank is full on Monday morning. After how many full days is it empty?', ask: 'How many days the water lasts.', plan: 'Two steps: 125 is 1,000 divided by 8, so find how long 1,000 litres last, then double it for 2,000.', answer: 16, unit: 'days', steps: ['125 &times; 8 = 1,000', 'So 125 &times; 16 = 2,000: 16 days'] },
  { id: 'w-tour', skills: ['8-reallife', '7-twostep'], q: 'A cycling tour is 360 km over 4 days. The riders go 95 km on day 1 and 85 km on day 2, and split the rest equally over days 3 and 4. How many kilometres do they ride on day 3?', ask: 'The distance for day 3 alone.', plan: 'Two steps: take the first two days from the whole tour, then share what is left between two days.', answer: 90, unit: 'km', steps: ['95 + 85 = 180', '360 &minus; 180 = 180', '180 &divide; 2 = 90 km'] },
  { id: 'w-path', skills: ['8-reallife', 'v-sq5', '6-areatri'], q: 'A square garden is 45 m on each side. A path 5 m wide runs all the way around the inside edge. What is the area of the path, in square metres?', ask: 'The area of the path only, not the whole garden.', plan: 'Two steps: the whole garden is 45 squared (it ends in 5: the fives trick); the lawn inside the path is 45 minus two path widths on each side, squared. Take one from the other.', answer: 800, unit: 'm²', steps: ['45² = 2,025', 'The lawn is 45 &minus; 10 = 35 m on a side: 35² = 1,225', '2,025 &minus; 1,225 = 800 m²'] },
  { id: 'w-exchange', skills: ['8-reallife', '6-ratio'], q: 'Sofia changes 400 dollars into rupees at 84 rupees a dollar, then spends 9,800 rupees on a train trip. How many rupees are left?', ask: 'The rupees left after the trip.', plan: 'Two steps: 400 dollars in rupees, then take away the trip.', answer: 23800, unit: 'rupees', steps: ['400 &times; 84 = 33,600 rupees', '33,600 &minus; 9,800 = 23,800 rupees'] },
  { id: 'w-relay', skills: ['8-reallife', '6-stats'], q: 'Four friends run a relay. Diego runs his part in 58 seconds, Mei in 62, Kofi in 55 and Ines in 65. What is their mean time, in seconds?', ask: 'The mean time: the time each runner would have if all four were the same.', plan: 'Two steps: add the four times (pair 58 with 62 and 55 with 65), then share the total by 4.', answer: 60, unit: 'seconds', steps: ['58 + 62 = 120 and 55 + 65 = 120', '240 &divide; 4 = 60 seconds'] }
];
const written = w => make(w.id, 'pro', w);

/* ---------- Which story fits a Skill (D4, D5) ---------- */
const ORDER = { explorer: ['explorer', 'challenger', 'pro'], challenger: ['challenger', 'explorer', 'pro'], pro: ['pro', 'challenger', 'explorer'] };
const fits = id => TEMPLATES.filter(t => t.skills.includes(id));
/* Does this Skill have any Word problem? (a Trick Skill has one when its Trick has a story) */
export function hasStory(skill) {
  if (!skill) return false;
  if (skill.trick && hasTrickStory(skill.trick)) return true;
  return fits(skill.id).length > 0 || WRITTEN.some(w => w.skills.includes(skill.id));
}
/* A Word problem for the Skill on screen in this Mode, or null. bare: the question the round would ask, whose numbers a
   Trick Skill's story keeps. */
export function storyFor(skill, mode = 'challenger', { bare = null, r = Math.random } = {}) {
  if (!skill) return null;
  const order = ORDER[mode] || ORDER.challenger, list = fits(skill.id), ctx = { grade: skill.grade };
  if (mode === 'pro') { const w = WRITTEN.filter(x => x.skills.includes(skill.id)); if (w.length && (r() < RULES.written || (!list.length && !(skill.trick && hasTrickStory(skill.trick) && bare)))) return written(pk(r, w)); }
  if (skill.trick && hasTrickStory(skill.trick) && bare && !(mode === 'pro' && list.some(t => t.mode === 'pro') && r() < .5)) {
    const p = trickStory(skill.trick, bare, mode, r); if (p) return p;
  }
  for (const m of order) { const of = list.filter(t => t.mode === m); if (of.length) return draw(pk(r, of), r, ctx); }
  return null;
}
/* The generator of a Word problem Skill (D10): every question a story of that Mode's style, written ones mixed in */
export function skillStory(id, mode, r = Math.random) {
  const w = mode === 'pro' ? WRITTEN.filter(x => x.skills.includes(id)) : [];
  if (w.length && r() < 0.3) return written(pk(r, w));
  const of = TEMPLATES.filter(t => t.mode === mode && t.skills.includes(id));
  return draw(pk(r, of), r, { grade: null });
}

register({ hasStory, storyFor, skillStory, trickStory });
