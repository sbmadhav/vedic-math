# Proposal

> **Approval.** The owner asked on 2026-10-31: "I need all the routes to be indexable and searchable. Direct linkable to an exact problem or game or dojo if it is unlocked for that user." The same day the owner added: "When you do move to the multi-page option, leverage the View Transitions API to have smooth transitions from one page to another and doesn't feel like there's a page reload." Product calls in this change are made under the owner's standing delegation and marked "owner-delegated, 2026-10-31" in design.md. AGENTS.md still applies: nothing here is built until the owner approves this change, and merging its pull request counts as that approval.

## Why

Every screen of the game lives behind a fragment (`/play/#/arena`, `/play/#/skill/v-sq5`). A fragment is not a page to a search engine, so the whole game is one URL in the index: `sitemap.xml` lists `/play/` and eight grown-up pages, nothing else. A shared link to a Kata, a game Level or a Sutra works only because the app reads the fragment after it starts, and a crawler or a link preview sees the same empty shell for all of them.

The fix was planned in `react-typescript` (paths under `/learn/`, server rendering on Workers, prerendered Sutra pages), but its phase 2 waits on owner task 0.8 (Workers Paid) and has not started, and the prerendered Sutra pages are phase 4. Checked against `main` on 2026-10-31:

- **Nothing in the plan needs server code for indexability.** Every route of the game is either a fixed list (136 Skills, 29 Sutras, 15 games, 21 Tricks) or a bounded number (50 Katas per Trick, 1,000 tower challenges, 72 Levels per game). All 3,522 of them can be written as static HTML at build time, about 18% of Cloudflare's 20,000 file limit. Static files cost no Worker CPU and run on the free plan.
- **The few open-ended links are already shareable codes** (a Ghost race, an Art piece, a Wall card, an Arena challenge link). A `_redirects` rule with status 200 serves their section's page for them, and Cloudflare runs no Worker code for `_redirects`.
- **An exact problem is reproducible today.** `seeded()` in `js/levels.js` (mulberry32 on a hashed seed) already makes every Kata, Star and tower challenge the same for everyone; the same seam makes one Practice question from a Skill, a level and a seed.
- **Unlock rules exist but fail silently.** A link to Kata 12 before Kata 11 is done, a locked tower challenge or a locked game Level quietly replaces the address with its map (`location.replace` in `kataView`, `challengeView`, `gameView`). A friend's link looks broken.
- **A first-time visitor gets the Mode picker on almost every route**, so a crawler that runs scripts sees the picker, not the page. Only Watch, the Sutras, the Guide and Find open without a Mode today (`sutras-first`).

## What Changes

- **Every screen gets a path, once, under `/learn/`.** The game moves from `/play/` to `/learn/` with path routes now, using `react-typescript`'s URL scheme (`/learn/arena`, `/learn/sutras/s1`, `/learn/game/times-sprint/12`), so URLs change once and that change's later React shell keeps them. The Skill map is `/learn/skills` (not `/learn/learn`). One route table (`js/paths.js`) maps each route to its path and back, and lists every finite path for the build.
- **Old links keep working, forever.** `/play/*` answers 301 to the same path under `/learn/`, keeping the query; a `#/` fragment becomes its path before anything paints, on the game's pages and on the landing page; a Legacy view that still sets `location.hash` gets the path without a reload. Aliases (`/learn/tricks`, `/learn/progress`, `/learn/duel`, `/learn/learn`) answer 301 to their screen.
- **Prerendered pages for every route, no server code.** The build writes `_site/learn/<path>.html` for all 3,522 finite paths: the game's shell with that route's title, description, canonical link, Open Graph tags and `robots` line, and, for the 220 public pages, the page's text as plain HTML that reads with JavaScript off. The app takes over on load and draws the live view as today. Open-ended share links get their section's page through a 200 `_redirects` rule. Any other unknown path under `/learn/` gets `/learn/404.html`, the game's shell with status 404 and `noindex`, which opens Home.
- **Indexed or not, by design.** 220 public pages (Home, the Skill map, each level and Skill lesson, the Sutras and each Deep dive, the Guide and its sections, the Dojo, the Arena, Games and each game, the Arcade, Watch and the 12 play experiences) are indexed, self-canonical and in `sitemap.xml`. Every numbered step (Kata, Star, tower challenge, game Level), every Player page (Me, Places, Find, Try a trick, the tiles, the mixes and runs) and the 404 shell is `noindex, follow`. A Trick lesson points its canonical at its Trick page once `trick-pages` ships it. `robots.txt` stays open (a `noindex` page must be crawlable to be seen).
- **Public pages open without a Mode.** A first-time visitor on a public page sees the page itself, worded for a visitor, with "Pick who is playing" where a round would start. Starting anything that plays opens the Mode picker, then returns to that page. A non-public link opens the Mode picker first, then the page that was asked for (any route the picked Mode can open, not only Find entries as today).
- **The Locked screen.** A link to a Kata, tower challenge or game Level that is not open yet for this Player shows "Kata 12 is locked", why, and a button to the step that unlocks it, never a blank page and never a silent jump. The existing "for older players" screen keeps handling a play experience the Mode cannot open. Nothing about a lock ever loads Firebase (ADR 0006).
- **Exact problem links.** `/learn/skill/<id>?problem=<level>-<seed>` opens that Skill's lesson with that one question first, the same numbers and words for everyone, every time. The Practice card gets "Copy link to this question". The page's canonical stays the lesson, so problem links never compete with it in search.
- **Smooth moves between pages (owner requirement, 2026-10-31).** Inside the game, a route change stays in the same document and runs inside `document.startViewTransition`. Between the game and the site's other pages (landing, `/tricks/`, grown-up pages), cross-document view transitions (`@view-transition { navigation: auto; }`) keep the header and nav still while the content changes, and the landing and Trick pages prefetch `/learn/` with speculation rules. Reduced motion, Pause motion and Calm get an instant swap. Browsers without support get a plain navigation.
- **Offline and installing follow the move.** The service worker's scope becomes `/learn/`; any navigation under `/learn/` falls back to the saved shell offline; the old `/play/` worker retires itself. The web manifest's `start_url` and scope move to `/learn/` and its `id` stays, so installed apps update in place.

