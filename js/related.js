/* "Watch it explained" keyword fallback (js/watch.js picksFor uses it only when a Skill or Trick has no hand-matched
   video). Matching is by whole words (with their plural and -ing forms), never by a fragment inside another word,
   so "Discounts" is not "count" and a percent lesson gets no counting videos. */
const KEYS = [
  /\bsquar(?:e|es|ed|ing)\b/, /\bnikhilam\b/, /\bcrosswise\b/, /\bmultipl(?:y|ies|ied|ying|ication)\b/, /\btimes\b/, /\b11\b/,
  /\bcount(?:s|ed|ing)?\b/, /\bfractions?\b/, /\balgebra\b/, /\bcalculus\b/, /\bgeometry\b/, /\bvedic\b/,
  /\bsubtract(?:s|ed|ing|ion)?\b/, /\badd(?:s|ed|ing|ition)?\b/
];
/* text: the Skill or Trick words; videos: VIDEOS entries (already filtered to what the Player may see).
   Returns up to n entries whose title or why line shares a key word with text. */
export function relatedTo(text, videos, n = 3) {
  const words = String(text).toLowerCase(), keys = KEYS.filter(k => k.test(words));
  if (!keys.length) return [];
  return videos.filter(v => keys.some(k => k.test(`${v.title} ${v.why}`.toLowerCase()))).slice(0, n);
}
