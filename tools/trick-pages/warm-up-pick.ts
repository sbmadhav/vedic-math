/* Which Trick the warm-up shows (openspec change teacher-warm-up, design D4): the Trick of the day rotates through the
   Trick page list by the local date, with nothing stored, so every class on the same date gets the same one; a
   ?trick=<id> link opens a Trick directly (a teacher can bookmark a lesson) and an unknown id falls back to the day's.
   Published at /tricks/warm-up-pick.js with its types taken out (build.py). No DOM: a test loads it in Node. */

/** The day number of a local date (days since 1970-01-01 of that calendar date, whatever the time zone) */
export const dayNumber = (date: Date): number => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);

/** The Trick of the day: the ids in order, taken round by the day number */
export function trickOfDay(date: Date, ids: readonly string[]): string {
  const id = ids[dayNumber(date) % ids.length];
  if (id === undefined) throw new Error('trickOfDay: no Trick ids');
  return id;
}

/** The Trick a visit shows: ?trick=<id> when it names one of the ids, else the Trick of the day */
export function pickTrick(search: string, date: Date, ids: readonly string[]): string {
  const asked = new URLSearchParams(search).get('trick');
  return asked !== null && ids.includes(asked) ? asked : trickOfDay(date, ids);
}
