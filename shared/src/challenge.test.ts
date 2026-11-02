/* Challenge links (openspec change arena-challenge-link, tasks 1.1 and 1.2): the share text is three lines of words and the
   link, the same shape in every League, with nothing personal in it; a link parses to the sharer's round and is Ranked
   only on its own date in the Player's League. The checks that need the game's own catalogs (Sutra and Trick names, the
   Mode names, the play catalog) stay in test/arena.test.mjs. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LEAGUES, LEAGUE_NAMES, MAX_CHALLENGE_SCORE, realDay, parseChallenge, challengeUrl, challengeShare, challengeText, type Challenge } from './challenge.ts';
import { dailySet, ROUND_SECS } from './questions.ts';
import { ADJ, NOUN } from './names.ts';
import { SITE, APP_BASE } from './site.ts';

const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|‍|️/u;
const SHARE = { league: 'challenger', day: '2026-10-30', score: 240, right: 14, wrong: 2, bestCombo: 9 };
const parts = (url: string) => url.split('#/arena/day/')[1]!.split('/');

test('challengeText: three lines of words and the link, the same shape in every League (design D4)', () => {
  assert.equal(ROUND_SECS, 60);
  const want: Record<string, string> = {
    explorer: 'Learn Vedic Math: Arena daily challenge, Explorer League, 2026-10-30\nScore 240: 14 right, 2 missed, best combo 9x\nThe same questions for every Explorer today, 60 seconds, no sign-in. Can you beat it?\nhttps://learnvedicmath.com/play/#/arena/day/2026-10-30/explorer/240',
    challenger: 'Learn Vedic Math: Arena daily challenge, Challenger League, 2026-10-30\nScore 240: 14 right, 2 missed, best combo 9x\nThe same questions for every Challenger today, 60 seconds, no sign-in. Can you beat it?\nhttps://learnvedicmath.com/play/#/arena/day/2026-10-30/challenger/240',
    pro: 'Learn Vedic Math: Arena daily challenge, Pro League, 2026-10-30\nScore 240: 14 right, 2 missed, best combo 9x\nThe same questions for every Pro today, 60 seconds, no sign-in. Can you beat it?\nhttps://learnvedicmath.com/play/#/arena/day/2026-10-30/pro/240'
  };
  for (const league of LEAGUES) {
    assert.equal(challengeText({ ...SHARE, league }), want[league], league);
    const s = challengeShare({ ...SHARE, league });
    assert.equal(s.title, 'Learn Vedic Math');
    assert.equal(`${s.text}\n${s.url}`, want[league], 'what the share sheet gets, joined as the clipboard copy is');
    assert.equal(s.text.split('\n').length, 3);
    assert.ok(s.text.includes(`${LEAGUE_NAMES[league]} League`));
  }
  assert.equal(challengeShare({ ...SHARE, league: 'proV1' }).text.split('\n')[0], 'Learn Vedic Math: Arena daily challenge, Challenger League, 2026-10-30', 'an unknown League reads as Challenger, the default Mode');
});

test('challengeText holds nothing personal: no emoji, em dash, Nickname word, Rating or Player id (design D3, D4)', () => {
  assert.ok(ADJ.length >= 10 && NOUN.length >= 10);
  for (const league of LEAGUES) for (const score of [0, 10, 240, 9999]) for (const combo of [0, 1, 9, 80]) {
    const text = challengeText({ ...SHARE, league, score, bestCombo: combo });
    assert.doesNotMatch(text, EMOJI, text);
    assert.doesNotMatch(text, /—|&mdash;/, 'no em dash');
    for (const w of [...ADJ, ...NOUN]) assert.doesNotMatch(text, new RegExp(`\\b${w}\\b`, 'i'), `Nickname word ${w}`);
    assert.doesNotMatch(text, /rating|\bp1\b|\bage\b|avatar|teal|coral/i, text);
  }
});

test('challengeUrl: SITE, APP_BASE and always three parts, the Score clamped to 0 to 9999 (design D1, D3)', () => {
  assert.equal(SITE, 'https://learnvedicmath.com');
  assert.equal(challengeUrl({ day: '2026-10-30', league: 'challenger', score: 240 }), `${SITE}${APP_BASE}#/arena/day/2026-10-30/challenger/240`);
  assert.equal(challengeUrl({ day: '2026-10-30', league: 'pro', score: 12000 }), `${SITE}${APP_BASE}#/arena/day/2026-10-30/pro/${MAX_CHALLENGE_SCORE}`);
  assert.equal(challengeUrl({ day: '2026-10-30', league: 'explorer', score: -3 }), `${SITE}${APP_BASE}#/arena/day/2026-10-30/explorer/0`);
  assert.equal(challengeUrl({ day: '2026-10-30', league: 'explorer', score: null }), `${SITE}${APP_BASE}#/arena/day/2026-10-30/explorer/0`);
  assert.equal(challengeUrl({ day: '2026-10-30', league: 'explorer', score: 36.4 }), `${SITE}${APP_BASE}#/arena/day/2026-10-30/explorer/36`);
  /* The link the app writes is one the app reads back */
  const url = challengeUrl({ day: '2026-10-30', league: 'challenger', score: 240 });
  assert.deepEqual(parseChallenge(parts(url), '2026-10-30', 'challenger'), { day: '2026-10-30', league: 'challenger', score: 240, ranked: true } satisfies Challenge);
});

