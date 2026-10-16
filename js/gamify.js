/* Gamification: Titles from Sparks, badges, belts and daily quests. Listens to store events and celebrates. */
import * as store from './store.js';
import { SKILLS } from './skills/index.js';
import { TRICKS, BELTS } from './vedic.js';
import { GAMES } from './games.js';
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { seeded } from './levels.js';
import { shuffle } from './lib.js';
import { sfx, confetti, toast, mode } from './fx.js';
import { migrateSky } from './sky.js';

/* Titles from total Sparks. The thresholds are where the old numbered levels (50 * n * (n - 1) XP, one Title
   per two levels) changed Title, so carried-over totals keep their Title (docs/adr/0003). No number is shown. */
export const TITLES = [[0, 'Number Rookie'], [300, 'Digit Dasher'], [1000, 'Sum Sprinter'], [2100, 'Times Tamer'], [3600, 'Fraction Fighter'], [5500, 'Sutra Scout'], [7800, 'Mental Ninja'], [10500, 'Equation Ace'], [13600, 'Pattern Sage'], [17100, 'Calculus Comet'], [21000, 'Vedic Legend']];
/* { title, next, into, need, pct }: the Title for a total, the next Title (null at the top, bar full),
   and the Sparks into and needed for the step to it */
export function titleInfo(sparks = store.sparks()) {
  const n = Math.max(0, sparks || 0); let i = 0;
  while (i + 1 < TITLES.length && n >= TITLES[i + 1][0]) i++;
  const [lo, title] = TITLES[i], nx = TITLES[i + 1];
  if (!nx) return { title, next: null, into: n - lo, need: 0, pct: 1 };
  return { title, next: nx[1], into: n - lo, need: nx[0] - lo, pct: (n - lo) / (nx[0] - lo) };
}

/* Belts by Stars (openspec sky-home): a Belt is earned by lighting all 9 Stars of its three Tricks, and a Belt once
   earned (by Stars, or under the old mastery rule before the change) is kept in store.keptBelts() and stays earned.
   Each Belt: lit (0 to 9 lit Stars), done (the same, for display), earned. */
export const STARS_PER_BELT = 9;
const litIn = (b, lit) => b.tricks.reduce((n, t) => n + [1, 2, 3].filter(k => lit[`${t}:${k}`]).length, 0);
export function beltProgress() {
  const { lit } = store.starStates(), kept = store.keptBelts();
  return BELTS.map(b => { const n = litIn(b, lit); return { ...b, lit: n, done: n, earned: !!kept[b.id] || n >= STARS_PER_BELT }; });
}
export function currentBelt() { const bp = beltProgress(); const last = [...bp].reverse().find(b => b.earned); return last || null; }
/* Writes every Belt earned by Stars to the kept Belts, so it never goes back */
function keepBelts() { const { lit } = store.starStates(), kept = store.keptBelts(); BELTS.forEach(b => { if (!kept[b.id] && litIn(b, lit) >= STARS_PER_BELT) store.keepBelt(b.id); }); }
/* The one-time move to Belts by Stars for the active Player (js/sky.js migrateSky): at start, after a Player switch
   and after a backup is restored. Stars it lights send no event and earn no Sparks. */
export function migrate() { if (store.upgrade(migrateSky)) { keepBelts(); checkBadges(); } }

