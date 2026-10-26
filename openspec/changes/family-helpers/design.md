# Design

## Context

- The Nikhilam Family is the brand mark (`brand/nikhilam-family/`, `js/family.js` `FAMILY_SVG`): a tall One (Eka, sky blue), a baby Zero (Shunya, sun with an ink face) and a Nine (Nava, coral and sun). It cheers on the app home (`fx.cheer`, `celebrations` change). The glossary says Bolt teaches "and appears only" in the game; this change gives the Family a second job there, as the Player's friends.
- Bolt (`js/bolt.js`, six poses) is the teacher in Star rounds and the bubble under Practice and Kata answers (`boltFor(tone)` in `js/app.js`). "A teacher, never a pet" (GLOSSARY). The Family are not Bolt's replacement and not pets either: classmates.
- Practice (`practice()` in `js/app.js`): up to three tries per question; the first miss says "Not quite. Try once more.", the second shows a hint and counts it (`hints`), the third reveals the steps. Hint and Show me buttons; mastery counts a try after a hint as half. Katas (`kataView()`): one try per problem, a Hint button. Star rounds (`js/star.js`): four questions, a miss replays the Trick on the Player's own numbers, a video offer after two misses.
- Reading bands are proposed in `age-bands` (`player.reading`, `bandOf()` in a future `js/bands.js`), not built. The Grade answer never leaves the device (ADR 0008).
- Toasts (110), sparkles (115) and confetti (120) use raw `z-index` values in `math.css`. The pinned design system (`vendor/design-system/2.1.0/tokens.css`) has `--z-header` 50, `--z-popover` 60, `--z-overlay` 100 and `--z-toast` 120, and no helper layer.
- The Studio voice records fixed lines with Chirp 3 HD Aoede (`tools/voice/`, `docs/agent/studio-voice.md`); `react-typescript` Phase 8 adds Server lines with a `VoiceLedger` Durable Object ($5 a day, $150 a month, ADR 0014).
- The game moves to React Router step by step (`react-typescript`). New code is TypeScript and React for views, but a Legacy view may still be changed by a feature that is not on a Locked view. Practice, Katas and the Star round are not Locked by an open pull request today.

## Goals / Non-Goals

**Goals:**
- A stuck Player gets the right amount of help, from friends, at the right moment, without being blocked, rushed, nagged or handed the answer.
- The owner can try the scripted Family on a phone before anything is recorded or switched on for everyone.
- One pure engine for when and how much to help, shared later by the React port, listening and the AI layer.

**Non-Goals:**
- Changing Bolt, Star rounds, the Arena or how tries, hints, Sparks and mastery count.
- Sending anything new about a Player. Visits are counted with fixed words only.
- Any voice in step 2: the new lines are text only until the owner's recording lands.

## Decisions (settled with the owner 2026-10-21)

**D1. Who they are.** Three friends and fellow students of the Player, never teachers and never pets. Bolt stays the friendly teacher, and the Family speak of him as theirs too ("Bolt showed us this one..."). Names and traits (constant across bands): **Shunya** (Zero, शून्य) is funny; **Nava** (Nine, नव) is witty, the nodder with comebacks; **Eka** (One, एक) is a little serious, names the Sutra and works the steps through with the Player as a peer. All generally joyful.

**D2. Register by Reading band.** Early (about 4 to 6): silly and gentle, short words, lots of praise, always right. Growing (about 7 to 9): playful, puns. Fluent (10 and up): dry wit and real method talk; Eka quotes the Sutra (in its IAST spelling with `lang="sa-Latn"`). The band is `age-bands`' `bandOf(player.reading)` when that exists; until then it comes from the Mode (Explorer Early, Challenger Growing, Pro Fluent). That fallback only picks the Family's tone; it is not the rejected "Mode as the band" for reading help in `age-bands`, and it goes when `age-bands` ships.

**D3. The brain: scripted first.** Every Mode gets scripted, prewritten help: instant, offline, free and safe, built from fixed lines (`js/family-lines.js`) plus the Skill's own data (its `idea`, its Trick's Sutra and meaning, a worked example from its generator on different numbers). An AI conversation layer comes second (D15) and only adds to it.

**D4. Help signals (the triggers).** A visit can start when:

