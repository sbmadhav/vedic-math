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
- *Not yet (2026-10-21; built since, decision 10):* badge rules (the Party Mode badge's rule is not recorded, and 24 rules are one long block, which decision 1 rejects), Mode blurbs (each sits inside a Mode card button, like Watch descriptions, and the Mode names are not recorded lines), Watch descriptions (56 of 298 recorded), and page introductions (their fixed lines are data in `js/ledes.js` since 2026-10-29, apart from the parts with the Player's own numbers, and in the recording list as `ledeLines()`, so the 4.6 re-record records them; their button follows it).
- *The "Older roots" notes (4.5, 2026-10-29).* They live in `js/sky-scene.js`, which Node imports, and are in the recording list (`rootsLines()`, the intro and one line per note as the list shows it). The card has one Listen button (key `roots`); until the 4.6 re-record records the notes it reads them with this device's voice, as every Listen line without a recording does.

**9. How explanations are read (owner-delegated, 2026-10-30; open decisions 1 and 2).**
- *Sound effects off and Calm leave Listen on.* Listen is the voice, not a sound effect, and it follows a tap, as read aloud and Hear it do (decision 5). Reason: a Player who mutes the effects is often the one who most needs the words read.
- *An arrow to a worked example's answer reads "gives".* `normalize()` in `js/voice.js` reads `→` as "gives" (after a comma) when it points at the highlighted answer (`<b class="hl">`, unless that answer is a word such as "yes" or "correct", which keeps ", so") or at the number that ends the line: "6 × 7 = 42, then 25 → 4225" is heard "6 times 7 equals 42, then 25, gives 4225", as `exampleLine()` always meant. An arrow inside a list ("7 → 5, 13 → 4") still reads "to", and one before a word still reads ", so". The page keeps the arrow: only the spoken words change. Reason: "then 25 to 4225" sounds like a range. Only explanation lines hold such arrows (no generated question, hint or fixed line does, checked over every generator), so the Explorer gate in `test/voice-coverage.test.mjs` is untouched; 73 explanation lines (Sutra cards and deep dives) now read differently, which the 4.6 re-record records.
- *A run of ten or more digits is read digit by digit* ("…789473684210526315" is "7 8 9 4 …"), unless it is written with thousands commas or follows a decimal point. Reason: as one number it is a quintillion nobody can follow; the 1/19 example is the one line, and no generated line has such a run.
- *Sanskrit words inside explanation text stay as written.* The whole-line recording takes plain text, with no pronunciation markup, and respelling the words on screen would teach a wrong spelling; the Sutra names keep their own clips (`sutra-pronunciation`). Reason: the cost (respelt copy, or a second pipeline) outweighs a word now and then in an English accent.

**10. The rest of the deferred places (owner-delegated, 2026-10-30; open decisions 3 and 4).** Built now, without waiting for the 4.6 re-record: like the Older roots notes, a line with no recording plays with this device's voice until it has one, so waiting only kept the button away from Players.
- *Page introductions (4.2).* A Listen button under each of the ten (key `lede:<id>`, named "Listen: about this page"). `ledeKeyLines()` in `js/explain-lines.js` reads `LEDES` in the Player's Mode words: the fixed lines are recorded whole after 4.6; the Player's own numbers travel in the key (`lede:grade:7:31`, `lede:sutras:3:29`), so the button reads the page's words without reading the page, and play from clips or the device's voice. A level's page shows two wordings (the friendlier one in Explorer and Challenger); the button names the one shown.
- *Watch descriptions (4.3).* The card is a button and cannot hold another, and splitting the card would break its one large target. The player the card opens shows the same description, so its Listen button is there ("Listen: about this video", `from:.vp-why`, the description without its channel, as recorded). Pressing play or closing the player stops it. Outside links (Pro) open in a new tab, so their descriptions get no button.
- *Badge rules (4.4).* One button over the Me page's badges reads the rules of the badges still to earn, in grid order (`from:.badge:not(.got) small`, "Listen: the badges to earn"); with every badge earned there is no button. Reading only what is left keeps the block shorter than all 24 (decision 1) and answers the question a Player has there: what can I earn next. The Party Mode badge's rule plays with the device's voice until the re-record.
- *Mode blurbs (4.4): no button.* They show only on the first visit's Mode picker, whose three Mode cards are its only buttons (`first-visit` spec, change `play-nav-by-mode`), and each blurb is inside its card's button. Find lists them too, as search results. Reason: a fourth button on the first screen would undo the one-step picker.

## Wording found while listing the lines (decided in decision 9)

- An arrow before a number is read "to": the Sutra example "6 × 7 = 42, then 25 → 4225" is heard "then 25 to 4225" (`normalize()` in `js/voice.js`). "gives" would read better in explanations.
- Long digit strings such as "…789473684210526315" (the 1/19 example) are read as one huge number.
- Sanskrit words inside explanation text ("Ekādhika means one more") are read by an English voice. The Sutra names themselves get their own clips (`sutra-pronunciation`).
- Any wording change to these lines needs a re-record (`tools/voice/lines.mjs`, `record.mjs`, `publish.mjs`), a few hundred characters each. The readings decision 9 changes are in the 4.6 re-record.

## Open decisions for the owner

None. Decisions 9 and 10 settle the four that were here (owner-delegated, 2026-10-30): Listen plays with Sound effects off; the arrow and long digit readings change and Sanskrit stays; every deferred place has its button except the Mode blurbs; the Older roots notes play with the device's voice until the 4.6 re-record. What stays the owner's: the 4.6 re-record (`tools/voice/`, it costs money) and the listening check in 5.1.

## Risks / Trade-offs

- **A wording change without a re-record** plays from the device's voice (or clips) until re-recorded. `test/explain-lines.test.mjs` checks that every key's lines are in the recording list; the recording itself is checked by part B's manifest.
- **The device voice never ends** on some browsers (no `onend`): the button would stay pressed until pressed again or the page changes. The fallback keeps working.
