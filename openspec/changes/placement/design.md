# Design

## Context

- The owner's answers Q1 to Q16 (`_handoff/RESUME.md`, accepted 2026-10-17) are the requirements. Each decision below names the answer it implements.
- Ratings (today `js/adapt.js`): one 1 to 20 number per game (`game:<id>`), Arena League (`arena:<league>`) and Skill (`skill:<id>`, Tricks are `skill:v-<trick>`). `rating(key, mode, fallback)` returns the saved Rating, else `fallback`, else `START[mode]` (1, 5, 9). `skillRating(id, mode)` uses the mastery band for Skills practiced before Ratings existed. A game's Rating is shared by its Practice and Ranked rounds.
- Skills (today `js/skills/index.js`): 13 school grades, K to 12, 8 to 10 Skills each, each with `gen(lv)` for levels 1 to 3. `AD.levelFor(rating)` maps a Rating to a generator level (1 to 7 is 1, 8 to 13 is 2, 14 to 20 is 3).
- Bolt's path (today `js/sky.js`): `startBeltOf(player)` already reads `player.placedBelt` ("Placement is a later change"); `sky-home`'s spec says "When a Placement result names a starting Belt, the path SHALL start at that Belt."
- Explorer Practice already turns small whole-number answers into big buttons (today `practice()` in `js/app.js`, 4 choices). Explorer is not offered Stars (`star-round`).
- `hook-first-star` (not started) planned the Hook inside a new Player's first Star, for Challenger and Pro, on 11 Tricks with an honest calculator race.
- After the `react-typescript` migration (this design was re-planned for it on 2026-10-21, its task 12.2) the game is at `https://learnvedicmath.com/learn/` with path routes, rendered by React Router in a Cloudflare Worker (its D4, D5). Placement is `/learn/placement`. An old `#/placement` link reaches it through the hash shim (its D5).
- Module names in this design are those after that migration (its D6, D11). Today's file, where it differs:

| Today | After `react-typescript` |
|---|---|
| `js/adapt.js` (`levelFor` moves out) | `app/src/logic/adapt.ts` (`levelFor` in `shared/src/questions.ts`) |
| `js/skills/*`, `js/vedic.js` | `shared/src/skills/*`, `shared/src/vedic.ts` |
| `js/store.js`, `js/fx.js` (`MODES`, `noMotion`, `announce`), `js/sky.js`, `js/metrics.js`, `js/voice.js` | `app/src/logic/store.ts`, `fx.ts` and `settings.ts`, `sky.ts`, `metrics.ts`, `voice.ts` |
| `js/star.js` (`starRound`, `starIntro`, `runStar()`) | `app/src/logic/star.ts` (pure) and `app/src/views/star/` (the round) |
| `js/app.js` `modePicker()`, `home()`, `gradeView()`, `practice()`, `meView()`, `parentNote()` | `app/src/shell/ModePicker.tsx`, `app/src/views/home/`, `app/src/views/learn/`, `app/src/views/me/` |
| `js/life.js` (`on`, `later`, `child`) and `test/lifecycle-scan.test.mjs` | `app/src/hooks/` (`useAbortSignal`, `useTimer`, `useInterval`, `useRound`) and the `no-bare-lifecycle` lint rule |
| `test/*.test.mjs` (`node --test`) | Vitest, `*.test.ts` next to each module |
| `import('/js/store.js')` in e2e specs | `mod(page, 'store')` (`e2e/tests/fixtures.ts`) |

