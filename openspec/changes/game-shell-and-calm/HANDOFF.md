# Handoff: game-shell-and-calm

Built. Tasks 1.1 to 6.3 are done and ticked; the PR to main is open (not merged).

## Left

- 7.1, the release check: after deploy, the live E2E run, and the owner's manual checks: an iPhone and a touch
  Chromebook play an Arena round and a Star round without scrolling or a covered keypad; VoiceOver hears the Calm
  switch state.
- Archive the change after release.
- `sky-home` and `hook-first-star` already read `vm.calm` through `fx.noMotion()`; nothing more to wire.

## What changed

- `js/shell.js` `openShell(title, { signal, onExit, exit, exitId, focusBack })`: a fixed full-screen region added to
  `#view`, with the Calm switch, A and A+ and Stop or Back in its header. Everything else in `#view`, the site header,
  the footer and the skip link are `inert` while it is open; `html.play-open` stops page scrolling and raises `#view`
  above the sticky header. `close()` restores focus to the start button. It closes itself when its signal aborts.
- Arena (daily, Practice, Practice no clock), Duel, game rounds, tower challenges and Star rounds play in it. Results
  show in the shell with a "Back to ..." button; the lobby then shows the same result.
- Calm (`vm.calm`): `fx.calmOn()`, `fx.setCalm()`, `body.calm`, the `vmcalm` event and one announcement. Text size
  (`vm.text`): `fx.textSize()`, `fx.setTextSize()`, `body.text-plus` sets `--play-scale: 1.25`.
- One motion rule: `fx.noMotion()` (reduced motion, `html.motion-paused`, Calm) and `fx.onMotionChange()`; the moving
  background, Trick scenes, confetti and the Number rain speed follow it. Every `prefers-reduced-motion` block in
  `math.css` has `html.motion-paused` and `body.calm` twins (checked by `test/shell.test.mjs`).
- Nothing new is sent: Calm and text size stay on the device and an untimed Arena Practice round is never posted.
  `parentNote()` and `cloud/README.md` need no change.

## Decisions made while building

- Calm changes clocks from the next round. A round already running keeps its rules (its clock, its Medal rules);
  motion stops at once. Turning Calm on during the 3, 2, 1 countdown still counts, since the round starts after it.
- With Calm on, the timed "Practice round" chip in the Arena also runs untimed (design: Calm takes the clock off every
  Arena Practice round). The analytics type word stays the chip's (`practice`); only the "Practice, no clock" chip
  sends `untimed`.
- The Calm note in the Arena lobby shows whenever Calm is on, not only while the daily chip is picked.
- Untimed tower Sprint: 20 questions with a Finish button, Sparks for right answers, no Medal. Time attack in Calm runs
  its questions as before (it never showed a clock) and gives no Medal. Survival, Sharpshooter and Boss keep Medals.
  A round without a Medal never lowers an earlier one (`store.setMedal` only raises).
- Untimed game rounds end after `perQ` answers once the last answer has been shown (a miss keeps its 1.2 s hold).
  Endless practice was already untimed and is unchanged; Ranked rounds keep the clock in Calm.
- Number rain is the one game whose motion is the game itself: in Calm the drops still fall, at the slower speed
  reduced motion already used.
- Touch screens are detected with `(any-pointer: coarse)`, so a touch Chromebook with a trackpad also gets
  `inputmode="none"` and `readonly` on the hidden answer input; a physical keyboard types through one `keydown`
  listener on the round signal.
- Star rounds open the shell at once (they have no Start button); its exit is "Back", which goes to the Star's own
  back link. The Star's heading stays in the round (it is the page's `h1`); on phones its tag is hidden to save room.
- The shell lives inside `#view` (the design allows "inert on #view's other content"), so a route change removes it
  with the view and `#view h1` still finds a Star's heading.
- A and A+ scale play screens only: question, entry, keys and choices; game areas scale by font size.

## Test results (local, before the PR)

- `node --test 'test/**/*.test.{js,mjs}'`: 239 passed.
- `python3 build.py --out <scratch>`: OK (35 modules pinned, 38 own + 13 shared files precached).
- `openspec validate game-shell-and-calm --strict`: valid.
- Playwright, `BASE_URL=http://localhost:8160`, `--grep-invert '@live|offline'`, chromium, webkit and mobile: see the PR.
- `tests/offline.spec.ts --project=chromium` against the built `_site`: 4 passed, 1 skipped, 1 flaky ("offline, the
  leaderboards fall back to this device", passed on retry; it touches no code from this change).
