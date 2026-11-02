/* Sentence templates for the server voice (openspec change age-bands, design decision 6; react-typescript D16).
   An `early` copy line that carries a count ("You climbed {n} steps!") cannot be recorded whole once per number, so
   each one has a template here: when the server voice is on, the line is said as one Server line built from its
   template; until then the device's voice or the clip packs say it. One template per line, matched by its exact text,
   so test/copy-bands.test.mjs can prove every counted `early` line has exactly one. No DOM here. */

export type Template = { readonly key: string; readonly text: string };

/* The placeholders a template may carry: {n} a count, {a} an answer (a whole number) */
export const PLACEHOLDER = /\{(n|a)\}/g;

export const TEMPLATES: readonly Template[] = [
  { key: 'star.start', text: 'Star {n}: four questions. Go!' },
  { key: 'star.reveal', text: 'Not quite. It is {a}.' },
  { key: 'star.need', text: '{n} more Sparks to light it.' },
  { key: 'star.headLit', text: 'Star {n} is lit!' },
  { key: 'star.headSkipped', text: 'Star {n} skipped' },
  { key: 'star.headStaysLit', text: 'Star {n} stays lit' },
  { key: 'practice.livesLeft', text: 'Oops! {n} lives left.' },
  { key: 'arena.rating', text: 'Your Arena Rating: {r} of 20.' },
  { key: 'arena.ratingUp', text: 'Your Arena Rating went up to {r}!' },
  { key: 'arena.ratingDown', text: 'Your Arena Rating is {r} now.' },
];

/* Every template whose text is exactly this line */
export const templatesFor = (text: string): readonly Template[] => TEMPLATES.filter(t => t.text === text);

/* The regular expression a template's spoken form matches: each placeholder a whole number */
export function patternOf(t: Template): RegExp {
  const esc = t.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(n|a|r)\\\}/g, '(-?\\d+)');
  return new RegExp(`^${esc}$`);
}
/* The template a spoken line was built from, with its numbers, or null */
export function matchTemplate(spoken: string): { template: Template; values: number[] } | null {
  for (const t of TEMPLATES) {
    const m = patternOf(t).exec(spoken);
    if (m) return { template: t, values: m.slice(1).map(Number) };
  }
  return null;
}
