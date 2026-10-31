# Design

## Context

The game's router is the `routes` table in `js/app.js` (29 patterns). `render()` reads `location.hash`, picks a view, and shows the Mode picker instead when the Player has no Mode, except on Watch, the Sutras, a Deep dive, the Guide and Find. `modePicker.pending` keeps the asked-for route in memory, and `afterPick()` opens it after a Mode is picked only when it is one of the Mode's Find entries. Views write `#/` links in their template strings and set `location.hash` in about 20 places.

Hosting is Cloudflare Workers static assets on the free plan (`wrangler.jsonc`: `html_handling: "auto-trailing-slash"`, `not_found_handling: "404-page"`, Worker code only for `/_csp`). Cloudflare documents that `404-page` serves "the nearest `404.html`" with status 404, that `foo.html` is served at `/foo` (no slash) under `auto-trailing-slash`, and that `_redirects` supports splats, placeholders and status 200 rewrites to other paths of the site, up to 2,000 static and 100 dynamic rules, without running Worker code (developers.cloudflare.com, Workers static assets: "Routing" and "Redirects", read 2026-10-31).

`react-typescript` plans the same URLs under `/learn/` (its design D5, its `app-routing` and `hosting` deltas), with a Worker rendering every path that has no file. That needs Workers Paid (its task 0.8, open). This change takes the parts of that plan that need no server code and ships them now.

## Goals

- Every screen has one path that a person can share and a search engine can fetch, today, on the free plan.
- Public pages carry their own title, description, canonical link, Open Graph tags and readable text.
- A link opens exactly what it names, or says plainly why it cannot yet and what opens it.
- URLs change once: the paths this change publishes are the ones the React shell keeps.
- Moving between pages never feels like a reload (owner requirement, 2026-10-31).

## Non-goals

- Server rendering, React, or any Worker route. `react-typescript` keeps those.
- New content. The public articles are written from the catalogs the app already has.
- Changing what a view shows once the app has drawn it, what is stored, or what is sent.

## Route inventory

Every pattern in `js/app.js` `routes` on `main` (804e6df), with its path, how many prerendered pages it makes, whether it needs a Mode, whether it can be locked, and whether it is indexed. "Public" (D6) means it opens without a Mode.

| Hash route today | View | Path | Pages | Public | Lock | Indexed |
| --- | --- | --- | --- | --- | --- | --- |
| `#/` | `home` (Mode picker on a first visit) | `/learn/` | 1 | yes (the picker is its first-visit face) | no | yes |
| `#/learn` | `learnView`, the Skill map | `/learn/skills` (`/learn/learn` 301) | 1 | yes | no | yes |
| `#/grade/<g>` | `gradeView`, a level (K, 1 to 12, V) | `/learn/grade/<g>` | 14 | yes | no | yes |
| `#/skill/<id>` | `skillView`, lesson and Practice | `/learn/skill/<id>`, and `?problem=<level>-<seed>` (D8) | 136 | yes | no | yes (D5 for the 15 Trick lessons) |
| `#/mix/<g>` | `mixView`, Endless practice | `/learn/mix/<g>` | 14 | no | no | no |
| `#/mix/<g>/words` | `mixView`, only Word problems | `/learn/mix/<g>/words` | 14 | no | no | no |
| `#/run/<g>` | `mixView`, Endless run | `/learn/run/<g>` | 14 | no | no | no |
| `#/arcade` | `arcadeView` | `/learn/arcade` | 1 | yes | no | yes |
| `#/dojo`, `#/tricks` | `dojoView`, the Vedic Dojo | `/learn/dojo` (`/learn/tricks` 301) | 1 | yes | no | yes |
| `#/katas/<trick>` | `katasView`, a Trick's 50 Katas | `/learn/katas/<trick>` | 21 | no | no | no |
| `#/kata/<trick>/<n>` | `kataView` | `/learn/kata/<trick>/<n>` | 1,050 | no | Kata n-1 done | no |
| `#/star/<trick>/<n>` | `starView` | `/learn/star/<trick>/<n>` | 63 | no | no (as today) | no |
| `#/try` | `tryView`, Try a trick | `/learn/try` | 1 | no | no | no |
| `#/tower` | `towerView` | `/learn/tower` | 1 | no | no | no |
| `#/tower/<c>` | `chapterView` | `/learn/tower/<c>` | 40 | no | no | no |
| `#/challenge/<id>` | `challengeView` | `/learn/challenge/<id>` | 1,000 | no | a Medal on the one before, inside its chapter | no |
| `#/sutras` | `sutrasView` | `/learn/sutras` | 1 | yes | no | yes |
| `#/sutras/<id>` | Deep dive over `sutrasView` | `/learn/sutras/<id>` | 29 | yes | no | yes |
| `#/arena` | `arenaView` | `/learn/arena` | 1 | yes | no | yes |
| `#/duel` | redirect | `/learn/duel` 301 to `/learn/arena/party` | 0 | | | |
| `#/games` | `gamesView` | `/learn/games` | 1 | yes | no | yes |
| `#/game/<id>` | `gameView`, Ranked round | `/learn/game/<id>` | 15 | yes | no | yes |
| `#/game/<id>/<n>` | `gameView`, a Level | `/learn/game/<id>/<n>` | 1,080 | no | open by Rating or a Medal on n-1 | no |
| `#/watch` | `watchView` | `/learn/watch` | 1 | yes | no | yes |
| `#/places` | `placesView` | `/learn/places` | 1 | no | no | no |
| `#/tiles` | `home` with tiles | `/learn/tiles` | 1 | no | no | no |
| `#/me`, `#/progress` | `meView` | `/learn/me` (`/learn/progress` 301) | 1 | no | no | no |
| `#/guide`, `#/guide/<s>` | `guideView` (start, learn, tricks, play, extras) | `/learn/guide`, `/learn/guide/<s>` | 6 | yes | no | yes |
| `#/find` | `findView` | `/learn/find` | 1 | yes (as today) | no | no |
| `#/(dojo\|arena\|games\|sutras)/<exp>` | `playView`, 12 play experiences | `/learn/dojo/spells`, `/learn/arena/ghosts` and the rest | 12 | yes | Mode (`playOpen`, as today) | yes |
| same, with parameters | `playView` with `params` (a Ghost race code, an Art piece, a Wall card, a Locks chapter, an Arena challenge link) | `/learn/<section>/<exp>/<params>` | 0: a 200 rewrite to the experience's page (D4) | as its experience | as its experience | no (canonical to the experience) |
| anything else | `home` | `/learn/404.html` with 404 | 1 | | | no |