/* Badges: id, name, how to earn, test */
const masteredCount = () => SKILLS.filter(s => store.mastered(s.id)).length;
/* A Sutra card is collected by mastering one of its tricks or by reading its card */
export const collectedCard = c => c.tricks.some(t => store.mastered('v-' + t)) || store.seen('sutra:' + c.name);
export const collectedCount = () => [...SUTRAS, ...SUBSUTRAS].filter(collectedCard).length;
export const BADGES = [
  { id: 'first', name: 'First step', how: 'Answer your first question.', test: () => store.count('answers') >= 1 },
  { id: 'right25', name: 'Quarter century', how: 'Get 25 answers right.', test: () => store.count('right') >= 25 },
  { id: 'right100', name: 'Century', how: 'Get 100 answers right.', test: () => store.count('right') >= 100 },
  { id: 'right500', name: 'Number cruncher', how: 'Get 500 answers right.', test: () => store.count('right') >= 500 },
  { id: 'streak5', name: 'On fire', how: 'Get 5 right in a row.', test: () => store.count('bestStreak') >= 5 },
  { id: 'streak15', name: 'Unstoppable', how: 'Get 15 right in a row.', test: () => store.count('bestStreak') >= 15 },
  { id: 'master1', name: 'Skill unlocked', how: 'Master any skill.', test: () => masteredCount() >= 1 },
  { id: 'master10', name: 'Ten skills', how: 'Master 10 skills.', test: () => masteredCount() >= 10 },
  { id: 'master50', name: 'Math marathon', how: 'Master 50 skills.', test: () => masteredCount() >= 50 },
  { id: 'trick1', name: 'Trick seeker', how: 'Watch a speed trick step by step.', test: () => store.count('tricksWatched') >= 1 },
  { id: 'trick10', name: 'Trick collector', how: 'Watch 10 different speed tricks.', test: () => TRICKS.filter(t => store.seen('trick:' + t.id)).length >= 10 },
  { id: 'belt-white', name: 'White belt', how: 'Light all 9 white belt Stars.', test: () => beltProgress()[0].earned },
  { id: 'belt-green', name: 'Green belt', how: 'Earn the green belt: light all 9 of its Stars.', test: () => beltProgress()[3].earned },
  { id: 'belt-black', name: 'Black belt', how: 'Earn the black belt: light all 9 of its Stars.', test: () => beltProgress()[6].earned },
  { id: 'arena1', name: 'Arena debut', how: 'Finish an Arena round.', test: () => store.count('arena') >= 1 },
  { id: 'arena200', name: 'Arena star', how: 'Score 200 or more in one Arena round.', test: () => store.count('arenaBest') >= 200 },
  { id: 'daily3', name: 'Daily habit', how: 'Finish the daily challenge on 3 days.', test: () => store.count('dailyDays') >= 3 },
  { id: 'duel', name: 'Party host', how: 'Finish a Party Mode game with family or friends.', test: () => store.count('duelsDone') >= 1 },
  { id: 'games', name: 'Game explorer', how: 'Play every game once.', test: () => GAMES.every(g => store.seen('game:' + g.id)) },
  { id: 'days7', name: 'Week warrior', how: 'Practice 7 days in a row.', test: () => store.streakDays() >= 7 },
  { id: 'sutras', name: 'Sutra scholar', how: 'Collect 10 Sutra cards.', test: () => collectedCount() >= 10 },
  { id: 'watch', name: 'Video learner', how: 'Watch a video in the player for a whole minute.', test: () => store.count('watchedMinute') >= 1 },
  /* Title badges keep their old ids (level5, level10), so badges earned before Sparks stay earned */
  { id: 'level5', name: 'Sum Sprinter', how: 'Reach the Sum Sprinter Title (1000 Sparks).', test: () => store.sparks() >= 1000 },
  { id: 'level10', name: 'Fraction Fighter', how: 'Reach the Fraction Fighter Title (3600 Sparks).', test: () => store.sparks() >= 3600 }
];

/* Daily quests: three a day from each Mode's pool, picked by a seeded draw on the local date, so every
   Player in a Mode sees the same three that day. Progress counts from a baseline taken on the day's
   first startDay(), for every counter any pool uses, so a Mode change mid-day starts at 0 too.
   A quest's id names what it asks, so the same quest in two Modes is the same quest. */
