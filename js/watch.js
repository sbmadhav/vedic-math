/* The Watch shelf's rules (openspec watch-shelf), as pure functions over the list in js/videos.js.
   The list itself is loaded on demand with loadVideos(); everything else here takes the list as an argument,
   so the node tests run the same rules over a small fixture. */
import { relatedTo } from './related.js';

/* A Mode sees its own videos and the Mode below; Explorer only its own */
export const MODE_SEES = { explorer: ['explorer'], challenger: ['challenger', 'explorer'], pro: ['pro', 'challenger'] };
const sees = mode => MODE_SEES[mode] || MODE_SEES.challenger;
const kidsFirst = mode => mode === 'explorer' || mode === 'challenger';

/* The data file, imported once and only when a Watch view or Bolt's offer needs it (never on a first load).
   A failed import (offline before it was saved) is forgotten so the next try can succeed. */
let loading = null;
export function loadVideos() {
  return loading ||= import('./videos.js').catch(e => { loading = null; throw e; });
}

/* Links that leave the site (Open on YouTube, websites, Wikipedia reading) are for Pro only */
export const linksOut = mode => mode === 'pro';

/* Marked for a Mode this Player may see; critiques only for Pro */
export const visibleTo = (v, mode) => v.modes.some(m => sees(mode).includes(m)) && (!v.critique || mode === 'pro');

/* Explorer and Challenger: made for kids first; then shortest first (a stable sort keeps the file's order for ties) */
export function order(list, mode) {
  const k = kidsFirst(mode);
  return [...list].sort((a, b) => (k ? Number(b.madeForKids) - Number(a.madeForKids) : 0) || a.duration - b.duration);
}

/* For Explorer and Challenger, when any made-for-kids video is in the list, only those */
const kidsOnly = (list, mode) => (kidsFirst(mode) && list.some(v => v.madeForKids) ? list.filter(v => v.madeForKids) : list);

/* A Skill or Trick page's "Watch it explained": up to n hand-matched videos visible to the Mode. Only when there
   are none, whole-word keyword matches over titles and why lines (js/related.js); else none.
   Returns { how: 'hand' | 'keyword' | 'none', picks }. */
export function picksFor(list, { skill = null, trick = null, mode, words = '' }, n = 3) {
  const visible = order(list.filter(v => visibleTo(v, mode)), mode);
  const hand = visible.filter(v => (skill && v.skills.includes(skill)) || (trick && v.tricks.includes(trick)));
  if (hand.length) return { how: 'hand', picks: kidsOnly(hand, mode).slice(0, n) };
  const kw = words ? relatedTo(words, visible, n) : [];
  return kw.length ? { how: 'keyword', picks: kw } : { how: 'none', picks: [] };
}

/* The one video hand-matched to a Trick that Bolt may offer in a Star: visible to the Mode, made for kids first
   (Explorer and Challenger), shortest first. Never a keyword match. */
export function pickForTrick(list, trick, mode) {
  return order(list.filter(v => v.tricks.includes(trick) && visibleTo(v, mode)), mode)[0] || null;
}

/* star-round's findVideo seam: findVideo(trickId, mode) resolves to a video or null. Null when offline or when
   the list cannot be loaded, so a Star never waits on or fails over a video. opts.list: a list to use instead
   of loading js/videos.js (tests). */
export async function videoForTrick(trick, mode, { list } = {}) {
  if (!list) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    try { list = (await loadVideos()).VIDEOS; } catch (e) { return null; }
  }
  return pickForTrick(list, trick, mode);
}

/* The length bar (openspec video-length-12): every video, for every Mode, is under 12 minutes */
export const MAX_LENGTH = 720;
/* Length filter buckets, in seconds: under 2 minutes, 2 to 5, 5 to 8, 8 to 12 */
export const LENGTHS = { short: [0, 120], mid: [120, 300], long: [300, 480], longer: [480, MAX_LENGTH] };
export const lengthOf = v => Object.keys(LENGTHS).find(k => v.duration >= LENGTHS[k][0] && v.duration < LENGTHS[k][1]) || null;

/* The Skill areas (strands) a video belongs to: its Skills' strands, plus 'tricks' when it has a Trick */
export const strandsOf = (v, byId) => [...new Set([...v.skills.map(id => byId[id] && byId[id].strand).filter(Boolean), ...(v.tricks.length ? ['tricks'] : [])])];

/* The shelf's filters. mode: the Player's Mode (what may be seen). level: one Mode chip, or 'all' for every
   visible Mode (the shelf opens on 'all'; the default here is the Player's own). strand: a Skill area id. tricks:
   true keeps entries with a Trick. length: a LENGTHS key. kind: 'video' or 'short' (the shelf always sets one).
   Unset filters keep everything. */
export function filterShelf(list, { mode, level = mode, strand = null, tricks = false, length = null, kind = null }, byId = {}) {
  return order(list.filter(v => visibleTo(v, mode)
    && (level === 'all' || v.modes.includes(level))
    && (!strand || strandsOf(v, byId).includes(strand))
    && (!tricks || v.tricks.length > 0)
    && (!length || lengthOf(v) === length)
    && (!kind || v.kind === kind)), mode);
}

/* The privacy-enhanced embed. rel=0 keeps end-of-video suggestions to the same channel; the player is rebuilt
   for every choice, so nothing plays next on its own. */
export const embedSrc = (v, { autoplay = true } = {}) =>
  `https://www.youtube-nocookie.com/embed/${v.yt}?${autoplay ? 'autoplay=1&' : ''}rel=0&modestbranding=1&playsinline=1`;
export const thumbSrc = v => `https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`;
