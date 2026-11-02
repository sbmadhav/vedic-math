/* The copy table (openspec change age-bands, band-copy spec; design decision 6). Every line of the mapped screens
   that varies by Mode or Reading band lives here, keyed <screen>.<line>, as plain data a reviewer can read top to
   bottom (pnpm --filter tools copy-table prints it as Markdown). An entry has the Mode variants (explorer, challenger,
   pro) or a default, an `early` variant (8 words or fewer a sentence, 2 sentences or fewer, no idioms), and a
   `growing` variant only where the Mode copy runs past 14 words a sentence. An array is a line set: pickLine() draws
   one in the handler that shows it, never while drawing. {n} and {a} are counts said as one Server line from a
   sentence template (shared/src/voice-text.ts); {r} a Rating the view hands in. Every other `early` line is fixed, so
   the Studio voice records it whole (tools/voice/lines.mjs bandLines). A line is text: fill() escapes what goes into a
   placeholder, and a line is never read as markup. Pure: no DOM, no storage. The Mode variants are the strings the
   views had, moved; a Player with no band reads them exactly as before. The Legacy views reach it through js/fx.js
   (copy, line); the React game will through app/src/hooks/useCopy. */

/* A line, or a line set one of which is drawn each time */
export type Line = string | readonly string[];
export type Variant = 'explorer' | 'challenger' | 'pro' | 'default' | 'early' | 'growing';
/* A default, or the Challenger and Pro variants (what a Player with no Mode reads, as fx.t() falls back to Challenger),
   the other Mode variants, then the band variants */
export type CopyEntry = ({ default: Line } | { challenger: Line; pro: Line }) & { default?: Line; explorer?: Line; challenger?: Line; pro?: Line; early?: Line; growing?: Line };
export const VARIANTS: readonly Variant[] = ['explorer', 'challenger', 'pro', 'default', 'early', 'growing'];

