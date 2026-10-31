import { test, expect, APP, pathTo, appErrors, type Mode } from './fixtures';

/* Deep links (openspec change indexable-routes, task 2.1; game-urls spec, "Every screen has a path under /learn/").
   One path of every route kind, loaded cold (a new document with nothing but the address), draws its view, or the Mode
   picker on a first visit to a page that needs a Mode, with no console error and no empty #view, and the address bar
   shows the path, never a #/ fragment. Seven Players: none, a new one in each Mode, and a returning one (played on an
   earlier day) in each Mode. The Kata, challenge and Level here are the first ones, open to every Player; locked steps
   belong to locked.spec.ts (task 7.1). Until task 2.2 the game is served at /play/ (APP in fixtures.ts), and until 2.3
   the local server stands in for each path's prerendered page with the game's shell (e2e/local-server.mjs). */

/* [what it is, the path after APP, the address it ends at when that is another screen] */
const KINDS: [string, string, string?][] = [
  ['Home', ''],
  ['the Skill map', 'skills'],
  ['a level', 'grade/3'],
  ['a Skill lesson', 'skill/v-sq5'],
  ['Endless practice', 'mix/3'],
  ['only Word problems', 'mix/3/words'],
  ['Endless run', 'run/3'],
  ['the Arcade', 'arcade'],
  ['the Dojo', 'dojo'],
  ['a second name, tricks', 'tricks', 'dojo'],
  ["a Trick's Katas", 'katas/sq5'],
  ['a Kata', 'kata/sq5/1'],
  ['a Star', 'star/sq5/1'],
  ['Try a trick', 'try'],
  ['the tower', 'tower'],
  ['a chapter', 'tower/1'],
  ['a challenge', 'challenge/1'],
  ['the Sutras', 'sutras'],
  ['a Deep dive', 'sutras/s1'],
  ['the Arena', 'arena'],
  ['Games', 'games'],
  ['a game', 'game/times-sprint'],
  ['a Level', 'game/times-sprint/1'],
  ['Watch', 'watch'],
  ['Places', 'places'],
  ['the tiles', 'tiles'],
  ['Me', 'me'],
  ['the Guide', 'guide'],
  ['a Guide section', 'guide/around'],
  ['Find', 'find'],
  ['a play experience', 'dojo/spells'],
];
/* Eight paths a test, so each stays well inside its budget and a failure names the path */
const CHUNK = 8;
const chunks: typeof KINDS[] = [];
for (let i = 0; i < KINDS.length; i += CHUNK) chunks.push(KINDS.slice(i, i + CHUNK));

const MODES: Mode[] = ['explorer', 'challenger', 'pro'];
const PLAYERS: [string, Mode | null, Record<string, unknown> | null][] = [
  ['no Player', null, null],
  ...MODES.map((m): [string, Mode, null] => [`a new ${m[0].toUpperCase()}${m.slice(1)}`, m, null]),
  ...MODES.map((m): [string, Mode, Record<string, unknown>] => [`a returning ${m[0].toUpperCase()}${m.slice(1)}`, m, { days: { '2026-01-05': 3 } }]),
];

for (const [who, seedMode, seedProgress] of PLAYERS) {
  test.describe(who, () => {
    test.use({ seedMode, seedProgress });
    for (const [i, group] of chunks.entries()) {
      test(`opens ${group.map(k => k[0]).join(', ')} cold by path (${i + 1} of ${chunks.length})`, async ({ page, issues }) => {
        for (const [what, rest, endsAt] of group) {
          await test.step(`${what}: ${APP}${rest}`, async () => {
            const errorsBefore = appErrors(issues).length;
            const res = await page.goto(APP + rest);
            expect(res?.status(), `${APP}${rest} is served`).toBe(200);
            await expect(page.locator('#view h1, #view h2').first(), `${APP}${rest} draws a view`).toBeVisible();
            expect((await page.locator('#view').innerText()).trim(), `${APP}${rest} has an empty #view`).not.toBe('');
            /* The address is the path: no fragment, and the screen's own path unless the view opened another screen */
            const u = new URL(page.url());
            expect(u.hash, `${APP}${rest} left a fragment in the address`).toBe('');
            expect(u.pathname.startsWith(APP), `${APP}${rest} left the game`).toBe(true);
            if (endsAt) expect(u.pathname).toBe(pathTo('#/' + endsAt));
            else if (rest !== 'mix/3/words') expect(u.pathname).toBe(APP + rest); /* only Word problems may open the mix while the stories load */
            expect(appErrors(issues).slice(errorsBefore), `${APP}${rest}: console errors`).toEqual([]);
          });
        }
      });
    }
  });
}
