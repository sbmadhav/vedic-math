/* Gamification: levels from XP, badges, belts and daily quests. Listens to store events and celebrates. */
import * as store from './store.js';
import { SKILLS } from './skills/index.js';
import { TRICKS, BELTS } from './vedic.js';
import { GAMES } from './games.js';
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { seeded } from './levels.js';
import { shuffle } from './lib.js';
import { sfx, confetti, toast, mode } from './fx.js';

/* Level n needs 50 * n * (n - 1) XP: 0, 100, 300, 600, 1000 ... */
export const levelOf = xp => Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
export const xpFor = lv => 50 * lv * (lv - 1);
export function levelInfo(xp = store.xp()) { const lv = levelOf(xp), lo = xpFor(lv), hi = xpFor(lv + 1); return { lv, into: xp - lo, need: hi - lo, pct: (xp - lo) / (hi - lo) }; }
const TITLES = ['Number Rookie', 'Digit Dasher', 'Sum Sprinter', 'Times Tamer', 'Fraction Fighter', 'Sutra Scout', 'Mental Ninja', 'Equation Ace', 'Pattern Sage', 'Calculus Comet', 'Vedic Legend'];
export const titleOf = lv => TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 2))];

export function beltProgress() {
  return BELTS.map(b => ({ ...b, done: b.tricks.filter(t => store.mastered('v-' + t)).length, earned: b.tricks.every(t => store.mastered('v-' + t)) }));
}
export function currentBelt() { const bp = beltProgress(); const last = [...bp].reverse().find(b => b.earned); return last || null; }

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
  { id: 'belt-white', name: 'White belt', how: 'Master the 3 white belt tricks.', test: () => beltProgress()[0].earned },
  { id: 'belt-green', name: 'Green belt', how: 'Reach the green belt in the Dojo.', test: () => beltProgress()[3].earned },
  { id: 'belt-black', name: 'Black belt', how: 'Earn the Vedic black belt.', test: () => beltProgress()[6].earned },
  { id: 'arena1', name: 'Arena debut', how: 'Finish an Arena round.', test: () => store.count('arena') >= 1 },
  { id: 'arena200', name: 'Arena star', how: 'Score 200 or more in one Arena round.', test: () => store.count('arenaBest') >= 200 },
  { id: 'daily3', name: 'Daily habit', how: 'Finish the daily challenge on 3 days.', test: () => store.count('dailyDays') >= 3 },
  { id: 'duel', name: 'Duelist', how: 'Finish a two-player duel.', test: () => store.count('duelsDone') >= 1 },
  { id: 'games', name: 'Game explorer', how: 'Play every game once.', test: () => GAMES.every(g => store.seen('game:' + g.id)) },
  { id: 'days7', name: 'Week warrior', how: 'Practice 7 days in a row.', test: () => store.streakDays() >= 7 },
  { id: 'sutras', name: 'Sutra scholar', how: 'Collect 10 Sutra cards.', test: () => collectedCount() >= 10 },
  { id: 'watch', name: 'Video learner', how: 'Watch a video in the player for a whole minute.', test: () => store.count('watchedMinute') >= 1 },
  { id: 'level5', name: 'Level 5', how: 'Reach level 5.', test: () => levelOf(store.xp()) >= 5 },
  { id: 'level10', name: 'Level 10', how: 'Reach level 10.', test: () => levelOf(store.xp()) >= 10 }
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
    store.addXP(25, 'quest'); toast(`<b>Quest complete</b> ${q.label} <span class="fx-xp">+25 XP</span>`, 'ok'); sfx('badge');
  });
}

let busy = false;
function checkBadges() { if (busy) return; busy = true; BADGES.forEach(b => { if (!store.badges()[b.id] && b.test()) store.award(b.id); }); busy = false; }

export function init() {
  store.on((type, d) => {
    if (type === 'xp') { const a = levelOf(d.before), b = levelOf(d.after); if (b > a) { sfx('level'); confetti(110); toast(`<b>Level ${b}!</b> You are now a ${titleOf(b)}.`, 'win'); } checkBadges(); }
    if (type === 'badge') { const b = BADGES.find(x => x.id === d); if (b) { sfx('badge'); toast(`<span class="fx-badge"></span><b>Badge earned:</b> ${b.name}`, 'win'); } }
    if (type === 'mastered') { confetti(); toast('<b>Skill mastered!</b> A new ring is full.', 'win'); }
    if (type === 'answer' || type === 'count' || type === 'seen') { checkBadges(); if (type !== 'seen') checkQuests(); }
    if (type === 'player') { startDay(); }
  });
  startDay(); atMidnight();
}
/* A new quest day at local midnight while the app stays open, so the day's first action counts */
function atMidnight() {
  const d = new Date(), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 1);
  const t = setTimeout(() => { startDay(); atMidnight(); }, next - d); if (t && t.unref) t.unref();
}