export const COPY = {
  /* ---------- The grade question (js/grade-question.js): asked before any band, so the default is what a new visitor sees ---------- */
  'grade.title': { default: 'What grade are you in?', early: 'What grade are you in?' },
  'grade.ageTitle': { default: 'How old are you?', early: 'How old are you?' },
  'grade.bolt': { default: 'A grown-up can help.', early: 'A grown-up can help.' },
  'grade.askAge': { default: 'Tell my age instead', early: 'Tell my age instead' },
  'grade.askGrade': { default: 'Tell my grade instead', early: 'Tell my grade instead' },
  'grade.skip': { default: 'Skip', early: 'Skip' },
  'grade.hear': { default: 'Hear the question', early: 'Hear the question' },
  'grade.hearChoices': { default: 'Hear the choices', early: 'Hear the choices' },

  /* ---------- Mode picker (js/app.js modePicker) ---------- */
  'picker.heading': { default: 'Pick who is playing', early: 'Who is playing?' },
  'picker.note': {
    default: 'Nicknames are made up for you, so no real names are ever needed. You can change who is playing any time.',
    early: 'Your name is made up. You can change it later.',
    growing: 'Nicknames are made up, so no real names are needed. Change who is playing any time.',
  },
  'picker.suggested': { default: 'Suggested', early: 'Suggested' },
  'picker.blurb.explorer': { default: 'Big buttons, pictures, counting, read-aloud.', early: 'Big buttons and pictures.' },
  'picker.blurb.challenger': { default: 'Speed tricks, belts, daily challenges.', early: 'Speed tricks and belts.' },
  'picker.blurb.pro': { default: 'Algebra to calculus, sutra deep dives, leaderboards.', early: 'Hard math and World boards.' },

  /* ---------- Home (js/app.js home, heroStats, the reading card) ---------- */
  'home.heading': { explorer: 'What do you want to play?', challenger: 'Learn a sutra, then use it', pro: 'Mental math, the sutra way', early: 'What do you want to play?' },
  'home.greeting': { explorer: 'Hello,', challenger: 'Welcome,', pro: 'Welcome,', early: 'Hello,' },
  'home.greetingBack': { explorer: 'Hello,', challenger: 'Welcome back,', pro: 'Welcome back,', early: 'Hello,' },
  'home.keepGoing': { default: 'Keep going', early: 'Keep going' },
  'home.readAloudOn': { default: 'Read questions aloud: on', early: 'Read aloud: on' },
  'home.readAloudOff': { default: 'Read questions aloud: off', early: 'Read aloud: off' },
  'home.tile.balloons': { default: 'Count and pop', early: 'Count and pop' },
  'home.tile.dots': { default: 'Count with ten frames', early: 'Count the dots' },
  'home.tile.more': { default: 'Big or small', early: 'Big or small' },
  'home.tile.ten': { default: 'Find the partners', early: 'Make ten' },
  'home.tile.add': { default: 'Put together', early: 'Put together' },
  'home.tile.look': { default: 'Flash dots', early: 'Flash dots' },
  'home.tile.shapes': { default: 'Name that shape', early: 'Name the shape' },
  'home.tile.race': { default: 'Tap fast!', early: 'Tap fast!' },
  'home.door.sutraTag': { challenger: 'Your next sutra', pro: 'Next sutra', early: 'Your next sutra' },
  'home.door.sutra': {
    challenger: 'A sutra is a short rule that does a whole sum in a line or two. A Star is a two-minute round of four questions on one of its tricks.',
    pro: "A sutra is a one-line rule from Bharati Krishna Tirtha's 1965 book that replaces a long method. A Star is a two-minute round of four questions on one of its tricks.",
    early: 'A sutra is a math rule. A Star is four questions.',
    growing: 'A sutra is a short rule that does a sum in one line. A Star is four quick questions on one trick.',
  },
  'home.door.arenaTitle': { challenger: 'Race in the Arena', pro: "Today's Arena round", early: 'Race the clock' },
  'home.door.arena': {
    challenger: 'Sixty seconds, the same questions for every Challenger today, and a leaderboard at the end.',
    pro: 'Sixty seconds of mental arithmetic: products, squares and percents. Every Pro gets the same questions today, and the best scores go on the leaderboard.',
    early: 'Race the clock for sixty seconds.',
    growing: 'Sixty seconds, the same questions for everyone today, and a leaderboard at the end.',
  },
  'home.door.learnTitle': { challenger: 'Learn a skill', pro: 'Skill map', early: 'Learn a skill' },
  'home.door.learn': {
    challenger: 'Skills by grade, from counting to calculus, each with a hint and a worked answer.',
    pro: 'Algebra, geometry and calculus, each skill with a hint and a worked answer.',
    early: 'Skills by grade, with hints.',
    growing: 'Skills by grade, from counting to calculus, each with a hint.',
  },
  'home.card.title': { default: 'Help Bolt talk your way', early: 'Help Bolt talk your way' },
  'home.card.body': { default: 'One quick question, so Bolt talks your way. A grown-up can help.', early: 'One quick question. A grown-up can help.' },
  'home.card.answer': { default: 'Answer it', early: 'Answer it' },
  'home.card.later': { default: 'Not now', early: 'Not now' },

  /* ---------- The Sky (js/sky-view.js) ---------- */
  'sky.suggests': { default: 'Bolt suggests', early: 'Bolt picks' },
  'sky.next': { explorer: 'Every Star is open, so pick any one.', challenger: 'Every Star is open, so pick any one.', pro: 'Every Star is open; start anywhere.', early: 'Pick any Star.' },
  'sky.allLit': { default: 'Every Star in your Sky is lit. Play any of them again for Sparks.', early: 'Every Star is lit. Play again for Sparks.' },

  /* ---------- Practice and Endless runs (js/app.js practice) ---------- */
  'practice.praise': {
    explorer: ['Yay! You got it!', 'Super star!', 'Woohoo! Correct!', 'You are so smart!'],
    challenger: ['Correct!', 'Nailed it!', 'Boom! First try.', 'Lightning fast!'],
    pro: ['Correct.', 'Exactly right.', 'Clean.', 'Correct, first try.'],
    early: ['You did it!', 'Yes!', 'Great job!', 'Super!'],
    growing: ['Yes!', 'Good thinking.', 'Right!', 'Nice work.'],
  },
  'practice.gotIt': { default: 'You got it!', early: 'You got it!' },
  'practice.retry': { default: 'Not quite. Try once more.', early: 'Try again!' },
  'practice.hintOffer': { default: 'Want a hint?', early: 'Hint?' },
  'practice.hintLead': { default: 'Hint:', early: 'Hint:' },
  'practice.tricky': {
    default: 'That one was tricky. See how it works, then try the next one.',
    early: 'Tricky one! See how, then try the next.',
    growing: 'That one was tricky. See how it works, then try the next.',
  },
  'practice.showSteps': { default: 'Read the steps, then try the next one.', early: 'Look at the steps. Then try the next one.' },
  'practice.empty': { default: 'Type an answer first.', early: 'Give an answer first.' },
  'practice.notAnswer': {
    explorer: 'Type just the answer, like 7.',
    challenger: 'Type just the answer, like 56 or 3/4.',
    pro: 'Type just the answer as a number, like 56 or 3/4.',
    early: 'Type just the number, like 7.',
  },
  'practice.oneLife': { default: 'Oops! 1 life left. See how it works, then keep going.', early: 'Oops! One life left.' },
  'practice.livesLeft': { default: 'Oops! {n} lives left. See how it works, then keep going.', early: 'Oops! {n} lives left.' },
  'practice.outOfLives': { default: 'Out of lives!', early: 'Out of lives!' },
  'practice.yourTurn': { default: 'Your turn', early: 'Your turn' },

  /* ---------- Bolt (js/star.js, and Practice's bubble): tone per band ---------- */
  'bolt.right': { default: ['Yes!', 'Nailed it.', 'Smooth.', 'Boom.', 'Right!'], early: ['You did it!', 'Yes!', 'Great job!'], growing: ['Yes!', 'Good thinking.', 'Right!'] },
  'bolt.next': { default: ['Next one.', 'Keep going.', 'You got this.'], early: ['Next one.', 'Keep going.', 'You can do it.'], growing: ['Next one.', 'Keep going.', 'You got this.'] },

  /* ---------- Star round (js/star.js) ---------- */
  'star.start': { default: 'Star {n}: four questions. Go!', early: 'Star {n}: four questions. Go!' },
  'star.last': { default: 'Last one!', early: 'Last one!' },
  'star.rematch': { default: 'Your turn. One just like it.', early: 'Your turn. One like it.' },
  'star.dare': { default: 'Brave! A harder one. A miss costs nothing.', early: 'Brave! A harder one.' },
  'star.dareOffer': { default: 'Double Sparks. A miss costs nothing.', early: 'Double Sparks. A miss is free.' },
  'star.dareLabel': { default: 'Take the Dare', early: 'Take the Dare' },
  'star.comeback': { default: 'Comeback! That is how you use a mistake.', early: 'Comeback! You fixed it!' },
  'star.dareWon': { default: 'Dare crushed!', early: 'Dare won!' },
  'star.reveal': { default: 'Close! It is {a}. Onward.', early: 'Not quite. It is {a}.' },
  'star.miss': { default: 'Not quite. Watch the trick on your numbers.', early: 'Not quite. Watch the trick.' },
  'star.dareLost': { default: 'So close! A Dare miss costs nothing. Watch how it works.', early: 'So close! A Dare miss is free.' },
  'star.replay': { default: 'Here is how the trick does it.', early: 'Here is how it works.' },
  'star.replayDare': { default: 'Here is the Dare, step by step.', early: 'Here is the Dare, step by step.' },
  'star.offer': { default: 'Want to see a short video about this trick? It is optional.', early: 'Want to see a short video?' },
  'star.fillFirst': { default: 'Fill in every box first.', early: 'Fill in every box first.' },
  'star.typeFirst': { default: 'Type an answer first.', early: 'Type an answer first.' },
  'star.justAnswer': { default: 'Type just the answer, like 56.', early: 'Type just the number.' },
  'star.headLit': { default: 'Star {n} is lit!', early: 'Star {n} is lit!' },
  'star.headDone': { default: 'Round done', early: 'Round done' },
  'star.headSkipped': { default: 'Star {n} skipped', early: 'Star {n} skipped' },
  'star.headStaysLit': { default: 'Star {n} stays lit', early: 'Star {n} stays lit' },
  'star.lit': { default: 'You did it!', early: 'You did it!' },
  'star.skipped': { default: 'Okay. On to the next one when you are ready.', early: 'Okay. Next one when you are ready.' },
  'star.practice': { default: 'Good practice. Every miss teaches.', early: 'Good practice!' },
  'star.shines': { default: 'It shines in your sky now.', early: 'It shines in your sky now.' },
  'star.stillLit': { default: 'Still shining. Every round still earns Sparks.', early: 'Still shining!' },
  'star.staysLit': { default: 'It stays lit. Every round still earns Sparks.', early: 'It stays lit!' },
  'star.need': { default: '{n} more Sparks to light it.', early: '{n} more Sparks to light it.' },
  'star.skipLine': { default: 'Come back to it any time. Lighting it later clears the mark.', early: 'Come back any time.' },
  'star.litStays': { default: 'A lit Star stays lit.', early: 'A lit Star stays lit.' },

  /* ---------- Arena (js/app.js arenaView) ---------- */
  'arena.daily': { default: 'Daily challenge', early: 'Daily race' },
  'arena.practiceType': { default: 'Practice round', early: 'Practice' },
  'arena.untimed': { default: 'Practice, no clock', early: 'No clock' },
  'arena.noClockNote': { default: 'The daily challenge is a timed race for everyone. Practice has no clock in Calm.', early: 'The daily race has a clock. Practice has no clock.' },
  'arena.rating': {
    explorer: 'Your Arena Rating: {r} of 20. Practice rounds get harder as you get them right.',
    challenger: 'Your Arena Rating: {r} of 20. Practice rounds start there and adapt to every answer.',
    pro: 'Arena Rating: {r}/20. Practice rounds start there and adapt to every answer; the daily round is the same for everyone.',
    early: 'Your Arena Rating: {r} of 20.',
    growing: 'Your Arena Rating: {r} of 20. Practice rounds start there and adapt to every answer.',
  },
  'arena.ratingUp': { explorer: 'Your Arena Rating went up to {r}!', challenger: 'Arena Rating up to {r}.', pro: 'Arena Rating up to {r}.', early: 'Your Arena Rating went up to {r}!' },
  'arena.ratingDown': { explorer: 'Your Arena Rating is {r} now.', challenger: 'Arena Rating now {r}.', pro: 'Arena Rating down to {r}.', early: 'Your Arena Rating is {r} now.' },
  'arena.practiceNote': { default: 'Practice rounds do not count for the leaderboard.', early: 'Practice does not go on the board.' },
  'arena.beatBest': { default: 'Play again to beat your best.', early: 'Play again!' },
  'arena.newBest': { default: 'New personal best for today!', early: 'Your best today!' },

  /* ---------- Games and the tower (js/app.js gameView, challengeView): a round of a timed game played with no clock ---------- */
  'game.noClockWhy': { default: 'Turn Calm off to play for one.', early: 'A grown-up can turn the clock on.' },
} satisfies Record<string, CopyEntry>;

