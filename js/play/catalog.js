/* The play experiences and where each one lives in the app. There is no separate play area: each experience
   is a page inside an existing section, reached from that section's page.
   - id: the module js/play/exp/<id>.js (exports mount) and the styles css/play/<id>.css
   - route: the page (params after it go to mount); section: the page Back returns to and that lists it
   - modes: who sees it listed and who may open it (the Dojo is hidden in Explorer, so its experiences are
     too; the Sutras page is in Explorer's menu since the sutras-first change, and its Lost Scroll stays above Explorer; Pattern Wall, Teach the Apprentice and Estimation Bets read above Explorer for now, owner decision 2026-10-17)
   Colors are the design system's three accents: coral, teal and sun. */
export const SECTIONS = {
  dojo: { href: '#/dojo', label: 'Dojo' },
  arena: { href: '#/arena', label: 'Arena' },
  games: { href: '#/games', label: 'Games' },
  sutras: { href: '#/sutras', label: 'Sutras' }
};
const ALL = ['explorer', 'challenger', 'pro'], BIG = ['challenger', 'pro'];
export const PLAY = [
  { id: 'spells', route: '#/dojo/spells', section: 'dojo', modes: BIG, title: 'Sutra Spellbook', tag: 'Cast a trick with your finger', blurb: 'Every trick is a spell. Trace the method on the digits to break a number monster.', color: 'coral', icon: 'spells' },
  { id: 'locks', route: '#/dojo/locks', section: 'dojo', modes: BIG, title: 'Discovery Locks', tag: 'Find the trick before it finds you', blurb: 'Feed numbers to a machine, spot its secret, crack the lock. Then learn the sutra you just discovered.', color: 'teal', icon: 'locks' },
  { id: 'party', route: '#/arena/party', section: 'arena', modes: ALL, title: 'Party Mode', tag: 'Family math night', blurb: 'Two to four players on one screen. Buzz in, steal points, everyone at their own level.', color: 'sun', icon: 'party' },
  { id: 'ghosts', route: '#/arena/ghosts', section: 'arena', modes: ALL, title: 'Ghost Races', tag: 'Race your past self', blurb: 'Every run leaves a ghost. Beat yesterday, or send your ghost to a friend.', color: 'coral', icon: 'ghosts' },
  { id: 'daily', route: '#/arena/daily-number', section: 'arena', modes: ALL, title: 'Daily Number', tag: 'One puzzle a day', blurb: 'Six numbers, one target. Find a path, share your grid, come back tomorrow.', color: 'teal', icon: 'daily' },
  { id: 'tala', route: '#/games/tala', section: 'games', modes: ALL, title: 'Tala Lab', tag: 'Konnakol rhythm math', blurb: 'Clap 3 against 4 and hear them meet at 12. Build a tihai that lands on sam.', color: 'sun', icon: 'tala' },
  { id: 'art', route: '#/games/art', section: 'games', modes: ALL, title: 'Mandala Studio', tag: 'Math you can hang on a wall', blurb: 'Times-table mandalas, Meru-prastāra in color, Śulba rope geometry. Each one sings. Save it as a wallpaper.', color: 'coral', icon: 'art' },
  { id: 'wall', route: '#/games/wall', section: 'games', modes: BIG, title: 'Pattern Wall', tag: 'Name what you discover', blurb: 'Color a number grid, find a pattern, give it your name. Build a wall of your own rules.', color: 'sun', icon: 'wall' },
  { id: 'apprentice', route: '#/games/apprentice', section: 'games', modes: BIG, title: 'Teach the Apprentice', tag: 'Be the teacher', blurb: 'Your apprentice keeps making mistakes. Spot the wrong step and coach them to their belt.', color: 'coral', icon: 'apprentice' },
  { id: 'bets', route: '#/games/bets', section: 'games', modes: BIG, title: 'Estimation Bets', tag: 'How sure are you?', blurb: 'Guess with a range, bet your confidence chips, and learn how good your number sense really is.', color: 'teal', icon: 'bets' },
  { id: 'lens', route: '#/games/lens', section: 'games', modes: ALL, title: 'Math Lens', tag: 'The world is your puzzle', blurb: 'Point the camera at a plate, a clock or a receipt and get a challenge made from its digits.', color: 'teal', icon: 'lens' },
  { id: 'scroll', route: '#/sutras/lost-scroll', section: 'sutras', modes: BIG, title: 'The Lost Śulba Scroll', tag: 'A math mystery in chapters', blurb: 'Katapayadi ciphers, rope-and-peg locks and a scroll torn into pieces. New chapter every week.', color: 'sun', icon: 'scroll' }
];
export const playById = id => PLAY.find(e => e.id === id);
/* The experience a hash opens, and its params: '#/arena/ghosts/r/abc' -> [ghosts, ['r', 'abc']] */
export function playFor(hash) {
  /* Params come from a link: a malformed escape (a lone %) is kept as typed instead of throwing in the router */
  const dec = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };
  for (const e of PLAY) if (hash === e.route || hash.startsWith(e.route + '/')) return [e, hash.slice(e.route.length).split('/').filter(Boolean).map(dec)];
  return null;
}
/* Listed in a section for a Mode */
/* Whether a Mode may open an experience (a direct link included) */
export const playOpen = (e, mode) => e.modes.includes(mode || 'challenger');
export const playIn = (section, mode) => PLAY.filter(e => e.section === section && e.modes.includes(mode || 'challenger'));