Totals: 3,522 prerendered route pages plus the 404 shell; 220 indexed (1 Home, 1 Skill map, 14 levels, 136 Skills, 1 Arcade, 1 Dojo, 1 Sutras, 29 Deep dives, 1 Arena, 1 Games, 15 games, 1 Watch, 6 Guide, 12 play experiences). "Dojo" in this codebase is the Vedic Dojo at `#/dojo`: the 21 speed Tricks grouped into seven Belts, each Trick with its lesson, 50 Katas and three Stars, plus the Dojo shelf of play experiences (Sutra Spellbook at `#/dojo/spells`, Locks at `#/dojo/locks`). Explorer's Arcade has no Dojo card, but the route opens in every Mode.

## Decisions

All owner-delegated, 2026-10-31, unless marked otherwise.

### D1. Ship it now as static files; no Worker CPU, not waiting on task 0.8

The alternative was to wait for `react-typescript` phase 2 (server rendering on Workers Paid). Indexability does not need it: every finite route can be a file, the open-ended ones are share codes a 200 rewrite can serve, and the app already draws every view in the browser. Static assets and `_redirects` run no Worker code and cost nothing on the free plan. So this change ships on the free plan, and task 0.8 gates only what truly needs the server (server rendering of Player-free markup for a faster first paint, the server voice, Duels).

Cost: 3,523 more files (about 18% of the 20,000 limit; the site publishes well under 1,000 today) and roughly 40 MB more uncompressed HTML in the deploy, which Cloudflare uploads once per changed file. Build time grows by a few seconds (one Node process writes every page).

### D2. URLs change once: `/learn/` and path routes now

The game moves from `/play/` to `/learn/` in the same release that switches to path routes, exactly as `react-typescript` task 2.10 planned, so that change's React shell inherits the URLs instead of changing them again. The path is the route without its `#` (`#/arena` is `/learn/arena`), with these choices:

- **No trailing slash** on any screen (`/learn/arena`, `/learn/sutras/s1`). The build writes `learn/arena.html`, which `auto-trailing-slash` serves at `/learn/arena` and answers `/learn/arena/` with a redirect to it. Home is `/learn/`. This amends `react-typescript`'s prerender requirement, which wrote `/learn/sutras/ekadhikena/` with a slash.
- **Ids as today** (`/learn/sutras/s1`, `/learn/skill/v-sq5`). A readable slug for search is the job of `trick-pages` (`/tricks/square-numbers-ending-in-5/`); changing game ids now would break every stored key that names them.
- **`/learn/skills` for the Skill map**, because `/learn/learn` reads as a mistake in a search result. `/learn/learn` and `#/learn` reach it.
- **Aliases become 301s** (`/learn/tricks`, `/learn/progress`, `/learn/duel`, `/learn/learn`), so each screen has one URL.

### D3. One route table; Legacy views change little

`js/paths.js` (pure, no DOM) holds one row per route: its pattern, its path form, its kind (for analytics, D11), whether it is public, whether it is indexed, its lock kind, and an enumerator of its finite values from the catalogs. Everything that needs a route reads it: the router, the hash shim, the prerender step, the sitemap, `metrics.routePath()` and the tests.

The router keeps matching route keys in today's `#/` form internally, so no view's pattern or body changes in the switch: `render()` derives the key from `location.pathname` (and `?problem=` from the query), and a delegated click handler turns any `a[href^="#/"]` into `history.pushState` to its path, then renders. `mount()` rewrites the `href` of each `#/` link it draws to the path, so links are real for middle-click, copy link and crawlers. A `hashchange` to `#/x` (a Legacy view setting `location.hash`) becomes `history.replaceState` to the path and a render. `popstate` renders. Views move to path links one at a time later, with `react-typescript`'s migration.

### D4. Prerendered pages