Unchanged: what every view shows and stores once it is drawn; the route-view event names; who may post and what is sent (ADRs 0002, 0006, 0008); the landing page and grown-up pages apart from their game links; `react-typescript`'s plan for React, server rendering and the Worker, which this change narrows (design D13).

## Capabilities

### New Capabilities

- `game-urls`: paths for every screen, the route table, old links, aliases, unknown paths, first visits on a deep link, the Locked screen, exact problem links, and the offline shell at paths.
- `search-pages`: the prerendered pages, their metadata, which pages are indexed, `sitemap.xml` and `robots.txt`.
- `page-transitions`: view transitions inside the game and between pages, prefetching, and the instant swap for reduced motion and Calm.

### Modified Capabilities

- `analytics`: "Route views are counted" now reads the route from the path; new requirement "Problem link counts".

## Impact

- New: `js/paths.js` (the route table, pure), `tools/prerender/` (TypeScript: the page writer and the public-article renderers, run by `build.py`), `learn/404.html` comes from the build.
- Moved: `play/index.html` to `learn/index.html` (AGENTS.md's stamps guardrail and the docs that name it are updated in the same pull request).
- `js/app.js`: the router reads the path, link clicks and hash writes become history navigations, the Mode picker's pending target, the Locked screen, the problem link, the view transition. `js/metrics.js`: route views from the route key. `app/src/sw/sw.ts`: scope, fallback, retiring branch. `manifest.webmanifest`: `start_url`, scope, shortcuts.
- `build.py`: the prerender step, one `_headers` rule for `/learn/*` (the 3,523 pages share one inline script set), `_redirects` rules, sitemap from the route table, the first-load budget measuring `/learn/`. `wrangler.jsonc`: unchanged (static assets, `404-page`, no new Worker route). `e2e/local-server.mjs`: nearest `404.html`, 200 rewrites, `.html` without a slash.
- `site/index.html`, `site/import/`, `theme/header.html` and every `/play/` link: point at `/learn/`. `trick-pages`: its "Practice this trick" and Deep dive links become `/learn/skill/v-<trick>` and `/learn/sutras/<id>`.
- `react-typescript`: tasks 2.4 and 2.10 superseded; 2.1, 2.3, 2.5, 2.6, 2.9 and 5.3 amended; its `app-routing` and `hosting` deltas lose the requirements this change makes live (design D13).
- Owner: submit the sitemap in Search Console after release (task 9.1). No new Cloudflare plan, secret or setting.
- Tests: `test/paths.test.mjs`, `test/prerender.test.mjs`, `test/problem-link.test.mjs`; new Playwright specs `old-routes.spec.ts`, `deep-links.spec.ts`, `locked.spec.ts`, `search-pages.spec.ts`, `transitions.spec.ts`; `e2e/tests/fixtures.ts` `open()` takes both URL forms.
