# Design

## Context

- `TRICKS` (`js/vedic.js:10`) gives each of the 21 Tricks a `sutra` string; there are 17 distinct strings (four Sutras have two Tricks: Ekādhikena Pūrvena, Nikhilam Navataścaramam Daśataḥ, Ānurūpyeṇa, Vilokanam; the three Ūrdhva Tiryagbhyām variants are separate strings, as decision 7 counts them). `BELTS` (`js/vedic.js:315`) lists 7 Belts of 3 Tricks in order.
- `star-round` stores Star state in `S.sky.lit` and `S.sky.skipped` (keys `<trick>:<n>`) and runs a round with `runStar(root, { trick, star, signal, back, findVideo })`.
- `sparks-replace-xp` stores done Katas in `S.katasDone` (keys `k:<trick>:<n>`).
- `beltProgress()` (`js/gamify.js:19`) is used by the Challenger home Dojo card, the Pro "Vedic Dojo" tile, `dojoView()`, `meView()` and three badges (`belt-white`, `belt-green`, `belt-black`).
- The router renders `home()` for `#/`; `metrics.view(hash, knownId, picker)` names route views from the hash (`js/metrics.js`).
- Motion: `fx.noMotion()` from `star-round` (reduced motion, `html.motion-paused`, Calm preference).
- Player records (`vm.players`) hold per-Player settings like `mode`, `age`, `parentOk`; progress records hold play data.

## Goals / Non-Goals

**Goals:**
- A Sky that is a real home: every Star reachable, the next one obvious, nothing locked.
- No Player loses a Belt or the credit for Katas already done.
- The plain list is a full alternative to the map.

**Non-Goals:**
- Default-on for everyone; Explorer; the tower Landmark; Placement's questions.

## Decisions

**1. Opt-in per Player, stored on the Player record.** `p.sky === true` turns it on; `skyOn(p) = (p.mode === 'challenger' || p.mode === 'pro') && (p.sky ?? SKY_DEFAULT)`, with `SKY_DEFAULT = false` in `js/sky.js`. The follow-up change that makes it the default flips the constant; a Player who switched it off (`sky: false`) stays off.
- The switch on the Me page: a `md-switch` (`role="switch"`), label "Try the new Sky", worded per Mode with `fx.t()`, only for Challenger and Pro.
- Rejected: a device-wide setting. Players on a shared tablet differ (decision 29 is per Player in spirit: "for Challenger and Pro").

**2. Constellations and layout.** `CONSTELLATIONS` is built from `TRICKS` grouped by `sutra`, in the order of first appearance in `BELTS` (so white belt Sutras come first). `SKY_LAYOUT` is a hand-placed table: for each Constellation, an anchor on the 27-sector nakshatra wheel (sector index 0 to 26, 17 used, spread so Belt neighbours are not adjacent) and, for each of its Stars, an offset from the anchor, in a 1000 × 1000 SVG viewBox. Lines join a Trick's Stars 1 to 2 to 3, and a Sutra's Tricks at their Star 1.
- The Sky is one inline SVG in a scroll container. On wide screens it fits; under 720 px it keeps a minimum width of 720 px and scrolls horizontally inside its container (never the page), and focusing a Star scrolls it into view.
- Stars are `<a>` elements with `href="#/star/<trick>/<n>"` and an accessible name "<Trick title>, Star n, lit | skipped | not lit yet", in path order in the DOM so Tab follows the suggested path.
- Parallax: three background star layers (small SVG pattern tiles) that shift a few pixels with pointer movement and scroll, through `life.on` on the view signal; twinkle and lighting use CSS animations. All stop under `fx.noMotion()` and the CSS blocks for `prefers-reduced-motion`, `html.motion-paused` and `body.calm`; a `sitemotion` listener re-checks.

