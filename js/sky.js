/* The Sky (openspec sky-home): the home map of Star Quest. Pure data and rules, no DOM and no storage, so every rule
   is a node test. js/sky-view.js draws it.
   - CONSTELLATIONS: one per Sutra name the Tricks use (17), in Belt order of their first Trick; each holds its
     Tricks (in Belt order) and their three Stars.
   - SKY_LAYOUT: where each Constellation and Star sits in a 1000 x 1000 viewBox, on the 27-sector nakshatra wheel.
   - PATH: the 63 Stars in Belt order (white to black, a Belt's Tricks in order, Stars 1 to 3); suggested() reads it.
   - migrateSky(): the one-time move of a Player's record to Belts by Stars (Kata progress lights Stars). */
import { TRICKS, BELTS } from './vedic.js';
import { STAR_THIRDS, kataKey } from './levels.js';

/* The Sky is opt-in for Challenger and Pro (decision 29). The follow-up change that makes it the default flips this;
   a Player who switched it off (sky: false) stays off. Explorer never gets it. */
export const SKY_DEFAULT = false;
export const skyOn = p => !!p && (p.mode === 'challenger' || p.mode === 'pro') && (p.sky ?? SKY_DEFAULT) === true;

export const starKey = (trick, n) => `${trick}:${n}`;
export const parseKey = k => { const [trick, n] = String(k).split(':'); return { trick, n: Number(n) }; };
const BELT_TRICKS = BELTS.flatMap(b => b.tricks);
const trick = id => TRICKS.find(t => t.id === id);
export const beltOf = trickId => (BELTS.find(b => b.tricks.includes(trickId)) || {}).id || null;

/* A short id from a Sutra name: no diacritics, lower case, words joined by hyphens */
export const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- Constellations ---------- */
export const CONSTELLATIONS = (() => {
  const out = [];
  for (const id of BELT_TRICKS) {
    const t = trick(id); let c = out.find(x => x.sutra === t.sutra);
    if (!c) out.push(c = { id: slug(t.sutra), sutra: t.sutra, meaning: t.meaning, tricks: [] });
    c.tricks.push(id);
  }
  return out;
})();
export const constellationOf = trickId => CONSTELLATIONS.find(c => c.tricks.includes(trickId)) || null;

/* ---------- Path ---------- */
export const PATH = BELT_TRICKS.flatMap(t => [1, 2, 3].map(n => starKey(t, n)));
/* The Stars in path order from the start of a Belt, wrapping round to white */
function fromBelt(startBelt) {
  const b = BELTS.find(x => x.id === startBelt) || BELTS[0], i = PATH.indexOf(starKey(b.tricks[0], 1));
  return PATH.slice(i).concat(PATH.slice(0, i));
}
/* Up to n Stars Bolt suggests, in order. state: { lit, skipped } (keys <trick>:<n>). The open Stars (neither lit nor
   skipped) from the start Belt on, wrapping round; when none is open, the skipped ones; when every Star is lit, none. */
export function upcoming(state = {}, startBelt = 'white', n = 3) {
  const lit = state.lit || {}, skipped = state.skipped || {}, order = fromBelt(startBelt);
  const open = order.filter(k => !lit[k] && !skipped[k]);
  return (open.length ? open : order.filter(k => !lit[k])).slice(0, n);
}
/* Where Bolt's path starts for a Player: the Belt a Placement result saved (placedBelt; Placement is a later change),
   else white */
export const startBeltOf = p => (p && BELTS.some(b => b.id === p.placedBelt) ? p.placedBelt : 'white');
/* The one Star Bolt waits at, or null when every Star is lit */
export const suggested = (state, startBelt = 'white') => upcoming(state, startBelt, 1)[0] || null;

/* ---------- Layout ---------- */
export const SKY_SIZE = 1000;
export const WHEEL = { cx: 500, cy: 500, inner: 110, outer: 470, sectors: 27 };
/* Each Constellation's anchor: [nakshatra sector 0 to 26, distance from the centre]. Hand-placed so that Belt
   neighbours are not side by side and no label meets a Star, another label or a Landmark (test/sky.test.mjs). */
