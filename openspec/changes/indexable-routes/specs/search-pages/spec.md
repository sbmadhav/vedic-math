# Spec Delta

## ADDED Requirements

### Requirement: Every screen's path is a published file
The build SHALL write one HTML file for every path the route table lists (every screen of the game with its finite ids: Skills, levels, Sutras, games, Tricks, Katas, Stars, tower chapters and challenges, game Levels, Guide sections and play experiences), served at that path with status 200 and without running server code. Each file SHALL be the game's shell, with the same scripts and styles as `/learn/`, so that it becomes the full game when its scripts run.

#### Scenario: A Kata path
- **WHEN** a link preview fetches `https://learnvedicmath.com/learn/kata/sq5/12`
- **THEN** the status is 200 and the `<title>` names Kata 12 of squaring numbers ending in 5

#### Scenario: No server code
- **WHEN** a visitor opens `/learn/sutras/s1`
- **THEN** the published file is served and no Worker code runs

### Requirement: Each page carries its own metadata
Every published page under `/learn/` SHALL have its own `<title>` (the title the view sets today), a meta description of one sentence under 160 characters with no em dash, a canonical link to its production URL without a query, and Open Graph title, description, URL and the site's share image. Indexed pages SHALL also carry JSON-LD `BreadcrumbList`, and a Skill lesson and a Deep dive JSON-LD `LearningResource`.

#### Scenario: A Deep dive's head
- **WHEN** the HTML of `/learn/sutras/s1` is read
- **THEN** its title names Ekādhikena Pūrveṇa, its canonical is `https://learnvedicmath.com/learn/sutras/s1`, and its `og:url` is the same

#### Scenario: A problem link's canonical
- **WHEN** a crawler fetches `/learn/skill/3-mult?problem=2-k7f9`
- **THEN** the canonical link is `https://learnvedicmath.com/learn/skill/3-mult`

### Requirement: Public pages read without JavaScript
Each indexed page SHALL hold its text in its HTML: its heading, its lede and its own content (a Skill's idea, method and one worked example; a Sutra's name, meaning, history and Worked examples; a game's description; a Guide section; a play experience's description), with its links as path links. With JavaScript on, that text SHALL NOT be painted before the app draws its view, so the first paint and the layout match today's.

#### Scenario: A crawler without scripts
- **WHEN** a crawler requests `/learn/skill/v-near-base` without running scripts
- **THEN** the HTML holds the lesson's title, its idea and a worked example with every step

#### Scenario: A returning Player
- **WHEN** a returning Player opens `/learn/sutras` in a new tab
- **THEN** the prerendered text is never painted, and the Sutras page is drawn with that Player's collected cards

### Requirement: Which pages are indexed
The indexed pages SHALL be Home, the Skill map, each level, each Skill lesson, the Arcade, the Dojo, the Sutras and each Deep dive, the Arena, Games and each game, Watch, the Guide and each section, and each play experience. Every other page under `/learn/` SHALL carry `<meta name="robots" content="noindex, follow">`. A Skill lesson for a Trick that has a published Trick page SHALL have that Trick page as its canonical.

#### Scenario: A numbered step
- **WHEN** the HTML of `/learn/challenge/30` is read
- **THEN** it carries `noindex, follow`

#### Scenario: A Trick lesson with a Trick page
- **WHEN** `/tricks/square-numbers-ending-in-5/` is published and the HTML of `/learn/skill/v-sq5` is read
- **THEN** its canonical is `https://learnvedicmath.com/tricks/square-numbers-ending-in-5/`

### Requirement: Sitemap and robots
`sitemap.xml` SHALL list every indexed page under `/learn/` by its canonical URL, besides the site's other pages, and no page that is `noindex` or whose canonical is another URL. `robots.txt` SHALL allow every path and name the sitemap.

#### Scenario: The sitemap
- **WHEN** `sitemap.xml` is fetched
- **THEN** it lists `https://learnvedicmath.com/learn/sutras/s1` and `https://learnvedicmath.com/learn/skills`, and no `/learn/kata/`, `/learn/challenge/` or `/play/` URL

#### Scenario: Robots
- **WHEN** `robots.txt` is fetched
- **THEN** it has no `Disallow` line and names `https://learnvedicmath.com/sitemap.xml`

### Requirement: One header rule for the game's pages
All pages under `/learn/` SHALL share one inline script set, so that one `_headers` rule for `/learn/*` carries their content security policy, and the build SHALL fail when a page under `/learn/` has an inline script that the others do not.

#### Scenario: A stray inline script
- **WHEN** a renderer adds an inline script to one Deep dive page
- **THEN** `python3 build.py` fails and names the page
