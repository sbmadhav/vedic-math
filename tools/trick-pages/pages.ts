/* The 15 Tricks that have a Trick page, in the order of the trick-pages table (openspec change trick-pages, design D2),
   with the slug of each page at /tricks/<slug>/. A slug never changes once published. The warm-up (openspec change
   teacher-warm-up) rotates through this list by the date (design D4) and names a page on its last screen; the Trick
   page generator takes its rows from here too. Published at /tricks/pages.js with its types taken out (build.py). */
export type TrickPage = { id: string; slug: string };

export const PAGES: readonly TrickPage[] = [
  { id: 'sq5', slug: 'square-numbers-ending-in-5' },
  { id: 'near-base', slug: 'multiply-numbers-near-100' },
  { id: 'crosswise', slug: 'multiply-any-two-numbers-in-one-line' },
  { id: 'from9', slug: 'subtract-from-100-or-1000' },
  { id: 'by9s', slug: 'multiply-by-9-99-or-999' },
  { id: 'ends10', slug: 'multiply-when-last-digits-add-to-10' },
  { id: 'square-near', slug: 'square-numbers-near-100' },
  { id: 'by11', slug: 'multiply-by-11' },
  { id: 'div9', slug: 'divide-by-9' },
  { id: 'check9', slug: 'check-answers-with-digit-sums' },
  { id: 'times5', slug: 'multiply-by-5-25-50-or-125' },
  { id: 'sub-base', slug: 'multiply-with-a-working-base' },
  { id: 'duplex', slug: 'square-any-two-digit-number' },
  { id: 'sqroot', slug: 'square-roots-in-your-head' },
  { id: 'cuberoot', slug: 'cube-roots-in-your-head' },
];

export const TRICK_IDS: readonly string[] = PAGES.map(p => p.id);

/** The page row of a Trick id, or undefined for a Trick without a page */
export const pageOf = (id: string): TrickPage | undefined => PAGES.find(p => p.id === id);
