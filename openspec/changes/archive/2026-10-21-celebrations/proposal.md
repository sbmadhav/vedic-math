# Proposal

## Why

The owner (2026-10-20) asked for three things on learnvedicmath.com:

1. **Heroes that make people click.** The landing page's hero had a kicker, a two-line headline and a three-sentence lede before its button; the app home (the Mode picker) had a tag, a headline, a lede, the button and a second line. Both should say as little as they can, with one big, inviting call to action.
2. **The Nikhilam Family as the mascot in both heroes.** The landing page has it since #104; the app home showed Bolt's lightning icon on Try a trick and no mascot.
3. **Confetti only for true wins, and small, fun animations for the everyday moments.** Picking a Mode fired the big victory confetti, as did a practice streak of 3, every fifth Arena combo, a right guess in Tala Lab and a demonstration ending in the Art room. When everything gets confetti, nothing feels like a win.

## What Changes

- **Landing hero** (`site/index.html`): the headline "Math tricks you can do in your head", one line "Free, for ages 4 to adult.", and a bigger Start learning button with an arrow. The button glows (a soft ring) every four seconds, the arrow nudges, the family's nine nods toward it in step, and hovering or focusing it makes the family hop. The lede moves below the hero, under "Three ways to learn".
- **App home hero** (`js/app.js` `modePicker`): the headline "Fast, fun math for every brain", one line "One trick, two minutes, no sign-up.", and Try a trick as the big first action with the same glow; the Nikhilam Family beside it (`js/family.js`, the landing page's drawing). The tag "Vedic Math for Everyone", the old lede and the second line under the button are gone. The Mode cards follow as before.
- **One place for celebrations** (`js/celebrate.js`): `confetti(n)` is the big burst, for true wins only, one at a time; the small ones are `sparkle`, `pop`, `bounce`, `twinkle`, `wiggle`, `tick`, `cheer`, `rollUp` and `rollSparks`. `js/fx.js` and `js/play/kit.js` re-export them, so the app and the play experiences share one set.
- **Every confetti call site sorted** (the table in design.md): true wins keep the big confetti (a Star lit, a Medal, a kata cleared, a Belt, a badge, a new Title, a mastered skill, a first Sutra card, a personal best, a Party or ghost race won, a lock cracked, a puzzle solved); a badge and a first Sutra card now get it too. Everyday moments get something small: picking a Mode (the card pops, sparkles fly, the family cheers, then Home opens), a right answer (a bounce or twinkle), a streak or combo (the number ticks, a few sparkles), a wrong answer (a gentle wiggle), the Sparks earned on a result screen (they count up), and buttons squish on press.
- **No motion means no motion**: every helper is a no-op under reduced motion, Pause motion or Calm, and turning any of them on stops whatever is running at once. The screen that follows (Home, the end screen) still comes, at once.

Out of scope:

- The WebGL celebrations of `gpu-effects` (not built). When it is, `gfx.celebrate` replaces the body of `celebrate.confetti`; the call sites stay.
- Bolt inside rounds, which stays as it is.
- New sounds: picking a Mode plays the existing `pop` instead of `level`.
- Analytics: no new events.

## Affected

All three Modes (Explorer, Challenger, Pro) and every Player: the landing page, the app home before a Mode is picked, practice, katas, Stars, the Arena, games, the Sutra cards and the play experiences (Spellbook, Pattern Wall, Art room, Tala Lab, Daily Number). No change to what is stored or sent.

## Capabilities

### New Capabilities

- `celebrations`: which moments get the big confetti and which get a small animation, and the rules every animation follows.

### Modified Capabilities

- `first-visit`: "Try a trick before any choice" (the app home hero says less, Try a trick is the big first action, and the Nikhilam Family is in the hero).
- The landing page hero lives in the unarchived `learnvedicmath` change (`specs/landing-pages`, "The landing page"), which this change edits in place, as #104 and `learn-not-play` did.
