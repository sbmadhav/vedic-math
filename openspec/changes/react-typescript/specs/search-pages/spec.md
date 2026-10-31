# Spec Delta

The `search-pages` capability is added by openspec change `indexable-routes`, which publishes one page per path, each with its metadata and, on indexed pages, its text, written by renderers in `tools/prerender/`. This delta changes only what React adds to one of its requirements (that change's design D13): once a view is a React view, the page's text is that view's own server render, and the first-visit Mode picker is Home's text. It applies after `indexable-routes` is archived.

## MODIFIED Requirements

### Requirement: Public pages read without JavaScript
Each indexed page SHALL hold its text in its HTML: its heading, its lede and its own content (a Skill's idea, method and one worked example; a Sutra's name, meaning, history and Worked examples; a game's description; a Guide section; a play experience's description), with its links as path links. For `/learn/`, that text SHALL be the first-visit Mode picker with the three Modes and the Guide link. Once the view that draws a page is a React view, the text SHALL be the server render of that same view (the parts that are the same for every visitor), not a separate renderer, so the HTML and the live view cannot drift. With JavaScript on, nothing SHALL be painted that the app then replaces: a page rendered by a React view hydrates in place, with the parts that depend on a Player drawn after start-up without a layout shift, and a page still written by a separate renderer keeps its text hidden until the app draws its view, so the first paint and the layout match today's. The Mode picker SHALL never be painted for a returning Player.

#### Scenario: A crawler without scripts
- **WHEN** a crawler requests `/learn/skill/v-near-base` without running scripts
- **THEN** the HTML holds the lesson's title, its idea and a worked example with every step

#### Scenario: A first visit with JavaScript off
- **WHEN** a first-time visitor opens `/learn/` with JavaScript off
- **THEN** the HTML shows the Mode picker with the three Modes and the Guide link

#### Scenario: A returning Player at Home
- **WHEN** a Player who has already picked a Mode opens `/learn/`
- **THEN** Home is shown and the Mode picker is never painted

#### Scenario: A returning Player on a Legacy page
- **WHEN** a returning Player opens a page whose view is still a Legacy view in a new tab
- **THEN** the text in the HTML is never painted, and the view is drawn as today

#### Scenario: A returning Player on a React page
- **WHEN** the Sutras view is a React view and a returning Player opens `/learn/sutras` in a new tab
- **THEN** the Sutras page in the HTML is the one shown, hydrated in place with no visible change, and that Player's collected cards are drawn after start-up without a layout shift

#### Scenario: A React view's page with JavaScript off
- **WHEN** the Deep dive is a React view and a crawler requests `/learn/sutras/s1` without running scripts
- **THEN** the HTML holds the Sutra's name, its meaning, its history and its Worked examples as that view shows them, and opening the same page with scripts on gives no hydration warning
