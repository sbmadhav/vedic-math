# Design

## Context

- `better-voice` part B plays prerecorded studio audio for read aloud (`js/voice.js` `speakStudio()`), named by a hash of the normalized words, with clips and the device's voice as fallbacks. `voice.speak()` cancels whatever is speaking.
- Part B also added `js/explain-lines.js`, which lists every explanation line for the recording tool (`tools/voice/lines.mjs` records each one whole): Skill ideas and methods, Trick ideas and when to use them, Sutra cards and deep dives (more, why, worked examples, where it is used, every diagram step's `say`), the History paragraphs, the Guide and the tour in each Mode's words, game descriptions, badge, quest and format labels, Mode blurbs and Watch descriptions.
- Views get an AbortSignal from the router (`mount()` in `js/app.js`); the Sutra deep dive and the tour have their own child signals.

## Decisions

**1. One button per explanation block, reading its lines in order.** A block is what a reader sees as one piece: a Skill's idea plus How it works, one deep dive section, one Guide section. Each line is a paragraph or list item, recorded whole, and `voice.speakAll()` plays them with a 250 ms pause. Rejected: one button per paragraph (too many buttons on a Guide card) and one per page (too long to be useful, and nothing to stop at).

**2. Keys, not page text, for recorded explanations.** A button carries `data-listen="<key>"` (`skill:<id>`, `sutra-card:<id>`, `sutra:<id>:<part>`, `history`, `guide:<section>`, `game:<id>`), and `linesForKey()` in `js/explain-lines.js` gives the same strings the page renders. Reading `innerHTML` would usually give the same words, but the browser re-serializes markup, so a key is the only way to be sure the hash matches the recording. Existing functions keep their exact output, so part B's recording stays valid.

**3. Page text for lines made at play time.** `from:<selector>` reads the matching elements' HTML in the nearest box around the button: the worked example and solution steps, the Trick tool's shown steps and the diagram step on screen. Worked steps are not recorded whole (about 13,000 Trick step lines and 50,000 Skill step lines); their word frames are in part B's clip packs, so they play from clips when every clip exists, else from the device's voice. The diagram step lines are recorded whole (they are fixed), so the current step plays whole.

**4. One at a time, and stopping.** `js/listen.js` keeps the one playing button. Pressing another stops the first; pressing the playing one stops it. `speak()` now returns a Promise that settles false when stopped, so a button always returns to `aria-pressed="false"`, also when read aloud or another voice takes over. Aborting the view's signal (route change), the deep dive's signal (close or swap) or moving to another tour step stops it.

**5. Listen follows a tap, so read aloud off does not silence it,** like Hear it. Sound effects off and Calm do not change it either: the voice is not a sound effect, and read aloud ignores them today. Open decision 1.

**6. Accessible button.** A real `<button type="button">` with a speaker icon and the visible word "Listen"; `aria-label="Listen: <what>"` starts with the visible text (WCAG 2.5.3); `aria-pressed` shows playing; at least 44 by 44 px; tokens only, the pressed fill is `var(--teal)` with `var(--on-accent)` text (4.5:1 in both schemes, checked by axe in `listen.spec.ts`). No live announcement: the pressed state is announced by screen readers already, and the audio itself is the feedback.

**7. Analytics.** One event per press that starts playback, `math/listen/explanation` (`metrics.listened()`), with no key, no section and no count. A press that stops is not counted.

**8. The deferred places (tasks section 4), built only where the lines are already recorded (2026-10-21).** Counted against `tools/voice/manifest.json` (recording `voice-53224c8ddd`):
- *Star replay steps (4.1).* The steps are worked steps on the Player's own numbers, so like the Trick tool they are read from the page (`from:.star-step > p`) and play from clips, else the device's voice. The button appears only once every step is shown, so it never races the 2.5 s step timer and reads the whole replay. The view's `wireListen()` plays it (the round's shell sits inside the view); the replay phase ending (Skip, Go, Escape) stops it.
- *Daily quests (4.4).* One button on the quest card reads today's three labels (`from:.q-l`, the label alone, without its count); all 21 labels are recorded.
- *Round formats (4.4).* One button under the Challenge tower chapter's format legend reads the five rules (key `formats`); all five are recorded. The format names are not recorded lines, so the rules are read alone.
- *Not yet:* badge rules (the Party Mode badge's rule is not recorded, and 24 rules are one long block, which decision 1 rejects), Mode blurbs (each sits inside a Mode card button, like Watch descriptions, and the Mode names are not recorded lines), Watch descriptions (56 of 298 recorded), page introductions (live counts) and the "Older roots" notes. The notes already live in `js/sky-scene.js`, which Node imports, and are now in the recording list (`rootsLines()`, the intro and one line per note as the list shows it), so the 4.6 re-record records them; their button follows that re-record.

## Wording found while listing the lines (for the owner, not changed here)

- An arrow before a number is read "to": the Sutra example "6 × 7 = 42, then 25 → 4225" is heard "then 25 to 4225" (`normalize()` in `js/voice.js`). "gives" would read better in explanations.
- Long digit strings such as "…789473684210526315" (the 1/19 example) are read as one huge number.
- Sanskrit words inside explanation text ("Ekādhika means one more") are read by an English voice. The Sutra names themselves get their own clips (`sutra-pronunciation`).
- Any wording change to these lines needs a re-record (`tools/voice/lines.mjs`, `record.mjs`, `publish.mjs`), a few hundred characters each.

## Open decisions for the owner

1. Should Listen stay silent when Sound effects are off? Proposed: no, it plays (it is the voice, and it follows a tap).
2. The wording items above: change them (and re-record) or keep them.
3. The deferred places (tasks section 4): which matter enough to do next. Page introductions hold live counts ("You have collected 3 of 29"), so they would play from clips or the device's voice unless the fixed sentences are split out.
4. The "Older roots" notes are in the recording list (`rootsLines()`, decision 8) but none of them is recorded yet: the 4.6 re-record records them, and their Listen button follows it.

## Risks / Trade-offs

- **A wording change without a re-record** plays from the device's voice (or clips) until re-recorded. `test/explain-lines.test.mjs` checks that every key's lines are in the recording list; the recording itself is checked by part B's manifest.
- **The device voice never ends** on some browsers (no `onend`): the button would stay pressed until pressed again or the page changes. The fallback keeps working.
