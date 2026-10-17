# Proposal

## Why

The owner, 2026-10-17: "all explanation should have audio with it". Today read aloud says questions, hints and praise. The explanations (a Skill's idea, how a Trick works, the Sutra deep dives, the Guide) are text only, so a young or struggling reader cannot hear them. The studio voice from `better-voice` (Google Chirp 3 HD, Aoede, recorded ahead of time) can say them whole for no extra running cost.

## What Changes

- A **Listen** button beside every explanation: a Skill page's idea and How it works, the worked example ("Watch me do one") and the solution ("Here is how"), the Trick tool's steps ("Watch it work"), each Sutra card's back, each section of a Sutra deep dive (In plain words, Why it works, Worked examples, Where it is used) and the diagram step on screen, the History card on the Sutras page, each Guide section, each tour step, and each game's description.
- A Listen button plays its lines with the read-aloud voice order (studio whole line, studio clips, this device's voice). Explanation lines are recorded whole; worked steps hold numbers made up per problem and are said from clips or by the device's voice.
- One plays at a time. Pressing a playing button stops it. Leaving the page, closing the deep dive, moving to the next tour step, or any new read-aloud line stops it.
- It follows a tap, so it plays with read aloud off, as Hear it does.
- One anonymous event per press, `math/listen/explanation`, with nothing about which explanation.
- `js/explain-lines.js` (added with `better-voice` part B) is the one list of explanation lines: the recording tool records it and the buttons read it, so the words heard always have a recording.

Out of scope (deferred, see tasks):
- The Star round's replay steps, page introductions (`md-lede`) with live counts, Watch descriptions (they sit inside card buttons), badge, quest and format labels, the Sutras page's "Older roots" notes.
- Sutra names: the `sutra-pronunciation` change gives them their own clips.
- Changing any wording.

## Capabilities

### New Capabilities

- `explanation-audio`: the Listen button, what it reads, one at a time, stopping, and its analytics event.

### Modified Capabilities

None. `read-aloud` (from `better-voice`) is used as is; `voice.speak()` now also says when a line has finished.

## Impact

- New `js/listen.js` (the button, toggling, wiring on a view signal).
- `js/voice.js`: `speak()` returns a Promise (true when the line finished, false when it was stopped); new `speakAll(texts)`.
- `js/explain-lines.js`: new `skillPageLines`, `sutraSectionLines`, `linesForKey`, `listenKeys` (existing functions unchanged, so the recording made with part B still matches).
- `js/app.js`, `js/tour.js`: the buttons. `js/metrics.js`: `listened()`. `math.css`: `.listen-btn`.
- Tests: `test/explain-lines.test.mjs` (every key resolves to recorded lines), `e2e/tests/listen.spec.ts`.
- Cost: none new. The explanation lines (1,237 lines, about 90,000 characters) are in part B's recording run.
