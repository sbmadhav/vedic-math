/* "Watch it explained": which Watch shelf entries go with a skill or trick. Matching is by whole words
   (with their plural and -ing forms), never by a fragment inside another word, so "Discounts" is not
   "count" and a percent lesson gets no counting videos. */
const KEYS = [
  /\bsquar(?:e|es|ed|ing)\b/, /\bnikhilam\b/, /\bcrosswise\b/, /\bmultipl(?:y|ies|ied|ying|ication)\b/, /\btimes\b/, /\b11\b/,
  /\bcount(?:s|ed|ing)?\b/, /\bfractions?\b/, /\balgebra\b/, /\bcalculus\b/, /\bgeometry\b/, /\bvedic\b/,
  /\bsubtract(?:s|ed|ing|ion)?\b/, /\badd(?:s|ed|ing|ition)?\b/
];
/* text: the skill or trick words; resources: the Watch shelf. Returns up to n entries (no channels). */
export function relatedTo(text, resources, n = 3) {
  const words = String(text).toLowerCase(), keys = KEYS.filter(k => k.test(words));
  if (!keys.length) return [];
  return resources.filter(r => r.type !== 'channel' && keys.some(k => k.test(`${r.tags.join(' ')} ${r.title}`.toLowerCase()))).slice(0, n);
}