- Server rendering (`react-typescript` D14): the server renders the document, the shell and every part of a view that is the same for every visitor; anything that depends on a Player's data renders in the browser after start-up, inside `ClientOnly`. The store's server snapshot has no Players. Routes have no server loader or action. Start-up side effects run once, after hydration (its B7), and the app runs under Strict Mode in development (its B9).
- `try-trick-teaches` (shipped, not yet archived) shows a worked example card first when Try a trick opens its Star (`starIntro()`, the Star round's `intro` option). Its decision 4 says how `placement` absorbs that card.

## Goals / Non-Goals

**Goals:**
- A short, untimed, friendly climb that finds where Practice should start, for any child in any Mode, including children well ahead of their age group.
- No change at all for a Player who skips it.
- Nothing about it is sent anywhere. The saved result moves only inside the Player's own progress, by the backup code or the progress hand-off a person starts on purpose (decision 11).

**Non-Goals:**
- Diagnosing gaps per area (Q9).
- Changing who competes with whom (Q7).
- Asking for age or grade (`age-bands` does that, later and separately).

## Decisions

**1. Names.** The thing a Placement finds is the **Placement level** in code, docs and the glossary, because **Level** already names a game's 72 stages (and the glossary bans "level" for Belt, Rating and Title). The owner's word "Level" survives in kid copy only as "your level" in the offer ("Want to find your level?"). The Player sees **steps**; grown-ups see "about grade N" (Q12). In code (`app/src/logic/store.ts`): `S.placement = { grade, steps, at }` where `grade` is `'K'` or `'1'` to `'12'` (strings, like `GRADES` ids), `steps` is the number of steps climbed, `at` the time.

**2. The steps (Q4, Q8).** `STEPS = ['K', 1, 2, ..., 12]`, 13 steps, one per school grade. Each step draws from `PLACEMENT_POOL[grade]`, a hand-picked list of that grade's Skills whose level-2 question:
- has a whole-number answer or is a choice question (so Explorer's 3 choices can always be built, decision 4);
- needs no lesson or picture that only makes sense after the Skill's intro;
- has spoken words (`say` or `q`) that read correctly (`voice-wording`'s table).

Initial pool (the builder confirms each with the test in task 1.2):

| Step | Skills |
|---|---|
| K | k-count, k-next, k-add10, k-sub10, k-compare |
| 1 | 1-add20, 1-missing, 1-tens, 1-doubles |
| 2 | 2-add100, 2-sub100, 2-skip, 2-place |
| 3 | 3-mult, 3-div, 3-multtens, 3-twostep |
| 4 | 4-mult2, 4-angles, 4-factors |
| 5 | 5-fracdiv, 5-order, 5-volume |
| 6 | 6-ratio, 6-percent, 6-gcf, 6-integers, 6-onestep |
| 7 | 7-intops, 7-twostep, 7-anglepairs |
| 8 | 8-roots, 8-pyth, 8-multistep, 8-exprules |
| 9 | 9-funceval, 9-seq |
| 10 | 10-triangle, 10-polygon |
| 11 | 11-logs, 11-expeq, 11-remainder, 11-counting |
| 12 | 12-limits, 12-chain, 12-vectors |

Every step has at least 2 Skills, so the second try at a step is a different Skill from the first. A question whose level-2 answer comes out non-integer is drawn again (at most 20 tries, then the next Skill). Questions are generated at level 2, the middle of the grade.

**3. The climb (Q4).** A pure state machine in `app/src/logic/placement.ts`, like `starRound`, with no React, DOM or storage in it:
- `placementStart({ mode, rand })`: the start step is the Mode's first grade (`MODES[mode].grades[0]`: Explorer K, Challenger 3, Pro 8).
- `placementAnswer(state, ok)`: right climbs one step and resets the misses at that step; a miss stays on the step and asks a different Skill; the second miss at the same step ends the climb. It also ends after 12 questions, or after a right answer at step 12 (there is nothing higher).
- The Placement level is the highest step answered right. When no step was answered right, it is the step below the start (Challenger: 2, Pro: 7), and K for Explorer.
- `steps` is the number of right answers (each right answer is one step up).
- No clock, no Sparks, no hints and no "Show me": it measures, it does not teach. A miss gets a neutral line ("Let's try a different one."), never the answer. Every question has an "I'm not sure" button, which counts as a miss, so a child who cannot read the question is not stuck.
- With 12 questions an Explorer starting at K can reach grade 11 at most; that is fine (Q4's "no ceiling" means no Mode cap).
- Rejected: a binary search over grades (fewer questions, but the first questions would be hard and discourage young children); a timer (slow readers would be placed low).

**4. Explorer's 3 choices (Q10).** `threeChoices(p, rand)`: for a whole-number answer, the answer plus 2 distinct non-negative distractors drawn from answer ± 1, ± 2, ± 10 and the digits swapped, shown in ascending order; for a choice question, the answer plus 2 of its other choices, in their original order. Big buttons, Explorer's look, at every step including algebra (decision 2 keeps every pool answer a number or a choice). Challenger and Pro use their usual entry (the Skill view's answer entry and `app/src/components/Keypad.tsx`), which handles every pool question.

**5. Read aloud (Q16).** In Explorer, the question is spoken (`speakQuestion(p)` in `app/src/logic/voice.ts`) when it appears. The first question appears after the Start tap and every next one after an answer tap, so speech still always follows a tap (glossary, Read aloud). The call is made in the Start and answer tap handlers, for the question the tap reveals, never from a render or a mount effect: a browser blocks speech that does not follow a gesture, and Strict Mode runs mount effects twice in development (`react-typescript` B9), which would speak twice. A replay button ("Hear it again") is always shown. If the Player turned Read aloud off in Me, the question is not read automatically; the replay button still reads it. Challenger and Pro: read only on the Hear it button. With `better-voice` Part B the voice is the Studio voice: Placement's fixed lines (offer, buttons, neutral lines) are added to its whole-line list. Questions and the result ("You climbed {n} steps!") hold numbers, so they are Server lines from sentence templates in `shared/src/voice-text.ts` once the server voice is on (`react-typescript` D16 and its voice order), else studio clips, else the device's voice. Without Part B the device's voice reads.

**6. What the Placement level sets (Q5, Q7).** Only where Practice starts, never Ranked rounds:

| What | Without Placement (today) | With a Placement level L |
|---|---|---|
| Game or Arena Practice, no Rating yet | `START[mode]` | `LEVEL_START[L]` |
| Skill or Trick Practice (Practice, Endless runs, Stars), no Rating yet | `START[mode]` (or the mastery band) | the mastery band if the Skill was practiced before Ratings, else `skillStart(skillGrade, L)` |
| Ranked round, no Rating yet | `START[mode]` | `START[mode]` (unchanged) |
| Skill map "Suggested" | the Mode's grades | L - 1, L and L + 1 (within K to 12), headed "Suggested for you" |
| Bolt's start Belt (Challenger, Pro) | white | `beltFor(L)` |
| Explorer home | 8 fixed tiles | a "Start here" tile first: the first unmastered Skill of step L |

`LEVEL_START` (games and Arena): K 1, 1 2, 2 3, 3 5, 4 6, 5 7, 6 8, 7 8, 8 9, 9 10, 10 11, 11 12, 12 13. It is anchored so that each Mode's first grade gives exactly that Mode's `START` (K is 1, 3 is 5, 8 is 9): a Player placed at their Mode's start gets today's behavior.

`skillStart(g, L)`: a Skill below L starts at 10 (generator level 2), a Skill at L at 5 (level 1, near the top), a Skill above L at 1. Tricks use the Trick's `grade` from `shared/src/vedic.ts`. `LEVEL_START`, `skillStart`, `beltFor` and `raiseOnly` live in `app/src/logic/placement.ts`.

`beltFor(L)`: the first Belt, in Belt order, that has a Trick at grade L or above. With today's Trick grades: L up to 3 is white, 4 and 5 yellow, 6 orange, 7 blue, 8 purple, 9 and above black.

`rating(key, mode, fallback, { practice })` in `app/src/logic/adapt.ts` gains the Practice flag; only Practice callers (Skill practice, runs, Stars, game Endless practice, Arena Practice and "Practice, no clock"; a game Level keeps its own fixed start) pass it. The daily Arena round and Ranked game rounds do not, so with no Rating they start at the Mode's start. Once any round saves a Rating, every later round uses it, as today.
- Rejected: writing Ratings at Placement time. It would make the first Ranked round start at the Placement level too, against Q7.

**7. Existing Players, raise-only (Q11).** A Player with any progress (any answer, Sparks, Rating, lit or skipped Star) when Placement ships sees one card on home: "Find your level" with Start and Not now. Either choice, or finishing a Placement from Me, retires the card (`S.placementCard = 'done'`). Finishing a Placement then runs `raiseOnly(S, L)`: each saved game or Arena Rating below `LEVEL_START[L]`, and each saved Skill Rating below `skillStart(grade, L)`, is raised to it; nothing is lowered; Medals, Stars, Belts, mastery and Sparks are untouched; `placedBelt` moves only forward in Belt order. Raised game Ratings are also used by Ranked game rounds, as any saved Rating is; this is the one place Placement reaches a Ranked round's start, and only upward, for a Player who chose to take it.

**8. Retake (Q3).** Me shows a Placement row: "Placement: about grade 5 (Oct 17)" in small print, and Retake (or "Find your level" if never taken). A retake replaces `S.placement` with the new result, even if lower, and then runs `raiseOnly` (so it never lowers anything already saved). Changing Mode keeps the Placement level; a later retake starts at the new Mode's first grade.

**9. First visit (Q14).** On `/learn/` with no Mode: the Mode picker (unchanged; prerendered, `react-typescript` task 4.3), then the offer screen (`/learn/placement`, offer state): Bolt, "Want to find your level? About 3 minutes. No clock.", Start and "Skip, just play". Start runs the climb in the same view; the result screen says "You climbed N steps! Bolt will start you there." with "Let's go", which opens home. Skip and Let's go both go to `/learn/` and set `S.placementCard = 'done'`. Leaving mid-climb saves nothing and counts as Skip. Home then shows the suggested first Star (Challenger and Pro: the Sky or the Dojo card, both through `startBeltOf`) or Explorer's Start here tile. The in-app Tour (`in-app-guide`) runs on that first home, as today. Each new Player added in Me goes through the same flow. The landing page's "Start playing" opens `/learn/`, so a new visitor reaches the Mode picker and then the offer. Try a trick on the picker is a Mode guess, not a pick (`first-visit` spec): it keeps opening its Star directly with no offer, and that Player finds "Find your level" in Me.

**10. The Hook folds in (Q14).** `hook-first-star`'s design moves here unchanged, in the React game's shape: `app/src/logic/hook.ts` (pure: `HOOK_DARES` for the 11 eligible Tricks, `calcKeys`, `isNewPlayer`) and `app/src/views/star/Hook.tsx` with `Calculator.tsx` (what `runHook` did), the race at one key per 450 ms, the reveal of at most 20 seconds, the round dealt easiest first, Skip, Calm and announcements. What changes is only which Star is first: the one Bolt suggests after Placement (or after Skip). Placement records no answers, Sparks or Stars, so `isNewPlayer()` is still true after a Placement. Placement levels of 7 and above start at the blue belt or later, whose Tricks have no dare, so those Players get no Hook (as `hook-first-star` already allowed for Tricks without a dare).
- The race's one key per 450 ms runs on `useInterval`, and the reveal's steps and its 20-second end on `useTimer`, both under the Star round's `useRound` signal, so leaving the Star stops them (the `no-bare-lifecycle` rule enforces it). `S.hookSeen` is set as `hook-first-star` decided: when the dare appears (so leaving mid-Hook counts as seen), when it is skipped, and when a new Player opens a first Star whose Trick has no dare, so a later Star with a dare never plays the Hook (the grade 8 then `from9` case). It is set once, when the round starts under `useRound`; setting it is idempotent, so Strict Mode's second run changes nothing. The Hook is drawn only in the browser: the Star route's round is already inside `ClientOnly` (`react-typescript` D14), and whether a Player is new is device data.
- **The Hook note (`try-trick-teaches` decision 4).** Try a trick opens the Star Bolt suggests with the worked example card (the Star round's `intro` option, set only on that path). A visitor from Try a trick is a new Player, so the Hook can play on that same Star. The rule: when the Hook plays (the Trick has a dare and the Player is new), the Hook's reveal is the teaching, the card is not shown and `intro` is ignored for that render; when the Hook does not play (a Trick with no dare, or a Player who saw or skipped the Hook), the card shows as `try-trick-teaches` specified. The visitor is never taught twice. `starIntro()` and the `intro` option stay, with their tests. `try-trick-teaches` also left a third option, that the Hook's dare replaces the card on the Try path outright, after which `starIntro()` and `intro` would be removed; the owner has not chosen it, so this plan keeps the first two bullets and leaves that option to a later change if the owner asks.

**11. Privacy and analytics (Q13).** `S.placement`, `S.placementCard` and `placedBelt` live in the Player's record on the device (never in the store's server snapshot, a cookie, a page request or a server render), travel only in the backup code and the learnvedicmath progress hand-off (device to device, in the URL fragment), and are never posted. `metrics.placementDone()` sends `math/placement/done` with the fixed title "Vedic Math: placement done", once per finished Placement (a retake sends it again), never on Skip. It is sent from the handler of the answer that ends the climb, together with `setPlacement`, so Strict Mode cannot send or save it twice. The route view `math/view/placement` is the existing per-route event (`analytics` spec), named from the router's matched route as every route view is (`react-typescript` B4). Placement answers send no `q_answered`, no `first_win`, and touch no counters, so quests, badges and the first-win timing are unaffected.

**12. The parent note (Q12).** `parentNote()` (in the Me view, `app/src/views/me/`) gains one sentence when the Player has a Placement level: "Placement: <Nickname> placed at about grade 5. It only sets where practice starts, and it stays on this device." Grade words come from `GRADES[...].pro` ("Algebra 1" reads as "about grade 9").

**13. Calm and screen readers.** The climb has no clock in any setting. The staircase picture moves only when `noMotion()` (`app/src/logic/settings.ts`) is false, by a CSS transition in `Climb.css`. Each question's heading takes focus (moved through a ref once the next question has rendered); the step ("Step 3") and the result are announced through `announce()`; the 3 choices are buttons named by their values. The result screen and the offer are checked by `a11y.spec.ts` in both color schemes.

**14. A React route module, server-safe (`react-typescript` D14).** `/learn/placement` is a route in `app/src/routes.ts` with its module in `app/src/views/placement/` (`Placement.tsx` holding `Offer`, `Climb` and `Result`, each with its own CSS file of design-system tokens). It has no server loader or action and is not prerendered (it is only meaningful with a Player on the device). On a cold load the server renders the document, the header, the nav and the route's `<title>`, with `noindex`; the view's body is inside `ClientOnly`, whose fallback keeps the view's space, because every part of it reads the Player, the Mode or the climb. With no Mode yet (a first visit opening the link), the view sends the browser to `/learn/` with a replace navigation after start-up, so the Mode pick still comes first. The climb's state is component state (`useReducer` over `placementAnswer`, which is pure, so Strict Mode's double call is harmless); the seeded `rand` is made once in the browser (the test hook `window.__vmSeed`, as other specs use it). Leaving the route unmounts the view and drops that state, which is why leaving mid-climb saves nothing. Each question runs under `useRound` (what `child(signal)` did), and the whole view under `useAbortSignal`. Markup in a question (a `<sup>`) is drawn only through `Markup` (`react-typescript` B1).
- Rejected: prerendering the offer. It would paint the offer to a returning Player who opened the link, and its start step needs a Mode the server cannot know.
- Rejected: keeping the climb in the store so a reload resumes it. Q3 and decision 9 make leaving mid-climb the same as Skip.

**15. Logic in `app/src/logic/`, not `shared/`.** `placement.ts` and `hook.ts` are used only by the game, never by the Worker, so they live in `app/src/logic/` (`react-typescript` D11: `shared/` is for what both use). They import the generators from `shared/src/skills/` and `levelFor` from `shared/src/questions.ts`. Neither imports React, the DOM or storage: the record is passed in (`raiseOnly(record, level)` returns a new record), so Vitest tests them directly.

## Risks / Trade-offs

- **A lucky guess places a child high** (Explorer's 3 choices give a 1 in 3 chance each). Mitigation: Ratings move with answers, and Practice drops after misses within a round; raise-only applies only to saved Ratings. A child placed too high meets easier questions within a few answers.
- **Tired children quit early and place low.** Mitigation: Skip and quitting both give exactly today's behavior, and Retake is always in Me.
- **The pool drifts** as Skills change. Mitigation: `test/placement.test.mjs` checks every pool Skill, every step, at level 2, for 200 seeds.
- **Explorer reading algebra aloud with built-in voice** sounds poor until Part B lands. This is why the build waits for `better-voice`.

## Migration Plan

Nothing to migrate: Players with no `S.placement` behave as today. The existing-Player card is the only new prompt. Rollback: remove the `placement` route from `app/src/routes.ts` and the card; saved Placement fields are ignored by older code.

## Owner decisions

The owner accepted every open question from PR #51 as recommended on 2026-10-17:

- PL1: the result is the **Placement level** in code and docs (Level stays a game stage); kid copy says "your level" and "steps" (decision 1).
- PL2: with no step right, the level is the step below the start (Challenger 2, Pro 7, Explorer K) (decision 3).
- PL3: neutral miss line with no answer shown, an "I'm not sure" button that counts as a miss, and no Sparks for Placement (decision 3).
- PL4: no Ratings are written at Placement time; Practice reads the level only when there is no Rating; game Levels keep their fixed starts (decision 6).
- PL5: raise-only for existing Players also raises saved game Ratings that Ranked game rounds use, upward only and opt-in (decision 7).
- PL6: Explorer gets a "Start here" Skill tile, not Stars (decision 6).
- PL7: Players placed at grade 7 or above start at the blue belt or later and get no Hook (decision 10).

No questions remain open.

## Builder calls in the re-plan (2026-10-21)

These follow from `react-typescript` and the owner decisions above; review can change them without going back to the owner.

- R1: built after `react-typescript` phase 6, with no Placement code in a Legacy view; its phases 7 and 8 are not waited for (proposal, Order and dependencies).
- R2: `/learn/placement` is server-rendered with its body in `ClientOnly`, not prerendered (decision 14).
- R3: speech, saving the result and the analytics event happen in tap handlers, never in a render or a mount effect (decisions 5 and 11).
- R4: `placement.ts` and `hook.ts` in `app/src/logic/` (decision 15).
- R5: the Hook note follows the first two bullets of `try-trick-teaches` decision 4; the worked example card stays where the Hook does not play (decision 10).
- R6: Try a trick keeps opening its Star directly, with no Placement offer, as the `first-visit` spec has it (decision 9).
