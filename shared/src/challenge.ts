/* Challenge links (openspec change arena-challenge-link): /learn/arena/day/<YYYY-MM-DD>/<league>/<score>, the path of the route #/arena/day/... (indexable-routes). The date and the
   League are the whole recipe for a daily round (questions.ts dailySet), so a link reproduces the sharer's round exactly,
   and the Score is the one to beat; nothing else is carried (design D1 and D3). Pure: the Arena view (js/app.js) reads
   the link through js/arena.js, and a Duel's server can check the same link. */
import { ROUND_SECS, type League } from './questions.ts';
import { SITE, APP_BASE } from './site.ts';

export const LEAGUES: readonly League[] = ['explorer', 'challenger', 'pro'];
/* The Mode names, as js/fx.js MODES spells them (test/arena.test.mjs pins the two together) */
export const LEAGUE_NAMES: Readonly<Record<League, string>> = { explorer: 'Explorer', challenger: 'Challenger', pro: 'Pro' };
export const MAX_CHALLENGE_SCORE = 9999;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface Challenge {
  /* The link's local date, YYYY-MM-DD */
  day: string;
  league: League;
  /* The Score to beat, or null when the link has no Score part or one the parser rejects */
  score: number | null;
  /* True only on the link's own date in the Player's own League (design D2); the Arena checks it again at Start */
  ranked: boolean;
}
export interface ChallengeResult {
  league: League | string;
  day: string;
  score: number;
  right: number;
  wrong: number;
  bestCombo: number;
}

const isLeague = (s: string): s is League => (LEAGUES as readonly string[]).includes(s);

/* A real calendar date written YYYY-MM-DD (2026-02-30 is not one) */
export function realDay(day: unknown): boolean {
  const m = DAY_RE.exec(String(day ?? '')); if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/* parts: what follows #/arena/day/ ([day, league] or [day, league, score]); today: the Player's local date (js/cloud.js
   dayId); league: the Player's League. Returns the Challenge, or null when the date or League does not parse (the Arena
   then opens its plain lobby, as #/arena does). score is null unless the part is a whole number from 0 to 9999 (design D3). */
export function parseChallenge(parts: unknown, today: string, league: string): Challenge | null {
  const p = Array.isArray(parts) ? (parts as unknown[]).filter((x): x is string => typeof x === 'string' && x !== '') : [];
  if (p.length < 2 || p.length > 3) return null;
  const [day, lg, sc] = p as [string, string, string?];
  if (!realDay(day) || !isLeague(lg)) return null;
  const score = sc !== undefined && /^\d{1,4}$/.test(sc) ? Number(sc) : null;
  return { day, league: lg, score, ranked: day === today && lg === league };
}

/* The one canonical link, always with its three parts (design D1); the Score is clamped to what the parser takes */
export const challengeUrl = ({ day, league, score }: { day: string; league: string; score?: number | null }): string =>
  `${SITE}${APP_BASE}arena/day/${day}/${league}/${Math.min(MAX_CHALLENGE_SCORE, Math.max(0, Math.round(Number(score) || 0)))}`;

/* What Challenge a friend hands the share sheet (design D4 and D5): a title, three lines of words (the site, the round,
   the League and the date; the Score and its parts; the invitation) and the link. The same words in every Mode: the
   reader is the friend, and the League name already says which Mode. No Nickname, Rating, emoji, em dash, Sutra or Trick. */
export function challengeShare({ league, day, score, right, wrong, bestCombo }: ChallengeResult): { title: string; text: string; url: string } {
  const name = isLeague(league) ? LEAGUE_NAMES[league] : LEAGUE_NAMES.challenger;
  return {
    title: 'Learn Vedic Math',
    text: `Learn Vedic Math: Arena daily challenge, ${name} League, ${day}\nScore ${score}: ${right} right, ${wrong} missed, best combo ${bestCombo}x\nThe same questions for every ${name} today, ${ROUND_SECS} seconds, no sign-in. Can you beat it?`,
    url: challengeUrl({ day, league, score })
  };
}
/* The text a Player pastes when there is no share sheet: the three lines, then the link (what js/play/kit.js share copies) */
export const challengeText = (r: ChallengeResult): string => { const s = challengeShare(r); return `${s.text}\n${s.url}`; };