const ANSWER_COUNTERS = ['answers', 'right'];
const Q = (counter, goal, label) => ({ id: `${counter}-${goal}`, counter, goal, label });
export const QUEST_POOL = {
  explorer: [Q('answers', 8, 'Answer 8 questions'), Q('answers', 12, 'Answer 12 questions'), Q('right', 5, 'Get 5 right'), Q('gamesPlayed', 1, 'Play a game'), Q('gamesPlayed', 2, 'Play 2 games'), Q('tricksWatched', 1, 'Watch a speed trick'), Q('arena', 1, 'Finish an Arena round')],
  challenger: [Q('answers', 15, 'Answer 15 questions'), Q('right', 10, 'Get 10 right'), Q('tricksWatched', 1, 'Watch a speed trick'), Q('arena', 1, 'Finish an Arena round'), Q('gamesPlayed', 1, 'Play a game'), Q('katas', 1, 'Finish a Dojo kata'), Q('runs', 1, 'Finish an Endless run')],
  pro: [Q('answers', 20, 'Answer 20 questions'), Q('right', 15, 'Get 15 right'), Q('arena', 1, 'Finish an Arena round'), Q('tricksWatched', 2, 'Watch 2 speed tricks'), Q('katas', 2, 'Finish 2 Dojo katas'), Q('runs', 1, 'Finish an Endless run'), Q('gamesPlayed', 2, 'Play 2 games')]
};
export const QUEST_COUNTERS = [...new Set(Object.values(QUEST_POOL).flat().map(q => q.counter))];
const QUEST_SEED = 'v1:quests:';
/* Today's three for a Mode: one answer quest first, then two more that count different things */
export function pickQuests(day = store.today(), m = mode()) {
  const pool = QUEST_POOL[m] || QUEST_POOL.challenger;
  return seeded(QUEST_SEED + day + ':' + m, () => {
    const order = shuffle(pool), first = order.find(q => ANSWER_COUNTERS.includes(q.counter)), out = [first];
    for (const q of order) if (out.length < 3 && !out.some(o => o.counter === q.counter || (ANSWER_COUNTERS.includes(o.counter) && ANSWER_COUNTERS.includes(q.counter)))) out.push(q);
    return out;
  });
}
/* Today's quest record, replaced on a new date (startDay) */
function today() {
  const day = store.today(); let qd = store.questDay();
  if (!qd || qd.day !== day) { startDay(); qd = store.questDay(); }
  return qd;
}
export function quests() {
  const qd = today(); let fill = false;
  const out = pickQuests(qd.day).map(q => {
    if (!(q.counter in qd.base)) { qd.base[q.counter] = store.count(q.counter); fill = true; }
    const prog = Math.min(q.goal, Math.max(0, Math.floor(store.count(q.counter) - qd.base[q.counter])));
    return { ...q, prog, done: !!qd.done[q.id] };
  });
  if (fill) store.setQuestDay(qd);
  return out;
}
export function startDay() {
  const day = store.today(), qd = store.questDay();
  if (qd && qd.day === day) return;
  store.setQuestDay({ day, base: Object.fromEntries(QUEST_COUNTERS.map(c => [c, store.count(c)])), done: {} });
}
function checkQuests() {
  quests().forEach(q => {
    if (q.done || q.prog < q.goal) return;
    const qd = store.questDay(); if (qd.done[q.id]) return;
    qd.done[q.id] = Date.now(); store.setQuestDay(qd);
    store.addSparks(25, 'quest'); toast(`<b>Quest complete</b> ${q.label} <span class="fx-sparks">+25 Sparks</span>`, 'ok'); sfx('badge');
  });
}

let busy = false;
function checkBadges() { if (busy) return; busy = true; BADGES.forEach(b => { if (!store.badges()[b.id] && b.test()) store.award(b.id); }); busy = false; }

export function init() {
  store.on((type, d) => {
    if (type === 'sparks') { const a = titleInfo(d.before).title, b = titleInfo(d.after).title; if (a !== b) { sfx('level'); confetti(110); toast(`<b>New Title: ${b}</b>`, 'win'); } checkBadges(); }
    if (type === 'badge') { const b = BADGES.find(x => x.id === d); if (b) { sfx('badge'); toast(`<span class="fx-badge"></span><b>Badge earned:</b> ${b.name}`, 'win'); } }
    if (type === 'mastered') { confetti(); toast('<b>Skill mastered!</b> A new ring is full.', 'win'); }
    if (type === 'answer' || type === 'count' || type === 'seen') { checkBadges(); if (type !== 'seen') checkQuests(); }
    if (type === 'star' || type === 'belt') { if (type === 'star') keepBelts(); checkBadges(); }
    if (type === 'player' || type === 'import') { migrate(); if (type === 'player') startDay(); }
  });
  migrate(); startDay(); atMidnight();
}
/* A new quest day at local midnight while the app stays open, so the day's first action counts */
function atMidnight() {
  const d = new Date(), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 1);
  const t = setTimeout(() => { startDay(); atMidnight(); }, next - d); if (t && t.unref) t.unref();
}