| Signal | Rule (tunable in `RULES`) |
|---|---|
| Misses in a row | 2 wrong tries in a row on the same Skill (a right answer or another Skill resets it) |
| Misses in a round | 3 wrong tries in one round or session since the last such visit |
| Idle | about 20 s on one question with no input, tap or key in the round |
| Hint twice | the round's Hint pressed twice on one question |
| Leaving early | the Player leaves a round after a miss with no right answer since |
| Asked | the Player taps "Ask a friend" (any time, any setting but Off) |
| Help phrase | a help phrase in listening mode (step 3, D14) |

A timed race is never interrupted mid-question (the Arena, a Star's clock): the engine is told when a race starts, holds what it noticed, and offers one visit at the round's end (or at a Practice pause); a race left before its end drops what was held. In step 2 the Star round reports only its end.

**D5. Escalation.** Each Skill's trouble count goes up by one with each signal in a session. Level = the trouble count, from 1 to 3 (Misses in a round starts at 2):

| Level | Who | What |
|---|---|---|
| 1, a first stumble | one friend (Shunya or Nava) | a light hint: a friendly line and a nudge from the Skill's idea or the Trick's Sutra meaning |
| 2, repeated trouble | two (Eka shows the method, Nava or Shunya encourages) | the method in words, then encouragement |
| 3, a real block | all three | a short skit: one example on different numbers, worked step by step by Eka, opened by Shunya, closed by Nava |
| Breakthrough | all three | a cheer, when the Player gets a Skill right first try after a level 2 or 3 visit on it, or lights a Star on a Skill that was hard last time |

At most one visit every 3 minutes unless the Player asks (Ask a friend, or a button in the open visit). A breakthrough cheer straight after a help visit whose buttons the Player used is that visit's ending, so it is not held back by the 3 minutes; any other cheer is. Only one friend speaks at a time: a multi-friend visit shows one turn at a time, each bubble pointing at its speaker, with Next between turns.

**D6. Where they stand (never Clippy's sin).** The question, the answer field and the round's buttons are protected. The overlay measures them and picks the first free band around their union (left margin, right margin, below, above), big enough for the friends and the bubble; on a 320 px phone with no free band it docks in the page flow under the round's card, so it still covers nothing (`placeVisit()`, a pure function with unit tests). It moves again on scroll and resize. The layer passes taps through everywhere except the friends and the bubble.

**D7. The visit's bubble (Clippy's good part).** A speech bubble with two or three buttons: **Show me** (the method worked on a different example, never the Player's question), **Another hint** (the round's own Hint, so it counts exactly as the Hint button does), **Not now** (closes and mutes automatic visits for this browser session). A close button and Escape close every visit in one tap. A cheer has one button, "Thanks!". Nothing takes focus: the answer field keeps it, and the buttons are reachable by Tab. Screen readers hear each turn through the app's one polite live region (`fx.announce`, "<name> says: ..."); the art is `aria-hidden`.

**D8. Never the answer.** Friends give a hint, the method or a worked example on different numbers (a fresh problem from the Skill's generator whose question and answer both differ from the Player's; up to 12 draws, else no example). The answer to the Player's question comes only from the round's own Show me. **Peer mistakes:** rarely (1 in 5 level 3 visits), in Growing and Fluent only, Shunya makes a playful mistake on the example (one more than its answer) and Nava or Eka catches it; never on the Player's question, never in Early.

**D9. Memory, on the device only.** Friends greet the Player by Nickname (its two words, without the number) on the first visit of a session, and remember which Sutra (for a Trick) or Skill was hard last time: `player.familyMem = { hard: { <sutra or skill id>: n }, last }` in the Player's record in `vm.players`, beside `family` (the switch) and `familyHelp` (the setting). Never sent, never in analytics, and the hand-off leaves those fields behind (it carries only known Player fields); removing a Player removes them (ADRs 0006, 0008).

**D10. The switch and the setting.** Step 2 ships behind a per-Player switch in Me, **"Try the Nikhilam Family helpers"** (`player.family`, off by default, `FAMILY_DEFAULT = false`), the way the Sky's "Try the new Sky" switch worked (`sky-home`). With it on, Me shows **When they help: Always (default), Only when I ask, Off** (`player.familyHelp`). Only when I ask makes "Ask a friend" the only way in; Off hides it too. When the owner releases the Family, a follow-up flips the default and removes the try switch, keeping the setting.

**D11. Motion.** Bonzi Buddy for how they appear: walk or hop in from the nearest screen edge, perch on the edge of the troubled card or margin, idle bob, wave and hop out. Inline SVG per friend (cut from the brand art, the same paths and tokens), CSS animation on a `data-pose` attribute (idle, talk, wave, cheer, think), as Bolt's poses do. Under Calm, Pause motion and reduced motion they appear with a short fade and no movement, and turning any of those on mid-visit stops the motion at once (`fx.onMotionChange`). Everything runs through `js/life.js` with the visit's signal.

**D12. A layer above toasts.** `math.css` gets local layer tokens on `:root`: `--vm-z-toasts: 110`, `--vm-z-sparkles: 115`, `--vm-z-confetti: 120`, `--vm-z-family: 125` (the old raw values, now named). The shared design system has no helper layer, and its `--z-toast` (120) differs from the game's toasts, so these are defined locally; adding a `--z-helper` to the design system is a design-system repository change, out of scope here and noted for its owner.

**D13. Voices.** Text always shows in the bubble. Voice plays only when Read aloud or sound is on, following the existing voice settings. Three Chirp 3 HD voices distinct from Bolt's Aoede: Shunya **Puck**, Nava **Leda**, Eka **Charon**, every line prerecorded per band. Step 1 gives the owner a sample tool (`tools/voice/family-samples.mjs`, a few lines per friend and band, cost printed before it asks, inside the spend guard) and a listening page (`docs/prototypes/family-helpers/listen.html`) to swap voices before the full recording. **The new lines are text only until the owner's recording lands:** the CLAUDE.md rule "a change to any spoken line needs a re-record" covers lines that are spoken; these are not spoken yet, and the task that wires their voice records them in the same PR. Lines with `{name}` are recorded as their fixed part plus the Nickname's two words as clips (32 words), the same join `better-voice` uses.

**D14. Listening (step 3, `helper-listening`).** Pro gets push-to-talk (hold a mic button, release to stop). An opt-in listening mode shows a visible mic badge, turns off when the tab is hidden and after 2 minutes of silence, uses on-device speech recognition where the browser offers it (`SpeechRecognition` with `processLocally`, else no listening mode), and only looks for help phrases ("I don't get it", "how?", "help", a frustrated word). It never stores or sends audio or transcripts; a match is a help signal and nothing else. Never always-on. ADR 0015.

**D15. The AI conversation layer (step 3, `helper-conversation`).** Opt-in, server side, only for a Player whose saved answers say 13 or over (an Age answer of 13 or over; with none, a Grade answer of grade 9 or above or Grown-up (grade 8 starts at 12 or 13, so it does not count); an Age answer under 13 always rules it out; Pro suits it), never for under-13 (ADR 0006, COPPA). The Worker calls the model with the Skill id, the question's own numbers and this Visit's words (the Player's typed or spoken messages and the replies so far in the open Visit, which belongs to one question), under fixed instructions that hold the speakers' voices and the "never the answer" rule; nothing about the Player (no Nickname, no id) is sent, and nothing is kept. This privacy contract is unchanged by D18 (owner, 2026-10-24). Capped at $5 a day and $50 a month in its own limit inside the same `VoiceLedger` Durable Object as the server voice (react-typescript Phase 8, ADR 0014); at the cap, over the per-address limit (D18), on a refusal, a failed check or offline it silently falls back to scripted help. How a turn works, who speaks, the actions, the clue limit, the safety rules and the bot protection are in D18. ADR 0015 (proposed).

**D16. Bolt and the Family by place.** In Star rounds and Arena races Bolt teaches as now, and the Family appear only after the round or when asked. In Practice, Katas and content pages the Family are the helpers, and Bolt keeps his existing bubble lines. In the conversation (D15, D18) Bolt talks with them and answers the why and how questions.

**D17. Phases.** (1) Now: this change and the prototype. (2) Now: the scripted Family in the Legacy views behind the switch. (3) After react-typescript phase 2 ships (held for its owner task 0.8, Workers Paid): port the overlay into the React root layout (one component over the router outlet, the same engine), record the lines, then the AI conversation for 13+ (D18: Bolt and the three, text only at first) and listening, then the 3D move: the Family as detailed 3D characters on React Three Fiber (react-typescript Phase 7, ADR 0013), loaded late on routes that show them, the 2D art as the fallback and under no motion.

**D18. Talking with the Family: the shape of a turn (owner, 2026-10-24).** Settled after D15, for step 3; nothing of it is built in step 2.

- **Who speaks.** Bolt joins the conversation with Shunya, Nava and Eka. Bolt answers every why or how question (he is the teacher, D1); the three answer the rest as classmates, in their D1 traits and the D2 register. One model call per turn returns up to two short replies, each `{speaker, line}` with `speaker` one of `bolt`, `shunya`, `nava`, `eka`, shown one at a time as D5's turns are. A line is at most about 30 words (Early and Growing registers shorter, as in `js/family-lines.js`).
- **Model and endpoint.** Claude Haiku 4.5 (`claude-haiku-4-5`, $1 per million input tokens and $5 per million output tokens at list price), called from our own Worker route (`POST /api/family/v1/turn`, beside the server voice in `workers/src/`), with the reply capped small (`max_tokens` about 300) and no second call within a turn. A turn costs about $0.004 (about 2,000 input tokens of fixed instructions and words, cached where the provider allows, and at most 300 output tokens), so the $5 day is about 1,200 turns. The model provider's key is a Cloudflare secret, never in a file the browser downloads. The Worker may later shape its answer as AG-UI events (the open event format) without taking any library; that is optional and not planned work.
- **CopilotKit, weighed and rejected.** Measured: its client minimum is 293 KB gzipped (732 KB with its provider), close to the whole first-load budget (758,499 bytes when it was weighed); its Worker runtime is about 1 MB gzipped and needs `nodejs_compat`. By default it sends the full history and all app context each turn, keeps threads in an in-memory store readable without auth, sends telemetry on every turn and sets `max_tokens` to 64,000; its onboarding command line tool is proprietary and links the project to its cloud. Each of those breaks D15's contract, the budget or ADR 0015. Our own small endpoint does the one thing needed.
- **Actions.** The model may ask for four actions (as tools with strict schemas, in the same response): `showExample(a, b)` (a worked example on the Skill's method; the numbers must differ from the question's in either order, and the example's result must differ from the question's answer), `pointAt(part)` (highlights a named part of the question, such as a digit or the base, from a fixed list per Skill), `showSutra()` (shows the Trick's Sutra and meaning; dropped when the Skill has none) and `react(mood)` (a pose for the speaker, from the D11 poses). The app validates every action against the question and the Skill before drawing it, and drops one that fails; none takes or shows the answer. Nothing else: no action changes a setting, moves to the next question, opens a page or touches the round's tries, hints or Score.
- **The clue limit.** A reply that hints at the current question (the model marks it `clue: true`, and every `pointAt` counts as one) uses a clue; each question has `CLUES` clues (3, tunable), counted from this Visit's words, so nothing new is sent. At zero, the speakers explain the method in general, with no more hints on that question, and the Worker replaces a reply that is still marked a clue. Talk about the method or the Sutra in general (and `showExample` on other numbers) is free. The first clue on a question counts as the round's Hint does (as D7's "Another hint"), so mastery counts the next right try as after a hint.
- **Text only at first.** Replies show in the bubble as text. A per-speaker server voice is a later follow-up, after the server voice and its cap are live; it needs its own change, because the server voice accepts only the game's own sentence templates, never free text (server-voice spec).
- **Safety.** The fixed instructions keep the talk on math and the Mode, steer back from anything else, never ask for or repeat personal details, and never take on another role ("pretend you are..." is steered back). Before sending, the browser strips email addresses, phone numbers and any run of 4 or more digits that is not one of the question's numbers, replacing each with a blank. The Worker checks every reply before it is returned: one that contains the question's answer (computed on the Worker from the Skill id and the numbers, with the shared Skill table), names a speaker outside the four, runs past the length limit, holds a link, an email address or a phone number, or speaks as anyone but the Family and Bolt, is replaced by a scripted line from `js/family-lines.js` for the same speaker. Under the chat box a note says: "Don't share your name or where you live."
- **Bot protection.** Before the first message in a browser session the game runs a Cloudflare Turnstile check (managed, usually invisible) and gets a `family`-scope session ticket (the D17 tickets of react-typescript, 30 minutes, then a new check); the Worker accepts a turn only with that ticket. Each connection address gets about 20 turns an hour (a Worker setting), counted in the same `VoiceLedger` Durable Object as the spend: the address is kept only as a keyed hash whose key changes every day, beside an hourly count that is deleted when the hour ends; nothing else is kept with it. Over the limit the Family answer with scripted help. Turnstile never loads for a Player whose Age answer is under 13 (they never reach the conversation). Turnstile is a planned third party: it joins `THIRD_PARTIES` in `build.py` and the privacy policy with the step 3 task that adds it, not before. The same Turnstile check and per-address limit apply to the server voice endpoint (react-typescript server-voice spec).
- **A throwaway prototype first.** A prototype of the chat lives outside the repository (`~/Documents/codebase/_handoff/family-chat-prototype/`) to try the shape and the lines; nothing from it is merged, and the real build stays in step 3 (tasks 3.6 and 3.7, 3.10 to 3.14).

## Module map (step 2)

| Module | What | Tests |
|---|---|---|
| `js/family-helpers.js` | Pure: `FRIENDS`, `RULES`, `bandFor(player)`, `nickWords(name)`, `createCoach({ now, rng })` (the help signals and escalation: `note(event)` returns a visit plan or null), `placeVisit(view, protect, box)`, `exampleFor(skill, problem, gen)`, `planVisit(...)` (the turns), `memoryAfter(mem, key)` | `test/family-helpers.test.mjs` |
| `js/family-lines.js` | The line table: per friend, per kind, per band | `test/family-lines.test.mjs` (word limits, no em dashes, no digits, honest framing, placeholders) |
| `js/family-view.js` | The overlay: one layer, one visit at a time, art, bubble, buttons, Escape, live region, placement, motion; through `js/life.js`. `mountFamily()` for a round; `showVisit()` draws a planned Visit at once (the prototype uses it) | e2e; `test/lifecycle-scan.test.mjs` |
| `js/family-hook.js` | The small piece the views call (`familyRound()`): checks the switch and the setting, loads `js/family-view.js` only when on, forwards round events, draws "Ask a friend" | e2e |
| `js/family.js` | Gains `friendSVG(id)`: each friend's own drawing from the brand art | `test/brand.test.mjs` |

Calls from `js/app.js`: `practice()` and `kataView()` report each question, miss, right answer and Hint, and their end; the Star view reports the round's end (a new `onEnd` option of `runStar`); Me draws the switch and the setting. Each is one line beside the existing code, so a parallel change to the same views merges easily.

## Analytics

Fixed words only (`metrics.family(event)`): `math/family/visit/1`, `/visit/2`, `/visit/3`, `/cheer`, `/ask`, `/show_me`, `/not_now`. Never the Skill, the Nickname, the band or anything typed.

## Risks / Trade-offs

- **Nagging.** Mitigation: the 3 minute rule, Not now for the session, the Me setting, and nothing mid-race.
- **Covering a control on a small phone.** Mitigation: `placeVisit()` only uses free bands and docks in the page flow when there is none; e2e checks at 320 px that no protected control intersects the visit.
- **Kids treat the friends as an answer machine.** Mitigation: no answers, only examples on different numbers, and the hint they give is the round's own, counted as a hint.
- **Tone drift between bands.** Mitigation: one table, read top to bottom, with the length rules tested.
- **First-load bytes grow.** Every module is precached, so the budget grows by the new modules (about 6 KB Brotli); the baseline is updated in this PR with the reason. The page imports the overlay, the engine and the line table only when the switch is on; that is what "SHALL NOT load" in the family-helpers spec means. The service worker's offline copy is kept on purpose, like every module a Player has not opened yet, so a Player who turns the switch on while offline still gets the helpers; it runs nothing and sends nothing.
- **A Player shares something personal anyway, or tries to make the Family say the answer.** Mitigation (D18): the browser strips contact details and long numbers before sending, the note under the chat box, fixed instructions that never ask for or repeat personal details and never take another role, and the Worker's check that replaces any reply holding the answer or leaving the speakers' voices with a scripted line.
- **A school shares one address.** About 20 turns an hour per address may be low for a classroom behind one address. Mitigation: the limit is a Worker setting, and over it the Family give scripted help, never an error.
- **The React port changes the view code.** The engine and line table are plain modules with no DOM, so the port reuses them; only the overlay is rewritten as a component.

## Owner decisions

All settled 2026-10-21 ("Yes to all"): D1 to D17 above. D18 (talking with the Family: Bolt joins, Claude Haiku 4.5 on our own Worker route, CopilotKit rejected, the four actions, the clue limit, text only at first, the safety rules, Turnstile and the per-address limit, the prototype outside the repository) settled 2026-10-24, with D15's privacy contract unchanged. Still to confirm with the owner: the number of clues per question (3 proposed), and that Turnstile before the server voice means a Player under 13 gets no new Server lines (react-typescript design, "Turnstile before the server voice"). Open owner steps are in `tasks.md` (voice samples, the voice pick, the full recording, the phone check, the AI layer's go).