**3. Path and the suggested Star.** `PATH` is the 63 Stars in Belt order (Belts in `BELTS` order, a Belt's Tricks in order, Stars 1 to 3). `suggested(state, startBelt = 'white')` returns the first Star in `PATH`, from the start Belt on, that is neither lit nor skipped; if none from there, it wraps to the start; if every Star is lit or skipped, the first skipped one; if all are lit, `null` (Bolt says every Star is lit). Bolt (`boltHTML('idle')`) sits beside it; a dotted `path` element joins it to the next two suggested Stars.
- Rejected: drawing all 63 Stars on one path. Belt order jumps across Constellations, so the full route is a web, not a path. The next three read as a route and match "the suggested path is still drawn".
- Rejected: Trick by Trick interleaving (Star 1 of each Belt Trick, then the Star 2s). Finishing a Trick before the next keeps one method in mind at a time, as the prototype does.
- Placement seam: `startBelt` comes from `store.player().placedBelt` when set; nothing sets it in this change.

**4. Belts by Stars, keeping old Belts.** `beltProgress()` returns, per Belt, `lit` (0 to 9 lit Stars of its Tricks), `earned` (`S.belts[id]` set, or all 9 lit) and `done` for display. When a Belt becomes earned by Stars, `S.belts[id]` is set too, so a Belt never goes back. Badges `belt-white`, `belt-green`, `belt-black` test `earned` and their `how` text says "Light all 9 white belt Stars" and "Earn the green belt" and "Earn the black belt".
- Copy that described the old rule changes: `dojoView()` lede ("Light all 9 Stars of a belt's three Tricks to earn it"), the Challenger home Dojo card ("Next Star: <Trick>, Star n", linking to the suggested Star), the Pro "Vedic Dojo" tile count, and the Me page stat.

**5. Migration, once per Player, every Mode.** `migrateSky(S)` runs from `gamify.init()` and after a Player switch, when `S.skyMigrated` is not set:
- For every Belt that `oldBeltEarned` (all 3 Tricks mastered, the current rule) says is earned, set `S.belts[id] = Date.now()`.
- For each of the 63 Stars, count `katasDone` in its third; if at least `Math.ceil(size / 2)` (9 for sizes 17, 8 for size 16) and the Star is not lit, light it with `S.sky.lit[key] = Date.now()` directly (not through the round, so no event and no Sparks).
- Set `S.skyMigrated = 1` and save.
- It runs for every Player (Explorer included) at release, so the Belt rule switches for all with nothing lost; it does not depend on the opt-in.
- `importData()` of an old backup runs it again (the flag is not in old backups).

**6. Landmarks.** Five labelled links at fixed points on the Sky's rim, each with a small token-coloured line drawing (race track, ring, arcade, observatory, library): `#/arena`, `#/duel`, `#/games`, `#/watch`, `#/learn`. The tower (Daily Sutra and Boards) is left out until the Daily Sutra exists; an empty rim slot is reserved for it.

**7. All places (`#/places`).** A plain page: a heading per Constellation (Sutra name and meaning), its Tricks, and their Stars as links with their state in words; then Landmarks; then Dojo, Sutra cards, Challenge tower, Me, and "The tile home" (the old home, rendered by `home({ tiles: true })`). Linked from a button on the Sky ("All places") and from the Me page. It is the accessible alternative to the map and is tested with axe.

**8. Home routing.** `home()` checks `skyOn(store.player())`: if on, `mount(skyView)`; else the current home. `render()` passes `skyOn` to `metrics.view` so the route view is `sky`. The header nav is unchanged.

**9. Back from a Star.** `starView()` sets `back = { href: '#/', label: 'Back to the Sky', focus: '<trick>:<n>' }` when `skyOn`; `skyView()` focuses that Star's link once (from a module variable set before navigation). Otherwise the `star-round` back target stays.

**10. Counts.** `metrics.starEvent(kind, trick)` with `kind` in `STAR_EVENTS = ['lit', 'skipped', 'comeback', 'dare_taken', 'dare_won']` and `trick` checked against `TRICKS`; sends `star/<kind>/<trick>` with a fixed title. `runStar()` calls it on the `lit`, `skipped`, `comeback`, `dare-won` events and when the Dare card is taken. Migration lights call nothing. The scan test in `test/metrics.test.mjs` covers the new call sites.

## Risks / Trade-offs

- [A Player loses visible Belt progress counts (3 Tricks mastered becomes "4 of 9 Stars")] → Earned Belts are kept, and Kata progress lights Stars; the counts are honest about the new rule.
- [Explorer Players' Belts now follow Stars, which Explorer cannot reach from its home] → Explorer has no Belt UI on its home; the Dojo is reachable by link and its Stars play with the Challenger layout. Explorer Constellations are a later change.
- [The map is hard to use on a small phone] → Horizontal scroll inside the container, focus scrolling, and All places as a full alternative.
- [Opt-in reaches few Players in two weeks] → The counts and route views measure it; the default flip is a separate decision.

## Migration Plan

1. Ship. On first load each Player's progress migrates once (Belts kept, Stars lit from Katas).
2. The Sky stays off until a Player turns it on.
3. Rollback: revert. `S.belts` and `S.skyMigrated` are ignored by older code; Belts fall back to the mastery rule (which is how they were earned before).

## Files touched

- New: `js/sky.js`, `js/sky-view.js`, `test/sky.test.mjs`, `e2e/tests/sky.spec.ts`
- `js/gamify.js`, `js/store.js`, `js/app.js`, `js/star.js`, `js/metrics.js`, `math.css`
- Tests: `test/gamify.test.mjs`, `test/metrics.test.mjs`, `test/store.test.mjs`, `test/lifecycle-scan.test.mjs`; `e2e/tests/analytics.spec.ts`, `a11y.spec.ts`, `modes.spec.ts`, `offline.spec.ts`, `routes.spec.ts`
- Docs: `docs/PLAN.md` "Where things stand" once shipped
