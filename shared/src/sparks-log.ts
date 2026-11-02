/* The Sparks history (openspec change muse-review-polish, design D4; sparks spec "A Sparks history on the device"):
   the rules for the log js/store.js keeps on each Player's record, and the words the Me page shows it with. Pure, no
   DOM: shared/src/sparks-log.test.ts checks it. */

/* One award: how many Sparks (n), what for (why, store.addSparks's second argument: quest, answer, play:locks), when
   (at, ms), and for a grouped entry how many answers it stands for (k) */
export type SparksAward = { n: number; why: string; at: number; k?: number };

/* The log keeps the newest LOG_CAP awards. Per-answer awards (LOG_GROUPED: a Practice answer, a Star's question)
   that follow each other within LOG_GAP group into one entry, so a round is one row, not a dozen. */
export const LOG_CAP = 50, LOG_GAP = 30 * 60000, LOG_GROUPED = ['answer', 'star'];

/* The log after one more award, newest first: a new array (the entries it keeps are copies) */
export function withAward(log: readonly SparksAward[] | null | undefined, n: number, why: string, at: number): SparksAward[] {
  const out = (Array.isArray(log) ? log : []).map(e => ({ ...e })), top = out[0];
  if (top && LOG_GROUPED.includes(why) && top.why === why && at - top.at < LOG_GAP) { top.n += n; top.k = (top.k ?? 1) + 1; top.at = at; return out; }
  out.unshift({ n, why, at });
  return out.slice(0, LOG_CAP);
}

/* Each why, as the Me page names it; OTHER for a why the list does not know */
export const OTHER = 'Sparks';
export const WHAT: Record<string, string> = {
  answer: 'Practice', star: 'Star round', quest: 'Quest complete', arena: 'Arena round', challenge: 'Tower challenge', run: 'Endless run',
  kata: 'Kata', game: 'Game', trick: 'Watched a speed trick', sutra: 'Sutra card collected', try: 'Try a trick', play: 'Play', other: OTHER
};
/* An entry's label: its why's name, an experience's title for play:<id> (titleOf gives it, from the play catalog), and
   the answer count of a grouped entry ("Practice: 12 answers") */
export function label(e: SparksAward, titleOf: (id: string) => string | undefined = () => undefined): string {
  const [why = 'other', id] = String(e.why || 'other').split(':');
  let w = WHAT[why] ?? OTHER;
  if (why === 'play' && id) w = titleOf(id) ?? w;
  return (e.k ?? 1) > 1 ? `${w}: ${e.k} answers` : w;
}
/* How long ago, in the Player's words: just now, 5 min ago, 2 h ago, yesterday, 3 days ago, then the date */
export function ago(at: number, now: number): string {
  const s = Math.max(0, now - at) / 1000;
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24); if (d === 1) return 'yesterday'; if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