const ANCHORS = {
  'nikhilam-navatascaramam-dasatah': [4, 380], 'urdhva-tiryagbhyam-special-case': [16, 200], anurupyena: [9, 380],
  'ekadhikena-purvena': [22, 380], 'ekanyunena-purvena': [1, 200], 'antyayordasake-pi': [11, 370], yavadunam: [5, 200],
  'gunita-samuccayah': [25, 380], 'urdhva-tiryagbhyam': [19, 380], 'urdhva-tiryagbhyam-duplex': [9, 200],
  'nikhilam-division-by-9': [7, 380], 'vestanam-with-ekadhika': [24, 200], vilokanam: [15, 380], 'paravartya-yojayet': [13, 200],
  'sankalana-vyavakalanabhyam': [1, 380], 'anurupye-sunyamanyat': [20, 200], 'sunyam-samyasamuccaye': [17, 380]
};
/* Star offsets from the anchor: one Trick (three Stars), or two Tricks (an upper and a lower arc) */
const ONE = [[-44, 10], [0, -18], [44, 6]];
const TWO = [[-52, -30], [-8, -46], [38, -32], [-40, 22], [6, 34], [52, 18]];
export const sectorAngle = s => ((-90 + (s + 0.5) * 360 / WHEEL.sectors) * Math.PI) / 180;
/* A long Sutra name in two lines, split at the space (or after the hyphen) that keeps both lines shortest */
export function labelLines(name, max = 16) {
  if (name.length <= max) return [name];
  let best = null;
  for (let i = 1; i < name.length; i++) {
    if (name[i] !== ' ' && name[i - 1] !== '-') continue;
    const a = name.slice(0, i).trim(), b = name.slice(i).trim(), m = Math.max(a.length, b.length);
    if (!best || m < best[0]) best = [m, [a, b]];
  }
  return best ? best[1] : [name];
}
export const SKY_LAYOUT = Object.fromEntries(CONSTELLATIONS.map(c => {
  const [sector, r] = ANCHORS[c.id], a = sectorAngle(sector);
  const x = Math.round(WHEEL.cx + r * Math.cos(a)), y = Math.round(WHEEL.cy + r * Math.sin(a)), shape = c.tricks.length > 1 ? TWO : ONE;
  const stars = {};
  c.tricks.forEach((t, ti) => [1, 2, 3].forEach(n => { const [dx, dy] = shape[ti * 3 + n - 1]; stars[starKey(t, n)] = [x + dx, y + dy]; }));
  return [c.id, { sector, r, x, y, stars, label: [x, y + (c.tricks.length > 1 ? 58 : 40)] }];
}));
export const starAt = k => { const c = constellationOf(parseKey(k).trick); return c ? SKY_LAYOUT[c.id].stars[k] : null; };
/* The box a Constellation's name takes (about 7.4 units a letter at 15px, 17 units a line), as { x0, x1, y0, y1 } */
export function labelBox(c) {
  const [x, y] = SKY_LAYOUT[c.id].label, lines = labelLines(c.sutra), w = Math.max(...lines.map(l => l.length)) * 7.4;
  return { x0: x - w / 2, x1: x + w / 2, y0: y - 13, y1: y - 13 + lines.length * 17 };
}
const meets = (p, q) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
/* Where Bolt stands beside a Star: the first spot around it whose box (BOLT_BOX, centred there) stays inside the
   Sky and covers no Star and no name. Returns the box's centre. */
export const BOLT_BOX = [60, 66];
/* Candidate spots, nearest first: rings 50 to 110 units out, every 30 degrees, starting above the Star */
const SPOTS = [50, 60, 70, 80, 90, 100, 110].flatMap(r => Array.from({ length: 12 }, (_, i) => { const a = ((-90 + i * 30) * Math.PI) / 180; return [Math.round(r * Math.cos(a)), Math.round(r * Math.sin(a))]; }));
export function boltSpot(k) {
  const [x, y] = starAt(k), [w, h] = BOLT_BOX, all = Object.values(SKY_LAYOUT).flatMap(l => Object.values(l.stars)), names = CONSTELLATIONS.map(labelBox);
  for (const [dx, dy] of SPOTS) {
    const cx = x + dx, cy = y + dy, b = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
    if (b.x0 < 0 || b.y0 < 0 || b.x1 > SKY_SIZE || b.y1 > SKY_SIZE) continue;
    if (all.some(([sx, sy]) => meets(b, { x0: sx - 15, x1: sx + 15, y0: sy - 15, y1: sy + 15 })) || names.some(n => meets(b, n))) continue;
    return [cx, cy];
  }
  return [x, y - 52];
}

/* Landmarks on the rim, in the corners and the bottom middle. The top middle slot is kept for the tower
   (Daily Sutra and Boards), which arrives with the Daily Sutra. */
export const LANDMARKS = [
  { id: 'arena', href: '#/arena', name: 'Arena', what: 'race track', at: [90, 70] },
  { id: 'duel', href: '#/arena/party', name: 'Party', what: 'ring', at: [910, 70] },
  { id: 'games', href: '#/games', name: 'Games', what: 'arcade', at: [90, 930] },
  { id: 'watch', href: '#/watch', name: 'Watch', what: 'observatory', at: [910, 930] },
  { id: 'learn', href: '#/learn', name: 'Skill map', what: 'library', at: [500, 935] }
];
export const TOWER_SLOT = [500, 45];

/* ---------- Migration (once per Player, every Mode) ---------- */
/* The Belt rule before this change: all three Tricks mastered (store.mastered: m >= 0.85 after 8 tries) */
const masteredIn = (S, id) => { const s = (S.skills || {})[id]; return !!s && s.m >= 0.85 && s.n >= 8; };
export const oldBeltEarned = (S, belt) => belt.tricks.every(t => masteredIn(S, 'v-' + t));
/* Moves a saved record (store's S) to Belts by Stars, once: Belts earned under the mastery rule are kept (S.belts),
   and a Star starts lit when at least half the Katas of its third are done (9 of 17, 8 of 16). Lights are written
   straight into S.sky.lit: no round, no Sparks, no event. Nothing is marked skipped. Returns true when it ran. */
export function migrateSky(S, now = Date.now()) {
  if (!S || typeof S !== 'object' || S.skyMigrated) return false;
  const kept = { ...(S.belts || {}) };
  for (const b of BELTS) if (!kept[b.id] && oldBeltEarned(S, b)) kept[b.id] = now;
  if (Object.keys(kept).length) S.belts = kept;
  const done = S.katasDone || {}, lights = [];
  for (const id of BELT_TRICKS) STAR_THIRDS.forEach(([lo, hi], i) => {
    let n = 0; for (let k = lo; k <= hi; k++) if (done[kataKey(id, k)]) n++;
    if (n >= Math.ceil((hi - lo + 1) / 2)) lights.push(starKey(id, i + 1));
  });
  if (lights.length) {
    const sky = S.sky = { lit: {}, skipped: {}, last: {}, ...(S.sky || {}) };
    sky.lit = { ...sky.lit }; sky.skipped = { ...sky.skipped };
    for (const k of lights) { if (!sky.lit[k]) sky.lit[k] = now; delete sky.skipped[k]; }
  }
  S.skyMigrated = 1;
  return true;
}