export type CopyKey = keyof typeof COPY;
/* Who a line is picked for: the Player's Mode and Reading band, either unknown */
export type Who = { mode?: string | null; band?: string | null };
/* What fills a placeholder: text (escaped), or { html } the view built itself from a number, never from typed text */
export type Vars = Record<string, string | number | { html: string }>;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escText = (s: unknown): string => String(s).replace(/[&<>"']/g, c => ESC[c] as string);
/* Fills {k} from vars as text: a string value is escaped (so <b>Max</b> shows as those characters); { html } is markup
   the view built itself from a number or its own template, never from typed text */
export function fill(text: string, vars?: Vars | null): string {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (m, k: string) => {
    if (!(k in vars)) return m;
    const v = vars[k];
    return v !== null && typeof v === 'object' && 'html' in v ? String(v.html) : escText(v);
  });
}

/* The variant for a Player (band-copy spec "Choosing a line"): the band's (early or growing) if the entry has one,
   else the Mode's, else default. Fluent and no band never have a variant of their own. */
export function variantOf(entry: CopyEntry | undefined, { mode = null, band = null }: Who = {}): Line | undefined {
  if (!entry) return undefined;
  const e = entry as Partial<Record<Variant, Line>>;
  if ((band === 'early' || band === 'growing') && e[band] !== undefined) return e[band];
  if (mode && (mode === 'explorer' || mode === 'challenger' || mode === 'pro') && e[mode] !== undefined) return e[mode];
  if (e.default !== undefined) return e.default;
  return e.challenger ?? e.pro ?? e.explorer;
}
const entryOf = (key: string): CopyEntry | undefined => (Object.prototype.hasOwnProperty.call(COPY, key) ? (COPY as Record<string, CopyEntry>)[key] : undefined);
/* A line (or a line set, untouched) for a Player; vars fill its placeholders as text. An unknown key is itself. */
export function copyFor(key: string, who: Who = {}, vars: Vars | null = null): Line {
  const v = variantOf(entryOf(key), who);
  if (v === undefined) return key;
  return typeof v === 'string' ? fill(v, vars) : vars ? v.map(t => fill(t, vars)) : v;
}
/* One line of a line set, drawn now (call it in the handler that shows the line, and keep what it gave) */
export function pickLine(key: string, who: Who = {}, vars: Vars | null = null, rand: () => number = Math.random): string {
  const v = copyFor(key, who, vars);
  return typeof v === 'string' ? v : (v[Math.floor(rand() * v.length)] as string);
}
/* Every text of a variant, flat (a line set gives each line) */
export const linesOf = (v: Line | undefined): readonly string[] => (v === undefined ? [] : typeof v === 'string' ? [v] : v);
/* The placeholders a line carries, sorted */
export const placeholders = (t: string): string[] => [...new Set([...String(t).matchAll(/\{(\w+)\}/g)].map(m => m[1] as string))].sort();
/* Every `early` line and every Bolt line, for the Studio voice's whole-line list: the fixed ones only (a line with a
   placeholder is a Server line from its sentence template, never recorded once per number) */
export function voiceLines(): string[] {
  const out = new Set<string>();
  for (const [key, entry] of Object.entries(COPY) as [string, CopyEntry][]) {
    const e = entry as Partial<Record<Variant, Line>>;
    const take = (v: Line | undefined) => linesOf(v).forEach(t => { if (!/\{\w+\}/.test(t)) out.add(t); });
    take(e.early);
    if (key.startsWith('bolt.')) VARIANTS.forEach(v => take(e[v]));
  }
  return [...out];
}
