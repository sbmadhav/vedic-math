/* Progress lives in this browser (localStorage), one record per player so a family can share a device.
   Mastery is a running score from 0 to 1: first tries count fully, a try after a hint counts half.
   Nothing here leaves the device except what cloud.js posts to World boards (nickname, color, score). */
const LEGACY = 'mathquest.v1', PKEY = 'vm.players', BOARD = 'vm.board';
let S = null, P = null;
const blank = () => ({ v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null });
const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const listeners = new Set();
export const on = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = (type, data) => listeners.forEach(fn => { try { fn(type, data); } catch (e) {} });

/* ---------- Players ---------- */
const ADJ = ['Swift', 'Clever', 'Mighty', 'Cosmic', 'Brave', 'Lucky', 'Sunny', 'Zippy', 'Witty', 'Bold', 'Jolly', 'Turbo', 'Nimble', 'Sparky', 'Quiet', 'Rapid'];
const NOUN = ['Tiger', 'Falcon', 'Otter', 'Panda', 'Comet', 'Rocket', 'Koala', 'Dolphin', 'Phoenix', 'Lynx', 'Gecko', 'Orca', 'Yak', 'Robin', 'Badger', 'Narwhal'];
export const AVATARS = ['coral', 'teal', 'sun', 'sky', 'plum'];
/* Nicknames are generated from fixed word lists, never typed, so no personal information is ever collected. */
export const makeName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]} ${String(Math.floor(Math.random() * 90) + 10)}`;
export const NAME_RE = /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/;

function players() {
  if (P) return P;
  P = get(PKEY);
  if (!P || !Array.isArray(P.list) || !P.list.length) {
    P = { active: 'p1', list: [{ id: 'p1', name: makeName(), avatar: 'teal', mode: null, created: Date.now() }] };
    const legacy = get(LEGACY); if (legacy && legacy.skills) put(LEGACY + '.p1', legacy);
    put(PKEY, P);
  }
  return P;
}
export const allPlayers = () => players().list;
export const player = () => players().list.find(p => p.id === P.active) || P.list[0];
export function updatePlayer(patch) { Object.assign(player(), patch); put(PKEY, P); emit('player', player()); }
/* A Mode guess: written only by the Try a trick before try-trick-in-modes (Challenger as a guess), never now. A record
   that still has one keeps it until setPlayerMode, which every pick (and null, to forget the Mode) goes through, clears it. */
export const modeGuessed = () => !!player().modeGuess;
export function setPlayerMode(mode) { delete player().modeGuess; updatePlayer({ mode }); }
/* Player ids are unique on the device: each one names that Player's World board identity (cloud.appNameFor) */
const newId = () => { let t = Date.now(), id; do id = 'p' + (t++).toString(36); while (players().list.some(p => p.id === id)); return id; };
export function addPlayer() { const p = { id: newId(), name: makeName(), avatar: AVATARS[P.list.length % AVATARS.length], mode: null, created: Date.now() }; players().list.push(p); switchPlayer(p.id); return p; }
export function switchPlayer(id) { players(); if (!P.list.some(p => p.id === id)) return; P.active = id; put(PKEY, P); S = null; emit('player', player()); }
/* Posting consent, per Player and only on this device (never sent; see cloud.canPost):
   age is the Age answer, a whole number of years or 'adult' (null until answered). Under 13 means Device boards only
   (ADR 0006). The retired Parent step's parentOk is never written; a record that still has one is ignored. */
export function setAge(age) {
  if (!(age === 'adult' || (Number.isInteger(age) && age >= 1 && age <= 120))) throw new Error('bad age');
  updatePlayer({ age });
}
/* Removing a Player drops their record and progress; cloud.js hears 'removed' and forgets their World board
   identity on this device (their entries already posted stay). */
/* A removed Player's play-experience progress (vm.play.<player id>.<key>, js/play/kit.js) goes with them */
function forgetPlay(id) {
  try { const pre = `vm.play.${id}.`, keys = []; for (let i = 0; i < (localStorage.length || 0); i++) { const k = localStorage.key(i); if (k && k.startsWith(pre)) keys.push(k); } keys.forEach(k => localStorage.removeItem(k)); } catch (e) {}
}
export function removePlayer(id) { players(); if (P.list.length < 2) return; const gone = P.list.find(p => p.id === id); if (!gone) return; P.list = P.list.filter(p => p.id !== id); try { localStorage.removeItem(LEGACY + '.' + id); } catch (e) {} forgetPlay(id); if (P.active === id) P.active = P.list[0].id; put(PKEY, P); S = null; emit('removed', gone); emit('player', player()); }

/* ---------- Progress for the active player ---------- */
const key = () => LEGACY + '.' + player().id;
/* Saved progress from before Sparks (schema v2: xp, weekXp, stars) becomes v3 (docs/adr/0003): XP carries over
   1:1 as Sparks, game Level and tower stars become Medals (1 bronze, 2 silver, 3 gold), and a Kata with any star
   is done. Runs on the saved record before blank() fills the gaps, so it can tell old from new; running it
   again changes nothing. stars is left as it was and never read again (a rollback keeps every result). */
export function migrate(d) {
  if (!d || typeof d !== 'object') return d;
  if (!('sparks' in d) && 'xp' in d) d.sparks = Number(d.xp) || 0;
  if (!('weekSparks' in d) && 'weekXp' in d) d.weekSparks = { ...(d.weekXp || {}) };
  if (!('medals' in d) && d.stars && typeof d.stars === 'object') {
    const e = Object.entries(d.stars);
    d.medals = Object.fromEntries(e.filter(([k, v]) => /^[ag]:/.test(k) && v > 0).map(([k, v]) => [k, Math.min(3, v)]));
    d.katasDone = { ...Object.fromEntries(e.filter(([k, v]) => k.startsWith('k:') && v > 0).map(([k]) => [k, 1])), ...(d.katasDone || {}) };
  }
  if (!(d.v >= 3)) d.v = 3;
  return d;
}
/* Every Player's saved record on this device, migrated once per page load (each is also migrated when read) */
let migratedAll = false;
function migrateDevice() {
  if (migratedAll) return; migratedAll = true;
  for (const p of players().list) { const k = LEGACY + '.' + p.id, d = get(k); if (d && !(d.v >= 3)) put(k, mirror(migrate(d))); }
}
/* TODO(remove after 2026-11-15): xp and weekXp mirror Sparks for one release, so a rollback to the XP
   version keeps every total. Nothing reads them. */
const mirror = d => { d.xp = d.sparks || 0; d.weekXp = d.weekSparks || {}; return d; };
export function load() { if (S) return S; migrateDevice(); S = { ...blank(), ...(migrate(get(key())) || {}) }; return S; }
export function save() { put(key(), mirror(S)); }
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function skill(id) { load(); return S.skills[id] || { n: 0, c: 0, m: 0, streak: 0, last: 0 }; }
export const mastery = id => skill(id).m;
export const mastered = id => { const s = skill(id); return s.m >= 0.85 && s.n >= 8; };
export const started = id => skill(id).n > 0;
export function level(id) { const s = skill(id); return s.m < 0.4 || s.n < 3 ? 1 : s.m < 0.75 ? 2 : 3; }

/* Sparks: the one progress number, earned by everything (Practice included). Only this ISO week's total is kept. */
export function addSparks(n, why = '') { load(); const before = S.sparks; S.sparks += n; S.weekSparks = S.weekSparks || {}; const wk = isoWeek(); S.weekSparks = { [wk]: (S.weekSparks[wk] || 0) + n }; save(); emit('sparks', { before, after: S.sparks, n, why }); }
/* ISO week id like 2026-W42, in local time (matches cloud.weekId) */
export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
export const weekSparks = () => (load(), (S.weekSparks || {})[isoWeek()] || 0);
/* This week's Sparks of any Player on this device (the weekly Sparks post reads the Player who earned them, not the active one) */
export function weekSparksOf(id) { if (id === player().id) return weekSparks(); return ((migrate(get(LEGACY + '.' + id)) || {}).weekSparks || {})[isoWeek()] || 0; }
export const playerById = id => players().list.find(p => p.id === id) || null;
/* Adaptive game ratings (difficulty 1 to 20), one per game */
export const rating = k => (load(), (S.ratings || {})[k] || 0);
export function setRating(k, v) { load(); S.ratings = S.ratings || {}; S.ratings[k] = v; save(); emit('rating', { k, v }); }
export function bump(counter, n = 1) { load(); S.counts[counter] = (S.counts[counter] || 0) + n; save(); emit('count', { counter, value: S.counts[counter] }); return S.counts[counter]; }
export const count = c => (load(), S.counts[c] || 0);
export function markSeen(k) { load(); if (S.seen[k]) return false; S.seen[k] = Date.now(); save(); emit('seen', k); return true; }
export const seen = k => (load(), !!S.seen[k]);
/* Today's quest record: { day, base: { counter: value at the day's start }, done: { questId: time } }, replaced each day */
export const questDay = () => (load(), S.questDay || null);
export function setQuestDay(q) { load(); S.questDay = q; save(); }
export function award(badge) { load(); if (S.badges[badge]) return false; S.badges[badge] = Date.now(); save(); emit('badge', badge); return true; }
export const badges = () => (load(), S.badges);
/* Medals for game Levels (g:<game>:<n>) and tower challenges (a:<id>): 0 none, 1 bronze, 2 silver, 3 gold; the best is kept */
export const medal = k => (load(), (S.medals || {})[k] || 0);
export function setMedal(k, n) { load(); S.medals = S.medals || {}; const was = S.medals[k] || 0; if (n > was) { S.medals[k] = n; save(); emit('medal', { k, n, was }); } return n > was; }
/* How many bronze, silver and gold Medals under a key prefix, and how many results have any Medal */
export const medalsWhere = prefix => { load(); const c = { bronze: 0, silver: 0, gold: 0, any: 0 }; for (const [k, v] of Object.entries(S.medals || {})) if (k.startsWith(prefix) && v > 0) { c[['bronze', 'silver', 'gold'][Math.min(3, v) - 1]]++; c.any++; } return c; };
/* Katas (k:<trick>:<n>) have no rating: done or not done, and done stays done */
export const kataDone = k => (load(), !!(S.katasDone || {})[k]);
export function setKataDone(k) { load(); S.katasDone = S.katasDone || {}; if (S.katasDone[k]) return false; S.katasDone[k] = 1; save(); emit('kata', { k }); return true; }
export const katasDoneWhere = prefix => { load(); return Object.keys(S.katasDone || {}).filter(k => k.startsWith(prefix)).length; };

/* Stars (<trick>:<n>, n 1 to 3): lit or skipped (each with when), and the keys the last round dealt. On the device only.
   S.sky is made on first use (not in blank()), so loading and saving an older record changes nothing. */
const sky = () => { load(); S.sky = { lit: {}, skipped: {}, last: {}, ...(S.sky || {}) }; return S.sky; };
const starKey = (trick, n) => `${trick}:${n}`;
export const starState = (trick, n) => { const k = starKey(trick, n), s = sky(); return s.lit[k] ? 'lit' : s.skipped[k] ? 'skipped' : 'open'; };
/* Lights a Star and clears its skipped mark; true when it was not lit before */
export function lightStar(trick, n) { const k = starKey(trick, n), s = sky(), was = !!s.lit[k]; if (!was) s.lit[k] = Date.now(); delete s.skipped[k]; save(); if (!was) emit('star', { k, state: 'lit' }); return !was; }
/* Marks a Star skipped, unless it is lit (a lit Star stays lit); true when it is now marked */
export function skipStar(trick, n) { const k = starKey(trick, n), s = sky(); if (s.lit[k]) return false; s.skipped[k] = s.skipped[k] || Date.now(); save(); emit('star', { k, state: 'skipped' }); return true; }
/* Every Star's state at once, for the Sky: { lit, skipped } (copies) */
export const starStates = () => { const s = sky(); return { lit: { ...s.lit }, skipped: { ...s.skipped } }; };
export const starLast = (trick, n) => (sky().last[starKey(trick, n)] || []).slice();
export function setStarLast(trick, n, keys) { sky().last[starKey(trick, n)] = keys.slice(); save(); }

/* Kept Belts (openspec sky-home): { <belt id>: when }. A Belt is earned by lighting all 9 of its Stars, and once earned
   (or earned under the old mastery rule before the change) it is kept here and never goes back. */
export const keptBelts = () => (load(), { ...(S.belts || {}) });
export function keepBelt(id) { load(); S.belts = { ...(S.belts || {}) }; if (S.belts[id]) return false; S.belts[id] = Date.now(); save(); emit('belt', id); return true; }
/* Runs a one-time upgrade fn(S) on the active Player's record and saves when it returns true (js/sky.js migrateSky) */
export function upgrade(fn) { load(); if (!fn(S)) return false; save(); return true; }

/* One answer to a Skill's question: counts, mastery, streak and quests. sparks: false when the caller pays its own
   Sparks (a Star round), so the answer earns no Practice Sparks on top. */
export function record(id, correct, hintsUsed, { sparks = true } = {}) {
  load();
  const s = S.skills[id] = { ...skill(id) }, was = mastered(id);
  const score = correct ? (hintsUsed ? 0.5 : 1) : 0, rate = s.n < 5 ? 0.35 : 0.22;
  s.n++; s.c += correct ? 1 : 0; s.m = Math.round((s.m + rate * (score - s.m)) * 1000) / 1000; s.streak = correct ? s.streak + 1 : 0; s.last = Date.now();
  S.days[today()] = (S.days[today()] || 0) + 1; S.last = id; S.counts.answers = (S.counts.answers || 0) + 1; if (correct) S.counts.right = (S.counts.right || 0) + 1;
  S.counts.bestStreak = Math.max(S.counts.bestStreak || 0, s.streak);
  save();
  const gain = correct ? (hintsUsed ? 5 : 10 + Math.min(s.streak, 5)) : 0;
  if (gain && sparks) addSparks(gain, 'answer');
  const justMastered = !was && mastered(id);
  emit('answer', { id, correct, streak: s.streak, justMastered });
  if (justMastered) emit('mastered', id);
  return { justMastered, streak: s.streak, gain: sparks ? gain : 0 };
}

export function streakDays() {
  load(); let n = 0; const d = new Date();
  const k = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!S.days[k(d)]) d.setDate(d.getDate() - 1);
  for (;;) { if (!S.days[k(d)]) return n; n++; d.setDate(d.getDate() - 1); }
}
/* Has this Player played on a day before today? (the home greeting says Welcome back only then) */
export const playedBefore = () => { load(); const t = today(); return Object.keys(S.days || {}).some(d => d < t && S.days[d] > 0); };
export function touchDay() { load(); S.days[today()] = (S.days[today()] || 0) + 1; save(); }
export function setBest(game, score) { load(); const isBest = score > (S.best[game] || 0); if (isBest) { S.best[game] = score; save(); } return isBest; }
export const best = game => (load(), +S.best[game] || 0);
export const sparks = () => (load(), +S.sparks || 0);
export const lastSkill = () => (load(), S.last);
export const setGrade = g => { load(); S.grade = String(g); save(); };
export const savedGrade = () => (load(), S.grade);
export function reset() { S = blank(); save(); emit('player', player()); }
export function exportData() { load(); return JSON.stringify({ player: player(), data: S }); }
export function importData(txt) { const d = JSON.parse(txt); const data = d.data || d; if (!isObj(data) || !isObj(data.skills)) throw new Error('bad'); S = { ...blank(), ...migrate(clean(data)) }; save(); emit('import'); }

/* A backup code is outside data that pages later put into HTML. clean keeps only the record's known fields, each in
   its own shape: counts and times are finite numbers 0 or more, and keys and ids hold no markup characters.
   Anything else is dropped. A field added to the record must be added here too, or a restore loses it. */
const KEY = /^[^<>"'&`]{1,120}$/;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const numMap = m => (isObj(m) ? Object.fromEntries(Object.entries(m).filter(([k, v]) => KEY.test(k) && num(v))) : {});
const mapOf = (m, fn) => (isObj(m) ? Object.fromEntries(Object.entries(m).filter(([k]) => KEY.test(k)).map(([k, v]) => [k, fn(v)])) : {});
const keyOrNull = v => (typeof v === 'string' && KEY.test(v) ? v : null);
export function clean(d) {
  const out = { skills: mapOf(d.skills, numMap) };
  for (const f of ['v', 'sparks', 'xp', 'skyMigrated']) if (num(d[f])) out[f] = d[f];
  for (const f of ['days', 'best', 'badges', 'counts', 'seen', 'medals', 'katasDone', 'ratings', 'weekSparks', 'belts', 'weekXp', 'stars']) if (f in d) out[f] = numMap(d[f]);
  out.last = keyOrNull(d.last); out.grade = keyOrNull(d.grade);
  if (isObj(d.questDay) && keyOrNull(d.questDay.day)) out.questDay = { day: d.questDay.day, base: numMap(d.questDay.base), done: numMap(d.questDay.done) };
  if (isObj(d.sky)) out.sky = { lit: numMap(d.sky.lit), skipped: numMap(d.sky.skipped), last: mapOf(d.sky.last, a => (Array.isArray(a) ? a.filter(keyOrNull) : [])) };
  return out;
}

/* ---------- Device leaderboard: every player on this device ---------- */
export function boardAdd(board, score) {
  const all = get(BOARD) || [], p = player();
  const i = all.findIndex(e => e.board === board && e.pid === p.id);
  if (i >= 0) { if (score <= all[i].score) return false; all[i] = { ...all[i], score, name: p.name, avatar: p.avatar, ts: Date.now() }; }
  else all.push({ board, pid: p.id, name: p.name, avatar: p.avatar, score, ts: Date.now() });
  put(BOARD, all.filter(e => Date.now() - e.ts < 90 * 864e5).slice(-500)); return true;
}
export const boardTop = (board, n = 10) => (get(BOARD) || []).filter(e => e.board === board).sort((a, b) => b.score - a.score).slice(0, n);
