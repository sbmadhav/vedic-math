/* Sutra progress (openspec change sutras-first, spec sutra-progress): how far a Player is with one Sutra, worked out
   from what the device already keeps for each of its Tricks (the Trick Skill's mastery, its three Stars, its Katas)
   and whether its card is collected. Pure: the caller passes readers over the store, so nothing is written, nothing is
   stored for it and nothing is sent; node tests pass plain functions. */
import { TRICKS } from './vedic.js';

export const STARS_PER_TRICK = 3;
const known = id => TRICKS.some(t => t.id === id);

/* card: a Sutra card (js/sutras.js, with its tricks). read: { started(skillId), mastered(skillId), starState(trick, n),
   katasDone(trick), collected(card) }. katasPer: Katas per Trick (js/levels.js KATAS_PER_TRICK). */
export function progressOf(card, read, { katasPer = 50 } = {}) {
  const tricks = (card && card.tricks || []).filter(known);
  const out = { tricks: tricks.length, started: 0, mastered: 0, lit: 0, stars: tricks.length * STARS_PER_TRICK, katas: 0, katasTotal: tricks.length * katasPer, collected: !!(card && read.collected && read.collected(card)), each: [] };
  for (const id of tricks) {
    const lit = [1, 2, 3].filter(n => read.starState(id, n) === 'lit').length, started = !!read.started('v-' + id), mastered = !!read.mastered('v-' + id), katas = read.katasDone(id) || 0;
    out.each.push({ id, lit, started, mastered, katas });
    out.lit += lit; out.started += started ? 1 : 0; out.mastered += mastered ? 1 : 0; out.katas += katas;
  }
  out.begun = out.started > 0 || out.lit > 0 || out.katas > 0;
  /* 0 to 1, for a meter: Stars lit (Challenger and Pro), or Tricks practiced (Explorer has no Stars) */
  out.share = mode => (out.tricks ? (mode === 'explorer' ? out.started / out.tricks : out.lit / out.stars) : 0);
  return out;
}

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
/* The progress line in the Mode's words */
export function progressLine(p, mode) {
  if (!p.tricks) return mode === 'explorer' ? 'No trick for this one yet. Tap Learn more to see it.' : 'No trick for this one yet. Read how it works in its deep dive.';
  if (mode === 'explorer') return `${p.started} of ${plural(p.tricks, 'trick')} practiced`;
  const stars = `${p.lit} of ${p.stars} Stars lit`;
  return mode === 'pro' ? `${stars} · ${p.mastered} of ${plural(p.tricks, 'Trick')} mastered` : stars;
}
/* One Trick's line in a Deep dive's "Try it yourself" */
export function trickLine(e, mode) {
  if (mode === 'explorer') return e.mastered ? 'Got it!' : e.started ? 'Practiced' : 'New';
  return `${e.lit} of ${STARS_PER_TRICK} Stars lit${e.mastered ? ' · mastered' : ''}`;
}