test('parseChallenge: Ranked only on its own date in the Player\'s League, else Practice (design D2)', () => {
  const link = ['2026-10-30', 'challenger', '240'];
  assert.deepEqual(parseChallenge(link, '2026-10-30', 'challenger'), { day: '2026-10-30', league: 'challenger', score: 240, ranked: true });
  assert.deepEqual(parseChallenge(link, '2026-10-30', 'pro'), { day: '2026-10-30', league: 'challenger', score: 240, ranked: false }, 'another League');
  assert.deepEqual(parseChallenge(link, '2026-10-31', 'challenger'), { day: '2026-10-30', league: 'challenger', score: 240, ranked: false }, 'another day (a time zone ahead)');
  assert.deepEqual(parseChallenge(link, '2026-10-29', 'challenger'), { day: '2026-10-30', league: 'challenger', score: 240, ranked: false }, 'another day (behind)');
  assert.equal(parseChallenge(['2026-10-30', 'challenger'], '2026-10-30', 'challenger')?.ranked, true, 'no Score part is still the daily challenge');
  for (const lg of LEAGUES) assert.equal(parseChallenge(['2026-10-30', lg], '2026-10-30', lg)?.league, lg);
});

test('parseChallenge: the Score part is a whole number from 0 to 9999 or null; no Score part is null (design D3)', () => {
  const at = (sc: string) => parseChallenge(['2026-10-30', 'challenger', sc], '2026-10-30', 'challenger');
  assert.equal(parseChallenge(['2026-10-30', 'challenger'], '2026-10-30', 'challenger')?.score, null);
  assert.equal(at('0')?.score, 0); assert.equal(at('240')?.score, 240); assert.equal(at('9999')?.score, 9999); assert.equal(at('0036')?.score, 36);
  for (const bad of ['99999', '-5', '24.5', 'lots', '1e3', ' 240', '240 ', '0x10', 'NaN', 'Infinity', '٢٤٠']) assert.equal(at(bad)?.score, null, bad);
  assert.equal(at('')?.score, null, 'a trailing slash leaves an empty part, which is no Score');
  assert.equal(at('lots')?.ranked, true, 'a bad Score does not unrank the link');
});

test('parseChallenge: a date or League that does not parse gives null, as #/arena does', () => {
  for (const p of [['yesterday', 'wizard', 'lots'], ['yesterday', 'challenger'], ['2026-10-30', 'wizard'], ['2026-13-01', 'pro'], ['2026-02-30', 'pro'], ['26-10-30', 'pro'], ['2026-1-5', 'pro'], ['20261030', 'pro'],
    ['2026-10-30'], [], ['2026-10-30', 'challenger', '240', 'more'], ['2026-10-30', 'Challenger'], ['2026-10-30', 'proV1'], ['2026-10-30', 'challenger ']]) assert.equal(parseChallenge(p, '2026-10-30', 'challenger'), null, JSON.stringify(p));
  assert.equal(parseChallenge(null, '2026-10-30', 'challenger'), null);
  assert.equal(parseChallenge(undefined, '2026-10-30', 'challenger'), null);
  assert.equal(parseChallenge('2026-10-30/challenger/240', '2026-10-30', 'challenger'), null, 'parts, not the hash');
  assert.equal(parseChallenge([2026, 'challenger'], '2026-10-30', 'challenger'), null, 'strings only');
  assert.equal(realDay('2026-02-28'), true); assert.equal(realDay('2026-02-29'), false); assert.equal(realDay('2028-02-29'), true); assert.equal(realDay(null), false);
});

test('a parsed link deals the sharer\'s round: dailySet(parsed.league, parsed.day) is the same set (design D1)', () => {
  for (const league of LEAGUES) for (const day of ['2026-10-14', '2026-10-30', '2027-03-08']) {
    const p = parseChallenge(parts(challengeUrl({ day, league, score: 240 })), '2026-10-30', 'pro')!;
    assert.equal(JSON.stringify(dailySet(p.league, p.day)), JSON.stringify(dailySet(league, day)), `${league} ${day}`);
    assert.notEqual(JSON.stringify(dailySet(p.league, p.day)), JSON.stringify(dailySet(league, '2026-10-31')), 'another day is another set');
  }
});