`tools/prerender/` (TypeScript, run by `build.py` with Node's type stripper, as `tools/build-sw.mjs` is) writes, for every path the route table enumerates, `_site/learn/<path>.html` from the published `learn/index.html`:

- the same document, header, nav, footer, scripts and stamps as `/learn/`, so every page shares one inline script set and `_headers` needs one rule for `/learn/*` (the build fails if any `/learn/` page's inline scripts differ; today's per-page rule would need 3,523 of Cloudflare's 100 rules);
- in `<head>`: `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph title, description, URL and the site's share image, `<meta name="robots" content="noindex, follow">` on pages that are not indexed (D5), and JSON-LD `BreadcrumbList` on indexed pages (`LearningResource` on a Skill lesson and a Deep dive);
- in `#view`: a public article, written by small pure renderers from the catalogs (`js/vedic.js`, `js/skills/`, `js/sutras.js`, `js/sutra-details.js`, `js/games.js`, `js/guide.js`, `js/play/catalog.js`, `js/ledes.js`): heading, lede and the page's own text (a Skill's idea, method and one worked example from `seeded()`; a Sutra's name, meaning, history and Worked examples; a game's description; a Guide section). Links in it are path links. Pages that are not indexed get the heading, one line and their breadcrumb links only.

With JavaScript on, the pre-paint script marks `<html>` and a style hides the article, so `#view` looks exactly as it does today until the app draws its view, and the app's first `mount()` replaces it: no flash, no layout shift, no change to the first contentful paint. With JavaScript off, a crawler or reader sees the article. A crawler that runs scripts sees the app's live view, which a public page now draws without a Mode (D6).

Unknown paths: `_site/learn/404.html` is the game's shell with `noindex` and no article; `404-page` serves it with status 404 for any path under `/learn/` with no file, and the app shows Home (or the Mode picker on a first visit), as an unknown hash does today. Open-ended share links get a 200 rewrite in `_redirects` (`/learn/arena/ghosts/* /learn/arena/ghosts 200`, `/learn/games/art/*`, `/learn/games/wall/*`, `/learn/dojo/locks/*`, `/learn/arena/day/* /learn/arena 200` for `arena-challenge-link`), one dynamic rule per experience that takes parameters (about 8 of 100). The app reads the parameters from the address as today.

### D5. What is indexed

Indexed, self-canonical, in `sitemap.xml`: the 220 public pages of the inventory. Not indexed (`noindex, follow`, not in the sitemap, still crawlable so the tag is seen): every numbered step (Kata, Star, tower challenge, game Level), the tower and its chapters, the Kata maps, the mixes and runs, Me, Places, the tiles, Try a trick, Find and the 404 shell. Their articles are thin by nature (a number and a map) and 3,300 near-duplicates would dilute the site.

The 15 Trick lessons (`/learn/skill/v-<trick>` for the Tricks `trick-pages` publishes) point their canonical at their Trick page and leave the sitemap once that Trick page is live, so the calculator page is the one search shows and the lesson is where it sends people to practice. Until then they are indexed like any Skill. An exact problem link (D8) is the lesson's own file, whose canonical is the lesson without the query.

`robots.txt` keeps `Allow: /` and its sitemap line (a `Disallow` would hide the `noindex` tag). `sitemap.xml` is the build's existing page list plus the indexed `/learn/` paths, generated from the route table. The landing page's `/play/` links become `/learn/`.

### D6. Public pages open without a Mode; the Mode picker comes before play

Today a first visit to almost any route shows the Mode picker, so a crawler that runs scripts sees the same picker on every URL and a person following a link to a Skill sees a question before the thing they clicked. The `sutras-first` change already opens Watch, the Sutras, the Deep dives, the Guide and Find without a Mode. This extends that set to every public route of the inventory.

On a public page with no Mode, the view draws in Challenger's words (the default `fx.t` already falls back to) without storing any Mode, and every control that starts a round, a Practice question or a game becomes "Pick who is playing", which opens the Mode picker; after a pick, the Player returns to the same page with the round's start in reach. A non-public link on a first visit opens the Mode picker, then the page that was asked for: `afterPick()` accepts any route of the table that the picked Mode can reach, not only Find entries. A locked target then shows the Locked screen (D7), and a play experience the Mode cannot open shows its "for older players" screen, as today. Nothing is guessed or stored before the pick.

The Age answer is not part of this: the game asks it at a Player's first would-be post to a World board (ADR 0006, GLOSSARY "Age answer"), and a deep link never skips or changes that.

### D7. The Locked screen

Today a locked Kata, tower challenge or game Level replaces the address with its map, which looks like a broken link. Instead, the route keeps its address and draws the Locked screen inside the normal page frame (breadcrumbs, the Sutra tag where the view has one):

- heading "<Kata 12> is locked" (Kata, Challenge, Level), and Explorer's "This one opens after Kata 11";
- one line naming the rule: "Finish Kata 11 to open it." / "Win a Medal on Challenge 36 to open it." / "Win a Medal on Level 8 to open it, or keep playing: Levels open as your skill grows.";
- a primary button to the first open step on the way (the first Kata not done, the first challenge in the chapter without a Medal, the highest open Level), and secondary links to the map and, for a Kata, the Trick's lesson.

The lock rules are exactly today's (`store.kataDone`, `store.medal`, `isOpen` in `gameView`); a first-time visitor has nothing done, so after the Mode picker, Kata 1, a chapter's first challenge and Level 1 open and the rest show the Locked screen. Stars stay open in every Mode as today. The screen is drawn in the browser from this device's records; the prerendered page is the same for everyone. A friend's link never unlocks anything (question Q2).

ADR 0006: nothing about a lock, a deep link or a prerendered page loads Firebase. Boards behave as they do today: a Player under 13 or with no Age answer sees Device boards only.

### D8. Exact problem links

`/learn/skill/<id>?problem=<level>-<seed>`, with `level` the Skill generator's level (1 to 3) and `seed` 1 to 8 characters of `[0-9a-z]`, opens the Skill's lesson with that question first in its Practice card. The question is `seeded(\`problem:<id>:<level>:<seed>\`, () => skill.gen(level))`, the same seam Katas use, so it is the same numbers and words for everyone, every time. A Skill whose generator does not reproduce from the seed (it reads anything but `Math.random`, or picks a story outside it) gets no link: `test/problem-link.test.mjs` generates each Skill twice per level and seed and fails on any difference, and the Skills that fail are listed as not linkable rather than fixed here. A malformed or out-of-range `problem` opens the lesson as usual.

After that question, Practice continues as usual. The Practice card gets a quiet "Copy link to this question" button that writes the link to the clipboard (a new seed per question, made with `Math.random` outside the seeded call) and says "Link copied". The link carries no Player data. The page's canonical is the lesson without the query.

### D9. Old links, forever

- `_redirects`: `/play /learn/ 301`, `/play/* /learn/:splat 301` (query kept by Cloudflare, fragment kept by the browser), the move's `/vedic-math` rules end at `/learn/`, and the four aliases of D2.
- A pre-paint inline script in every `/learn/` page: a fragment starting with `#/` is turned into its path with `location.replace`, keeping the query, before anything paints; `#view` (the skip link) and other fragments are left alone. The landing page's pre-paint script sends `#/x` straight to `/learn/x`; `/import/` sends Players to `/learn/`.
- At run time, a `hashchange` to `#/x` becomes the path without a reload (D3).

These rules are never removed. `react-typescript` 2.4 and 2.10 described the same behavior for the React shell; this change makes it live with Legacy code, and the React shell keeps it.

### D10. Offline and installing

- `app/src/sw/sw.ts` is registered with scope `/learn/`. Page loads under `/learn/` stay network first; the precache holds `/learn/` (the shell) and every file it loads, as `/play/` today, and none of the 3,522 route pages. Offline, any navigation under `/learn/` gets the saved `/learn/` shell, whose router draws the view for the path.
- The same `/sw.js` running under the old `/play/` scope takes a retiring branch: it keeps no cache of its own, answers each navigation with a redirect to the same path under `/learn/` (fragment kept by the browser), lets every other request through, and leaves the shared `lvm-*` caches (`lvm-voice`, `lvm-sounds`) to the `/learn/` worker.
- `manifest.webmanifest`: `start_url` `/learn/?source=pwa`, `scope` `/learn/`, shortcuts at `/learn/arena`, `/learn/skills` and `/learn/sutras`; `id` stays `/play/`, so installed apps update in place instead of appearing twice. An app installed before the switch starts at `/play/?source=pwa` and follows the 301.
- In the Installed app, links outside `/learn/` open in the browser, as links outside `/play/` do today.

### D11. Analytics

Route-view events keep their names (`math/view/arena`, `math/view/game/times-sprint/level`): `metrics.routePath()` takes the route key the router derived from the path. An old hash link sends one route view, after the address became the path. GoatCounter's page view of a cold load names the path without its query (`count.js` is given `location.pathname`), so problem seeds and share codes never reach it. Two new events (D8): `math/problem/copy/<skill>` when the link is copied and `math/problem/open/<skill>` when a problem link opens, with `<skill>` a catalog id, never the numbers.

### D12. Smooth moves between pages (owner requirement, 2026-10-31)

The owner, verbatim: "When you do move to the multi-page option, leverage the View Transitions API to have smooth transitions from one page to another and doesn't feel like there's a page reload."

**Which moves are documents and which are not.** Inside the game, every route change stays in one document after the first load, as today: audio, Read aloud, a running round's teardown, the play shell, the loaded module graph and any Firebase connection survive a move, and no page is fetched. Prerendered files are only entry points (a cold load, a search result, a shared link). Document loads happen between the game and the site's other pages (landing `/`, `/tricks/`, `/parents/`, `/teachers/`, the legal pages, `/import/`) and on a cold load.

**Same-document (the game's router).** `render()` runs its DOM update inside `document.startViewTransition(update)` when the browser has it and motion is allowed; focus and scroll run after `transition.updateCallbackDone`, so the heading gets focus as today. It skips the transition on the first render, on a redraw of the same route (Play again, Run again), and when the previous transition has not finished (the update then runs at once). The header (`view-transition-name: site-header`), the game's nav (`game-nav`) and the Player chip (`player-chip`) are named, so they stay still while `#view` cross-fades (180 ms, no slide). The React shell later uses React Router's `viewTransition` option on `Link` and `navigate`, which calls the same API.

**Cross-document (between pages).** Every page of the site opts in with `@view-transition { navigation: auto; }` in `theme/` (landing, Trick pages and grown-up pages) and in `math.css` (the game), with the same names on the shared header and nav, so moving from the landing page into `/learn/` keeps the header in place and fades the content. Breadcrumbs (`crumbs`) are named on pages that have them.

**Prefetch.** The landing page and each Trick page carry a speculation rules script that prefetches `/learn/` and the links into it on hover or press (`"eagerness": "moderate"`), document only. Never prerender: prerendering runs the game's start-up, which counts a page view and may write storage for a page the visitor never opened. Inside the game nothing is prefetched; the shell and its modules are already loaded or precached. The inline speculation rules join the build's script hashes for those pages.

**Reduced motion and Calm.** With `prefers-reduced-motion: reduce`, Pause motion or Calm on, the swap is instant: the router calls the update directly (no `startViewTransition`), and for document loads the stylesheet sets `@view-transition { navigation: none; }` under the reduced-motion query and a `pagereveal` handler skips the transition (`event.viewTransition.skipTransition()`) when the pre-paint script found Pause motion or Calm on (the `motion-paused` class it already sets, and a `calm` class it gains).

**Browser support** (MDN browser-compat-data 8.1.7, 2026-10-22): `document.startViewTransition` in Chrome 111, Safari 18 and Firefox 144; `@view-transition` and `pagereveal` in Chrome 126 and 123 and Safari 18.2, not in Firefox (bug 1860854); speculation rules in Chrome 109, in Safari 26.2 only behind a preference, in Firefox only in preview. Where a feature is missing, the code checks for it and the move is a plain swap or a plain navigation. No polyfill.

**Weight.** About 0.4 KB Brotli of CSS (the at-rule, four names, the 180 ms fade and the reduced-motion rule) and about 0.3 KB of JavaScript in the router; the speculation rules are about 0.2 KB on the landing and Trick pages only. The first-load gate measures it in the same pull request.

**Focus and scroll.** Same-document: as today (heading focused, unless the view placed focus; scrolled to the top; the first load moves no focus). Cross-document: the browser's own behavior for a new document (top of page, focus at the start), which the transition does not change.

### D13. Reconciling with `react-typescript`

This change makes live, with Legacy code, the URL and old-link behavior `react-typescript` planned for its React shell, so that change keeps the URLs and drops the work:

- **Superseded:** 2.4's hash shim, landing forward and `/import/` target (its nonce and header work stays, for server-rendered pages); 2.10 entirely (the `/learn/` move, `_redirects`, manifest, retiring `/play/` worker).
- **Amended:** 2.1 (`src/routes.ts` reads `js/paths.js`; `fixtures.ts` already takes both forms); 2.3 (static first stays; the Worker's server render is for paths with no file, which after this change are only unknown paths, so `/learn/404.html` is replaced by it then, and `/learn/nowhere` becomes 200 with `noindex` as that spec says; the 200 rewrites stay or move to the Worker); 2.5 and 2.6 (the shell, scope and fallback already exist at `/learn/`); 2.9 (done here); 5.3 (the Sutra and Guide pages are already prerendered with metadata; 5.3 renders them with React instead of the renderers in `tools/prerender/`).
- **Specs:** its `app-routing` delta's "Every screen has a path", "Old `/play/` links reach the same screen, forever", "Old hash links reach the same screen, forever", "Public pages are prerendered" and "The prerendered Mode picker is for first visits", and its `hosting` delta's "Old links reach the same screen", become MODIFIED requirements against this change's `game-urls` and `search-pages` once this change is archived, and are trimmed to what React adds. Task 1.2 does that edit right after approval.
- **Task 0.8 (Workers Paid)** no longer blocks anything in search. It still gates server rendering, the server voice and Duels.

### D14. Pull requests that can run in parallel

The switch itself (tasks 2.x) is one release: the paths, the shim, the move, the redirects, the worker and the manifest land together so URLs change once. They are built as separate pull requests into an integration branch `learn-paths` and merged to `main` together. Everything after the switch (articles, Mode-free public pages, the Locked screen, problem links) touches separate code and runs in parallel. View transitions inside the game need no paths and can start on day one.

## Risks and mitigations

- **A deep link drew the wrong view or a blank page.** `deep-links.spec.ts` opens every route kind by path, cold, with no Player, a new Player and a returning Player in each Mode, and fails on an empty `#view` or a console error.
- **Prerendered text drifts from the app.** The renderers read the same catalogs; `test/prerender.test.mjs` checks every page's title against the view's `document.title` rule and that every indexed page's article holds its catalog text.
- **Crawlers treat 3,300 `noindex` pages as wasted crawl.** They are linked only from maps and numbered steps, never from the sitemap, and each says `noindex`.
- **View transitions slow interactions.** The transition's update waits a frame for the old snapshot. The perf job's interaction gate (+20 ms) runs on the pull request; if it fails, the fade is shortened or skipped on the play shell's routes.
- **An old installed app or worker strands a Player.** The retiring `/play/` worker and the manifest `id` are covered by `offline.spec.ts` with a worker registered under `/play/` before the update, online and offline.
- **The 404 status on unknown paths is shown to a person.** It is not: the browser shows the app; only crawlers and link previews see 404, which is right for a path the game does not know.

## Open questions for the owner

At most three; each has a default this plan already follows.

- **Q1.** Public pages open without a Mode for a first-time visitor, with "Pick who is playing" where play starts (D6), instead of the Mode picker first. This changes the first-visit experience on 220 pages. Default: yes.
- **Q2.** A friend's shared link to a locked Kata, challenge or Level shows the Locked screen (D7); it never unlocks the step. Default: yes, locks stay earned.
- **Q3.** With search no longer waiting on it, is Workers Paid (react-typescript 0.8) still wanted now, for server rendering, the server voice and Duels? Default: yes, unchanged.
