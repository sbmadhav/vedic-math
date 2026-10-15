# Proposal

## Why

Small wording and layout errors cost trust with exactly the people the plan targets: young Players who cannot read a faint prompt, parents who notice "3th", and anyone who checks where the sutras come from. Verified against the current code (line numbers as of `origin/main` 272230c):

- **Bug 11, confirmed.** Game prompts are meant to be large (`.g-q`, `math.css:216`, 2 to 3 rem, and `.g-say`, `math.css:200`), but the design system's `.md-card p` rule (15px, `--ink-muted`, in `/design-system/components.css`) is more specific (one class plus one element) and the game area sits inside `.md-card.g-shell` (`js/app.js:727`). Every prompt rendered as a `<p>` therefore shows at 15px grey: Balloon pop (`js/games.js:120`), Make ten (`js/games.js:153`) and Multiple rain (`js/games.js:333`), all Explorer games. Prompts rendered as a `<div>` are unaffected.
- **Bug 12, all five items confirmed.**
  - "Welcome back," is the Challenger and Pro greeting on every visit, including the first (`js/app.js:120`).
  - "What is the 3th multiple of 7?": the ordinal is `${m}th` for `m` from 2 to 9 (`js/skills/middle.js:130`), giving "2th" and "3th".
  - The hundredths picture is wrong: for a hundredths question the bar shows `Math.round(n / 10)` of 10 parts (`js/skills/middle.js:164`), so 0.25 shows 3 tenths and 0.04 shows nothing.
  - "Watch it explained" matches by substring (`js/app.js:240-242`), so "Discounts, tax and percent change" (`js/skills/upper.js:116`) contains "count" and links Numberblocks counting videos to a grade 7 percent lesson.
  - The footer says "Speed tricks follow the traditional Vedic mathematics sutras" (`index.html:58`).
- **Honest framing, confirmed gaps.** Besides the footer, Player-facing copy calls them "the Vedic sutras", which the glossary lists under _Avoid_ for Sutra: the Mode picker lede (`js/app.js:102`), the Dojo lede (`js/app.js:363`) and the Sutras page title (`js/app.js:510`, `:584`). The history panel itself is already accurate (`js/sutras.js:41-43`). There is no share text in the app yet; the rule is recorded now so share cards in Phase 2 follow it.
- **Layout shift, confirmed cause.** `#view` has no minimum height (`math.css:518`); the footer jumps when the view renders after the modules load. The plan measured mobile CLS at 0.33; this change sets `#view { min-height: 100svh }` and measures it in the e2e suite.

## What Changes

- Game prompts and game instruction lines render at their intended size and ink color in every game, including inside cards.
- Greeting: "Welcome back," only for a Player who played on an earlier day; otherwise "Welcome," (Challenger) or "Hello," (Explorer, unchanged).
- Ordinals are correct (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st).
- Hundredths questions show a 10 by 10 grid with the right number of squares shaded.
- Related videos match whole words or tags, never substrings inside another word.
- Every Player-facing mention of where the sutras come from says they are from Bharati Krishna Tirtha's 1965 book, and nothing says "from the Vedas" or "traditional Vedic mathematics sutras". "The Vedic sutras" as a name is replaced by "the sutras" or "the 16 sutras".
- The main view reserves the screen height before it renders, bringing mobile CLS under 0.1.

Out of scope:

- The parent note's content (owned by `add-age-answer-and-parent-step` and `separate-identity-per-player`).
- Share cards and challenge links (Phase 2); they must follow the framing requirement when built.
- Rewriting the history panel or the sutra deep dives, which are already accurate.
- The product name "Vedic Math for Everyone" and the Sanskrit names, which come from `js/sutras.js` only.
- Other performance work (LCP, lazy routes).

Affected: Explorer Players (prompt size, hundredths picture is grade 4 so Challenger too), Challenger and Pro Players (greeting, ordinals, related videos), and every visitor, including parents and teachers (framing, layout shift).

## Capabilities

### New Capabilities

- `honest-framing`: how every surface describes where the sutras and Vedic math come from.
- `copy-accuracy`: greetings, ordinals, lesson pictures and related links that say what is true.
- `page-layout`: readable game prompts and a stable page layout while the app loads.

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `math.css`: `.g-shell .g-q`, `.g-shell .g-say` selectors; `#view { min-height: 100svh }` (tokens only, no raw hex).
- `index.html:58` footer copy; `index.html:7` meta description reviewed against the framing rule (it already says "from the sutras").
- `js/app.js`: `heroStats()` greeting (`:120`), Mode picker and Dojo ledes (`:102`, `:363`), Sutras page titles (`:510`, `:584`), `videosFor()` matching (`:239-245`).
- `js/skills/middle.js:130` (ordinal helper, probably in `js/lib.js`), `js/skills/middle.js:164` and a new `hundredGrid()` in `js/viz.js`.
- Tests: node tests (ordinal helper, a copy scan over `index.html` and `js/` for banned phrases and em dashes, the related-videos matcher), Playwright specs (`e2e/tests/games.spec.ts` computed font size, `e2e/tests/load.spec.ts` CLS and footer, `e2e/tests/modes.spec.ts` greeting).
- Nothing sent or kept changes; `parentNote()` and `cloud/README.md` are untouched.
- **Order:** independent; small and safe to land early. `analytics-events` and `pro-arena-mental-arithmetic` do not depend on it.
